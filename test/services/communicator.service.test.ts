import test from 'node:test';
import assert from 'node:assert/strict';

import { CommunicatorService } from '../../src/nest/modules/communicator/communicator.service';

test('CommunicatorService.getCommunicatorsByEmail returns the canonical official communicator when the user has none', async () => {
  const legacyAuthService = {
    async getAuthorizedUser() {
      return {
        email: 'user@example.com',
        isAdmin: false,
      };
    },
    assertSameUserOrAdmin() {},
  };

  const paginateCalls: unknown[][] = [];
  const communicatorRepository = {
    async paginate(...args: unknown[]) {
      paginateCalls.push(args);
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
      return [
        {
          name: "Komunicare's Communicator",
          author: 'Komunicare',
          email: 'lucho@komuni.care',
          description: "Komunicare's default communicator",
          rootBoard: 'komunicare',
          boards: ['root', 'jjmlUcQs19', 'komunicare'],
          defaultBoardsIncluded: [
            { nameOnJSON: 'komunicare', homeBoard: 'komunicare' },
          ],
          toJSON() {
            return this;
          },
        },
        {
          name: 'Damian - Komunicare',
          author: 'Damian',
          email: 'user@example.com',
          description: "Komunicare's default communicator (copy)",
          rootBoard: 'komunicare',
          boards: ['root', 'jjmlUcQs19', 'komunicare'],
          defaultBoardsIncluded: [
            { nameOnJSON: 'advanced', homeBoard: 'root' },
            { nameOnJSON: 'picSeePal', homeBoard: 'jjmlUcQs19' },
            { nameOnJSON: 'komunicare', homeBoard: 'komunicare' },
          ],
          toJSON() {
            return this;
          },
        },
      ];
    },
  };

  const service = new CommunicatorService(
    legacyAuthService as any,
    communicatorRepository as any,
  );

  const result = await service.getCommunicatorsByEmail(
    {} as any,
    'user@example.com',
    { page: 1, limit: 100, offset: 0, sort: '-_id', search: '' },
  );

  assert.equal(paginateCalls.length, 1);
  assert.equal(result.total, 1);
  assert.deepEqual(
    result.data
      .map((communicator) => communicator.rootBoard)
      .sort(),
    ['komunicare'],
  );
  assert.deepEqual(
    result.data
      .map((communicator) => communicator.email)
      .sort(),
    ['lucho@komuni.care'],
  );
});

test('CommunicatorService.getCommunicatorsByEmail keeps repository results when user already has communicators', async () => {
  const legacyAuthService = {
    async getAuthorizedUser() {
      return {
        email: 'user@example.com',
        isAdmin: false,
      };
    },
    assertSameUserOrAdmin() {},
  };

  const communicatorRepository = {
    async paginate() {
      return {
        total: 1,
        page: 1,
        limit: 100,
        offset: 0,
        sort: '-_id',
        search: '',
        data: [
          {
            id: 'remote-1',
            name: 'Damian - Mi comunicador',
            email: 'user@example.com',
            rootBoard: 'komunicare',
            boards: ['root', 'jjmlUcQs19', 'komunicare'],
          },
        ],
      };
    },
    async findAll() {
      throw new Error('findAll should not run when user already has communicators');
    },
  };

  const service = new CommunicatorService(
    legacyAuthService as any,
    communicatorRepository as any,
  );

  const result = await service.getCommunicatorsByEmail(
    {} as any,
    'user@example.com',
    { page: 1, limit: 100, offset: 0, sort: '-_id', search: '' },
  );

  assert.equal(result.total, 1);
  assert.equal(result.data[0].id, 'remote-1');
});

test('CommunicatorService.createCommunicator rejects duplicated personal copy source for the same user', async () => {
  const legacyAuthService = {
    async getAuthorizedUser() {
      return {
        email: 'user@example.com',
        isAdmin: false,
      };
    },
    assertSameUserOrAdmin() {},
  };

  const communicatorRepository = {
    async findOne() {
      return {
        _id: 'existing-communicator-id',
      };
    },
    create() {
      throw new Error('create should not be called when duplicate exists');
    },
    async save() {
      throw new Error('save should not be called when duplicate exists');
    },
  };

  const service = new CommunicatorService(
    legacyAuthService as any,
    communicatorRepository as any,
  );

  await assert.rejects(
    () =>
      service.createCommunicator({} as any, {
        name: 'Damian - Komunicare copy',
        author: 'Damian',
        email: 'user@example.com',
        description: 'copy',
        rootBoard: '6a02237402c530c4446b2b2c',
        boards: ['6a02237402c530c4446b2b2c'],
        copySource: 'komunicare',
      } as any),
    (error: any) => {
      assert.equal(error?.status, 409);
      assert.equal(
        error?.response?.copySource,
        'komunicare',
      );
      return true;
    },
  );
});

test('CommunicatorService.createCommunicator normalizes copy source aliases before saving', async () => {
  const legacyAuthService = {
    async getAuthorizedUser() {
      return {
        email: 'user@example.com',
        isAdmin: false,
      };
    },
    assertSameUserOrAdmin() {},
  };

  const findOneCalls: any[] = [];
  const communicatorRepository = {
    async findOne(criteria: Record<string, unknown>) {
      findOneCalls.push(criteria);
      return null;
    },
    create(payload: Record<string, unknown>) {
      return {
        _id: 'created-id',
        ...payload,
      };
    },
    async save(communicator: Record<string, unknown>) {
      return communicator;
    },
  };

  const service = new CommunicatorService(
    legacyAuthService as any,
    communicatorRepository as any,
  );

  const result = await service.createCommunicator({} as any, {
    name: 'Damian - Cboard copy',
    author: 'Damian',
    email: 'user@example.com',
    description: 'copy',
    rootBoard: '6a02237402c530c4446b2b2c',
    boards: ['6a02237402c530c4446b2b2c'],
    copySource: 'advanced',
    copySourceCommunicatorId: 'official-advanced-id',
  } as any);

  assert.equal(findOneCalls.length, 1);
  assert.equal(findOneCalls[0].copySource, 'cboard');
  assert.equal(result.communicator.copySource, 'cboard');
  assert.equal(
    result.communicator.copySourceCommunicatorId,
    'official-advanced-id',
  );
});

test('CommunicatorService.updateCommunicator keeps copy rootBoard on non-canonical board', async () => {
  const legacyAuthService = {
    async getAuthorizedUser() {
      return {
        email: 'user@example.com',
        isAdmin: false,
      };
    },
    assertSameUserOrAdmin() {},
  };

  const savedPayloads: any[] = [];
  const communicatorRepository = {
    async findById() {
      return {
        _id: 'copy-id',
        id: 'copy-id',
        email: 'user@example.com',
        rootBoard: '6a0276fe7fff38876b2cf342',
        boards: ['6a0276fe7fff38876b2cf342', 'komunicare', 'jjmlUcQs19'],
        copySource: 'cboard',
      };
    },
    async findOne() {
      return null;
    },
    async save(communicator: Record<string, unknown>) {
      savedPayloads.push({ ...communicator });
      return communicator;
    },
  };

  const service = new CommunicatorService(
    legacyAuthService as any,
    communicatorRepository as any,
  );

  const result = await service.updateCommunicator(
    {} as any,
    'copy-id',
    {
      rootBoard: 'komunicare',
      boards: ['6a0276fe7fff38876b2cf342', 'komunicare', 'jjmlUcQs19'],
    } as any,
  );

  assert.equal(savedPayloads.length, 1);
  assert.equal(savedPayloads[0].rootBoard, '6a0276fe7fff38876b2cf342');
  assert.equal((result as any).rootBoard, '6a0276fe7fff38876b2cf342');
});
