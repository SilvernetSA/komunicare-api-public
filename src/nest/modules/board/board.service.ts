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

  async copyPublicBoard(
    req: Request,
    payload: CopyPublicBoardDto,
  ): Promise<Record<string, unknown>> {
    const user = await this.legacyAuthService.getAuthorizedUser(req);
    const communicator = await (CommunicatorPersistenceEntity as any)
      .findById(payload.communicatorId)
      .exec();

    if (!communicator) {
      throw new NotFoundException(
        `Communicator does not exist. Communicator ID: ${payload.communicatorId}`,
      );
    }

    const isPrivileged = isPrivilegedContentActor(user);
    if (isOfficialCommunicator(communicator) && !isPrivileged) {
      throw new ForbiddenException('Official/system communicators cannot receive user copies.');
    }
    if (!isPrivileged && String(communicator.email || '').trim() !== user.email) {
      throw new ForbiddenException('You can only copy boards to your own communicator.');
    }

    const sourceBoard = await this.findBoardByReference(payload.sourceBoardId);
    if (!sourceBoard?.isPublic || isOfficialBoard(sourceBoard)) {
      throw new BadRequestException('Only original public boards can be copied.');
    }
    if (String(sourceBoard.email || '').trim() === user.email) {
      throw new BadRequestException('You cannot copy your own public board.');
    }

    const destinationBoardId =
      normalizeOptionalString(payload.destinationBoardId) ||
      normalizeOptionalString(communicator.rootBoard);
    if (!destinationBoardId) {
      throw new BadRequestException('A destination root board is required.');
    }

    const communicatorBoardIds = Array.isArray(communicator.boards)
      ? communicator.boards.map((boardId: unknown) => String(boardId || '').trim())
      : [];
    if (!communicatorBoardIds.includes(destinationBoardId)) {
      throw new BadRequestException(
        'The destination board is not attached to the target communicator.',
      );
    }

    const destinationBoard = await this.findBoardByReference(destinationBoardId);
    if (
      !destinationBoard ||
      String(destinationBoard.email || '').trim() !== String(communicator.email || '').trim() ||
      isOfficialBoard(destinationBoard)
    ) {
      throw new ForbiddenException('The destination board is not writable by the target user.');
    }

    const existingCopy = await (BoardPersistenceEntity as any)
      .findOne({ email: communicator.email, publicSourceId: payload.sourceBoardId })
      .lean()
      .exec();
    if (existingCopy) {
      throw new ConflictException('This public board is already copied to the target user.');
    }

    return withTransaction(async (session) => {
      const sourceBoards = await this.collectBoardGraph(payload.sourceBoardId);
      const sourceBoardsByReference = indexBoardsByReference(sourceBoards);
      const sourceReferences = sourceBoards
        .map((board) => getBoardDocumentId(board))
        .filter((boardId): boardId is string => Boolean(boardId));
      const boardIdMap = new Map(
        sourceReferences.map((boardId) => [boardId, new Types.ObjectId().toHexString()]),
      );
      const copiedBoardIds: string[] = [];

      for (const sourceReference of sourceReferences) {
        const source = sourceBoardsByReference.get(sourceReference);
        const copiedBoardId = boardIdMap.get(sourceReference);
        if (!source || !copiedBoardId) continue;

        const copiedBoard = this.boardRepository.create({
          _id: copiedBoardId,
          name: source.name,
          author: user.name || source.author,
          email: communicator.email,
          isPublic: false,
          publicSourceId: source.isPublic ? sourceReference : undefined,
          sourceBoardId: sourceReference,
          tiles: remapCopiedBoardTiles(cloneComparableValue(source.tiles), boardIdMap),
          cellSize: source.cellSize,
          locale: source.locale,
          caption: source.caption,
          format: source.format,
          description: source.description,
          isFixed: false,
          grid: cloneComparableValue(source.grid),
        });
        const savedBoard = await this.boardRepository.save(copiedBoard, session);
        const persistedBoardId = getBoardDocumentId(savedBoard || copiedBoard);
        if (!persistedBoardId) {
          throw new BadRequestException('Could not persist the copied board graph.');
        }
        copiedBoardIds.push(persistedBoardId);
      }

      const copiedRootBoardId = boardIdMap.get(
        getBoardDocumentId(sourceBoard) || payload.sourceBoardId,
      );
      if (!copiedRootBoardId) {
        throw new BadRequestException('Could not resolve the copied root board.');
      }

      destinationBoard.tiles = [
        ...(Array.isArray(destinationBoard.tiles) ? destinationBoard.tiles : []),
        {
          id: new Types.ObjectId().toHexString(),
          label: sourceBoard.name,
          loadBoard: copiedRootBoardId,
          type: 'folder',
          linkedBoard: true,
        },
      ];
      await destinationBoard.save({ session });

      communicator.boards = Array.from(
        new Set([...communicatorBoardIds, ...copiedBoardIds]),
      );
      await communicator.save({ session });

      return {
        board: copiedRootBoardId,
        communicator: communicator.toJSON ? communicator.toJSON() : communicator,
      };
    });
  }

  private async findBoardByReference(reference: string): Promise<any | null> {
    const query = buildBoardReferenceQuery([reference]);
    if (!query) return null;
    return (BoardPersistenceEntity as any).findOne(query).exec();
  }

  private async collectBoardGraph(rootReference: string): Promise<any[]> {
    const boardsByReference = new Map<string, any>();
    const pending = [rootReference];
    const visited = new Set<string>();

    while (pending.length) {
      const next = normalizeOptionalString(pending.shift());
      if (!next || visited.has(next)) continue;
      visited.add(next);

      const query = buildBoardReferenceQuery([next]);
      if (!query) continue;
      const boards = await (BoardPersistenceEntity as any).find(query).lean().exec();
      boards.forEach((board: any) => {
        const boardId = getBoardDocumentId(board);
        if (!boardId) return;
        if (!boardsByReference.has(boardId)) boardsByReference.set(boardId, board);
        [board.sourceBoardId, board.boardId, board._id, board.id]
          .map((reference) => normalizeOptionalString(reference))
          .filter((reference): reference is string => Boolean(reference))
          .forEach((reference) => {
            if (!boardsByReference.has(reference)) boardsByReference.set(reference, board);
          });
        (Array.isArray(board.tiles) ? board.tiles : []).forEach((tile: any) => {
          const childReference = normalizeOptionalString(tile?.loadBoard);
          if (childReference && !visited.has(childReference)) pending.push(childReference);
        });
      });
    }

    return Array.from(new Set(boardsByReference.values()));
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
