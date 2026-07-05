import test from 'node:test';
import assert from 'node:assert/strict';

import { BoardPersistenceEntity } from '../../src/nest/common/models/board.persistence-model';
import { SystemCommunicatorDraftPersistenceEntity } from '../../src/nest/common/models/system-communicator-draft.persistence-model';
import { SystemBoardsService } from '../../src/nest/modules/system-boards/system-boards.service';

const buildService = () =>
  new SystemBoardsService({
    async getAuthorizedUser() {
      return { isAdmin: true, role: 'admin' };
    },
  } as any);

test('SystemBoardsService.updateBoard bumps lastEdited for official board updates', async () => {
  const boardEntity = BoardPersistenceEntity as any;
  const originalFindOneAndUpdate = boardEntity.findOneAndUpdate;
  let capturedUpdate: any;

  boardEntity.findOneAndUpdate = (_query: any, update: any) => ({
    lean: () => ({
      exec: async () => {
        capturedUpdate = update;
        return {
          boardId: 'komunicare',
          ...update.$set,
        };
      },
    }),
  });

  try {
    const service = buildService();
    const result = await service.updateBoard(
      {} as any,
      'komunicare',
      { name: 'Updated official board' } as any,
    );

    assert.equal(capturedUpdate.$set.name, 'Updated official board');
    assert.ok(capturedUpdate.$set.lastEdited instanceof Date);
    assert.ok(result.lastEdited instanceof Date);
  } finally {
    boardEntity.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test('SystemBoardsService.publishDraft bumps lastEdited for existing official boards', async () => {
  const boardEntity = BoardPersistenceEntity as any;
  const draftEntity = SystemCommunicatorDraftPersistenceEntity as any;
  const originalUpdateOne = boardEntity.updateOne;
  const originalFindOne = draftEntity.findOne;
  const originalDeleteOne = draftEntity.deleteOne;
  const updates: Array<{ query: any; update: any }> = [];

  draftEntity.findOne = () => ({
    lean: () => ({
      exec: async () => ({
        boardChanges: {
          komunicare: { name: 'Published official board' },
        },
        newBoards: [],
      }),
    }),
  });

  boardEntity.updateOne = (query: any, update: any) => ({
    exec: async () => {
      updates.push({ query, update });
    },
  });

  draftEntity.deleteOne = () => ({
    exec: async () => ({ deletedCount: 1 }),
  });

  try {
    const service = buildService();
    const result = await service.publishDraft({} as any, 'komunicare');

    assert.deepEqual(result, { published: true });
    assert.equal(updates.length, 1);
    assert.deepEqual(updates[0].query, {
      isSystemBoard: true,
      boardId: 'komunicare',
    });
    assert.equal(updates[0].update.$set.name, 'Published official board');
    assert.ok(updates[0].update.$set.lastEdited instanceof Date);
  } finally {
    boardEntity.updateOne = originalUpdateOne;
    draftEntity.findOne = originalFindOne;
    draftEntity.deleteOne = originalDeleteOne;
  }
});
