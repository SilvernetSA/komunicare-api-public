import { Injectable } from '@nestjs/common';

import { AccountPersistenceService } from './account-persistence.service';
import { sanitizeDefaultBoardsIncluded } from './default-boards-included.util';

const DEFAULT_BUNDLE_HOME_IDS: Record<string, string> = {
  advanced: 'root',
  picSeePal: 'jjmlUcQs19',
  komunicare: 'komunicare',
};

const CANONICAL_COMMUNICATOR_BOARD_IDS = [
  DEFAULT_BUNDLE_HOME_IDS.advanced,
  DEFAULT_BUNDLE_HOME_IDS.picSeePal,
  DEFAULT_BUNDLE_HOME_IDS.komunicare,
];

const CANONICAL_BOARD_ID_SET = new Set(CANONICAL_COMMUNICATOR_BOARD_IDS);
const DEFAULT_BUNDLE_NAMES = Object.keys(DEFAULT_BUNDLE_HOME_IDS);

type CommunicatorLike = Record<string, any>;

@Injectable()
export class CommunicatorBoardCleanupService {
  constructor(
    private readonly accountPersistenceService: AccountPersistenceService,
  ) {}

  async cleanupCommunicatorBoardCopies(): Promise<CleanupCommunicatorBoardCopiesResult> {
    const communicators = await this.accountPersistenceService.findAllCommunicators();
    const removableBoardIds = new Set<string>();

    let cleanedCommunicators = 0;
    let updatedCommunicators = 0;

    for (const communicator of communicators) {
      const currentIncluded = communicator.defaultBoardsIncluded;
      if (!hasDefaultBundles(currentIncluded)) {
        continue;
      }

      cleanedCommunicators += 1;
      collectRemovableBoardIds(communicator).forEach((boardId: string) => {
        removableBoardIds.add(boardId);
      });

      const nextBoards = [...CANONICAL_COMMUNICATOR_BOARD_IDS];
      const nextRootBoard = resolveCanonicalRootBoard(communicator);
      const nextDefaultBoardsIncluded = sanitizeDefaultBoardsIncluded(
        currentIncluded,
      );

      const boardsChanged =
        JSON.stringify(communicator.boards || []) !== JSON.stringify(nextBoards);
      const includedChanged =
        JSON.stringify(communicator.defaultBoardsIncluded || []) !==
        JSON.stringify(nextDefaultBoardsIncluded);
      const rootChanged = communicator.rootBoard !== nextRootBoard;

      if (!boardsChanged && !includedChanged && !rootChanged) {
        continue;
      }

      communicator.boards = nextBoards;
      communicator.rootBoard = nextRootBoard;
      communicator.defaultBoardsIncluded = nextDefaultBoardsIncluded;
      await this.accountPersistenceService.saveCommunicator(communicator);
      updatedCommunicators += 1;
    }

    const removableFixedBoardIds =
      await this.accountPersistenceService.findFixedBoardIds();
    removableFixedBoardIds.forEach((boardId: string) => {
      if (!CANONICAL_BOARD_ID_SET.has(boardId)) {
        removableBoardIds.add(boardId);
      }
    });

    const boardIdsToDelete = Array.from(removableBoardIds);
    const deletedBoards = await this.accountPersistenceService.deleteBoardsByIds(
      boardIdsToDelete,
    );

    return {
      scannedCommunicators: communicators.length,
      cleanedCommunicators,
      updatedCommunicators,
      deletedBoards,
      targetedBoardIds: boardIdsToDelete.length,
    };
  }
}

export interface CleanupCommunicatorBoardCopiesResult {
  scannedCommunicators: number;
  cleanedCommunicators: number;
  updatedCommunicators: number;
  deletedBoards: number;
  targetedBoardIds: number;
}

const isCanonicalBoardId = (boardId: unknown): boardId is string => {
  return typeof boardId === 'string' && CANONICAL_BOARD_ID_SET.has(boardId);
};

const hasDefaultBundles = (defaultBoardsIncluded: unknown): boolean => {
  if (!Array.isArray(defaultBoardsIncluded) || !defaultBoardsIncluded.length) {
    return false;
  }

  const names = new Set(
    defaultBoardsIncluded.map((entry) =>
      typeof (entry as Record<string, unknown>)?.nameOnJSON === 'string'
        ? ((entry as Record<string, unknown>).nameOnJSON as string)
        : '',
    ),
  );

  return DEFAULT_BUNDLE_NAMES.every((name) => names.has(name));
};

const resolveCanonicalRootBoard = (communicator: CommunicatorLike): string => {
  if (isCanonicalBoardId(communicator.rootBoard)) {
    return communicator.rootBoard;
  }

  const rawIncluded = Array.isArray(communicator.defaultBoardsIncluded)
    ? communicator.defaultBoardsIncluded
    : [];

  const matchingDefaultEntry = rawIncluded.find((entry) => {
    if (!entry || typeof entry !== 'object') {
      return false;
    }

    const nameOnJSON = (entry as Record<string, unknown>).nameOnJSON;
    const homeBoard = (entry as Record<string, unknown>).homeBoard;

    return (
      typeof nameOnJSON === 'string' &&
      typeof homeBoard === 'string' &&
      DEFAULT_BUNDLE_HOME_IDS[nameOnJSON] &&
      homeBoard === communicator.rootBoard
    );
  }) as Record<string, unknown> | undefined;

  if (matchingDefaultEntry?.nameOnJSON) {
    return DEFAULT_BUNDLE_HOME_IDS[matchingDefaultEntry.nameOnJSON as string];
  }

  const currentBoards = Array.isArray(communicator.boards) ? communicator.boards : [];
  const firstCanonicalBoard = currentBoards.find((boardId: unknown) =>
    isCanonicalBoardId(boardId),
  );

  return firstCanonicalBoard || DEFAULT_BUNDLE_HOME_IDS.advanced;
};

const collectRemovableBoardIds = (communicator: CommunicatorLike): string[] => {
  const removableIds = new Set<string>();

  if (
    typeof communicator.rootBoard === 'string' &&
    !CANONICAL_BOARD_ID_SET.has(communicator.rootBoard)
  ) {
    removableIds.add(communicator.rootBoard);
  }

  const currentBoards = Array.isArray(communicator.boards) ? communicator.boards : [];
  currentBoards.forEach((boardId: unknown) => {
    if (typeof boardId === 'string' && !CANONICAL_BOARD_ID_SET.has(boardId)) {
      removableIds.add(boardId);
    }
  });

  const currentIncluded = Array.isArray(communicator.defaultBoardsIncluded)
    ? communicator.defaultBoardsIncluded
    : [];
  currentIncluded.forEach((entry: unknown) => {
    if (!entry || typeof entry !== 'object') {
      return;
    }

    const homeBoard = (entry as Record<string, unknown>).homeBoard;
    if (typeof homeBoard === 'string' && !CANONICAL_BOARD_ID_SET.has(homeBoard)) {
      removableIds.add(homeBoard);
    }
  });

  return Array.from(removableIds);
};
