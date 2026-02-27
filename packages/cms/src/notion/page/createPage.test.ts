import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPage, createNotionPage } from './createPage';
import { modifyResult } from '../utils/modifyResult';
import { modifyProperty } from '../utils/modifyProperty';

vi.mock('@notionhq/client', () => ({
  Client: vi.fn(function() { return notionMock; }),
}));

vi.mock('../utils/modifyResult', () => ({
    modifyResult: vi.fn(),
}));

vi.mock('../utils/modifyProperty', () => ({
    modifyProperty: vi.fn(),
}));

// Mock logger to suppress console output during tests
vi.mock('@workspace/observability/winston-logger', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn()
    }
}));

const notionMock = vi.hoisted(() => ({
  pages: {
    create: vi.fn(),
  }
}));

describe('createPage module', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createPage', () => {
        it('should create a page successfully', async () => {
            const payload = {
                body: { parent: { database_id: 'db_1' } },
            };

            notionMock.pages.create.mockResolvedValue({ id: 'new_page_id' });

            const response = await createPage(payload);

            expect(notionMock.pages.create).toHaveBeenCalledWith({
                 parent: { database_id: 'db_1' } 
            });

            expect(response).toEqual({ id: 'new_page_id' });
        });

        it('should handle API errors smoothly', async () => {
            const payload = {
                body: {},
            };

            notionMock.pages.create.mockResolvedValue({ status: 400, message: 'Bad request' });

            const response = await createPage(payload);
            expect(response).toEqual({ status: 400, message: 'Bad request' });
        });
    });

    describe('createNotionPage', () => {
        it('should construct body and modify result correctly', async () => {
            vi.mocked(modifyProperty)
                .mockResolvedValueOnce({ title: [{ text: { content: 'hello' } }] }) // prop 1
                .mockResolvedValueOnce({ number: 42 }); // prop 2

            notionMock.pages.create.mockResolvedValue({ id: 'notion_page_123' });
            vi.mocked(modifyResult).mockResolvedValue({ id: 'notion_page_123', formatted: true });

            const properties = [
                { name: 'Name', type: 'title', value: 'hello' },
                { name: 'Count', type: 'number', value: 42 }
            ];

            const response = await createNotionPage({
                apiToken: 'token',
                database_id: 'db_id',
                properties
            });

            // Ensure properties were mapped
            expect(modifyProperty).toHaveBeenCalledTimes(2);
            expect(modifyProperty).toHaveBeenNthCalledWith(1, properties[0]);
            expect(modifyProperty).toHaveBeenNthCalledWith(2, properties[1]);

            // Ensure createPage was called with constructed body
            expect(notionMock.pages.create).toHaveBeenCalledWith({
                parent: {
                    type: 'database_id',
                    database_id: 'db_id'
                },
                properties: {
                    'Name': { title: [{ text: { content: 'hello' } }] },
                    'Count': { number: 42 }
                }
            });

            // Ensure result was modified
            expect(modifyResult).toHaveBeenCalledWith({ id: 'notion_page_123' });
            expect(response).toEqual({ id: 'notion_page_123', formatted: true });
        });
    });
});
