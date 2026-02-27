import { describe, it, expect, beforeEach, vi } from 'vitest';
import { trashPage } from './trashPage';

vi.mock('@notionhq/client', () => ({
  Client: vi.fn(function() { return notionMock; }),
}));

const notionMock = vi.hoisted(() => ({
  pages: {
    update: vi.fn(),
  }
}));

describe('trashPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should trash a page', async () => {
    const payload = {
      apiToken: 'api_token',
      page_id: 'page_id',
    };

    notionMock.pages.update.mockResolvedValue({ id: 'page_id', in_trash: true });

    const response = await trashPage(payload);

    expect(notionMock.pages.update).toHaveBeenCalledWith({
        page_id: 'page_id',
        in_trash: true
    });

    expect(response).toEqual({ id: 'page_id', in_trash: true });
  });
});
