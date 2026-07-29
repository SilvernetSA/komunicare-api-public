import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

import { BoardPersistenceEntity } from '../../src/nest/common/models/board.persistence-model';
import { CommunicatorPersistenceEntity } from '../../src/nest/common/models/communicator.persistence-model';
import { SystemCommunicatorDraftPersistenceEntity } from '../../src/nest/common/models/system-communicator-draft.persistence-model';
import { SystemBoardsService } from '../../src/nest/modules/system-boards/system-boards.service';

const createMockSession = () => ({
  async withTransaction(fn: () => Promise<void>) {
    await fn();
  },
  async endSession() {},
});

const stubTransactionSession = () => {
  const originalStartSession = (mongoose.connection as any).startSession;
  (mongoose.connection as any).startSession = async () => createMockSession();

  return () => {
    (mongoose.connection as any).startSession = originalStartSession;
  };
};

const buildService = (pushNotificationService: any = {}) =>
  new SystemBoardsService({
    async getAuthorizedUser() {
      return { email: 'admin@komuni.care', isAdmin: true, role: 'admin' };
    },
  } as any, {
    async notifyOfficialCommunicatorUpdateAvailable() {},
    ...pushNotificationService,
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
  const communicatorEntity = CommunicatorPersistenceEntity as any;
  const draftEntity = SystemCommunicatorDraftPersistenceEntity as any;
  const originalUpdateOne = boardEntity.updateOne;
  const originalCommunicatorFindOne = communicatorEntity.findOne;
  const originalFindOne = draftEntity.findOne;
  const originalDeleteOne = draftEntity.deleteOne;
  const restoreSession = stubTransactionSession();
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

  communicatorEntity.findOne = () => ({
    exec: async () => null,
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
    restoreSession();
    boardEntity.updateOne = originalUpdateOne;
    communicatorEntity.findOne = originalCommunicatorFindOne;
    draftEntity.findOne = originalFindOne;
    draftEntity.deleteOne = originalDeleteOne;
  }
});

test('SystemBoardsService.updateBoard increments official communicator version and notifies copy owners', async () => {
  const boardEntity = BoardPersistenceEntity as any;
  const communicatorEntity = CommunicatorPersistenceEntity as any;
  const originalFindOneAndUpdate = boardEntity.findOneAndUpdate;
  const originalFindOne = communicatorEntity.findOne;
  const originalFind = communicatorEntity.find;
  let savedVersion = 0;
  const notificationCalls: Array<unknown[]> = [];

  boardEntity.findOneAndUpdate = (_query: any, update: any) => ({
    lean: () => ({
      exec: async () => ({
        boardId: 'komunicare',
        communicator: 'komunicare',
        ...update.$set,
      }),
    }),
  });

  communicatorEntity.findOne = () => ({
    exec: async () => ({
      communicatorKey: 'komunicare',
      version: 2,
      async save() {
        savedVersion = this.version;
        return this;
      },
      toJSON() {
        return { id: 'official-1', communicatorKey: 'komunicare', name: 'Komunicare' };
      },
    }),
  });

  communicatorEntity.find = () => ({
    exec: async () => [
      {
        _id: 'copy-1',
        email: 'owner@example.com',
        name: 'Owner copy',
        toJSON() {
          return { id: 'copy-1', email: 'owner@example.com', name: 'Owner copy' };
        },
      },
    ],
  });

  try {
    const service = buildService({
      async notifyOfficialCommunicatorUpdateAvailable(...args: unknown[]) {
        notificationCalls.push(args);
      },
    });

    await service.updateBoard(
      {} as any,
      'komunicare',
      { name: 'Updated official board' } as any,
    );

    assert.equal(savedVersion, 3);
    assert.equal(notificationCalls.length, 1);
    assert.equal((notificationCalls[0][2] as any[]).length, 1);
  } finally {
    boardEntity.findOneAndUpdate = originalFindOneAndUpdate;
    communicatorEntity.findOne = originalFindOne;
    communicatorEntity.find = originalFind;
  }
});

test('SystemBoardsService.publishDraft increments official communicator version and notifies copy owners', async () => {
  const restoreSession = stubTransactionSession();
  const boardEntity = BoardPersistenceEntity as any;
  const communicatorEntity = CommunicatorPersistenceEntity as any;
  const draftEntity = SystemCommunicatorDraftPersistenceEntity as any;
  const originalUpdateOne = boardEntity.updateOne;
  const originalCommunicatorFindOne = communicatorEntity.findOne;
  const originalCommunicatorFind = communicatorEntity.find;
  const originalDraftFindOne = draftEntity.findOne;
  const originalDeleteOne = draftEntity.deleteOne;
  let savedVersion = 0;
  const notificationCalls: Array<unknown[]> = [];

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

  boardEntity.updateOne = () => ({
    exec: async () => undefined,
  });

  communicatorEntity.findOne = () => ({
    exec: async () => ({
      communicatorKey: 'komunicare',
      version: 4,
      async save() {
        savedVersion = this.version;
        return this;
      },
      toJSON() {
        return { id: 'official-1', communicatorKey: 'komunicare', name: 'Komunicare' };
      },
    }),
  });

  communicatorEntity.find = () => ({
    exec: async () => [
      {
        _id: 'copy-1',
        email: 'owner@example.com',
        name: 'Owner copy',
        toJSON() {
          return { id: 'copy-1', email: 'owner@example.com', name: 'Owner copy' };
        },
      },
    ],
  });

  draftEntity.deleteOne = () => ({
    exec: async () => ({ deletedCount: 1 }),
  });

  try {
    const service = buildService({
      async notifyOfficialCommunicatorUpdateAvailable(...args: unknown[]) {
        notificationCalls.push(args);
      },
    });

    const result = await service.publishDraft({} as any, 'komunicare');

    assert.deepEqual(result, { published: true });
    assert.equal(savedVersion, 5);
    assert.equal(notificationCalls.length, 1);
    assert.equal((notificationCalls[0][2] as any[]).length, 1);
  } finally {
    restoreSession();
    boardEntity.updateOne = originalUpdateOne;
    communicatorEntity.findOne = originalCommunicatorFindOne;
    communicatorEntity.find = originalCommunicatorFind;
    draftEntity.findOne = originalDraftFindOne;
    draftEntity.deleteOne = originalDeleteOne;
  }
});
