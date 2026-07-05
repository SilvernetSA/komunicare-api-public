import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import axios from 'axios';
import { Request } from 'express';
import { randomUUID } from 'crypto';

import { LegacyAuthService } from '../../common/legacy-auth.service';
import { BoardPersistenceEntity } from '../../common/models/board.persistence-model';
import { CommunicatorPersistenceEntity } from '../../common/models/communicator.persistence-model';
import { SystemCommunicatorDraftPersistenceEntity } from '../../common/models/system-communicator-draft.persistence-model';
import { AiGenerateBoardDto } from './dto/ai-generate-board.dto';
import { CreateSystemBoardDto } from './dto/create-system-board.dto';
import { CreateSystemCommunicatorDto } from './dto/create-system-communicator.dto';
import { SaveDraftDto } from './dto/save-draft.dto';
import {
  OFFICIAL_COMMUNICATOR_IDS,
  OFFICIAL_ROOT_BOARD_IDS,
  OFFICIAL_SYSTEM_BOARD_AUTHORS,
  OFFICIAL_SYSTEM_BOARD_EMAILS,
  OFFICIAL_SYSTEM_COMMUNICATORS,
} from './system-boards.constants';
import { UpdateSystemBoardDto } from './dto/update-system-board.dto';

@Injectable()
export class SystemBoardsService {
  constructor(private readonly legacyAuthService: LegacyAuthService) {}

  private normalizeBoardId(board: any): string {
    return String(board?.boardId || board?.id || board?._id || '').trim();
  }

  private async findOfficialBoardsFallback(): Promise<any[]> {
    // 1) Camino principal: documentos marcados correctamente.
    const byFlag = await BoardPersistenceEntity
      .find({ isSystemBoard: true })
      .lean()
      .exec();
    if (byFlag.length) return byFlag;

    // 2) Bases históricas: por communicator o roots canónicos.
    const byCommunicatorOrRoot = await BoardPersistenceEntity
      .find({
        $or: [
          { communicator: { $in: OFFICIAL_COMMUNICATOR_IDS } },
          { boardId: { $in: OFFICIAL_ROOT_BOARD_IDS } },
          { id: { $in: OFFICIAL_ROOT_BOARD_IDS } },
        ],
      })
      .lean()
      .exec();
    if (byCommunicatorOrRoot.length) return byCommunicatorOrRoot;

    // 3) Último fallback: tableros del sistema por email/autor.
    return BoardPersistenceEntity
      .find({
        $or: [
          { email: { $in: OFFICIAL_SYSTEM_BOARD_EMAILS } },
          { author: { $in: OFFICIAL_SYSTEM_BOARD_AUTHORS } },
        ],
      })
      .lean()
      .exec();
  }

  async getCommunicators() {
    let comms = await CommunicatorPersistenceEntity
      .find({ isSystemCommunicator: true })
      .lean()
      .exec();

    // Fallback para bases históricas donde no quedó seteado isSystemCommunicator
    if (!comms.length) {
      comms = await CommunicatorPersistenceEntity
        .find({
          $or: [
            { communicatorKey: { $in: OFFICIAL_COMMUNICATOR_IDS } },
            { rootBoard: { $in: OFFICIAL_ROOT_BOARD_IDS } },
          ],
        })
        .lean()
        .exec();
    }

    const mappedCommunicators = (comms || [])
      .map((c: any) => ({
        id: String(c.communicatorKey || c.id || '').trim(),
        name: c.name,
        rootBoard: c.rootBoard,
        boards: Array.isArray(c.boards) ? c.boards : [],
        description: c.description,
      }))
      .filter((c: any) => Boolean(c.id))
      .filter((c: any) => !['advanced', 'picSeePal'].includes(c.id));

    if (mappedCommunicators.length) {
      const rootBoardDocs = await BoardPersistenceEntity
        .find({ boardId: { $in: mappedCommunicators.map((c: any) => c.rootBoard) } })
        .lean()
        .exec();
      const captionMap = new Map<string, string>(
        rootBoardDocs.map((b: any) => [String(b.boardId), String(b.caption || '')]),
      );
      return mappedCommunicators.map((c: any) => ({
        ...c,
        caption: captionMap.get(c.rootBoard),
      }));
    }

    // Fallback defensivo:
    // si faltan los documentos "isSystemCommunicator", reconstruimos el
    // comunicador oficial desde los system boards.
    let systemBoards = await BoardPersistenceEntity
      .find({
        isSystemBoard: true,
        communicator: { $in: OFFICIAL_COMMUNICATOR_IDS },
      })
      .lean()
      .exec();

    if (!systemBoards.length) {
      systemBoards = await BoardPersistenceEntity
        .find({
          $or: [
            { communicator: { $in: OFFICIAL_COMMUNICATOR_IDS } },
            { boardId: { $in: OFFICIAL_ROOT_BOARD_IDS } },
            { id: { $in: OFFICIAL_ROOT_BOARD_IDS } },
          ],
        })
        .lean()
        .exec();
    }

    const boardsByCommunicator = new Map<string, string[]>();
    systemBoards.forEach((board: any) => {
      const communicatorId = String(board?.communicator || '').trim();
      if (!communicatorId) return;

      const boardId = String(board?.boardId || board?.id || board?._id || '').trim();
      if (!boardId) return;

      const current = boardsByCommunicator.get(communicatorId) || [];
      if (!current.includes(boardId)) {
        current.push(boardId);
      }
      boardsByCommunicator.set(communicatorId, current);
    });

    return OFFICIAL_SYSTEM_COMMUNICATORS.map((communicator) => {
      const boards = [...(boardsByCommunicator.get(communicator.id) || [])];
      if (!boards.includes(communicator.rootBoard)) {
        boards.unshift(communicator.rootBoard);
      }
      return {
        id: communicator.id,
        name: communicator.name,
        rootBoard: communicator.rootBoard,
        boards,
        description: communicator.description,
      };
    });
  }

  async getAllSystemBoards() {
    const boards = await this.findOfficialBoardsFallback();

    return boards.map((b: any) => ({
      ...b,
      id: this.normalizeBoardId(b),
      _id: undefined,
      __v: undefined,
      isSystemBoard: undefined,
    }));
  }

  async getBoardsByComm(communicator: string) {
    let boards = await BoardPersistenceEntity
      .find({ isSystemBoard: true, communicator })
      .lean()
      .exec();

    if (!boards.length) {
      boards = await BoardPersistenceEntity
        .find({ communicator })
        .lean()
        .exec();
    }

    if (!boards.length && OFFICIAL_COMMUNICATOR_IDS.includes(communicator)) {
      const allOfficialBoards = await this.findOfficialBoardsFallback();
      boards = allOfficialBoards.filter(
        (board: any) => String(board?.communicator || '').trim() === communicator,
      );
    }

    return boards;
  }

  async getBoardById(boardId: string) {
    let board = await BoardPersistenceEntity
      .findOne({ isSystemBoard: true, boardId })
      .lean()
      .exec();

    if (!board) {
      board = await BoardPersistenceEntity
        .findOne({
          $and: [
            { $or: [{ boardId }, { id: boardId }] },
            {
              $or: [
                { communicator: { $in: OFFICIAL_COMMUNICATOR_IDS } },
                { isSystemBoard: true },
                { email: { $in: OFFICIAL_SYSTEM_BOARD_EMAILS } },
              ],
            },
          ],
        })
        .lean()
        .exec();
    }
    if (!board) throw new NotFoundException(`System board not found: ${boardId}`);
    return board;
  }

  async aiGenerateBoard(req: Request, _communicator: string, dto: AiGenerateBoardDto) {
    await this.assertAdminOrTherapist(req);

    const lambdaUrl = process.env.AI_ENGINE_LAMBDA_URL;
    if (!lambdaUrl) {
      throw new InternalServerErrorException({ error: 'AI engine not configured' });
    }

    const { prompt, totalTiles = 20, language = 'es', symbolSet = 'arasaac' } = dto;

    try {
      const { data } = await axios.post(
        lambdaUrl,
        { action: 'create-board', prompt, totalTiles, language, symbolSet },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(process.env.AI_ENGINE_LAMBDA_API_KEY
              ? { 'x-api-key': process.env.AI_ENGINE_LAMBDA_API_KEY }
              : {}),
          },
          timeout: 35_000,
        },
      );
      return data.board;
    } catch (error: any) {
      const status = error?.response?.status;
      const message = error?.response?.data?.error || error?.message;
      if (status === 400) throw new BadRequestException({ error: message });
      throw new InternalServerErrorException({ error: 'AI engine error' });
    }
  }

  async createBoard(req: Request, communicator: string, dto: CreateSystemBoardDto) {
    await this.assertAdminOrTherapist(req);
    const boardId = dto.boardId || randomUUID().replace(/-/g, '').slice(0, 10);
    const existing = await BoardPersistenceEntity
      .findOne({ isSystemBoard: true, boardId })
      .lean()
      .exec();
    if (existing) throw new BadRequestException(`Board already exists: ${boardId}`);

    const doc = {
      ...dto,
      boardId,
      communicator,
      isSystemBoard: true,
      tiles: dto.tiles || [],
      lastEdited: new Date(),
      name: dto.name,
      author: 'komunicare',
      email: 'system@komuni.care',
    };

    // Use raw collection to bypass Mongoose strict schema (boardId is not in schema)
    const collection = (BoardPersistenceEntity as any).collection;
    await collection.insertOne(doc);

    await CommunicatorPersistenceEntity
      .updateOne({ communicatorKey: communicator }, { $addToSet: { boards: boardId } })
      .exec();

    return doc;
  }

  async updateBoard(req: Request, boardId: string, dto: UpdateSystemBoardDto) {
    await this.assertAdminOrTherapist(req);
    const lastEdited = new Date();
    const board = await BoardPersistenceEntity
      .findOneAndUpdate(
        { isSystemBoard: true, boardId },
        { $set: { ...dto, lastEdited } },
        { new: true },
      )
      .lean()
      .exec();
    if (!board) throw new NotFoundException(`System board not found: ${boardId}`);
    return board;
  }

  async getDraft(req: Request, communicatorId: string) {
    await this.assertAdminOrTherapist(req);
    const draft = await SystemCommunicatorDraftPersistenceEntity
      .findOne({ communicatorId, status: 'draft' })
      .lean()
      .exec();
    // Return explicit object so NestJS always serializes a valid JSON body.
    // The proxy converts { draft: null } → null on the client side.
    return draft ? draft : { draft: null };
  }

  async saveDraft(req: Request, communicatorId: string, dto: SaveDraftDto) {
    const user = await this.getAuthorizedAdminOrTherapist(req);
    const draft = await SystemCommunicatorDraftPersistenceEntity
      .findOneAndUpdate(
        { communicatorId, status: 'draft' },
        {
          $set: {
            ...(dto.boardChanges !== undefined ? { boardChanges: dto.boardChanges } : {}),
            ...(dto.newBoards !== undefined ? { newBoards: dto.newBoards } : {}),
          },
          $setOnInsert: {
            communicatorId,
            status: 'draft',
            createdBy: user.email,
          },
        },
        { upsert: true, new: true },
      )
      .lean()
      .exec();
    return draft;
  }

  async publishDraft(req: Request, communicatorId: string) {
    await this.assertAdminOrTherapist(req);
    const draft = await SystemCommunicatorDraftPersistenceEntity
      .findOne({ communicatorId, status: 'draft' })
      .lean()
      .exec() as any;

    if (!draft) throw new NotFoundException('No active draft found');

    const publishedAt = new Date();
    const boardChanges: Record<string, any> = draft.boardChanges || {};
    for (const [boardId, changes] of Object.entries(boardChanges)) {
      await BoardPersistenceEntity
        .updateOne(
          { isSystemBoard: true, boardId },
          { $set: { ...(changes as any), lastEdited: publishedAt } },
        )
        .exec();
    }

    const newBoards: any[] = draft.newBoards || [];
    const collection = (BoardPersistenceEntity as any).collection;
    for (const board of newBoards) {
      const existing = await BoardPersistenceEntity
        .findOne({ isSystemBoard: true, boardId: board.boardId })
        .lean()
        .exec();
      if (!existing) {
        await collection.insertOne({
          ...board,
          isSystemBoard: true,
          communicator: communicatorId,
          lastEdited: publishedAt,
          author: 'komunicare',
          email: 'system@komuni.care',
        });
        await CommunicatorPersistenceEntity
          .updateOne(
            { communicatorKey: communicatorId },
            { $addToSet: { boards: board.boardId } },
          )
          .exec();
      }
    }

    await SystemCommunicatorDraftPersistenceEntity
      .deleteOne({ communicatorId, status: 'draft' })
      .exec();

    return { published: true };
  }

  async discardDraft(req: Request, communicatorId: string) {
    await this.assertAdminOrTherapist(req);
    await SystemCommunicatorDraftPersistenceEntity
      .deleteOne({ communicatorId, status: 'draft' })
      .exec();
    return { discarded: true };
  }

  async createSystemCommunicator(req: Request, dto: CreateSystemCommunicatorDto) {
    await this.assertAdmin(req);
    const communicatorKey = `custom_${Date.now()}`;
    const boardCollection = (BoardPersistenceEntity as any).collection;
    await boardCollection.insertOne({
      boardId: communicatorKey,
      name: dto.name,
      communicator: communicatorKey,
      isSystemBoard: true,
      tiles: [],
      locale: 'es-ES',
    });
    const commCollection = (CommunicatorPersistenceEntity as any).collection;
    await commCollection.insertOne({
      name: dto.name,
      author: 'Komunicare',
      email: 'info@komuni.care',
      description: dto.description || '',
      rootBoard: communicatorKey,
      boards: [communicatorKey],
      isSystemCommunicator: true,
      communicatorKey,
      defaultBoardsIncluded: [],
    });
    return { id: communicatorKey, name: dto.name, rootBoard: communicatorKey, boards: [communicatorKey] };
  }

  async deleteSystemCommunicator(req: Request, communicatorKey: string) {
    await this.assertAdmin(req);
    const PROTECTED = ['komunicare', 'picSeePal'];
    if (PROTECTED.includes(communicatorKey)) {
      throw new ForbiddenException(`Cannot delete protected communicator: ${communicatorKey}`);
    }
    await CommunicatorPersistenceEntity
      .updateMany({ communicatorKey }, { $set: { isSystemCommunicator: false } })
      .exec();
    return { success: true, id: communicatorKey };
  }

  private async getAuthorizedAdminOrTherapist(req: Request): Promise<any> {
    const user = await this.legacyAuthService.getAuthorizedUser(req) as any;
    if (!user.isAdmin && user.role !== 'admin' && user.role !== 'therapist') {
      throw new ForbiddenException('Not authorized.');
    }
    return user;
  }

  private async assertAdminOrTherapist(req: Request): Promise<void> {
    await this.getAuthorizedAdminOrTherapist(req);
  }

  private async assertAdmin(req: Request): Promise<void> {
    const user = await this.legacyAuthService.getAuthorizedUser(req) as any;
    if (!user.isAdmin && user.role !== 'admin') {
      throw new ForbiddenException('Not authorized.');
    }
  }
}
