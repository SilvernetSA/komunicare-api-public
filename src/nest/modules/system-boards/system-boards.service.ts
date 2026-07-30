import { Injectable } from '@nestjs/common';

import { BoardPersistenceEntity } from '../../common/models/board.persistence-model';
import { CommunicatorPersistenceEntity } from '../../common/models/communicator.persistence-model';
import {
  OFFICIAL_COMMUNICATOR_IDS,
  OFFICIAL_ROOT_BOARD_IDS,
  OFFICIAL_SYSTEM_BOARD_AUTHORS,
  OFFICIAL_SYSTEM_BOARD_EMAILS,
  OFFICIAL_SYSTEM_COMMUNICATORS,
} from './system-boards.constants';

@Injectable()
export class SystemBoardsService {
  private normalizeBoardId(board: any): string {
    return String(board?.boardId || board?.id || board?._id || '').trim();
  }

  private async findOfficialBoardsFallback(): Promise<any[]> {
    const byFlag = await BoardPersistenceEntity.find({ isSystemBoard: true })
      .lean()
      .exec();
    if (byFlag.length) return byFlag;

    const byCommunicatorOrRoot = await BoardPersistenceEntity.find({
      $or: [
        { communicator: { $in: OFFICIAL_COMMUNICATOR_IDS } },
        { boardId: { $in: OFFICIAL_ROOT_BOARD_IDS } },
        { id: { $in: OFFICIAL_ROOT_BOARD_IDS } },
      ],
    })
      .lean()
      .exec();
    if (byCommunicatorOrRoot.length) return byCommunicatorOrRoot;

    return BoardPersistenceEntity.find({
      $or: [
        { email: { $in: OFFICIAL_SYSTEM_BOARD_EMAILS } },
        { author: { $in: OFFICIAL_SYSTEM_BOARD_AUTHORS } },
      ],
    })
      .lean()
      .exec();
  }

  async getCommunicators() {
    let comms = await CommunicatorPersistenceEntity.find({
      isSystemCommunicator: true,
    })
      .lean()
      .exec();

    if (!comms.length) {
      comms = await CommunicatorPersistenceEntity.find({
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
        version: typeof c.version === 'number' ? c.version : 0,
      }))
      .filter((c: any) => Boolean(c.id))
      .filter((c: any) => !['advanced', 'picSeePal'].includes(c.id));

    if (mappedCommunicators.length) {
      const rootBoardDocs = await BoardPersistenceEntity.find({
        boardId: { $in: mappedCommunicators.map((c: any) => c.rootBoard) },
      })
        .lean()
        .exec();
      const captionMap = new Map<string, string>(
        rootBoardDocs.map((b: any) => [
          String(b.boardId),
          String(b.caption || ''),
        ]),
      );
      return mappedCommunicators.map((c: any) => ({
        ...c,
        caption: captionMap.get(c.rootBoard),
      }));
    }

    // Fallback: reconstruct from system boards
    let systemBoards = await BoardPersistenceEntity.find({
      isSystemBoard: true,
      communicator: { $in: OFFICIAL_COMMUNICATOR_IDS },
    })
      .lean()
      .exec();

    if (!systemBoards.length) {
      systemBoards = await BoardPersistenceEntity.find({
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
      const boardId = String(
        board?.boardId || board?.id || board?._id || '',
      ).trim();
      if (!boardId) return;
      const current = boardsByCommunicator.get(communicatorId) || [];
      if (!current.includes(boardId)) current.push(boardId);
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
        version: 0,
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
}
