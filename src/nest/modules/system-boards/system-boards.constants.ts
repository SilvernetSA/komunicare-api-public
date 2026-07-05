export const OFFICIAL_SYSTEM_COMMUNICATORS: Array<{
  id: string;
  name: string;
  description: string;
  rootBoard: string;
}> = [
  {
    id: 'komunicare',
    name: 'Komunicare',
    description: 'Comunicador oficial de Komunicare',
    rootBoard: 'komunicare',
  },
];

export const OFFICIAL_COMMUNICATOR_IDS = OFFICIAL_SYSTEM_COMMUNICATORS.map(
  (item) => item.id,
);

export const OFFICIAL_ROOT_BOARD_IDS = OFFICIAL_SYSTEM_COMMUNICATORS.map(
  (item) => item.rootBoard,
);

export const OFFICIAL_SYSTEM_BOARD_EMAILS = [
  'system@komuni.care',
  'info@komuni.care',
];

export const OFFICIAL_SYSTEM_BOARD_AUTHORS = [
  'Komunicare',
  'Komunicare Team',
  'komunicare',
  'komunicare team',
];
