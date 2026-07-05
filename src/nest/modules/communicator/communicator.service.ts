import {
  BadRequestException,
  ConflictException,
  Injectable,
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
import { OFFICIAL_ROOT_BOARD_IDS } from '../system-boards/system-boards.constants';
import { CreateCommunicatorDto } from './dto/create-communicator.dto';
import { ListCommunicatorsByEmailDto } from './dto/list-communicators-by-email.dto';
import { UpdateCommunicatorDto } from './dto/update-communicator.dto';
import { CommunicatorRepository } from './communicator.repository';
import {
  CommunicatorModel,
  CreateCommunicatorResponse,
  PaginatedCommunicatorModelResponse,
} from './models/communicator.model';

const OFFICIAL_ROOT_BOARD_ORDER = [...OFFICIAL_ROOT_BOARD_IDS] as const;
const OFFICIAL_ROOT_BOARD_SET = new Set<string>(OFFICIAL_ROOT_BOARD_ORDER);
const OFFICIAL_DEFAULT_BOARDS_INCLUDED = JSON.stringify(
  sanitizeDefaultBoardsIncluded([]),
);
const CANONICAL_OFFICIAL_BOARD_IDS = new Set(['komunicare']);

@Injectable()
export class CommunicatorService {
  constructor(
    private readonly legacyAuthService: LegacyAuthService,
    private readonly communicatorRepository: CommunicatorRepository,
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

    const communicators = await this.communicatorRepository.paginate(
      {
        ...searchQuery,
        email,
        copySource: { $exists: true, $nin: [null, ''] },
      },
      query as any,
    );

    if (communicators.total || communicators.data.length) {
      return communicators;
    }

    return this.buildOfficialCommunicatorsFallback(query);
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
      "You are not authorized to create a communicator for this user.",
    );

    const copySource = normalizeCommunicatorCopySource(payload.copySource);
    const copySourceCommunicatorId = payload.copySourceCommunicatorId
      ? String(payload.copySourceCommunicatorId).trim()
      : undefined;

    if (payload.copySource && !copySource) {
      throw new BadRequestException('Invalid communicator copy source.');
    }

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

    const normalizedPayload = {
      ...payload,
      defaultBoardsIncluded: sanitizeDefaultBoardsIncluded(
        payload.defaultBoardsIncluded,
      ),
      copySource,
      copySourceCommunicatorId: copySourceCommunicatorId || undefined,
    };

    const communicator = this.communicatorRepository.create(
      normalizedPayload as any,
    );
    const savedCommunicator = await this.communicatorRepository.save(communicator);
    const persistedCommunicator = savedCommunicator || communicator;

    return {
      success: 1,
      id: String(persistedCommunicator._id),
      communicator: {
        id: String(persistedCommunicator._id),
        name: persistedCommunicator.name,
        author: persistedCommunicator.author,
        email: persistedCommunicator.email,
        description: persistedCommunicator.description,
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
    await this.authorizeCommunicatorAccess(
      req,
      nextEmail,
      'You are not authorized to update this communicator.',
      user,
    );

    if (payload.copySource !== undefined && payload.copySource && !nextCopySource) {
      throw new BadRequestException('Invalid communicator copy source.');
    }

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

    const boards = payload.boards || communicator.boards;
    let rootBoard = payload.rootBoard || communicator.rootBoard;
    const isCommunicatorCopy = Boolean(nextCopySource);

    if (isCommunicatorCopy) {
      const nonCanonicalBoards = (Array.isArray(boards) ? boards : [])
        .map((boardId) => String(boardId || '').trim())
        .filter(
          (boardId) =>
            Boolean(boardId) && !OFFICIAL_ROOT_BOARD_SET.has(boardId),
        );

      if (OFFICIAL_ROOT_BOARD_SET.has(String(rootBoard || ''))) {
        if (nonCanonicalBoards.length) {
          rootBoard = nonCanonicalBoards[0];
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
      normalizedPayload.copySourceCommunicatorId =
        payload.copySourceCommunicatorId &&
        String(payload.copySourceCommunicatorId).trim()
          ? String(payload.copySourceCommunicatorId).trim()
          : undefined;
    }
    normalizedPayload.rootBoard = rootBoard;

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

  private async buildOfficialCommunicatorsFallback(
    query: ListCommunicatorsByEmailDto,
  ): Promise<PaginatedCommunicatorModelResponse> {
    const allCommunicators = await this.communicatorRepository.findAll();
    const officialCommunicatorsByRoot = new Map<string, any>();

    allCommunicators.forEach((communicator) => {
      if (!this.isOfficialCommunicatorCandidate(communicator)) {
        return;
      }

      const current = officialCommunicatorsByRoot.get(communicator.rootBoard);
      if (!current) {
        officialCommunicatorsByRoot.set(communicator.rootBoard, communicator);
        return;
      }

      if (
        this.getOfficialCommunicatorPriority(communicator) >
        this.getOfficialCommunicatorPriority(current)
      ) {
        officialCommunicatorsByRoot.set(communicator.rootBoard, communicator);
      }
    });

    const orderedOfficialCommunicators = OFFICIAL_ROOT_BOARD_ORDER.map(
      (rootBoard) => officialCommunicatorsByRoot.get(rootBoard),
    ).filter(Boolean);

    const normalizedSearch = (query.search || '').trim().toLowerCase();
    const filteredCommunicators = normalizedSearch.length
      ? orderedOfficialCommunicators.filter((communicator) =>
          [communicator.name, communicator.author, communicator.description]
            .filter((value) => typeof value === 'string')
            .some((value: string) =>
              value.toLowerCase().includes(normalizedSearch),
            ),
        )
      : orderedOfficialCommunicators;

    const page = Number(query.page) > 0 ? Number(query.page) : 1;
    const limit = Number(query.limit) > 0 ? Number(query.limit) : 10;
    const offset = Number(query.offset) >= 0 ? Number(query.offset) : 0;
    const skip = (page - 1) * limit + offset;
    const data = filteredCommunicators
      .slice(skip, skip + limit)
      .map((communicator) => communicator.toJSON() as CommunicatorModel);

    return {
      total: filteredCommunicators.length,
      page,
      limit,
      offset,
      sort: query.sort || '-_id',
      search: query.search || '',
      data,
    };
  }

  private isOfficialCommunicatorCandidate(communicator: any): boolean {
    if (!communicator || typeof communicator !== 'object') {
      return false;
    }

    if (communicator.copySource) {
      return false;
    }

    if (!OFFICIAL_ROOT_BOARD_SET.has(communicator.rootBoard)) {
      return false;
    }

    const boards = Array.isArray(communicator.boards) ? communicator.boards : [];
    const hasCanonicalBoards = boards.includes(communicator.rootBoard);

    if (!hasCanonicalBoards) {
      return false;
    }

    return (
      JSON.stringify(
        sanitizeDefaultBoardsIncluded(communicator.defaultBoardsIncluded),
      ) === OFFICIAL_DEFAULT_BOARDS_INCLUDED
    );
  }

  private getOfficialCommunicatorPriority(communicator: any): number {
    let priority = 0;
    const name = `${communicator?.name || ''}`.toLowerCase();
    const description = `${communicator?.description || ''}`.toLowerCase();
    const email = `${communicator?.email || ''}`.toLowerCase();

    if (!description.includes('copy')) {
      priority += 4;
    }

    if (name.includes('komunicare')) {
      priority += 2;
    }

    if (email.endsWith('@komuni.care')) {
      priority += 1;
    }

    return priority;
  }
}
