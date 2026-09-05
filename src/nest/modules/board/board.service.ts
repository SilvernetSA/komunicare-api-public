import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import moment from 'moment';
import { Types } from 'mongoose';

import {
  AuthorizedUser,
  LegacyAuthService,
} from '../../common/legacy-auth.service';
import { BoardPersistenceEntity } from '../../common/models/board.persistence-model';
import { withTransaction } from '../../common/with-transaction';
import { getORQuery } from '../../common/query.util';
import { ListBoardsByEmailDto } from './dto/list-boards-by-email.dto';
import { ReportPublicBoardDto } from './dto/report-public-board.dto';
import { CommunicatorPersistenceEntity } from '../../common/models/communicator.persistence-model';
import { BoardRepository } from './board.repository';
import { CopyPublicBoardDto } from './dto/copy-public-board.dto';
import {
  buildBoardReferenceQuery,
  cloneComparableValue,
  getBoardDocumentId,
  indexBoardsByReference,
  isOfficialBoard,
  isOfficialCommunicator,
  isPrivilegedContentActor,
  remapCopiedBoardTiles,
} from '../communicator/communicator.helpers';
import {
  OFFICIAL_COMMUNICATOR_IDS,
  OFFICIAL_ROOT_BOARD_IDS,
  OFFICIAL_SYSTEM_BOARD_AUTHORS,
  OFFICIAL_SYSTEM_BOARD_EMAILS,
} from '../system-boards/system-boards.constants';
import {
  BoardActionResponse,
  BoardModel,
  PaginatedBoardModelResponse,
} from './models/board.model';
import { BoardModerationService } from './services/board-moderation.service';

const CANONICAL_OFFICIAL_BOARD_IDS = new Set(['komunicare']);
const OFFICIAL_PUBLIC_BOARD_EXCLUSIONS = [
  { isSystemBoard: true },
  { communicator: { $in: OFFICIAL_COMMUNICATOR_IDS } },
  { boardId: { $in: OFFICIAL_ROOT_BOARD_IDS } },
  { id: { $in: OFFICIAL_ROOT_BOARD_IDS } },
  { email: { $in: OFFICIAL_SYSTEM_BOARD_EMAILS } },
  { author: { $in: OFFICIAL_SYSTEM_BOARD_AUTHORS } },
];

const normalizeOptionalString = (value: unknown): string | undefined => {
  const normalized = String(value || '').trim();
  return normalized || undefined;
};

@Injectable()
export class BoardService {
  constructor(
    private readonly legacyAuthService: LegacyAuthService,
    private readonly boardRepository: BoardRepository,
    private readonly boardModerationService: BoardModerationService,
  ) {}

  async listBoard(
    query: ListBoardsByEmailDto,
  ): Promise<PaginatedBoardModelResponse> {
    const search = query.search || '';
    const searchQuery: Record<string, unknown> = search.length
      ? (getORQuery(
          ['name', 'author', 'email'],
          search,
          true,
        ) as Record<string, unknown>)
      : {};

    return this.boardRepository.paginate(searchQuery, query as any);
  }

  async getBoardsByEmail(
    req: Request,
    email: string,
    query: ListBoardsByEmailDto,
  ): Promise<PaginatedBoardModelResponse> {
    const user = await this.legacyAuthService.getAuthorizedUser(req);
    this.legacyAuthService.assertSameUserOrAdmin(
      user,
      email,
      "You are not authorized to get this user's boards.",
    );

    const search = query.search || '';
    const searchQuery: Record<string, unknown> = search.length
      ? (getORQuery(['name', 'author'], search, true) as Record<
          string,
          unknown
        >)
      : {};

    return this.boardRepository.paginate(
      { ...searchQuery, email, isFixed: { $ne: true } },
      query as any,
    );
  }

  async getPublicBoards(
    req: Request,
    query: ListBoardsByEmailDto,
  ): Promise<PaginatedBoardModelResponse> {
    await this.legacyAuthService.getAuthorizedUser(req);

    const search = query.search || '';
    const searchQuery: Record<string, unknown> = search.length
      ? (getORQuery(['name', 'author'], search, true) as Record<
          string,
          unknown
        >)
      : {};

    return this.boardRepository.paginate(
      {
        ...searchQuery,
        isPublic: true,
        $nor: OFFICIAL_PUBLIC_BOARD_EXCLUSIONS,
      },
      query as any,
    );
  }

  async getBoard(req: Request, id: string): Promise<BoardModel> {
    const user = await this.legacyAuthService.getAuthorizedUser(req);
    const board = await this.findBoardById(id);

    if (!board.isPublic && !(board as any).isSystemBoard) {
      const isOwner = user.email === board.email;
      const isAdmin = Boolean(user.isAdmin || user.role === 'admin');
      if (!isOwner && !isAdmin) {
        const comm = await (CommunicatorPersistenceEntity as any)
          .findOne({ email: user.email, boards: id })
          .lean()
          .exec();
        if (!comm) {
          throw new ForbiddenException('You are not authorized to get this board.');
        }
      }
    }

    return board.toJSON() as BoardModel;
  }

  async createBoard(
    req: Request,
    payload: Record<string, any>,
  ): Promise<BoardModel> {
    if (!payload?.email) {
      throw new BadRequestException('User email is required');
    }

    await this.authorizeBoardAccess(
      req,
      payload.email,
      'You are not authorized to create a board for this user.',
    );

    const requester = await this.legacyAuthService.getAuthorizedUser(req);
    const requestedParentBoardId = normalizeOptionalString(
      payload?.parentBoardId || payload?.parentBoard,
    );
    if (requestedParentBoardId && !isPrivilegedContentActor(requester)) {
      throw new ForbiddenException(
        'End users can only create boards at communicator root level.',
      );
    }
    if (!isPrivilegedContentActor(requester) && isOfficialBoard(payload)) {
      throw new ForbiddenException('Official/system boards cannot be created here.');
    }
    if (requestedParentBoardId) {
      const parentBoard = await this.boardRepository.findById(requestedParentBoardId);
      if (!parentBoard || String(parentBoard.email || '').trim() !== payload.email) {
        throw new BadRequestException('A folder board must belong to the requested user.');
      }
    }

    const publicSourceId = normalizeOptionalString(payload?.publicSourceId);
    const sourceBoardId = normalizeOptionalString(payload?.sourceBoardId);

    if (payload?.isPublic && publicSourceId) {
      throw new BadRequestException(
        'A copied public board cannot be published.',
      );
    }

    const board = this.boardRepository.create({
      ...payload,
      publicSourceId,
      sourceBoardId,
      lastEdited: moment().format(),
    });
    await this.boardRepository.save(board);

    return board.toJSON() as BoardModel;
  }

  async reportPublicBoard(
    payload: ReportPublicBoardDto,
  ): Promise<BoardActionResponse> {
    return this.boardModerationService.reportPublicBoard(payload);
  }

  async updateBoard(
    req: Request,
    id: string,
    payload: Record<string, any>,
  ): Promise<BoardModel> {
    const user = await this.legacyAuthService.getAuthorizedUser(req);
    const board = await this.findBoardById(id);
    if (isOfficialBoard(board) && !isPrivilegedContentActor(user)) {
      throw new ForbiddenException('Official/system boards cannot be modified by end users.');
    }
    const nextEmail = payload?.email || board.email;
    const nextIsPublic =
      payload?.isPublic !== undefined ? payload.isPublic : Boolean(board.isPublic);
    const nextPublicSourceId =
      payload?.publicSourceId !== undefined
        ? normalizeOptionalString(payload.publicSourceId)
        : normalizeOptionalString(board.publicSourceId);
    const nextSourceBoardId =
      payload?.sourceBoardId !== undefined
        ? normalizeOptionalString(payload.sourceBoardId)
        : normalizeOptionalString(board.sourceBoardId);

    await this.authorizeBoardAccess(
      req,
      nextEmail,
      'You are not authorized to update this board.',
      user,
    );

    if (payload.isPublic && ['root', 'jjmlUcQs19', 'komunicare'].includes(id)) {
      throw new BadRequestException('This board cannot be published.');
    }

    if (nextIsPublic && nextPublicSourceId) {
      throw new BadRequestException(
        'A copied public board cannot be published.',
      );
    }

    Object.keys(payload || {}).forEach((key) => {
      board[key] = payload[key];
    });

    if (payload?.publicSourceId !== undefined) {
      board.publicSourceId = nextPublicSourceId;
    }

    if (payload?.sourceBoardId !== undefined) {
      board.sourceBoardId = nextSourceBoardId;
    }

    board.lastEdited = moment().format();
    await this.boardRepository.save(board);

    return board.toJSON() as BoardModel;
  }

  async deleteBoard(req: Request, id: string): Promise<BoardModel> {
    const user = await this.legacyAuthService.getAuthorizedUser(req);
    const board = await this.findBoardById(id);
    if (isOfficialBoard(board) && !isPrivilegedContentActor(user)) {
      throw new ForbiddenException('Official/system boards cannot be deleted by end users.');
    }
    await this.authorizeBoardAccess(
      req,
      board.email,
      'You are not authorized to delete this board.',
      user,
    );

    const boardId = String(board.id || id);
    const communicatorCopies = await (CommunicatorPersistenceEntity as any)
      .find({
        email: board.email,
        copySource: { $exists: true, $nin: [null, ''] },
        $or: [{ rootBoard: boardId }, { boards: boardId }],
      })
      .select('_id boards rootBoard')
      .lean()
      .exec();

    if (communicatorCopies.length) {
      const communicatorIdsToDelete = new Set<string>();
      const removableBoardIds = new Set<string>();

      for (const communicator of communicatorCopies) {
        const communicatorId = String(
          communicator?._id || communicator?.id || '',
        ).trim();
        if (!communicatorId) {
          continue;
        }

        const currentBoards: string[] = Array.isArray(communicator?.boards)
          ? communicator.boards.map((candidate: unknown) =>
              String(candidate || '').trim(),
            )
          : [];
        const nextBoards = currentBoards.filter(
          (candidateBoardId: string) =>
            candidateBoardId && candidateBoardId !== boardId,
        );
        const nonCanonicalNextBoards = nextBoards.filter(
          (candidateBoardId: string) =>
            candidateBoardId && !CANONICAL_OFFICIAL_BOARD_IDS.has(candidateBoardId),
        );

        const currentRootBoard = String(communicator?.rootBoard || '').trim();
        let nextRootBoard = currentRootBoard;

        if (currentRootBoard === boardId || !nextBoards.includes(currentRootBoard)) {
          nextRootBoard = nonCanonicalNextBoards[0] || '';
        }

        if (
          CANONICAL_OFFICIAL_BOARD_IDS.has(currentRootBoard) &&
          nonCanonicalNextBoards.length
        ) {
          nextRootBoard = nonCanonicalNextBoards[0];
        }

        const shouldDeleteCommunicator =
          !nonCanonicalNextBoards.length ||
          !nextRootBoard ||
          CANONICAL_OFFICIAL_BOARD_IDS.has(nextRootBoard);

        if (shouldDeleteCommunicator) {
          communicatorIdsToDelete.add(communicatorId);
          currentBoards.forEach((candidateBoardId: string) => {
            if (
              candidateBoardId &&
              !CANONICAL_OFFICIAL_BOARD_IDS.has(candidateBoardId)
            ) {
              removableBoardIds.add(candidateBoardId);
            }
          });
          if (
            currentRootBoard &&
            !CANONICAL_OFFICIAL_BOARD_IDS.has(currentRootBoard)
          ) {
            removableBoardIds.add(currentRootBoard);
          }
          continue;
        }

        await (CommunicatorPersistenceEntity as any)
          .updateOne(
            { _id: communicatorId },
            {
              $set: {
                boards: nextBoards,
                rootBoard: nextRootBoard,
              },
            },
          )
          .exec();
      }

      if (communicatorIdsToDelete.size) {
        await (CommunicatorPersistenceEntity as any)
          .deleteMany({ _id: { $in: Array.from(communicatorIdsToDelete) } })
          .exec();
      }

      const candidateBoardIdsToDelete = Array.from(removableBoardIds).filter(
        (candidateBoardId) =>
          candidateBoardId &&
          candidateBoardId !== boardId &&
          !CANONICAL_OFFICIAL_BOARD_IDS.has(candidateBoardId),
      );

      if (candidateBoardIdsToDelete.length) {
        const boardIdsStillReferenced = new Set<string>();
        const stillReferencedCommunicators = await (CommunicatorPersistenceEntity as any)
          .find({
            email: board.email,
            copySource: { $exists: true, $nin: [null, ''] },
            $or: [
              { boards: { $in: candidateBoardIdsToDelete } },
              { rootBoard: { $in: candidateBoardIdsToDelete } },
              { 'defaultBoardsIncluded.homeBoard': { $in: candidateBoardIdsToDelete } },
            ],
          })
          .select('boards rootBoard defaultBoardsIncluded')
          .lean()
          .exec();

        stillReferencedCommunicators.forEach((communicator: any) => {
          const boards = Array.isArray(communicator?.boards)
            ? communicator.boards
            : [];
          boards.forEach((candidateBoardId: unknown) => {
            const normalizedBoardId = String(candidateBoardId || '').trim();
            if (normalizedBoardId) {
              boardIdsStillReferenced.add(normalizedBoardId);
            }
          });

          const rootBoardId = String(communicator?.rootBoard || '').trim();
          if (rootBoardId) {
            boardIdsStillReferenced.add(rootBoardId);
          }

          const defaultBoardsIncluded = Array.isArray(
            communicator?.defaultBoardsIncluded,
          )
            ? communicator.defaultBoardsIncluded
            : [];
          defaultBoardsIncluded.forEach((entry: any) => {
            const homeBoardId = String(entry?.homeBoard || '').trim();
            if (homeBoardId) {
              boardIdsStillReferenced.add(homeBoardId);
            }
          });
        });

        const boardIdsSafeToDelete = candidateBoardIdsToDelete.filter(
          (candidateBoardId) => !boardIdsStillReferenced.has(candidateBoardId),
        );

        if (boardIdsSafeToDelete.length) {
          await (BoardPersistenceEntity as any)
            .deleteMany({
              _id: { $in: boardIdsSafeToDelete },
              email: board.email,
            })
            .exec();
        }
      }
    }

    await this.boardRepository.deleteById(id);

    return board.toJSON() as BoardModel;
  }

  private async authorizeBoardAccess(
    req: Request,
    email: string,
    errorMessage: string,
    user?: AuthorizedUser,
  ): Promise<void> {
    const requester = user || (await this.legacyAuthService.getAuthorizedUser(req));
    this.legacyAuthService.assertSameUserOrAdmin(
      requester,
      email,
      errorMessage,
    );
  }

  private async assertAdmin(req: Request, errorMessage: string): Promise<void> {
    const user = await this.legacyAuthService.getAuthorizedUser(req);
    const isAdmin = Boolean(user.isAdmin || user.role === 'admin');

    if (!isAdmin) {
      throw new ForbiddenException(errorMessage);
    }
  }

  private async findBoardById(id: string): Promise<any> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Invalid ID for a Board. Board Id: ${id}`);
    }

    const board = await this.boardRepository.findById(id);
    if (!board) {
      throw new NotFoundException(`Board does not exist. Board Id: ${id}`);
    }

    return board;
  }
}
