import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ClientSession, Types } from 'mongoose';

import { BoardPersistenceEntity } from '../../../common/models/board.persistence-model';
import { BoardRepository } from '../../board/board.repository';
import {
  buildBoardReferenceQuery,
  cloneComparableValue,
  collectCommunicatorBoardReferences,
  getBoardDocumentId,
  normalizeOptionalString,
  remapCopiedBoardTiles,
} from '../communicator.helpers';

@Injectable()
export class CommunicatorBoardService {
  constructor(private readonly boardRepository: BoardRepository) {}

  async findBoardsByReference(
    boardIds: string[],
    options?: { email?: string },
  ): Promise<any[]> {
    const boardReferenceQuery = buildBoardReferenceQuery(boardIds);

    if (!boardReferenceQuery) {
      return [];
    }

    const query = options?.email
      ? { email: options.email, ...boardReferenceQuery }
      : boardReferenceQuery;

    return (BoardPersistenceEntity as any).find(query).lean().exec();
  }

  async findUserBoardsForOfficialCopy(
    userCommunicator: any,
    session?: ClientSession,
  ): Promise<any[]> {
    const email = normalizeOptionalString(userCommunicator?.email);
    if (!email) {
      return [];
    }

    const currentBoardIds = collectCommunicatorBoardReferences(userCommunicator);
    const boardReferenceQuery = buildBoardReferenceQuery(currentBoardIds);

    if (!boardReferenceQuery) {
      return [];
    }

    const query = { email, ...boardReferenceQuery };
    const request = (BoardPersistenceEntity as any).find(query);

    if (session) {
      request.session(session);
    }

    return request.lean().exec();
  }

  async ensureLocalOfficialBoards({
    sourceBoardIds,
    officialBoardsById,
    ownerEmail,
    ownerName,
    session,
    existingSourceToLocalBoardIdMap,
    preservePublicBoardSourceIds = false,
  }: {
    sourceBoardIds: string[];
    officialBoardsById: Map<string, any>;
    ownerEmail: string;
    ownerName?: string;
    session: ClientSession;
    existingSourceToLocalBoardIdMap?: Map<string, string>;
    preservePublicBoardSourceIds?: boolean;
  }): Promise<Map<string, string>> {
    const normalizedSourceBoardIds = Array.from(
      new Set(
        sourceBoardIds
          .map((boardId) => normalizeOptionalString(boardId))
          .filter((boardId): boardId is string => Boolean(boardId)),
      ),
    );
    const boardIdMap = new Map(existingSourceToLocalBoardIdMap || []);

    normalizedSourceBoardIds.forEach((sourceBoardId) => {
      if (!officialBoardsById.has(sourceBoardId)) {
        throw new NotFoundException(
          `Official board not found. Board ID: ${sourceBoardId}`,
        );
      }

      if (!boardIdMap.has(sourceBoardId)) {
        boardIdMap.set(sourceBoardId, new Types.ObjectId().toHexString());
      }
    });

    for (const sourceBoardId of normalizedSourceBoardIds) {
      const localBoardId = boardIdMap.get(sourceBoardId);
      const isExistingLocalBoard = Boolean(
        existingSourceToLocalBoardIdMap?.has(sourceBoardId),
      );

      if (!localBoardId || isExistingLocalBoard) {
        continue;
      }

      const sourceBoard = officialBoardsById.get(sourceBoardId);
      const boardCopy = this.boardRepository.create({
        _id: localBoardId,
        name: sourceBoard.name,
        author: ownerName || sourceBoard.author,
        email: ownerEmail,
        isPublic: false,
        publicSourceId:
          preservePublicBoardSourceIds && sourceBoard.isPublic
            ? sourceBoardId
            : undefined,
        sourceBoardId,
        tiles: remapCopiedBoardTiles(cloneComparableValue(sourceBoard.tiles), boardIdMap),
        cellSize: sourceBoard.cellSize,
        locale: sourceBoard.locale,
        caption: sourceBoard.caption,
        format: sourceBoard.format,
        description: sourceBoard.description,
        isFixed: sourceBoard.isFixed,
        grid: cloneComparableValue(sourceBoard.grid),
      });
      const savedBoard = await this.boardRepository.save(boardCopy, session);
      const persistedBoardId =
        getBoardDocumentId(savedBoard) || getBoardDocumentId(boardCopy);

      if (!persistedBoardId) {
        throw new InternalServerErrorException(
          'Could not persist copied communicator boards.',
        );
      }

      if (persistedBoardId !== localBoardId) {
        throw new InternalServerErrorException(
          'Could not preserve copied communicator board ids.',
        );
      }
    }

    return boardIdMap;
  }
}
