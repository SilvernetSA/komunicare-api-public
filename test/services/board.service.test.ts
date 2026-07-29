import test from 'node:test';
import assert from 'node:assert/strict';

import { CommunicatorPersistenceEntity } from '../../src/nest/common/models/communicator.persistence-model';
import { PublicBoardReportPersistenceEntity } from '../../src/nest/common/models/public-board-report.persistence-model';
import { BoardService } from '../../src/nest/modules/board/board.service';

const createLegacyAuthService = () => ({
  async getAuthorizedUser() {
    return {
      email: 'damianclluch@gmail.com',
      isAdmin: false,
    };
  },
  assertSameUserOrAdmin() {},
  assertSameUserOrAdminOrSupervisor() {},
});

test('BoardService.getBoard allows capacitador users to load another user private board', async () => {
  const boardRepository = {
    async findById() {
      return {
        _id: '6866bcb1e9b4ada1dc47a70c',
        id: '6866bcb1e9b4ada1dc47a70c',
        email: 'patient@example.com',
        isPublic: false,
        toJSON() {
          return {
            id: '6866bcb1e9b4ada1dc47a70c',
            email: 'patient@example.com',
            isPublic: false,
          };
        },
      };
    },
  };

  const service = new BoardService(
    {
      async getAuthorizedUser() {
        return {
          email: 'trainer@example.com',
          role: 'capacitador',
          isAdmin: false,
        };
      },
      assertSameUserOrAdmin() {},
      assertSameUserOrAdminOrSupervisor() {},
    } as any,
    boardRepository as any,
    {} as any,
    {} as any,
    {} as any,
  );

  const result = await service.getBoard({} as any, '6866bcb1e9b4ada1dc47a70c');

  assert.equal(result.id, '6866bcb1e9b4ada1dc47a70c');
  assert.equal(result.email, 'patient@example.com');
});

test('BoardService.getBoard allows users to load private boards included in their communicator', async () => {
  const originalFindOne = (CommunicatorPersistenceEntity as any).findOne;

  (CommunicatorPersistenceEntity as any).findOne = () => ({
    lean() {
      return this;
    },
    exec() {
      return Promise.resolve({
        _id: 'communicator-1',
        email: 'damianclluch@gmail.com',
        boards: ['6866bcb1e9b4ada1dc47a70d'],
      });
    },
  });

  try {
    const boardRepository = {
      async findById() {
        return {
          _id: '6866bcb1e9b4ada1dc47a70d',
          id: '6866bcb1e9b4ada1dc47a70d',
          email: 'patient@example.com',
          isPublic: false,
          tiles: [{ label: 'mate' }],
          toJSON() {
            return {
              id: '6866bcb1e9b4ada1dc47a70d',
              email: 'patient@example.com',
              isPublic: false,
              tiles: [{ label: 'mate' }],
            };
          },
        };
      },
    };

    const service = new BoardService(
      createLegacyAuthService() as any,
      boardRepository as any,
      {} as any,
      {} as any,
      {} as any,
    );

    const result = await service.getBoard({} as any, '6866bcb1e9b4ada1dc47a70d');

    assert.equal(result.id, '6866bcb1e9b4ada1dc47a70d');
    assert.deepEqual(result.tiles, [{ label: 'mate' }]);
  } finally {
    (CommunicatorPersistenceEntity as any).findOne = originalFindOne;
  }
});

test('BoardService.createBoard rejects publishing copied public boards', async () => {
  const boardRepository = {
    create() {
      throw new Error('create should not be called for invalid publication');
    },
    async save() {
      throw new Error('save should not be called for invalid publication');
    },
  };

  const service = new BoardService(
    createLegacyAuthService() as any,
    boardRepository as any,
    {} as any,
    {} as any,
    {} as any,
  );

  await assert.rejects(
    () =>
      service.createBoard({} as any, {
        name: 'Copied public board',
        author: 'Damian',
        email: 'damianclluch@gmail.com',
        isPublic: true,
        publicSourceId: '67af7a87b764d6e7efcf2d22',
      }),
    (error: any) => {
      assert.equal(error?.status, 400);
      assert.equal(
        error?.response?.message,
        'A copied public board cannot be published.',
      );
      return true;
    },
  );
});

test('BoardService.updateBoard rejects publishing copied public boards', async () => {
  const boardRepository = {
    async findById() {
      return {
        _id: '67af7a87b764d6e7efcf2d31',
        id: '67af7a87b764d6e7efcf2d31',
        email: 'damianclluch@gmail.com',
        isPublic: false,
        publicSourceId: '67af7a87b764d6e7efcf2d22',
      };
    },
    async save() {
      throw new Error('save should not be called for invalid publication');
    },
  };

  const service = new BoardService(
    createLegacyAuthService() as any,
    boardRepository as any,
    {} as any,
    {} as any,
    {} as any,
  );

  await assert.rejects(
    () =>
      service.updateBoard({} as any, '67af7a87b764d6e7efcf2d31', {
        isPublic: true,
      }),
    (error: any) => {
      assert.equal(error?.status, 400);
      assert.equal(
        error?.response?.message,
        'A copied public board cannot be published.',
      );
      return true;
    },
  );
});

test('BoardService.reportPublicBoard persists report metadata and keeps email delivery', async () => {
  const originalSave = PublicBoardReportPersistenceEntity.prototype.save;
  const savedReports: Record<string, any>[] = [];
  let mailArgs: unknown[] = [];

  PublicBoardReportPersistenceEntity.prototype.save = async function saveMock() {
    savedReports.push({
      boardId: this.boardId,
      boardName: this.boardName,
      author: this.author,
      ownerEmail: this.ownerEmail,
      reason: this.reason,
      url: this.url,
      whistleblower: {
        name: this.whistleblower?.name,
        email: this.whistleblower?.email,
        language: this.whistleblower?.language,
      },
      status: this.status,
      adminComment: this.adminComment,
      metadata: this.metadata,
      createdAt: this.createdAt,
    });

    return this;
  } as any;

  try {
    const boardRepository = {
      async findById() {
        return {
          _id: '67af7a87b764d6e7efcf2d31',
          id: '67af7a87b764d6e7efcf2d31',
          name: 'Public board name',
          author: 'Stored author',
          email: 'owner@example.com',
          isPublic: true,
        };
      },
    };
    const mailGateway = {
      async sendEmail(...args: unknown[]) {
        mailArgs = args;
        return { success: true };
      },
    };
    const service = new BoardService(
      createLegacyAuthService() as any,
      boardRepository as any,
      mailGateway as any,
      {} as any,
      {} as any,
    );

    const result = await service.reportPublicBoard({
      id: '67af7a87b764d6e7efcf2d31',
      name: 'Payload board name',
      author: 'Payload author',
      description: 'Payload description',
      url: 'https://komuni.care/board/67af7a87b764d6e7efcf2d31',
      reason: 'Contenido inapropiado',
      whistleblower: {
        name: 'Juan Perez',
        email: 'juan@example.com',
        language: 'es-AR',
      },
    });

    assert.equal(result.success, 1);
    assert.equal(savedReports.length, 1);
    assert.deepEqual(savedReports[0], {
      boardId: '67af7a87b764d6e7efcf2d31',
      boardName: 'Public board name',
      author: 'Stored author',
      ownerEmail: 'owner@example.com',
      reason: 'Contenido inapropiado',
      url: 'https://komuni.care/board/67af7a87b764d6e7efcf2d31',
      whistleblower: {
        name: 'Juan Perez',
        email: 'juan@example.com',
        language: 'es-AR',
      },
      status: 'pending',
      adminComment: '',
      metadata: {
        description: 'Payload description',
        payloadName: 'Payload board name',
        payloadAuthor: 'Payload author',
        isPublic: true,
        ownerEmail: 'owner@example.com',
      },
      createdAt: savedReports[0].createdAt,
    });
    assert.ok(savedReports[0].createdAt instanceof Date);
    assert.deepEqual(mailArgs.slice(0, 2), [
      'info@komuni.care',
      '[Komunicare] Reported public board: Payload board name',
    ]);
    assert.match(String(mailArgs[2] || ''), /Public board report/);
  } finally {
    PublicBoardReportPersistenceEntity.prototype.save = originalSave;
  }
});

test('BoardService.listPublicBoardReportsBackoffice requires admin and sorts by newest first', async () => {
  const originalFind = (PublicBoardReportPersistenceEntity as any).find;
  const originalCountDocuments = (PublicBoardReportPersistenceEntity as any)
    .countDocuments;
  const queries: Record<string, any> = {};

  (PublicBoardReportPersistenceEntity as any).find = (
    query: Record<string, any>,
  ) => {
    queries.find = query;

    return {
      sort(sort: string) {
        queries.sort = sort;
        return this;
      },
      skip(skip: number) {
        queries.skip = skip;
        return this;
      },
      limit(limit: number) {
        queries.limit = limit;
        return this;
      },
      async exec() {
        return [{ id: 'report-1' }];
      },
    };
  };

  (PublicBoardReportPersistenceEntity as any).countDocuments = (
    query: Record<string, any>,
  ) => {
    queries.count = query;
    return {
      async exec() {
        return 1;
      },
    };
  };

  try {
    const adminService = new BoardService(
      {
        async getAuthorizedUser() {
          return { isAdmin: true, role: 'admin' };
        },
        assertSameUserOrAdmin() {},
        assertSameUserOrAdminOrSupervisor() {},
      } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    const result = await adminService.listPublicBoardReportsBackoffice(
      {} as any,
      { search: 'owner@example.com', page: 2, limit: 5 },
    );

    assert.equal(result.total, 1);
    assert.equal(result.data[0].id, 'report-1');
    assert.equal(queries.sort, '-createdAt');
    assert.equal(queries.skip, 5);
    assert.equal(queries.limit, 5);
    assert.equal(queries.find.$or[0].boardId.$regex.source, 'owner@example\\.com');
    assert.deepEqual(queries.find, queries.count);

    const userService = new BoardService(
      {
        async getAuthorizedUser() {
          return { isAdmin: false, role: 'user' };
        },
        assertSameUserOrAdmin() {},
        assertSameUserOrAdminOrSupervisor() {},
      } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await assert.rejects(
      () => userService.listPublicBoardReportsBackoffice({} as any, {} as any),
      (error: any) => {
        assert.equal(error?.status, 403);
        assert.equal(
          error?.message,
          'You are not authorized to list public board reports.',
        );
        return true;
      },
    );
  } finally {
    (PublicBoardReportPersistenceEntity as any).find = originalFind;
    (PublicBoardReportPersistenceEntity as any).countDocuments =
      originalCountDocuments;
  }
});

test('BoardService.reportPublicBoard requires a useful reason', async () => {
  const boardRepository = {
    async findById() {
      return {
        _id: '67af7a87b764d6e7efcf2d31',
        id: '67af7a87b764d6e7efcf2d31',
        name: 'Public board name',
        author: 'Stored author',
        email: 'owner@example.com',
        isPublic: true,
      };
    },
  };

  const service = new BoardService(
    createLegacyAuthService() as any,
    boardRepository as any,
    {} as any,
    {} as any,
    {} as any,
  );

  await assert.rejects(
    () =>
      service.reportPublicBoard({
        id: '67af7a87b764d6e7efcf2d31',
        name: 'Payload board name',
        author: 'Payload author',
        description: 'Payload description',
        url: 'https://komuni.care/board/67af7a87b764d6e7efcf2d31',
        reason: 'short',
        whistleblower: {
          name: 'Juan Perez',
          email: 'juan@example.com',
          language: 'es-AR',
        },
      }),
    (error: any) => {
      assert.equal(error?.status, 400);
      assert.equal(
        error?.response?.message,
        'Report reason must include at least 10 characters.',
      );
      return true;
    },
  );
});

test('BoardService.deleteBoard notifies the affected user when an admin removes a board', async () => {
  const originalFind = (CommunicatorPersistenceEntity as any).find;
  const notifications: Array<{
    actor: Record<string, unknown>;
    board: Record<string, unknown>;
  }> = [];

  (CommunicatorPersistenceEntity as any).find = () => ({
    select() {
      return this;
    },
    lean() {
      return this;
    },
    async exec() {
      return [];
    },
  });

  try {
    const boardRepository = {
      async findById() {
        return {
          _id: '67af7a87b764d6e7efcf2d31',
          id: '67af7a87b764d6e7efcf2d31',
          name: 'Board to delete',
          email: 'owner@example.com',
          toJSON() {
            return {
              id: '67af7a87b764d6e7efcf2d31',
              name: 'Board to delete',
              email: 'owner@example.com',
            };
          },
        };
      },
      async deleteById() {
        return undefined;
      },
    };

    const service = new BoardService(
      {
        async getAuthorizedUser() {
          return { email: 'admin@example.com', isAdmin: true, role: 'admin' };
        },
        assertSameUserOrAdmin() {},
        assertSameUserOrAdminOrSupervisor() {},
      } as any,
      boardRepository as any,
      {} as any,
      {} as any,
      {
        async notifyBoardDeleted(
          actor: Record<string, unknown>,
          board: Record<string, unknown>,
        ) {
          notifications.push({ actor, board });
        },
      } as any,
    );

    const result = await service.deleteBoard(
      {} as any,
      '67af7a87b764d6e7efcf2d31',
    );

    assert.equal(result.name, 'Board to delete');
    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].actor.email, 'admin@example.com');
    assert.equal(notifications[0].board.email, 'owner@example.com');
  } finally {
    (CommunicatorPersistenceEntity as any).find = originalFind;
  }
});
