import { describe, it, expect } from 'vitest';
import { modifyChildrenProperty } from './modifyChildrenProperty';

describe('modifyChildrenProperty', () => {
    it('should handle table_of_contents type', async () => {
        const prop = { type: 'table_of_contents', value: 'something' };
        const result = await modifyChildrenProperty(prop);
        expect(result).toEqual({ color: 'default' });
    });

    it('should handle callout type', async () => {
        const prop = { type: 'callout', value: { icon: { emoji: '💡' } } };
        const result = await modifyChildrenProperty(prop);
        expect(result).toEqual({ icon: { emoji: '💡' } });
    });

    it('should handle embed type', async () => {
        const prop = { type: 'embed', value: 'https://example.com/video' };
        const result = await modifyChildrenProperty(prop);
        expect(result).toEqual({ url: 'https://example.com/video' });
    });

    it('should handle default text types', async () => {
        const prop = { type: 'paragraph', value: 'Some text content' };
        const result = await modifyChildrenProperty(prop);
        expect(result).toEqual({ rich_text: [{ text: { content: 'Some text content' } }] });
    });
});
