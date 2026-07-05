const FIXED_DEFAULT_BOARDS: Record<string, string> = {
  komunicare: 'komunicare',
};

// Canonical (system) homeBoard values — when a user-provided homeBoard matches
// one of these, the entry is treated as a system default and is NOT considered
// a user-defined custom homeBoard.
const CANONICAL_HOME_BOARDS = new Set(Object.values(FIXED_DEFAULT_BOARDS));

const CUSTOM_DEFAULT_BOARD_NAME = 'custom';

interface DefaultBoardIncludedLike extends Record<string, unknown> {
  nameOnJSON: string;
  homeBoard: string;
}

/**
 * Sanitizes `defaultBoardsIncluded` for storage and serialization.
 *
 * Fixed entries (currently only komunicare) are always present.
 * When the caller provides a non-canonical homeBoard for a fixed entry (i.e.
 * the user has pointed the bundle at their own copied board) that value is
 * preserved. The canonical default is only used as a fallback when no
 * user-provided value exists.
 *
 * Any extra entry whose `nameOnJSON === 'custom'` is appended as-is.
 */
export const sanitizeDefaultBoardsIncluded = (
  defaultBoardsIncluded: unknown,
): DefaultBoardIncludedLike[] => {
  const inputArray = Array.isArray(defaultBoardsIncluded)
    ? defaultBoardsIncluded
    : [];

  // Build a lookup of user-provided entries keyed by nameOnJSON.
  const userEntries = new Map<string, string>();
  for (const entry of inputArray) {
    if (
      Boolean(entry) &&
      typeof entry === 'object' &&
      'nameOnJSON' in entry &&
      'homeBoard' in entry &&
      typeof (entry as Record<string, unknown>).nameOnJSON === 'string' &&
      typeof (entry as Record<string, unknown>).homeBoard === 'string'
    ) {
      const nameOnJSON = String(
        (entry as Record<string, unknown>).nameOnJSON,
      ).trim();
      const homeBoard = String(
        (entry as Record<string, unknown>).homeBoard,
      ).trim();
      if (nameOnJSON && homeBoard) {
        userEntries.set(nameOnJSON, homeBoard);
      }
    }
  }

  // Build the fixed entries, keeping user-provided non-canonical homeBoards.
  const fixedEntries = Object.entries(FIXED_DEFAULT_BOARDS).map(
    ([nameOnJSON, canonicalHomeBoard]) => {
      const userHomeBoard = userEntries.get(nameOnJSON);
      const homeBoard =
        userHomeBoard && !CANONICAL_HOME_BOARDS.has(userHomeBoard)
          ? userHomeBoard
          : canonicalHomeBoard;
      return { nameOnJSON, homeBoard };
    },
  );

  // Append at most one 'custom' entry if present.
  const customEntry = inputArray
    .filter(
      (
        entry,
      ): entry is {
        nameOnJSON: string;
        homeBoard: string;
      } =>
        Boolean(entry) &&
        typeof entry === 'object' &&
        'nameOnJSON' in entry &&
        'homeBoard' in entry &&
        (entry as Record<string, unknown>).nameOnJSON ===
          CUSTOM_DEFAULT_BOARD_NAME &&
        typeof (entry as Record<string, unknown>).homeBoard === 'string' &&
        Boolean((entry as Record<string, unknown>).homeBoard),
    )
    .slice(-1)
    .map(({ nameOnJSON, homeBoard }) => ({
      nameOnJSON,
      homeBoard,
    }));

  return [...fixedEntries, ...customEntry];
};
