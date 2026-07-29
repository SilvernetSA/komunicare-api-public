import test from 'node:test';
import assert from 'node:assert/strict';

import { BoardService } from '../../src/nest/modules/board/board.service';

test('BoardService.getPublicBoards keeps isPublic and excludes official system board heuristics', async () => {
  const paginateCalls: unknown[][] = [];
  const legacyAuthService = {
    async getAuthorizedUser() {
      return {
        email: 'user@example.com',
        isAdmin: false,
      };
    },
  };
  const boardRepository = {
    async paginate(...args: unknown[]) {
      paginateCalls.push(args);
      return {
        total: 1,
        page: 1,
        limit: 10,
        offset: 0,
        sort: '-_id',
        search: '',
        data: [{ id: 'board-1' }],
      };
    },
  };

  const service = new BoardService(
    legacyAuthService as any,
    boardRepository as any,
    {} as any,
    {} as any,
    {} as any,
  );

  const result = await service.getPublicBoards({}, { page: '1', limit: '10' });

  assert.equal(paginateCalls.length, 1);
  const criteria = paginateCalls[0][0] as any;
  assert.equal(criteria.isPublic, true);
  assert.deepEqual(criteria.$nor, [
    { isSystemBoard: true },
    { communicator: { $in: ['komunicare'] } },
    { boardId: { $in: ['komunicare'] } },
    { id: { $in: ['komunicare'] } },
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
  ]);

  assert.deepEqual(result, {
    total: 1,
    page: 1,
    limit: 10,
    offset: 0,
    sort: '-_id',
    search: '',
    data: [{ id: 'board-1' }],
  });
});

test('BoardService.getPublicBoards keeps search support while filtering official boards', async () => {
  const paginateCalls: unknown[][] = [];
  const legacyAuthService = {
    async getAuthorizedUser() {
      return {
        email: 'user@example.com',
        isAdmin: false,
      };
    },
  };
  const boardRepository = {
    async paginate(...args: unknown[]) {
      paginateCalls.push(args);
      return {
        total: 1,
        page: 1,
        limit: 10,
        offset: 0,
        sort: '-_id',
        search: 'home',
        data: [{ id: 'board-1', name: 'Home' }],
      };
    },
  };

  const service = new BoardService(
    legacyAuthService as any,
    boardRepository as any,
    {} as any,
    {} as any,
    {} as any,
  );

  await service.getPublicBoards({}, { search: 'home', page: '1', limit: '10' });

  assert.equal(paginateCalls.length, 1);
  const criteria = paginateCalls[0][0] as any;
  assert.equal(criteria.isPublic, true);
  assert.ok(Array.isArray(criteria.$or));
  assert.equal(criteria.$or.length, 2);
  assert.equal(criteria.$or[0].name.$regex.source, 'home');
  assert.equal(criteria.$or[0].name.$regex.flags, 'i');
  assert.equal(criteria.$or[1].author.$regex.source, 'home');
  assert.equal(criteria.$or[1].author.$regex.flags, 'i');
  assert.ok(Array.isArray(criteria.$nor));
  assert.equal(criteria.$nor.length, 6);
});
