import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import moment from 'moment';
import { Types } from 'mongoose';

import {
  CommunicatorBoardCleanupService,
  type CleanupCommunicatorBoardCopiesResult,
} from '../../common/communicator-board-cleanup.service';
import {
  AuthorizedUser,
  LegacyAuthService,
} from '../../common/legacy-auth.service';
import { MailGatewayService } from '../../common/mail-gateway.service';
import { BoardPersistenceEntity } from '../../common/models/board.persistence-model';
import { getORQuery } from '../../common/query.util';
import { ListBoardsByEmailDto } from './dto/list-boards-by-email.dto';
import { ReportPublicBoardDto } from './dto/report-public-board.dto';
import { CommunicatorPersistenceEntity } from '../../common/models/communicator.persistence-model';
import { BoardRepository } from './board.repository';
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

const CANONICAL_OFFICIAL_BOARD_IDS = new Set(['komunicare']);
const OFFICIAL_PUBLIC_BOARD_EXCLUSIONS = [
  { isSystemBoard: true },
  { communicator: { $in: OFFICIAL_COMMUNICATOR_IDS } },
  { boardId: { $in: OFFICIAL_ROOT_BOARD_IDS } },
  { id: { $in: OFFICIAL_ROOT_BOARD_IDS } },
  { email: { $in: OFFICIAL_SYSTEM_BOARD_EMAILS } },
  { author: { $in: OFFICIAL_SYSTEM_BOARD_AUTHORS } },
];

@Injectable()
export class BoardService {
  constructor(
    private readonly legacyAuthService: LegacyAuthService,
    private readonly boardRepository: BoardRepository,
    private readonly mailGateway: MailGatewayService,
    private readonly communicatorBoardCleanupService: CommunicatorBoardCleanupService,
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
      { ...searchQuery, email },
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

    const board = this.boardRepository.create({
      ...payload,
      lastEdited: moment().format(),
    });
    await this.boardRepository.save(board);

    return board.toJSON() as BoardModel;
  }

  async reportPublicBoard(
    payload: ReportPublicBoardDto,
  ): Promise<BoardActionResponse> {
    const board = await this.findBoardById(payload.id);

    if (!board.isPublic) {
      throw new BadRequestException('Only public boards can be reported.');
    }

    const supportEmail =
      process.env.KOMUNICARE_SUPPORT_EMAIL || 'info@komuni.care';
    const whistleblowerName = payload.whistleblower?.name || 'Unknown';
    const whistleblowerEmail = payload.whistleblower?.email || 'Unknown';
    const whistleblowerLanguage = payload.whistleblower?.language || 'Unknown';

    const html = `
      <h1>Public board report</h1>
      <p>A public board was reported from Komunicare.</p>
      <h2>Board</h2>
      <ul>
        <li><strong>Name:</strong> ${payload.name}</li>
        <li><strong>Author:</strong> ${payload.author}</li>
        <li><strong>Description:</strong> ${payload.description}</li>
        <li><strong>Board ID:</strong> ${payload.id}</li>
        <li><strong>Board URL:</strong> ${payload.url}</li>
        <li><strong>Stored owner email:</strong> ${board.email}</li>
      </ul>
      <h2>Report</h2>
      <p>${payload.reason}</p>
      <h2>Whistleblower</h2>
      <ul>
        <li><strong>Name:</strong> ${whistleblowerName}</li>
        <li><strong>Email:</strong> ${whistleblowerEmail}</li>
        <li><strong>Language:</strong> ${whistleblowerLanguage}</li>
      </ul>
    `;

    const result = await this.mailGateway.sendEmail(
      supportEmail,
      `[Komunicare] Reported public board: ${payload.name}`,
      html,
    );

    if ((result as any)?.error) {
      throw new InternalServerErrorException({
        message: 'Error sending board report email.',
        error:
          (result as any).error instanceof Error
            ? (result as any).error.message
            : 'Unknown error',
      });
    }

    return {
      success: 1,
      message: 'Mail sent successfully',
    };
  }

  async updateBoard(
    req: Request,
    id: string,
    payload: Record<string, any>,
  ): Promise<BoardModel> {
    const user = await this.legacyAuthService.getAuthorizedUser(req);
    const board = await this.findBoardById(id);
    const nextEmail = payload?.email || board.email;

    await this.authorizeBoardAccess(
      req,
      nextEmail,
      'You are not authorized to update this board.',
      user,
    );

    if (payload.isPublic && ['root', 'jjmlUcQs19', 'komunicare'].includes(id)) {
      throw new BadRequestException('Los tableros base oficiales no pueden ser publicados.');
    }

    Object.keys(payload || {}).forEach((key) => {
      board[key] = payload[key];
    });

    board.lastEdited = moment().format();
    await this.boardRepository.save(board);

    return board.toJSON() as BoardModel;
  }

  async deleteBoard(req: Request, id: string): Promise<BoardModel> {
    const user = await this.legacyAuthService.getAuthorizedUser(req);
    const board = await this.findBoardById(id);
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

  async cleanupDefaultCommunicatorCopies(
    req: Request,
  ): Promise<CleanupCommunicatorBoardCopiesResult> {
    const user = await this.legacyAuthService.getAuthorizedUser(req);
    const isAdmin = Boolean(user.isAdmin || user.role === 'admin');

    if (!isAdmin) {
      throw new ForbiddenException(
        'You are not authorized to cleanup communicator board copies.',
      );
    }

    return this.communicatorBoardCleanupService.cleanupCommunicatorBoardCopies();
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
