import test from 'node:test';
import assert from 'node:assert/strict';

import { SystemBoardsController } from '../../src/nest/modules/system-boards/system-boards.controller';

test('SystemBoardsController.getPublicCommunicators disables HTTP caching for dynamic responses', async () => {
  const headers: Record<string, string> = {};
  const service = {
    async getCommunicators() {
      return [{ id: 'comm-1' }];
    },
  };

  const controller = new SystemBoardsController(service as any);
  const response = {
    setHeader(name: string, value: string) {
      headers[name] = value;
    },
  };

  const result = await controller.getPublicCommunicators(response as any);

  assert.deepEqual(result, [{ id: 'comm-1' }]);
  assert.equal(
    headers['Cache-Control'],
    'private, no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  );
  assert.equal(headers.Pragma, 'no-cache');
  assert.equal(headers.Expires, '0');
  assert.equal(headers['Surrogate-Control'], 'no-store');
});

test('SystemBoardsController.getPublicBoards disables HTTP caching for dynamic responses', async () => {
  const headers: Record<string, string> = {};
  const service = {
    async getAllSystemBoards() {
      return [{ id: 'board-1' }];
    },
  };

  const controller = new SystemBoardsController(service as any);
  const response = {
    setHeader(name: string, value: string) {
      headers[name] = value;
    },
  };

  const result = await controller.getPublicBoards(response as any);

  assert.deepEqual(result, [{ id: 'board-1' }]);
  assert.equal(
    headers['Cache-Control'],
    'private, no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  );
  assert.equal(headers.Pragma, 'no-cache');
  assert.equal(headers.Expires, '0');
  assert.equal(headers['Surrogate-Control'], 'no-store');
});
