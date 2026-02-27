import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getDatabaseProperties } from './retrieveDatabase';

vi.mock('@notionhq/client', () => ({
  Client: vi.fn(function() { return notionMock; }),
}));

const notionMock = vi.hoisted(() => ({
  databases: {
    retrieve: vi.fn(),
  }
}));

describe('getDatabaseProperties', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should retrieve a database', async () => {
    const payload = {
      apiToken: 'api_token',
      database_id: 'database_id',
    };

    notionMock.databases.retrieve.mockResolvedValue({ id: 'database_id', properties: {} });

    const response = await getDatabaseProperties(payload);

    expect(notionMock.databases.retrieve).toHaveBeenCalledWith({
      database_id: 'database_id'
    });

    expect(response).toEqual({ id: 'database_id', properties: {} });
  });
});
