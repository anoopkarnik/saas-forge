// notion.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createDatabase,
  queryDatabase,
  createPage,
  modifyPage,
  getPage,
  getBlockChildren,
  deleteBlock,
  appendBlockChildren,
} from '../src'; // Adjust the path as needed


vi.mock('@notionhq/client', () => ({
    Client: vi.fn(() => notionMock),
  }));
  

const notionMock = {
  databases: {
    create: vi.fn(),
    query: vi.fn(),
  },
  pages: {
    create: vi.fn(),
    update: vi.fn(),
    retrieve: vi.fn(),
  },
  blocks: {
    children: {
      list: vi.fn(),
      append: vi.fn(),
    },
    delete: vi.fn(),
  },
};


describe('Notion API Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a database', async () => {
    const payload = {
      apiToken: 'api_token',
      parent: 'parent_page_id',
      title: 'Test Database',
      properties: {},
    };

    notionMock.databases.create.mockResolvedValue({ id: 'new_database_id' });

    const response = await createDatabase(payload);

    expect(notionMock.databases.create).toHaveBeenCalledWith({
      parent: { type: 'page_id', page_id: 'parent_page_id' },
      title: [
        {
          type: 'text',
          text: {
            content: 'Test Database',
          },
        },
      ],
      properties: {},
    });

    expect(response).toEqual({ id: 'new_database_id' });
  });

  it('should query a database', async () => {
    const payload = {
      database_id: 'database_id',
      filters_body: {},
    };

    notionMock.databases.query.mockResolvedValue({ results: [] });

    const response = await queryDatabase(payload);

    expect(notionMock.databases.query).toHaveBeenCalledWith({
      database_id: 'database_id',
      filter: {},
    });

    expect(response).toEqual({ results: [] });
  });

  it('should create a page', async () => {
    const payload = {
      body: {},
    };

    notionMock.pages.create.mockResolvedValue({ id: 'new_page_id' });

    const response = await createPage(payload);

    expect(notionMock.pages.create).toHaveBeenCalledWith({});

    expect(response).toEqual({ id: 'new_page_id' });
  });

  it('should modify a page', async () => {
    const payload = {
      page_id: 'page_id',
      body: {},
    };

    notionMock.pages.update.mockResolvedValue({ id: 'updated_page_id' });

    const response = await modifyPage(payload);

    expect(notionMock.pages.update).toHaveBeenCalledWith({
      page_id: 'page_id',
      properties: {},
    });

    expect(response).toEqual({ id: 'updated_page_id' });
  });

  it('should get a page', async () => {
    const payload = {
      page_id: 'page_id',
    };

    notionMock.pages.retrieve.mockResolvedValue({ id: 'page_id' });

    const response = await getPage(payload);

    expect(notionMock.pages.retrieve).toHaveBeenCalledWith({ page_id: 'page_id' });

    expect(response).toEqual({ id: 'page_id' });
  });

  it('should get block children', async () => {
    const payload = {
      block_id: 'block_id',
    };

    notionMock.blocks.children.list.mockResolvedValue({ results: [] });

    const response = await getBlockChildren(payload);

    expect(notionMock.blocks.children.list).toHaveBeenCalledWith({ block_id: 'block_id' });

    expect(response).toEqual({ results: [] });
  });

  it('should delete a block', async () => {
    const payload = {
      block_id: 'block_id',
    };

    notionMock.blocks.delete.mockResolvedValue({});

    const response = await deleteBlock(payload);

    expect(notionMock.blocks.delete).toHaveBeenCalledWith({ block_id: 'block_id' });

    expect(response).toEqual({});
  });

  it('should append block children', async () => {
    const payload = {
      block_id: 'block_id',
      children: [],
    };

    notionMock.blocks.children.append.mockResolvedValue({});

    const response = await appendBlockChildren(payload);

    expect(notionMock.blocks.children.append).toHaveBeenCalledWith({
      block_id: 'block_id',
      children: [],
    });

    expect(response).toEqual({});
  });
});
