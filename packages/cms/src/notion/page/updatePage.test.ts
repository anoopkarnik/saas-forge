import { describe, it, expect, beforeEach, vi } from 'vitest';
import { updatePage, updateNotionPage } from './updatePage';
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
    update: vi.fn(),
  }
}));

describe('updatePage module', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('updatePage', () => {
        it('should modify a page successfully', async () => {
            const payload = {
                page_id: 'page_id',
                body: { properties: {} },
            };

            notionMock.pages.update.mockResolvedValue({ id: 'updated_page_id' });

            const response = await updatePage(payload);

            expect(notionMock.pages.update).toHaveBeenCalledWith({
                page_id: 'page_id',
                properties: {},
            });

            expect(response).toEqual({ id: 'updated_page_id' });
        });

        it('should handle API errors smoothly', async () => {
            const payload = {
                page_id: 'page_id',
                body: { properties: {} },
            };

            notionMock.pages.update.mockResolvedValue({ status: 400, message: 'Invalid payload' });

            const response = await updatePage(payload);
            expect(response).toEqual({ status: 400, message: 'Invalid payload' });
        });
    });

    describe('updateNotionPage', () => {
        it('should construct body and modify result correctly', async () => {
            vi.mocked(modifyProperty)
                .mockResolvedValueOnce({ rich_text: [{ text: { content: 'updated_text' } }] });

            notionMock.pages.update.mockResolvedValue({ id: 'page_id' });
            vi.mocked(modifyResult).mockResolvedValue({ id: 'page_id', formatted: true });

            const properties = [
                { name: 'Description', type: 'rich_text', value: 'updated_text' }
            ];

            const response = await updateNotionPage({
                apiToken: 'token',
                page_id: 'page_id',
                properties
            });

            // Ensure properties were mapped
            expect(modifyProperty).toHaveBeenCalledTimes(1);
            expect(modifyProperty).toHaveBeenCalledWith(properties[0]);

            // Ensure updatePage was called with constructed body
            expect(notionMock.pages.update).toHaveBeenCalledWith({
                page_id: 'page_id',
                properties: {
                    'Description': { rich_text: [{ text: { content: 'updated_text' } }] }
                }
            });

            // Ensure result was modified
            expect(modifyResult).toHaveBeenCalledWith({ id: 'page_id' });
            expect(response).toEqual({ id: 'page_id', formatted: true });
        });
    });
});
