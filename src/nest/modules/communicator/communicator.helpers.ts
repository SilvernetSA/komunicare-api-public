import { Types } from 'mongoose';

import {
  OFFICIAL_ROOT_BOARD_IDS,
  OFFICIAL_SYSTEM_BOARD_AUTHORS,
  OFFICIAL_SYSTEM_BOARD_EMAILS,
} from '../system-boards/system-boards.constants';

export const OFFICIAL_ROOT_BOARD_SET = new Set<string>(OFFICIAL_ROOT_BOARD_IDS);
export const CANONICAL_OFFICIAL_BOARD_IDS = new Set(['komunicare']);
export const COMPARABLE_BOARD_KEYS_TO_OMIT = new Set(['_id', '__v']);
export const OFFICIAL_SYSTEM_BOARD_EMAIL_SET = new Set(
  OFFICIAL_SYSTEM_BOARD_EMAILS.map((email) => email.toLowerCase()),
);
export const OFFICIAL_SYSTEM_BOARD_AUTHOR_SET = new Set(
  OFFICIAL_SYSTEM_BOARD_AUTHORS.map((author) => author.toLowerCase()),
);
export const SOURCE_REFERENCE_QUERY = {
  $exists: true,
  $nin: [null, ''],
};
export const OFFICIAL_PUBLIC_COMMUNICATOR_EXCLUSIONS = [
  { isSystemCommunicator: true },
  { rootBoard: { $in: OFFICIAL_ROOT_BOARD_IDS } },
  { email: { $in: OFFICIAL_SYSTEM_BOARD_EMAILS } },
  { author: { $in: OFFICIAL_SYSTEM_BOARD_AUTHORS } },
  { copySource: SOURCE_REFERENCE_QUERY },
  { copySourceCommunicatorId: SOURCE_REFERENCE_QUERY },
  { publicSourceId: SOURCE_REFERENCE_QUERY },
];

export const normalizeOptionalString = (value: unknown): string | undefined => {
  const normalized = String(value || '').trim();
  return normalized || undefined;
};

export const hasSourceReference = (value: unknown): boolean =>
  Boolean(normalizeOptionalString(value));

export const isOfficialCommunicator = (communicator: any): boolean =>
  Boolean(
    communicator?.isSystemCommunicator ||
      normalizeOptionalString(communicator?.communicatorKey) ||
      OFFICIAL_ROOT_BOARD_SET.has(String(communicator?.rootBoard || '').trim()),
  );

export const isOfficialBoard = (board: any): boolean => {
  const boardId = normalizeOptionalString(
    board?.boardId || board?._id || board?.id,
  );
  const communicator = normalizeOptionalString(board?.communicator);
  const email = normalizeOptionalString(board?.email)?.toLowerCase();
  const author = normalizeOptionalString(board?.author)?.toLowerCase();

  return Boolean(
    board?.isSystemBoard ||
      (boardId && OFFICIAL_ROOT_BOARD_SET.has(boardId)) ||
      (communicator && OFFICIAL_ROOT_BOARD_SET.has(communicator)) ||
      (email && OFFICIAL_SYSTEM_BOARD_EMAIL_SET.has(email)) ||
      (author && OFFICIAL_SYSTEM_BOARD_AUTHOR_SET.has(author)),
  );
};

export const isPrivilegedContentActor = (user: {
  isAdmin?: boolean;
  role?: string;
}): boolean =>
  Boolean(
    user?.isAdmin ||
      user?.role === 'admin' ||
      user?.role === 'therapist' ||
      user?.role === 'capacitador',
  );

export const toObjectIdOrValue = (value: string): Types.ObjectId | string =>
  Types.ObjectId.isValid(value) ? new Types.ObjectId(value) : value;

export const normalizeComparableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeComparableValue(item));
  }

  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .filter((key) => !COMPARABLE_BOARD_KEYS_TO_OMIT.has(key))
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        const normalizedValue = normalizeComparableValue(
          (value as Record<string, unknown>)[key],
        );
        if (normalizedValue !== undefined) {
          result[key] = normalizedValue;
        }
        return result;
      }, {});
  }

  return value;
};

export const cloneComparableValue = <T>(value: T): T =>
  value === undefined ? value : JSON.parse(JSON.stringify(value));

export const remapCopiedBoardTiles = (
  tiles: unknown,
  boardIdMap: Map<string, string>,
): unknown => {
  if (!Array.isArray(tiles)) {
    return tiles;
  }

  return tiles.map((tile) => {
    if (!tile || typeof tile !== 'object') {
      return tile;
    }

    const loadBoard = normalizeOptionalString((tile as any).loadBoard);
    const mappedLoadBoard = loadBoard ? boardIdMap.get(loadBoard) : undefined;

    if (!mappedLoadBoard) {
      return tile;
    }

    return {
      ...(tile as Record<string, unknown>),
      loadBoard: mappedLoadBoard,
    };
  });
};

export const getBoardDocumentId = (board: any): string | undefined =>
  normalizeOptionalString(board?.boardId) ||
  normalizeOptionalString(board?._id) ||
  normalizeOptionalString(board?.id);

export const buildBoardReferenceQuery = (
  boardIds: string[],
): Record<string, unknown> | null => {
  const normalizedBoardIds = Array.from(
    new Set(
      boardIds
        .map((boardId) => normalizeOptionalString(boardId))
        .filter((boardId): boardId is string => Boolean(boardId)),
    ),
  );

  if (!normalizedBoardIds.length) {
    return null;
  }

  const clauses: Record<string, unknown>[] = [
    { boardId: { $in: normalizedBoardIds } },
  ];
  const objectIds = normalizedBoardIds
    .filter((boardId) => Types.ObjectId.isValid(boardId))
    .map((boardId) => new Types.ObjectId(boardId));

  if (objectIds.length) {
    clauses.unshift({ _id: { $in: objectIds } });
  }

  return clauses.length === 1 ? clauses[0] : { $or: clauses };
};

export const collectCommunicatorBoardReferences = (communicator: any): string[] => {
  const collectedBoardIds = new Set<string>();

  const boards = Array.isArray(communicator?.boards) ? communicator.boards : [];
  boards.forEach((boardId: unknown) => {
    const normalizedBoardId = normalizeOptionalString(boardId);
    if (normalizedBoardId) {
      collectedBoardIds.add(normalizedBoardId);
    }
  });

  const includedBoards = Array.isArray(communicator?.defaultBoardsIncluded)
    ? communicator.defaultBoardsIncluded
    : [];
  includedBoards.forEach((entry: any) => {
    const homeBoardId = normalizeOptionalString(entry?.homeBoard);
    if (homeBoardId) {
      collectedBoardIds.add(homeBoardId);
    }
  });

  const rootBoard = normalizeOptionalString(communicator?.rootBoard);
  if (rootBoard) {
    collectedBoardIds.add(rootBoard);
  }

  return Array.from(collectedBoardIds);
};
