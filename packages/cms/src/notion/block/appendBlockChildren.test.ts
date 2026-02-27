import { describe, it, expect, beforeEach, vi } from 'vitest';
import { appendBlockChildren } from './appendBlockChildren';
import { modifyChildrenProperty } from '../utils/modifyChildrenProperty';

vi.mock('@notionhq/client', () => ({
  Client: vi.fn(function() { return notionMock; }),
}));

vi.mock('../utils/modifyChildrenProperty', () => ({
    modifyChildrenProperty: vi.fn(),
}));

const notionMock = vi.hoisted(() => ({
  blocks: {
    children: {
        append: vi.fn()
    }
  }
}));

// We only need to test `appendBlockChildren` as `addChildrenToPage` is not exported from the module
describe('appendBlockChildren module', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('appendBlockChildren', () => {
        it('should append block children successfully', async () => {
            const payload = {
                apiToken: 'test_token',
                block_id: 'block_123',
                children: [
                    { type: 'paragraph', paragraph: { rich_text: [] } }
                ]
            };

            notionMock.blocks.children.append.mockResolvedValue({ id: 'new_block' });

            const response = await appendBlockChildren(payload);

            expect(notionMock.blocks.children.append).toHaveBeenCalledWith({
                block_id: 'block_123',
                children: [
                    { type: 'paragraph', paragraph: { rich_text: [] } }
                ]
            });

            expect(response).toEqual({ id: 'new_block' });
        });
    });

    describe('addChildrenToPage', () => {
        it('should construct body and append children', async () => {
            const { addChildrenToPage } = await import('./appendBlockChildren.js');
            
            vi.mocked(modifyChildrenProperty).mockResolvedValue({ rich_text: [{ text: { content: 'test' } }] });
            notionMock.blocks.children.append.mockResolvedValue({ id: 'new_block' });

            const result = await addChildrenToPage('test_token', 'page_id', [{ type: 'paragraph', value: 'test' }]);
            
            expect(result).toEqual({ message: 'Added the children' });
            expect(modifyChildrenProperty).toHaveBeenCalledWith({ type: 'paragraph', value: 'test' });
        });
    });
});
