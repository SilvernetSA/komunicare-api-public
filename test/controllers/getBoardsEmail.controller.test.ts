import test from 'node:test';
import assert from 'node:assert/strict';
import { ForbiddenException } from '@nestjs/common';

import { BoardService } from '../../src/nest/modules/board/board.service';

test('BoardService.getBoardsByEmail throws 403 when a non-admin user requests another user boards', async () => {
  const legacyAuthService = {
    async getAuthorizedUser() {
      return {
        email: 'other@example.com',
        isAdmin: false,
      };
    },
    assertSameUserOrAdmin(_user, _email, message) {
      throw new ForbiddenException(message);
    },
  };
  const boardRepository = {
    async paginate() {
      throw new Error('paginate should not run');
    },
  };

  const service = new BoardService(
    legacyAuthService as any,
    boardRepository as any,
    {} as any,
    {} as any,
  );

  await assert.rejects(
    service.getBoardsByEmail({}, 'owner@example.com', {}),
    (err) => {
      assert.equal(err.getStatus(), 403);
      assert.equal(
        err.getResponse().message,
        "You are not authorized to get this user's boards.",
      );
      return true;
    },
  );
});

test('BoardService.getBoardsByEmail paginates with email merged into the query and supports search', async () => {
  const paginateCalls: unknown[][] = [];
  const legacyAuthService = {
    async getAuthorizedUser() {
      return {
        email: 'juanperez@gmail.com',
        isAdmin: false,
      };
    },
    assertSameUserOrAdmin() {},
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
        data: [{ id: 'board-1' }],
      };
    },
  };

  const service = new BoardService(
    legacyAuthService as any,
    boardRepository as any,
    {} as any,
    {} as any,
  );

  const result = await service.getBoardsByEmail(
    {},
    'juanperez@gmail.com',
    { search: 'home', page: '1', limit: '10' },
  );

  assert.equal(paginateCalls.length, 1);
  const criteria = paginateCalls[0][0] as any;
  assert.equal(criteria.email, 'juanperez@gmail.com');
  assert.ok(Array.isArray(criteria.$or));
  assert.equal(criteria.$or.length, 2);
  assert.equal(criteria.$or[0].name.$regex.source, 'home');
  assert.equal(criteria.$or[0].name.$regex.flags, 'i');

  assert.deepEqual(result, {
    total: 1,
    page: 1,
    limit: 10,
    offset: 0,
    sort: '-_id',
    search: 'home',
    data: [{ id: 'board-1' }],
  });
});
