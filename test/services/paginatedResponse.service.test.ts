import test from 'node:test';
import assert from 'node:assert/strict';

import { paginatedResponse } from '../../src/nest/common/pagination.util';

test('paginatedResponse normalizes params and applies pagination to the query model', async () => {
  const state = {
    query: null as unknown,
    sort: null as unknown,
    skip: null as unknown,
    limit: null as unknown,
    populate: [] as unknown[],
    countQuery: null as unknown,
  };
  const rows = [{ id: 'board-1' }, { id: 'board-2' }];

  const queryModel = {
    sort(value) {
      state.sort = value;
      return this;
    },
    skip(value) {
      state.skip = value;
      return this;
    },
    limit(value) {
      state.limit = value;
      return this;
    },
    populate(value) {
      state.populate.push(value);
      return this;
    },
    async exec() {
      return rows;
    },
  };

  const model = {
    find(query) {
      state.query = query;
      return queryModel;
    },
    countDocuments(query) {
      state.countQuery = query;
      return {
        async exec() {
          return 27;
        },
      };
    },
  };

  const response = await paginatedResponse(
    model,
    {
      query: { email: 'juanperez@gmail.com' },
      populate: [{ path: 'boards' }],
    },
    {
      page: '2',
      limit: '5',
      offset: '3',
      sort: 'name',
      order: 'desc',
      search: 'home',
    },
  );

  assert.deepEqual(state.query, { email: 'juanperez@gmail.com' });
  assert.deepEqual(state.countQuery, { email: 'juanperez@gmail.com' });
  assert.equal(state.sort, '-name');
  assert.equal(state.skip, 8);
  assert.equal(state.limit, 5);
  assert.deepEqual(state.populate, [{ path: 'boards' }]);

  assert.equal(response.total, 27);
  assert.equal(response.page, 2);
  assert.equal(response.limit, 5);
  assert.equal(response.offset, 3);
  assert.equal(response.sort, '-name');
  assert.equal(response.search, 'home');
  assert.deepEqual(response.data, rows);
});
