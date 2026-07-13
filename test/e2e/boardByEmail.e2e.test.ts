import test from 'node:test';
import assert from 'node:assert/strict';
import { ForbiddenException } from '@nestjs/common';

import { BoardController } from '../../src/nest/modules/board/board.controller';
import { BoardService } from '../../src/nest/modules/board/board.service';

test('BoardController.getBoardsByEmail rejects unauthorized requests and serves allowed ones', async () => {
  const paginateCalls: Array<{ criteria: unknown; query: unknown }> = [];
  const boardRepository = {
    async paginate(criteria: unknown, query: any) {
      paginateCalls.push({ criteria, query });
      return {
        total: 1,
        page: 1,
        limit: 10,
        offset: 0,
        sort: '-_id',
        search: query.search || '',
        data: [{ id: 'board-1', name: 'Mi Tablero Copia' }],
      };
    },
  };

  const legacyAuthService = {
    async getAuthorizedUser(req: any) {
      return req.user;
    },
    assertSameUserOrAdmin(user: any, email: string, message: string) {
      const isAdmin = Boolean(user.isAdmin || user.role === 'admin');
      if (!isAdmin && user.email !== email) {
        throw new ForbiddenException(message);
      }
    },
  };

  const service = new BoardService(
    legacyAuthService as any,
    boardRepository as any,
    {} as any,
    {} as any,
  );
  const controller = new BoardController(service);

  await assert.rejects(
    controller.getBoardsByEmail(
      { user: { isAdmin: false, email: 'other@example.com' } },
      'member@example.com',
      { page: '1', limit: '10' },
    ),
    (err) => {
      assert.equal(err.getStatus(), 403);
      assert.equal(
        err.getResponse().message,
        "You are not authorized to get this user's boards.",
      );
      return true;
    },
  );

  const allowedResponse = await controller.getBoardsByEmail(
    { user: { isAdmin: false, email: 'member@example.com' } },
    'member@example.com',
    { page: '1', limit: '10' },
  );

  assert.equal(allowedResponse.total, 1);
  assert.equal(allowedResponse.data[0].name, 'Mi Tablero Copia');
  assert.equal(paginateCalls.length, 1);
  assert.deepEqual(paginateCalls[0].criteria, { email: 'member@example.com' });
});
