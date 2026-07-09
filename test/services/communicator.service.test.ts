import test from 'node:test';
import assert from 'node:assert/strict';

import { BoardPersistenceEntity } from '../../src/nest/common/models/board.persistence-model';
import { CommunicatorService } from '../../src/nest/modules/communicator/communicator.service';

const createLegacyAuthService = () => ({
  async getAuthorizedUser() {
    return {
      email: 'damianclluch@gmail.com',
      isAdmin: false,
    };
  },
  assertSameUserOrAdmin() {},
});

test('CommunicatorService.getCommunicatorsByEmail returns only repository data when the user has no communicators', async () => {
  const communicatorRepository = {
    async paginate() {
      return {
        total: 0,
        page: 1,
        limit: 100,
        offset: 0,
        sort: '-_id',
        search: '',
        data: [],
      };
    },
    async findAll() {
      throw new Error('findAll should not run for byemail fallback anymore');
    },
  };

  const service = new CommunicatorService(
    createLegacyAuthService() as any,
    communicatorRepository as any,
    {} as any,
  );

  const result = await service.getCommunicatorsByEmail(
    {} as any,
    'damianclluch@gmail.com',
    { page: 1, limit: 100, offset: 0, sort: '-_id', search: '' },
  );

  assert.deepEqual(result, {
    total: 0,
    page: 1,
    limit: 100,
    offset: 0,
    sort: '-_id',
    search: '',
    data: [],
  });
});

test('CommunicatorService.getPublicCommunicators keeps search support and excludes official or copied communicators', async () => {
  const paginateCalls: unknown[][] = [];
  const communicatorRepository = {
    async paginate(...args: unknown[]) {
      paginateCalls.push(args);
      return {
        total: 1,
        page: 1,
        limit: 10,
        offset: 0,
        sort: '-_id',
        search: 'home',
        data: [{ id: 'communicator-1', name: 'Home communicator' }],
      };
    },
  };

  const service = new CommunicatorService(
    createLegacyAuthService() as any,
    communicatorRepository as any,
    {} as any,
  );

  await service.getPublicCommunicators({}, {
    search: 'home',
    page: '1',
    limit: '10',
  } as any);

  assert.equal(paginateCalls.length, 1);
  const criteria = paginateCalls[0][0] as any;
  assert.equal(criteria.isPublic, true);
  assert.ok(Array.isArray(criteria.$or));
  assert.equal(criteria.$or.length, 3);
  assert.ok(Array.isArray(criteria.$nor));
  assert.deepEqual(criteria.$nor, [
    { isSystemCommunicator: true },
    { rootBoard: { $in: ['komunicare'] } },
    {
      email: {
        $in: ['system@komuni.care', 'info@komuni.care'],
      },
    },
    {
      author: {
        $in: ['Komunicare', 'Komunicare Team', 'komunicare', 'komunicare team'],
      },
    },
    {
      copySource: {
        $exists: true,
        $nin: [null, ''],
      },
    },
    {
      copySourceCommunicatorId: {
        $exists: true,
        $nin: [null, ''],
      },
    },
    {
      publicSourceId: {
        $exists: true,
        $nin: [null, ''],
      },
    },
  ]);
});

test('CommunicatorService.createCommunicator rejects duplicated public communicator copies for the same user', async () => {
  const communicatorRepository = {
    async findOne(criteria: Record<string, unknown>) {
      if (criteria.publicSourceId) {
        return {
          _id: 'existing-public-copy-id',
        };
      }

      return null;
    },
    create() {
      throw new Error('create should not be called when duplicate exists');
    },
    async save() {
      throw new Error('save should not be called when duplicate exists');
    },
  };

  const service = new CommunicatorService(
    createLegacyAuthService() as any,
    communicatorRepository as any,
    {} as any,
  );

  await assert.rejects(
    () =>
      service.createCommunicator({} as any, {
        name: 'Damian - Public copy',
        author: 'Damian',
        email: 'damianclluch@gmail.com',
        description: 'copy',
        rootBoard: '67af7a87b764d6e7efcf2d22',
        boards: ['67af7a87b764d6e7efcf2d22'],
        publicSourceId: 'source-communicator-id',
      } as any),
    (error: any) => {
      assert.equal(error?.status, 409);
      assert.equal(error?.response?.publicSourceId, 'source-communicator-id');
      return true;
    },
  );
});

test('CommunicatorService.createCommunicator rejects publishing communicator copies', async () => {
  const communicatorRepository = {
    async findOne() {
      return null;
    },
    create() {
      throw new Error('create should not be called for invalid publication');
    },
    async save() {
      throw new Error('save should not be called for invalid publication');
    },
  };

  const service = new CommunicatorService(
    createLegacyAuthService() as any,
    communicatorRepository as any,
    {} as any,
  );

  await assert.rejects(
    () =>
      service.createCommunicator({} as any, {
        name: 'Damian - Public copy',
        author: 'Damian',
        email: 'damianclluch@gmail.com',
        description: 'copy',
        isPublic: true,
        publicSourceId: 'source-communicator-id',
        rootBoard: '67af7a87b764d6e7efcf2d22',
        boards: ['67af7a87b764d6e7efcf2d22'],
      } as any),
    (error: any) => {
      assert.equal(error?.status, 400);
      assert.equal(
        error?.response?.message,
        'Only original communicators can be published.',
      );
      return true;
    },
  );
});

test('CommunicatorService.updateCommunicator rejects publishing communicator copies', async () => {
  const communicatorRepository = {
    async findById() {
      return {
        _id: 'copy-id',
        id: 'copy-id',
        email: 'damianclluch@gmail.com',
        rootBoard: '67af7a87b764d6e7efcf2d22',
        boards: ['67af7a87b764d6e7efcf2d22'],
        publicSourceId: 'source-communicator-id',
        isPublic: false,
      };
    },
    async findOne() {
      return null;
    },
    async save() {
      throw new Error('save should not be called for invalid publication');
    },
  };

  const service = new CommunicatorService(
    createLegacyAuthService() as any,
    communicatorRepository as any,
    {} as any,
  );

  await assert.rejects(
    () =>
      service.updateCommunicator({} as any, 'copy-id', {
        isPublic: true,
      } as any),
    (error: any) => {
      assert.equal(error?.status, 400);
      assert.equal(
        error?.response?.message,
        'Only original communicators can be published.',
      );
      return true;
    },
  );
});

test('CommunicatorService.copyPublicCommunicator creates a private copy and remaps board references', async () => {
  const sourceBoardAId = '67af7a87b764d6e7efcf2d22';
  const sourceBoardBId = '67af7a87b764d6e7efcf2d23';
  const savedBoardIds = ['67af7a87b764d6e7efcf2d31', '67af7a87b764d6e7efcf2d32'];
  const savedBoards: Array<Record<string, unknown>> = [];

  const originalFind = (BoardPersistenceEntity as any).find;
  (BoardPersistenceEntity as any).find = () => ({
    lean() {
      return this;
    },
    async exec() {
      return [
        {
          _id: sourceBoardAId,
          name: 'Home',
          author: 'Original Author',
          email: 'owner@example.com',
          isPublic: true,
          tiles: [{ id: 'tile-a' }],
          cellSize: 'medium',
          locale: 'es-AR',
          caption: 'home.svg',
          format: 'cboard',
          description: 'Home board',
          isFixed: false,
          grid: { rows: 6, columns: 4 },
        },
        {
          _id: sourceBoardBId,
          name: 'Food',
          author: 'Original Author',
          email: 'owner@example.com',
          isPublic: false,
          tiles: [{ id: 'tile-b' }],
          cellSize: 'medium',
          locale: 'es-AR',
          caption: 'food.svg',
          format: 'cboard',
          description: 'Food board',
          isFixed: false,
          grid: { rows: 6, columns: 4 },
        },
      ];
    },
  });

  const communicatorRepository = {
    async findById() {
      return {
        _id: 'source-communicator-id',
        id: 'source-communicator-id',
        name: 'Original communicator',
        author: 'Original Author',
        email: 'owner@example.com',
        description: 'Original description',
        caption: 'communicator.svg',
        isPublic: true,
        rootBoard: sourceBoardAId,
        boards: [sourceBoardAId, sourceBoardBId],
        defaultBoardsIncluded: [
          { nameOnJSON: 'custom', homeBoard: sourceBoardBId },
        ],
      };
    },
    async findOne() {
      return null;
    },
    create(payload: Record<string, unknown>) {
      return {
        _id: 'new-communicator-id',
        ...payload,
      };
    },
    async save(communicator: Record<string, unknown>) {
      return communicator;
    },
  };

  const boardRepository = {
    create(payload: Record<string, unknown>) {
      return { ...payload };
    },
    async save(board: Record<string, unknown>) {
      const nextId = savedBoardIds[savedBoards.length];
      const savedBoard = { _id: nextId, ...board };
      savedBoards.push(savedBoard);
      return savedBoard;
    },
  };

  try {
    const service = new CommunicatorService(
      createLegacyAuthService() as any,
      communicatorRepository as any,
      boardRepository as any,
    );

    const result = await service.copyPublicCommunicator(
      {} as any,
      'source-communicator-id',
    );

    assert.equal(savedBoards.length, 2);
    assert.equal(savedBoards[0].email, 'damianclluch@gmail.com');
    assert.equal(savedBoards[0].isPublic, false);
    assert.equal(savedBoards[0].publicSourceId, sourceBoardAId);
    assert.equal(savedBoards[1].publicSourceId, undefined);

    assert.equal(result.communicator.publicSourceId, 'source-communicator-id');
    assert.equal(result.communicator.isPublic, false);
    assert.equal(result.communicator.rootBoard, savedBoardIds[0]);
    assert.deepEqual(result.communicator.boards, savedBoardIds);
    assert.ok(
      result.communicator.defaultBoardsIncluded?.some(
        (entry) =>
          entry.nameOnJSON === 'custom' && entry.homeBoard === savedBoardIds[1],
      ),
    );
  } finally {
    (BoardPersistenceEntity as any).find = originalFind;
  }
});
