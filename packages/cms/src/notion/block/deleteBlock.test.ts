import { describe, it, expect, beforeEach, vi } from 'vitest';
import { deleteBlock } from './deleteBlock';
import { retrieveBlockChildren } from './retrieveBlockChildren';

vi.mock('@notionhq/client', () => ({
  Client: vi.fn(function() { return notionMock; }),
}));

vi.mock('./retrieveBlockChildren', () => ({
    retrieveBlockChildren: vi.fn(),
}));

const notionMock = vi.hoisted(() => ({
  blocks: {
    delete: vi.fn()
  }
}));

// We only need to test `deleteBlock` as `deletePageBlocks` is not exported from the module
describe('deleteBlock module', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('deleteBlock', () => {
        it('should delete a block successfully', async () => {
            const payload = {
                apiToken: 'test_token',
                block_id: 'block_123',
            };

            notionMock.blocks.delete.mockResolvedValue({ id: 'deleted_block' });

            const response = await deleteBlock(payload);

            expect(notionMock.blocks.delete).toHaveBeenCalledWith({
                block_id: 'block_123',
            });

            expect(response).toEqual({ id: 'deleted_block' });
        });
    });

    describe('deletePageBlocks', () => {
        it('should retrieve block children and delete them', async () => {
            const { deletePageBlocks } = await import('./deleteBlock.js');

            vi.mocked(retrieveBlockChildren).mockResolvedValue({
                 results: [{ id: 'child_1' } as any, { id: 'child_2' } as any],
                 type: 'block',
                 block: {},
                 object: 'list',
                 next_cursor: null,
                 has_more: false 
                });
            notionMock.blocks.delete.mockResolvedValue({ id: 'deleted_block' });

            const result = await deletePageBlocks('test_token', 'page_id');

            expect(retrieveBlockChildren).toHaveBeenCalledWith({ apiToken: 'test_token', block_id: 'page_id' });
            expect(notionMock.blocks.delete).toHaveBeenCalledTimes(2);
            expect(notionMock.blocks.delete).toHaveBeenCalledWith({ block_id: 'child_1' });
            expect(result).toEqual({ message: 'Deleted the children' });
        });

        it('should exit early if no block children exist', async () => {
             const { deletePageBlocks } = await import('./deleteBlock.js');

             vi.mocked(retrieveBlockChildren).mockResolvedValue({
                 results: [],
                 type: 'block',
                 block: {},
                 object: 'list',
                 next_cursor: null,
                 has_more: false 
             });

             const result = await deletePageBlocks('test_token', 'page_id_empty');

             expect(retrieveBlockChildren).toHaveBeenCalledWith({ apiToken: 'test_token', block_id: 'page_id_empty' });
             expect(notionMock.blocks.delete).not.toHaveBeenCalled();
             expect(result).toEqual({ message: 'Deleted the children' });
        });
    });
});
