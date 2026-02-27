import { describe, it, expect, beforeEach, vi } from 'vitest';
import { retrieveBlockChildren, retrieveBlockChildrenAll, retrieveBlocksTree } from './retrieveBlockChildren';

vi.mock('@notionhq/client', () => ({
  Client: vi.fn(function() { return notionMock; }),
}));

// Mock logger to suppress console output during tests
vi.mock('@workspace/observability/winston-logger', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn()
    }
}));

const notionMock = vi.hoisted(() => ({
  blocks: {
    children: {
        list: vi.fn()
    }
  }
}));

describe('retrieveBlockChildren module', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('retrieveBlockChildren', () => {
        it('should list block children successfully', async () => {
            const payload = {
                apiToken: 'test_token',
                block_id: 'block_123',
            };

            notionMock.blocks.children.list.mockResolvedValue({ results: [{ id: 'child_1' }] });

            const response = await retrieveBlockChildren(payload);

            expect(notionMock.blocks.children.list).toHaveBeenCalledWith({
                block_id: 'block_123',
            });

            expect(response).toEqual({ results: [{ id: 'child_1' }] });
        });
    });

    describe('retrieveBlockChildrenAll', () => {
        it('should paginate and retrieve all block children', async () => {
            notionMock.blocks.children.list
                .mockResolvedValueOnce({ results: [{ id: 'child_1' }], has_more: true, next_cursor: 'cursor_1' })
                .mockResolvedValueOnce({ results: [{ id: 'child_2' }], has_more: false, next_cursor: null });

            const blocks = await retrieveBlockChildrenAll({
                apiToken: 'test_token',
                block_id: 'block_123',
            });

            expect(notionMock.blocks.children.list).toHaveBeenCalledTimes(2);
            expect(notionMock.blocks.children.list).toHaveBeenNthCalledWith(1, {
                block_id: 'block_123',
                page_size: 100,
                start_cursor: undefined
            });
            expect(notionMock.blocks.children.list).toHaveBeenNthCalledWith(2, {
                block_id: 'block_123',
                page_size: 100,
                start_cursor: 'cursor_1'
            });

            expect(blocks).toEqual([{ id: 'child_1' }, { id: 'child_2' }]);
        });

        it('should handle undefined next_cursor', async () => {
            notionMock.blocks.children.list
                .mockResolvedValueOnce({ results: [{ id: 'child_1' }], has_more: true, next_cursor: null })
                .mockResolvedValueOnce({ results: [{ id: 'child_2' }], has_more: false, next_cursor: undefined });

            const blocks = await retrieveBlockChildrenAll({
                apiToken: 'test_token',
                block_id: 'block_123',
            });

            expect(notionMock.blocks.children.list).toHaveBeenCalledTimes(2);
            expect(notionMock.blocks.children.list).toHaveBeenNthCalledWith(2, {
                block_id: 'block_123',
                page_size: 100,
                start_cursor: undefined
            });
            expect(blocks).toEqual([{ id: 'child_1' }, { id: 'child_2' }]);
        });
    });

    describe('retrieveBlocksTree', () => {
        it('should recursively retrieve full block tree including children of children', async () => {
            // Setup a mock implementation that returns different tree depths based on block_id
            notionMock.blocks.children.list.mockImplementation(async (args) => {
                if (args.block_id === 'root_block') {
                    return {
                        results: [
                            { id: 'child_1', has_children: true },
                            { id: 'child_2', has_children: false }
                        ],
                        has_more: false
                    };
                } else if (args.block_id === 'child_1') {
                    return {
                        results: [
                            { id: 'sub_child_1', has_children: false }
                        ],
                        has_more: false
                    };
                }
                return { results: [], has_more: false };
            });

            const blocksTree = await retrieveBlocksTree({
                apiToken: 'test_token',
                block_id: 'root_block',
            });

            expect(notionMock.blocks.children.list).toHaveBeenCalledTimes(2);

            expect(blocksTree).toEqual([
                {
                    id: 'child_1',
                    has_children: true,
                    children: [
                        { id: 'sub_child_1', has_children: false, children: [] }
                    ]
                },
                {
                    id: 'child_2',
                    has_children: false,
                    children: []
                }
            ]);
        });
        
        it('should handle blocks with no children effectively', async () => {
            notionMock.blocks.children.list.mockImplementation(async (args) => {
                if (args.block_id === 'root_block_empty') {
                    return {
                        results: [
                            { id: 'child_1', has_children: false }
                        ],
                        has_more: false
                    };
                }
                return { results: [], has_more: false };
            });

            const blocksTree = await retrieveBlocksTree({
                apiToken: 'test_token',
                block_id: 'root_block_empty',
            });

            expect(notionMock.blocks.children.list).toHaveBeenCalledTimes(1);

            expect(blocksTree).toEqual([
                {
                    id: 'child_1',
                    has_children: false,
                    children: []
                }
            ]);
        });
    });
});
