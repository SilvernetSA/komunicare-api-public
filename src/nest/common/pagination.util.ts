import { Document, Model, PopulateOptions } from 'mongoose';

export interface RequestQuery {
  page?: number;
  limit?: number;
  offset?: number;
  sort?: string;
  search?: string;
  order?: string;
}

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  limit: number;
  offset: number;
  sort: string;
  search: string;
  data: T[];
}

const getParameters = ({
  page = 1,
  limit = 10,
  offset = 0,
  sort = '-_id',
  search = '',
  order = '',
}: RequestQuery = {}): RequestQuery => {
  const parsedPage = !isNaN(Number(page)) ? parseInt(`${page}`, 10) : 1;
  const parsedLimit = !isNaN(Number(limit)) ? parseInt(`${limit}`, 10) : 10;
  const parsedOffset = !isNaN(Number(offset)) ? parseInt(`${offset}`, 10) : 0;
  const normalizedOrder = order?.toLowerCase?.() || '';

  const baseSort = sort && sort.length ? sort : '-_id';
  const normalizedSort =
    normalizedOrder === 'desc'
      ? baseSort.startsWith('-')
        ? baseSort
        : `-${baseSort}`
      : normalizedOrder === 'asc' && baseSort.startsWith('-')
        ? baseSort.slice(1)
        : baseSort;

  return {
    page: parsedPage > 0 ? parsedPage : 1,
    limit: parsedLimit > 0 ? parsedLimit : 10,
    offset: parsedOffset >= 0 ? parsedOffset : 0,
    sort: normalizedSort,
    search: search && search.length ? search : '',
    order: normalizedOrder,
  };
};

export async function paginatedResponse<T extends Document>(
  model: Model<T>,
  options: { query?: Record<string, any>; populate?: PopulateOptions[] } = {},
  requestQuery: RequestQuery,
): Promise<PaginatedResponse<T>> {
  let total = 0;
  let data: T[] = [];

  const { page, limit, offset, sort, search } = getParameters(requestQuery);
  const skip = ((page ?? 1) - 1) * (limit ?? 10) + (offset ?? 0);
  const query = options.query || {};
  const populate = options.populate || [];

  let queryModel = model.find(query).sort(sort).skip(skip).limit(limit ?? 10);

  populate.forEach((pop) => {
    queryModel = queryModel.populate(pop);
  });

  try {
    data = await queryModel.exec();
    total = await model.countDocuments(query).exec();
  } catch (error) {
    console.error('Error in paginatedResponse:', error);
  }

  return {
    total,
    page: page ?? 1,
    limit: limit ?? 10,
    offset: offset ?? 0,
    sort: sort ?? '-_id',
    search: search ?? '',
    data,
  };
}
