import test from 'node:test';
import assert from 'node:assert/strict';

import { BoardController } from '../../src/nest/modules/board/board.controller';

test('BoardController.getBoardsByEmail delegates to BoardService.getBoardsByEmail', async () => {
  const calls: unknown[][] = [];
  const expected = {
    total: 1,
    page: 1,
    limit: 10,
    offset: 0,
    sort: '-_id',
    search: '',
    data: [{ id: 'board-1', name: 'Mi Tablero Copia' }],
  };

  const boardService = {
    async getBoardsByEmail(...args: unknown[]) {
      calls.push(args);
      return expected;
    },
  };

  const controller = new BoardController(boardService as any);

  const req = { headers: { authorization: 'Bearer token' } };
  const query = { page: '1', limit: '10' };
  const email = 'juanperez@gmail.com';

  const result = await controller.getBoardsByEmail(req, email, query);

  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], req);
  assert.equal(calls[0][1], email);
  assert.equal(calls[0][2], query);
  assert.deepEqual(result, expected);
});
