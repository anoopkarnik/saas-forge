import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createDatabase } from './createDatabase';

vi.mock('@notionhq/client', () => ({
  Client: vi.fn(function() { return notionMock; }),
}));

const notionMock = vi.hoisted(() => ({
  databases: {
    create: vi.fn(),
  }
}));

describe('createDatabase', () => {
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
});
