import { describe, it, expect, beforeEach, vi } from 'vitest';
import { queryDatabase, queryNotionDatabase, queryAllNotionDatabase } from './queryDatabase';
import { modifyResult } from '../utils/modifyResult';

vi.mock('@notionhq/client', () => ({
  Client: vi.fn(function() { return notionMock; }),
}));

vi.mock('../utils/modifyResult', () => ({
    modifyResult: vi.fn(),
}));

// Mock logger to suppress console output during tests
vi.mock('@workspace/observability/winston-logger', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn()
    }
}));

const notionMock = vi.hoisted(() => ({
  databases: {
    query: vi.fn(),
  }
}));

describe('queryDatabase module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('queryDatabase', () => {
      it('should query a database successfully', async () => {
        const payload = {
          database_id: 'database_id',
          body: { filter: {} },
        };
    
        notionMock.databases.query.mockResolvedValue({ results: [{id: 1}], has_more: false, next_cursor: null });
    
        const response = await queryDatabase(payload);
    
        expect(notionMock.databases.query).toHaveBeenCalledWith({
          database_id: 'database_id',
          filter: {},
        });
    
        expect(response).toEqual({ results: [{id: 1}], has_more: false, next_cursor: null });
      });

      it('should handle API errors smoothly', async () => {
        const payload = {
          database_id: 'database_id',
          body: { filter: {} },
        };
    
        // Notion API errors typically return an object with a 'status' property
        notionMock.databases.query.mockResolvedValue({ status: 400, code: 'validation_error', message: 'Error' });
    
        const response = await queryDatabase(payload);
    
        expect(response).toEqual({ results: [], has_more: false, next_cursor: '' });
      });
  });

  describe('queryNotionDatabase', () => {
      it('should map sorts and filters correctly', async () => {
        notionMock.databases.query.mockResolvedValue({ results: [{id: 1}], has_more: true, next_cursor: 'cursor_123' });
        vi.mocked(modifyResult).mockResolvedValue({ id: 1, modified: true });

        const filters = [
            { type: 'last_edited_time', condition: 'on_or_after', value: '2023-01-01' },
            { type: 'title', name: 'Name', condition: 'equals', value: 'Test' },
            { type: 'created_time', condition: 'on_or_before', value: '2023-12-31' },
            { type: 'ID', name: 'Task ID', condition: 'equals', value: 42 }
        ];

        const sorts = [
            { type: 'last_edited_time', direction: 'descending' },
            { type: 'date', name: 'Due Date', direction: 'ascending' },
            { type: 'created_time', direction: 'descending' }
        ];

        const response = await queryNotionDatabase({
            apiToken: 'token',
            database_id: 'db_id',
            filters,
            filter_condition: 'or',
            sorts,
            cursor: 'initial_cursor'
        });

        // Check if queryDatabase was called with mapped body
        expect(notionMock.databases.query).toHaveBeenCalledWith(expect.objectContaining({
            database_id: 'db_id',
            filter: {
                or: [
                    { timestamp: 'last_edited_time', last_edited_time: { on_or_after: '2023-01-01' } },
                    { property: 'Name', title: { equals: 'Test' } },
                    { timestamp: 'created_time', created_time: { on_or_before: '2023-12-31' } },
                    { property: 'Task ID', unique_id: { equals: 42 } }
                ]
            },
            sorts: [
                { timestamp: 'last_edited_time', direction: 'descending' },
                { property: 'Due Date', direction: 'ascending' },
                { timestamp: 'created_time', direction: 'descending' }
            ],
            start_cursor: 'initial_cursor'
        }));

        expect(response.results).toEqual([{ id: 1, modified: true }]);
        expect(response.has_more).toBe(true);
        expect(response.next_cursor).toBe('cursor_123');
      });
      
      it('should handle invalid filter and sort types', async () => {
        notionMock.databases.query.mockResolvedValue({ results: [], has_more: false, next_cursor: null });

        const filters = [
            { type: 'unknown_filter', condition: 'equals', value: 'Test' }
        ];

        const sorts = [
            { type: 'unknown_sort', direction: 'ascending' },
        ];

        const response = await queryNotionDatabase({
            apiToken: 'token',
            database_id: 'db_id',
            filters,
            sorts,
        });

        expect(notionMock.databases.query).toHaveBeenCalledWith(expect.objectContaining({
            filter: { and: [ undefined ] },
            sorts: [ undefined ]
        }));
      });
      
      it('should handle empty filter or sort gracefully', async () => {
        notionMock.databases.query.mockResolvedValue({ results: [], has_more: false, next_cursor: null });

        const filters: any[] = [];
        const sorts: any[] = [];

        const response = await queryNotionDatabase({
            apiToken: 'token',
            database_id: 'db_id',
            filters,
            sorts,
        });

        expect(notionMock.databases.query).toHaveBeenCalled();
      });

      it('should handle empty results from notion', async () => {
        notionMock.databases.query.mockResolvedValue({ results: [], has_more: false, next_cursor: null });

        const response = await queryNotionDatabase({
            apiToken: 'token',
            database_id: 'db_id',
        });

        expect(response.results).toEqual([]);
        expect(response.has_more).toBe(true); // Matches implementation behavior where has_more is initially true and not modified if results is empty
      });
  });

  describe('queryAllNotionDatabase', () => {
    it('should paginate through all results', async () => {
        notionMock.databases.query
            .mockResolvedValueOnce({ results: [{id: 1}], has_more: true, next_cursor: 'page2' })
            .mockResolvedValueOnce({ results: [{id: 2}], has_more: false, next_cursor: null });

        vi.mocked(modifyResult)
            .mockResolvedValueOnce({ id: 1, modified: true })
            .mockResolvedValueOnce({ id: 2, modified: true });

        const response = await queryAllNotionDatabase({
            apiToken: 'token',
            database_id: 'db_id',
            filters: [],
        });

        expect(notionMock.databases.query).toHaveBeenCalledTimes(2);
        
        // First call has no cursor
        expect(notionMock.databases.query).toHaveBeenNthCalledWith(1, expect.not.objectContaining({
             start_cursor: expect.anything()
        }));

        // Second call uses cursor returned from first call
        expect(notionMock.databases.query).toHaveBeenNthCalledWith(2, expect.objectContaining({
             start_cursor: 'page2'
        }));

        expect(response.results).toHaveLength(2);
        expect(response.results).toEqual([{ id: 1, modified: true }, { id: 2, modified: true }]);
    });
    
    it('should return empty results if database is empty', async () => {
        notionMock.databases.query.mockResolvedValueOnce({ results: [], has_more: false, next_cursor: null });

        const response = await queryAllNotionDatabase({
            apiToken: 'token',
            database_id: 'empty_db',
            filters: [],
        });

        expect(notionMock.databases.query).toHaveBeenCalledTimes(1);
        expect(response.results).toEqual([]);
    });
  });
});
