import { describe, it, expect, beforeEach, vi } from 'vitest';
import { retrievePage, getNotionPage } from './retrievePage';
import { modifyResult } from '../utils/modifyResult';

vi.mock('@notionhq/client', () => ({
  Client: vi.fn(function() { return notionMock; }),
}));

vi.mock('../utils/modifyResult', () => ({
    modifyResult: vi.fn(),
}));

const notionMock = vi.hoisted(() => ({
  pages: {
    retrieve: vi.fn(),
  }
}));

describe('retrievePage module', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('retrievePage', () => {
        it('should get a page', async () => {
            const payload = {
                apiToken: 'api_token',
                page_id: 'page_id',
            };

            notionMock.pages.retrieve.mockResolvedValue({ id: 'page_id' });

            const response = await retrievePage(payload);

            expect(notionMock.pages.retrieve).toHaveBeenCalledWith({ page_id: 'page_id' });

            expect(response).toEqual({ id: 'page_id' });
        });
    });

    describe('getNotionPage', () => {
        it('should retrieve and modify result', async () => {
            notionMock.pages.retrieve.mockResolvedValue({ id: 'page_id', raw: true });
            vi.mocked(modifyResult).mockResolvedValue({ id: 'page_id', formatted: true });

            const response = await getNotionPage({
                apiToken: 'token',
                page_id: 'page_id',
            });

            expect(notionMock.pages.retrieve).toHaveBeenCalledWith({ page_id: 'page_id' });
            expect(modifyResult).toHaveBeenCalledWith({ id: 'page_id', raw: true });
            expect(response).toEqual({ id: 'page_id', formatted: true });
        });
    });
});
