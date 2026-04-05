import { describe, it, expect } from 'vitest';
import { modifyBlock } from './modifyBlock';

describe('modifyBlock', () => {
    it('should map heading_3 block properties', () => {
        const block = {
            id: 'h3_id',
            has_children: false,
            heading_3: {
                rich_text: [{ text: { content: 'Heading 3 Text' } }]
            }
        };
        const result = modifyBlock(block);
        expect(result).toEqual({ name: 'Heading 3 Text', id: undefined });
    });

    it('should map numbered_list_item block properties', () => {
        const block = {
            id: 'list_id',
            has_children: true,
            numbered_list_item: {
                rich_text: [{ text: { content: 'List Item Text' } }]
            }
        };
        const result = modifyBlock(block);
        expect(result).toEqual({ name: 'List Item Text', id: 'list_id' });
    });

    it('should map code block properties', () => {
        const block = {
            id: 'code_id',
            has_children: false,
            code: {
                rich_text: [{ text: { content: 'console.log("hello")' } }]
            }
        };
        const result = modifyBlock(block);
        expect(result).toEqual({ name: 'console.log("hello")', id: undefined });
    });

    it('should return undefined for unhandled block types', () => {
        const block = {
            id: 'unknown_id',
            type: 'paragraph',
            paragraph: {
                rich_text: [{ text: { content: 'text' } }]
            }
        };
        const result = modifyBlock(block);
        expect(result).toBeUndefined();
    });

    it('should handle heading_3 with has_children true', () => {
        const block = {
            id: 'h3_id',
            has_children: true,
            heading_3: {
                rich_text: [{ text: { content: 'Heading 3 Text' } }]
            }
        };
        const result = modifyBlock(block);
        expect(result).toEqual({ name: 'Heading 3 Text', id: 'h3_id' });
    });

    it('should handle numbered_list_item with has_children false', () => {
        const block = {
            id: 'list_id',
            has_children: false,
            numbered_list_item: {
                rich_text: [{ text: { content: 'List Item Text' } }]
            }
        };
        const result = modifyBlock(block);
        expect(result).toEqual({ name: 'List Item Text', id: undefined });
    });

    it('should handle code with has_children true', () => {
        const block = {
            id: 'code_id',
            has_children: true,
            code: {
                rich_text: [{ text: { content: 'console.log("hello")' } }]
            }
        };
        const result = modifyBlock(block);
        expect(result).toEqual({ name: 'console.log("hello")', id: 'code_id' });
    });
});
