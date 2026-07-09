import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { Types } from 'mongoose';

import { BoardPersistenceEntity } from '../../common/models/board.persistence-model';
import { CommunicatorPersistenceEntity } from '../../common/models/communicator.persistence-model';
import { normalizeCommunicatorCopySource } from '../../common/communicator-copy-source.util';
import { sanitizeDefaultBoardsIncluded } from '../../common/default-boards-included.util';
import {
  AuthorizedUser,
  LegacyAuthService,
} from '../../common/legacy-auth.service';
import { getORQuery } from '../../common/query.util';
import { BoardRepository } from '../board/board.repository';
import {
  OFFICIAL_ROOT_BOARD_IDS,
  OFFICIAL_SYSTEM_BOARD_AUTHORS,
  OFFICIAL_SYSTEM_BOARD_EMAILS,
} from '../system-boards/system-boards.constants';
import { CreateCommunicatorDto } from './dto/create-communicator.dto';
import { ListCommunicatorsByEmailDto } from './dto/list-communicators-by-email.dto';
import { UpdateCommunicatorDto } from './dto/update-communicator.dto';
import { CommunicatorRepository } from './communicator.repository';
import {
  CommunicatorModel,
  CreateCommunicatorResponse,
  PaginatedCommunicatorModelResponse,
} from './models/communicator.model';

const OFFICIAL_ROOT_BOARD_SET = new Set<string>(OFFICIAL_ROOT_BOARD_IDS);
const CANONICAL_OFFICIAL_BOARD_IDS = new Set(['komunicare']);
const OFFICIAL_SYSTEM_BOARD_EMAIL_SET = new Set(
  OFFICIAL_SYSTEM_BOARD_EMAILS.map((email) => email.toLowerCase()),
);
const OFFICIAL_SYSTEM_BOARD_AUTHOR_SET = new Set(
  OFFICIAL_SYSTEM_BOARD_AUTHORS.map((author) => author.toLowerCase()),
);
const SOURCE_REFERENCE_QUERY = {
  $exists: true,
  $nin: [null, ''],
};
const OFFICIAL_PUBLIC_COMMUNICATOR_EXCLUSIONS = [
  { isSystemCommunicator: true },
  { rootBoard: { $in: OFFICIAL_ROOT_BOARD_IDS } },
  { email: { $in: OFFICIAL_SYSTEM_BOARD_EMAILS } },
  { author: { $in: OFFICIAL_SYSTEM_BOARD_AUTHORS } },
  { copySource: SOURCE_REFERENCE_QUERY },
  { copySourceCommunicatorId: SOURCE_REFERENCE_QUERY },
  { publicSourceId: SOURCE_REFERENCE_QUERY },
];

const normalizeOptionalString = (value: unknown): string | undefined => {
  const normalized = String(value || '').trim();
  return normalized || undefined;
};

const hasSourceReference = (value: unknown): boolean =>
  Boolean(normalizeOptionalString(value));

const toObjectIdOrValue = (value: string): Types.ObjectId | string =>
  Types.ObjectId.isValid(value) ? new Types.ObjectId(value) : value;

@Injectable()
export class CommunicatorService {
  constructor(
    private readonly legacyAuthService: LegacyAuthService,
    private readonly communicatorRepository: CommunicatorRepository,
    private readonly boardRepository: BoardRepository,
  ) {}

  async listCommunicators(
    req: Request,
    query: ListCommunicatorsByEmailDto,
  ): Promise<PaginatedCommunicatorModelResponse> {
    await this.legacyAuthService.getAuthorizedUser(req);

    const search = query.search || '';
    const searchQuery: Record<string, unknown> = search.length
      ? (getORQuery(
          ['name', 'author', 'description', 'email'],
          search,
          true,
        ) as Record<string, unknown>)
      : {};

    return this.communicatorRepository.paginate(searchQuery, query as any);
  }

  async getCommunicatorsByEmail(
    req: Request,
    email: string,
    query: ListCommunicatorsByEmailDto,
  ): Promise<PaginatedCommunicatorModelResponse> {
    const user = await this.legacyAuthService.getAuthorizedUser(req);
    this.legacyAuthService.assertSameUserOrAdmin(
      user,
      email,
      "You are not authorized to get this user's communicators.",
    );

    const search = query.search || '';
    const searchQuery: Record<string, unknown> = search.length
      ? (getORQuery(
          ['name', 'author', 'description'],
          search,
          true,
        ) as Record<string, unknown>)
      : {};

    return this.communicatorRepository.paginate(
      {
        ...searchQuery,
        email,
      },
      query as any,
    );
  }

  async getPublicCommunicators(
    req: Request,
    query: ListCommunicatorsByEmailDto,
  ): Promise<PaginatedCommunicatorModelResponse> {
    await this.legacyAuthService.getAuthorizedUser(req);

    const search = query.search || '';
    const searchQuery: Record<string, unknown> = search.length
      ? (getORQuery(
          ['name', 'author', 'description'],
          search,
          true,
        ) as Record<string, unknown>)
      : {};

    return this.communicatorRepository.paginate(
      {
        ...searchQuery,
        isPublic: true,
        $nor: OFFICIAL_PUBLIC_COMMUNICATOR_EXCLUSIONS,
      },
      query as any,
    );
  }

  async getCommunicator(req: Request, id: string): Promise<CommunicatorModel> {
    const user = await this.legacyAuthService.getAuthorizedUser(req);
    const communicator = await this.findCommunicatorById(id);
    await this.authorizeCommunicatorAccess(
      req,
      communicator.email,
      'You are not authorized to get this communicator.',
      user,
    );

    return communicator.toJSON() as CommunicatorModel;
  }

  async createCommunicator(
    req: Request,
    payload: CreateCommunicatorDto,
  ): Promise<CreateCommunicatorResponse> {
    const user = await this.legacyAuthService.getAuthorizedUser(req);
    this.legacyAuthService.assertSameUserOrAdmin(
      user,
      payload.email,
      'You are not authorized to create a communicator for this user.',
    );

    const copySource = normalizeCommunicatorCopySource(payload.copySource);
    const copySourceCommunicatorId = normalizeOptionalString(
      payload.copySourceCommunicatorId,
    );
    const publicSourceId = normalizeOptionalString(payload.publicSourceId);

    if (payload.copySource && !copySource) {
      throw new BadRequestException('Invalid communicator copy source.');
    }

    this.assertCommunicatorCanBePublic(
      payload.isPublic,
      copySource,
      copySourceCommunicatorId,
      publicSourceId,
    );

    if (copySource) {
      const existingCopy = await this.communicatorRepository.findOne({
        email: payload.email,
        copySource,
      });

      if (existingCopy) {
        throw new ConflictException({
          message:
            'A personal copy for this communicator source already exists for this user.',
          existingCommunicatorId: String(existingCopy._id || existingCopy.id || ''),
          copySource,
        });
      }
    }

    if (publicSourceId) {
      const existingPublicCopy = await this.communicatorRepository.findOne({
        email: payload.email,
        publicSourceId,
      });

      if (existingPublicCopy) {
        throw new ConflictException({
          message:
            'A personal copy for this public communicator already exists for this user.',
          existingCommunicatorId: String(
            existingPublicCopy._id || existingPublicCopy.id || '',
          ),
          publicSourceId,
        });
      }
    }

    // A communicator created from scratch (not a copy of a system/public
    // communicator) must start empty. Only copies force-include the fixed
    // komunicare bundle so they keep the default board set.
    const isCommunicatorCopy = Boolean(
      copySource || copySourceCommunicatorId || publicSourceId,
    );

    const normalizedPayload = {
      ...payload,
      defaultBoardsIncluded: sanitizeDefaultBoardsIncluded(
        payload.defaultBoardsIncluded,
        { includeFixedDefaults: isCommunicatorCopy },
      ),
      publicSourceId,
      copySource,
      copySourceCommunicatorId,
    };

    const communicator = this.communicatorRepository.create(
      normalizedPayload as any,
    );
    const savedCommunicator = await this.communicatorRepository.save(communicator);
    const persistedCommunicator = savedCommunicator || communicator;
    const persistedCommunicatorId = String(
      persistedCommunicator._id || persistedCommunicator.id || '',
    );

    return {
      success: 1,
      id: persistedCommunicatorId,
      communicator: {
        id: persistedCommunicatorId,
        name: persistedCommunicator.name,
        author: persistedCommunicator.author,
        email: persistedCommunicator.email,
        description: persistedCommunicator.description,
        isPublic: persistedCommunicator.isPublic,
        publicSourceId: persistedCommunicator.publicSourceId,
        rootBoard: persistedCommunicator.rootBoard,
        boards: persistedCommunicator.boards,
        defaultBoardsIncluded: persistedCommunicator.defaultBoardsIncluded,
        copySource: persistedCommunicator.copySource,
        copySourceCommunicatorId:
          persistedCommunicator.copySourceCommunicatorId,
      },
      message: 'Communicator saved successfully',
    };
  }

  async updateCommunicator(
    req: Request,
    id: string,
    payload: UpdateCommunicatorDto,
  ): Promise<CommunicatorModel> {
    const user = await this.legacyAuthService.getAuthorizedUser(req);
    const communicator = await this.findCommunicatorById(id);

    const nextEmail = payload.email || communicator.email;
    const nextCopySource =
      payload.copySource !== undefined
        ? normalizeCommunicatorCopySource(payload.copySource)
        : communicator.copySource;
    const nextPublicSourceId =
      payload.publicSourceId !== undefined
        ? normalizeOptionalString(payload.publicSourceId)
        : normalizeOptionalString(communicator.publicSourceId);
    const nextCopySourceCommunicatorId =
      payload.copySourceCommunicatorId !== undefined
        ? normalizeOptionalString(payload.copySourceCommunicatorId)
        : normalizeOptionalString(communicator.copySourceCommunicatorId);
    const nextIsPublic =
      payload.isPublic !== undefined
        ? payload.isPublic
        : Boolean(communicator.isPublic);
    await this.authorizeCommunicatorAccess(
      req,
      nextEmail,
      'You are not authorized to update this communicator.',
      user,
    );

    if (payload.copySource !== undefined && payload.copySource && !nextCopySource) {
      throw new BadRequestException('Invalid communicator copy source.');
    }

    this.assertCommunicatorCanBePublic(
      nextIsPublic,
      nextCopySource,
      nextCopySourceCommunicatorId,
      nextPublicSourceId,
    );

    if (nextCopySource) {
      const conflictingCopy = await this.communicatorRepository.findOne({
        email: nextEmail,
        copySource: nextCopySource,
        _id: { $ne: id },
      });

      if (conflictingCopy) {
        throw new ConflictException({
          message:
            'A personal copy for this communicator source already exists for this user.',
          existingCommunicatorId: String(
            conflictingCopy._id || conflictingCopy.id || '',
          ),
          copySource: nextCopySource,
        });
      }
    }

    if (nextPublicSourceId) {
      const conflictingPublicCopy = await this.communicatorRepository.findOne({
        email: nextEmail,
        publicSourceId: nextPublicSourceId,
        _id: { $ne: id },
      });

      if (conflictingPublicCopy) {
        throw new ConflictException({
          message:
            'A personal copy for this public communicator already exists for this user.',
          existingCommunicatorId: String(
            conflictingPublicCopy._id || conflictingPublicCopy.id || '',
          ),
          publicSourceId: nextPublicSourceId,
        });
      }
    }

    const boards = payload.boards || communicator.boards;
    let rootBoard = payload.rootBoard || communicator.rootBoard;
    const isCommunicatorCopy = Boolean(nextCopySource || nextPublicSourceId);

    if (isCommunicatorCopy && !payload.rootBoard) {
      // Only auto-correct rootBoard when not explicitly provided AND it points
      // to a canonical system root. In that case prefer the first user-created
      // board (board_<timestamp>) so the copy has its own entry point.
      // System sub-boards (foodBoard, drinksBoard, …) are intentionally excluded
      // because they are not valid personal roots.
      if (OFFICIAL_ROOT_BOARD_SET.has(String(rootBoard || ''))) {
        const userBoards = (Array.isArray(boards) ? boards : [])
          .map((boardId) => String(boardId || '').trim())
          .filter((boardId) => /^board_\d+/.test(boardId));
        if (userBoards.length) {
          rootBoard = userBoards[0];
        }
      }
    }

    if (!boards.includes(rootBoard)) {
      throw new BadRequestException(
        `RootBoard '${rootBoard}' does not exist in boards: ${boards.join(', ')}`,
      );
    }

    const normalizedPayload: Record<string, unknown> = { ...payload };
    if (payload.defaultBoardsIncluded !== undefined) {
      normalizedPayload.defaultBoardsIncluded = sanitizeDefaultBoardsIncluded(
        payload.defaultBoardsIncluded,
      );
    }
    if (payload.copySource !== undefined) {
      normalizedPayload.copySource = nextCopySource;
      if (!nextCopySource) {
        normalizedPayload.copySourceCommunicatorId = undefined;
      }
    }
    if (payload.copySourceCommunicatorId !== undefined) {
      normalizedPayload.copySourceCommunicatorId = normalizeOptionalString(
        payload.copySourceCommunicatorId,
      );
    }
    if (payload.publicSourceId !== undefined) {
      normalizedPayload.publicSourceId = nextPublicSourceId;
    }
    normalizedPayload.rootBoard = rootBoard;

    if (payload.isDefault === true) {
      await CommunicatorPersistenceEntity.updateMany(
        { email: nextEmail, _id: { $ne: new Types.ObjectId(id) } },
        { $set: { isDefault: false } },
      );
    }

    Object.keys(normalizedPayload).forEach((key) => {
      communicator[key] = normalizedPayload[key];
    });

    const savedCommunicator = await this.communicatorRepository.save(communicator);

    if (!savedCommunicator) {
      throw new NotFoundException(
        `Unable to update communicator. Communicator Id: ${id}`,
      );
    }

    return savedCommunicator as CommunicatorModel;
  }

  async copyPublicCommunicator(
    req: Request,
    id: string,
  ): Promise<CreateCommunicatorResponse> {
    const user = await this.legacyAuthService.getAuthorizedUser(req);
    const sourceCommunicator = await this.findCommunicatorById(id);

    if (
      !sourceCommunicator.isPublic ||
      this.isExcludedFromPublicCommunicators(sourceCommunicator)
    ) {
      throw new BadRequestException(
        'Only original public communicators can be copied.',
      );
    }

    if (user.email === sourceCommunicator.email) {
      throw new BadRequestException(
        'You cannot copy your own public communicator.',
      );
    }

    const sourceCommunicatorId = String(
      sourceCommunicator._id || sourceCommunicator.id || id,
    ).trim();
    const existingCopy = await this.communicatorRepository.findOne({
      email: user.email,
      publicSourceId: sourceCommunicatorId,
    });

    if (existingCopy) {
      throw new ConflictException({
        message:
          'A personal copy for this public communicator already exists for this user.',
        existingCommunicatorId: String(existingCopy._id || existingCopy.id || ''),
        publicSourceId: sourceCommunicatorId,
      });
    }

    const sourceBoardIds = this.collectCopyableBoardIds(sourceCommunicator);
    if (!sourceBoardIds.length) {
      throw new BadRequestException(
        'Public communicator has no persisted boards to copy.',
      );
    }

    const sourceBoards = await (BoardPersistenceEntity as any)
      .find({
        _id: {
          $in: sourceBoardIds.map((boardId) => new Types.ObjectId(boardId)),
        },
      })
      .lean()
      .exec();
    const sourceBoardsById = new Map<string, any>(
      sourceBoards.map((board: any) => [String(board._id || ''), board]),
    );

    if (sourceBoardIds.some((boardId) => !sourceBoardsById.has(boardId))) {
      throw new NotFoundException(
        'Public communicator has missing boards and cannot be copied.',
      );
    }

    const copiedBoardIds: string[] = [];
    const boardIdMap = new Map<string, string>();

    try {
      for (const sourceBoardId of sourceBoardIds) {
        const sourceBoard = sourceBoardsById.get(sourceBoardId);
        const boardCopy = this.boardRepository.create({
          name: sourceBoard.name,
          author: user.name || sourceBoard.author,
          email: user.email,
          isPublic: false,
          publicSourceId: sourceBoard.isPublic ? sourceBoardId : undefined,
          tiles: sourceBoard.tiles,
          cellSize: sourceBoard.cellSize,
          locale: sourceBoard.locale,
          caption: sourceBoard.caption,
          format: sourceBoard.format,
          description: sourceBoard.description,
          isFixed: sourceBoard.isFixed,
          grid: sourceBoard.grid,
        });
        const savedBoard = await this.boardRepository.save(boardCopy);
        const copiedBoardId = String(
          savedBoard._id || savedBoard.id || boardCopy._id || boardCopy.id || '',
        ).trim();

        if (!copiedBoardId) {
          throw new InternalServerErrorException(
            'Could not persist copied communicator boards.',
          );
        }

        copiedBoardIds.push(copiedBoardId);
        boardIdMap.set(sourceBoardId, copiedBoardId);
      }

      const originalBoards = Array.isArray(sourceCommunicator.boards)
        ? sourceCommunicator.boards
            .map((boardId: unknown) => String(boardId || '').trim())
            .filter(Boolean)
        : [];
      const mappedBoards = Array.from(
        new Set([...originalBoards, ...sourceBoardIds]),
      )
        .map((boardId) => boardIdMap.get(boardId))
        .filter((boardId): boardId is string => Boolean(boardId));
      const mappedRootBoard = boardIdMap.get(
        String(sourceCommunicator.rootBoard || '').trim(),
      );

      if (!mappedRootBoard) {
        throw new BadRequestException(
          'Public communicator root board could not be mapped to the copied boards.',
        );
      }

      return this.createCommunicator(req, {
        name: sourceCommunicator.name,
        author: user.name || sourceCommunicator.author,
        email: user.email,
        description: sourceCommunicator.description,
        caption: sourceCommunicator.caption,
        isPublic: false,
        publicSourceId: sourceCommunicatorId,
        rootBoard: mappedRootBoard,
        boards: mappedBoards,
        defaultBoardsIncluded: this.mapDefaultBoardsIncludedForCopy(
          sourceCommunicator.defaultBoardsIncluded,
          boardIdMap,
        ) as any,
      });
    } catch (error) {
      if (copiedBoardIds.length) {
        await (BoardPersistenceEntity as any)
          .deleteMany({
            _id: { $in: copiedBoardIds.map(toObjectIdOrValue) },
            email: user.email,
          })
          .exec();
      }

      throw error;
    }
  }

  async deleteCommunicator(
    req: Request,
    id: string,
  ): Promise<CommunicatorModel> {
    const user = await this.legacyAuthService.getAuthorizedUser(req);
    const communicator = await this.findCommunicatorById(id);
    await this.authorizeCommunicatorAccess(
      req,
      communicator.email,
      'You are not authorized to delete this communicator.',
      user,
    );

    const communicatorId = String(communicator?._id || communicator?.id || id).trim();
    const communicatorEmail = String(communicator?.email || '').trim();
    const rawBoards = Array.isArray(communicator?.boards) ? communicator.boards : [];
    const rootBoard = String(communicator?.rootBoard || '').trim();
    const candidateBoardIds = new Set<string>();

    rawBoards.forEach((candidate: unknown) => {
      const boardId = String(candidate || '').trim();
      if (boardId && !CANONICAL_OFFICIAL_BOARD_IDS.has(boardId)) {
        candidateBoardIds.add(boardId);
      }
    });

    if (rootBoard && !CANONICAL_OFFICIAL_BOARD_IDS.has(rootBoard)) {
      candidateBoardIds.add(rootBoard);
    }

    await this.communicatorRepository.deleteById(id);

    const boardIdsToEvaluate = Array.from(candidateBoardIds);
    if (boardIdsToEvaluate.length && communicatorEmail) {
      const boardIdsStillReferenced = new Set<string>();
      const stillReferencedCommunicators = await (CommunicatorPersistenceEntity as any)
        .find({
          email: communicatorEmail,
          _id: { $ne: communicatorId },
          $or: [
            { boards: { $in: boardIdsToEvaluate } },
            { rootBoard: { $in: boardIdsToEvaluate } },
            { 'defaultBoardsIncluded.homeBoard': { $in: boardIdsToEvaluate } },
          ],
        })
        .select('boards rootBoard defaultBoardsIncluded')
        .lean()
        .exec();

      stillReferencedCommunicators.forEach((item: any) => {
        const boards = Array.isArray(item?.boards) ? item.boards : [];
        boards.forEach((candidate: unknown) => {
          const boardId = String(candidate || '').trim();
          if (boardId) {
            boardIdsStillReferenced.add(boardId);
          }
        });

        const itemRootBoard = String(item?.rootBoard || '').trim();
        if (itemRootBoard) {
          boardIdsStillReferenced.add(itemRootBoard);
        }

        const included = Array.isArray(item?.defaultBoardsIncluded)
          ? item.defaultBoardsIncluded
          : [];
        included.forEach((entry: any) => {
          const homeBoard = String(entry?.homeBoard || '').trim();
          if (homeBoard) {
            boardIdsStillReferenced.add(homeBoard);
          }
        });
      });

      const boardIdsSafeToDelete = boardIdsToEvaluate.filter(
        (boardId) => !boardIdsStillReferenced.has(boardId),
      );

      // Filter to only valid MongoDB ObjectIds — shortids in the boards array
      // would cause a Mongoose CastError when matched against Board._id (ObjectId field),
      // resulting in a 400 response. Boards that were never persisted to the API
      // retain their shortid and can be safely skipped here since they don't exist
      // in the database anyway.
      const validBoardIds = boardIdsSafeToDelete.filter((boardId) =>
        Types.ObjectId.isValid(boardId),
      );

      if (validBoardIds.length) {
        await (BoardPersistenceEntity as any)
          .deleteMany({
            _id: { $in: validBoardIds },
            email: communicatorEmail,
          })
          .exec();
      }
    }

    return communicator.toJSON() as CommunicatorModel;
  }

  private async authorizeCommunicatorAccess(
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

  private async findCommunicatorById(id: string): Promise<any> {
    const communicator = await this.communicatorRepository.findById(id);

    if (!communicator) {
      throw new NotFoundException(
        `Communicator does not exist. Communicator ID: ${id}`,
      );
    }

    return communicator;
  }

  private assertCommunicatorCanBePublic(
    isPublic: boolean | undefined,
    copySource: string | undefined,
    copySourceCommunicatorId: string | undefined,
    publicSourceId: string | undefined,
  ): void {
    if (isPublic && (copySource || copySourceCommunicatorId || publicSourceId)) {
      throw new BadRequestException(
        'Only original communicators can be published.',
      );
    }
  }

  private collectCopyableBoardIds(communicator: any): string[] {
    const collectedBoardIds = new Set<string>();

    const boards = Array.isArray(communicator?.boards) ? communicator.boards : [];
    boards.forEach((boardId: unknown) => {
      const normalizedBoardId = String(boardId || '').trim();
      if (Types.ObjectId.isValid(normalizedBoardId)) {
        collectedBoardIds.add(normalizedBoardId);
      }
    });

    const includedBoards = Array.isArray(communicator?.defaultBoardsIncluded)
      ? communicator.defaultBoardsIncluded
      : [];
    includedBoards.forEach((entry: any) => {
      const homeBoardId = String(entry?.homeBoard || '').trim();
      if (Types.ObjectId.isValid(homeBoardId)) {
        collectedBoardIds.add(homeBoardId);
      }
    });

    const rootBoard = String(communicator?.rootBoard || '').trim();
    if (Types.ObjectId.isValid(rootBoard)) {
      collectedBoardIds.add(rootBoard);
    }

    return Array.from(collectedBoardIds);
  }

  private mapDefaultBoardsIncludedForCopy(
    defaultBoardsIncluded: unknown,
    boardIdMap: Map<string, string>,
  ): Record<string, unknown>[] {
    const sourceDefaultBoards = Array.isArray(defaultBoardsIncluded)
      ? defaultBoardsIncluded
      : [];

    return sourceDefaultBoards
      .filter(
        (entry): entry is Record<string, unknown> =>
          Boolean(entry) && typeof entry === 'object',
      )
      .map((entry) => {
        const homeBoard = normalizeOptionalString(entry.homeBoard);
        return {
          ...entry,
          ...(homeBoard && boardIdMap.has(homeBoard)
            ? { homeBoard: boardIdMap.get(homeBoard) }
            : {}),
        };
      });
  }

  private isExcludedFromPublicCommunicators(communicator: any): boolean {
    const email = String(communicator?.email || '').trim().toLowerCase();
    const author = String(communicator?.author || '').trim().toLowerCase();
    const rootBoard = String(communicator?.rootBoard || '').trim();

    return (
      Boolean(communicator?.isSystemCommunicator) ||
      OFFICIAL_ROOT_BOARD_SET.has(rootBoard) ||
      OFFICIAL_SYSTEM_BOARD_EMAIL_SET.has(email) ||
      OFFICIAL_SYSTEM_BOARD_AUTHOR_SET.has(author) ||
      hasSourceReference(communicator?.copySource) ||
      hasSourceReference(communicator?.copySourceCommunicatorId) ||
      hasSourceReference(communicator?.publicSourceId)
    );
  }
}
