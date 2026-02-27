import { describe, it, expect } from 'vitest';
import { modifyProperty } from './modifyProperty';

describe('modifyProperty', () => {
    it('should map text property', async () => {
        const prop = { type: 'text', value: 'hello' };
        expect(await modifyProperty(prop)).toEqual({ rich_text: [{ text: { content: 'hello' } }] });
    });

    it('should map title property', async () => {
        const prop = { type: 'title', value: 'My Title' };
        expect(await modifyProperty(prop)).toEqual({ title: [{ text: { content: 'My Title' } }] });
    });

    it('should map date property', async () => {
        const prop1 = { type: 'date', value: '2023-05-10' };
        expect(await modifyProperty(prop1)).toEqual({ date: { start: '2023-05-10' } });

        // Fallback date
        const prop2 = { type: 'date', value: null };
        expect(await modifyProperty(prop2)).toEqual({ date: { start: '1900-01-01' } });
    });

    it('should map number property', async () => {
        const prop = { type: 'number', value: 42 };
        expect(await modifyProperty(prop)).toEqual({ number: 42 });
    });

    it('should map file_url property', async () => {
        const prop = { type: 'file_url', value: 'https://file.com/image.png' };
        expect(await modifyProperty(prop)).toEqual({ files: [{ type: 'external', name: 'Cover', external: { url: 'https://file.com/image.png' } }] });
    });

    it('should map url property', async () => {
        const prop = { type: 'url', value: 'https://example.com' };
        expect(await modifyProperty(prop)).toEqual({ url: 'https://example.com' });
    });

    it('should map checkbox property', async () => {
        const prop = { type: 'checkbox', value: true };
        expect(await modifyProperty(prop)).toEqual({ checkbox: true });
    });

    it('should map select property', async () => {
        const prop = { type: 'select', value: 'Option A' };
        expect(await modifyProperty(prop)).toEqual({ select: { name: 'Option A' } });
    });

    it('should map multi_select property', async () => {
        const prop = { type: 'multi_select', value: ['Option A', 'Option B'] };
        expect(await modifyProperty(prop)).toEqual({ multi_select: [{ name: 'Option A' }, { name: 'Option B' }] });
    });

    it('should map relation property', async () => {
        const prop = { type: 'relation', value: ['id_1', 'id_2'] };
        expect(await modifyProperty(prop)).toEqual({ relation: [{ id: 'id_1' }, { id: 'id_2' }] });
    });

    it('should map status property', async () => {
        const prop = { type: 'status', value: 'In Progress' };
        expect(await modifyProperty(prop)).toEqual({ status: { name: 'In Progress' } });
    });
});
