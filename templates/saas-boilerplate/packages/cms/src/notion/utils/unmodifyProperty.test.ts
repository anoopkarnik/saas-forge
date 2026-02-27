import { describe, it, expect } from 'vitest';
import { unmodifyProperty } from './unmodifyProperty';

describe('unmodifyProperty', () => {
    it('should unmodify unique_id', () => {
        expect(unmodifyProperty({ type: 'unique_id', unique_id: { prefix: 'PRE', number: 123 } })).toBe('PRE-123');
    });

    it('should unmodify relation', () => {
        expect(unmodifyProperty({ type: 'relation', relation: [{ id: 'id1' }, { id: 'id2' }] })).toEqual(['id1', 'id2']);
    });

    it('should unmodify number', () => {
        expect(unmodifyProperty({ type: 'number', number: 42.5 })).toBe(42.5);
    });

    it('should unmodify select', () => {
        expect(unmodifyProperty({ type: 'select', select: { name: 'Option A' } })).toBe('Option A');
        expect(unmodifyProperty({ type: 'select', select: null })).toBeNull();
    });

    it('should unmodify title', () => {
        expect(unmodifyProperty({ type: 'title', title: [{ plain_text: 'My Title Text' }] })).toBe('My Title Text');
        expect(unmodifyProperty({ type: 'title', title: [] })).toBe('');
    });

    it('should unmodify rich_text', () => {
        expect(unmodifyProperty({ type: 'rich_text', rich_text: [{ text: { content: 'Line 1' } }, { text: { content: 'Line 2' } }] })).toEqual(['Line 1\n', 'Line 2\n']);
        expect(unmodifyProperty({ type: 'rich_text', rich_text: [] })).toBe('');
    });

    it('should unmodify rollup', () => {
        // rollup uses recursive call
        expect(unmodifyProperty({ type: 'rollup', rollup: { type: 'number', number: 10 } })).toBe(10);
    });

    it('should unmodify people', () => {
        expect(unmodifyProperty({ type: 'people', people: [{ name: 'Alice' }, { name: 'Bob' }] })).toEqual(['Alice', 'Bob']);
    });

    it('should unmodify status', () => {
        expect(unmodifyProperty({ type: 'status', status: { name: 'Done' } })).toBe('Done');
        expect(unmodifyProperty({ type: 'status', status: null })).toBeNull();
    });

    it('should unmodify date', () => {
        expect(unmodifyProperty({ type: 'date', date: { start: '2023-05-10' } })).toBe('2023-05-10');
        expect(unmodifyProperty({ type: 'date', date: null })).toBeNull();
    });

    it('should unmodify last_edited_time', () => {
        // Time format is day short-moonth year HH:MM, in UTC
        const formatted = unmodifyProperty({ type: 'last_edited_time', last_edited_time: '2023-05-10T14:30:00Z' });
        expect(formatted).toBe('10 May 2023 14:30');
    });

    it('should unmodify created_time', () => {
        const formatted = unmodifyProperty({ type: 'created_time', created_time: '2021-01-05T08:05:00Z' });
        expect(formatted).toBe('05 Jan 2021 08:05');
    });

    it('should unmodify multi_select', () => {
        expect(unmodifyProperty({ type: 'multi_select', multi_select: [{ name: 'A' }, { name: 'B' }] })).toEqual(['A', 'B']);
    });

    it('should unmodify array', () => {
        expect(unmodifyProperty({ type: 'array', array: [{ type: 'number', number: 1 }, { type: 'number', number: 2 }] })).toEqual([1, 2]);
    });

    it('should unmodify files (external)', () => {
        expect(unmodifyProperty({ type: 'files', files: [{ type: 'external', external: { url: 'http://ext.com/img.png' } }] })).toEqual(['http://ext.com/img.png']);
    });

    it('should unmodify files (file)', () => {
        expect(unmodifyProperty({ type: 'files', files: [{ type: 'file', file: { url: 'http://aws.com/img.png' } }] })).toEqual(['http://aws.com/img.png']);
    });

    it('should unmodify files (other)', () => {
        expect(unmodifyProperty({ type: 'files', files: [{ type: 'other', other: { url: 'http://aws.com/img.png' } }] })).toEqual('');
    });

    it('should unmodify empty files', () => {
        expect(unmodifyProperty({ type: 'files', files: [] })).toBe('');
    });

    it('should unmodify url', () => {
        expect(unmodifyProperty({ type: 'url', url: 'https://test.com' })).toBe('https://test.com');
    });

    it('should unmodify checkbox', () => {
        expect(unmodifyProperty({ type: 'checkbox', checkbox: true })).toBe(true);
    });

    it('should unmodify formula', () => {
        expect(unmodifyProperty({ type: 'formula', formula: { type: 'number', number: 42 } })).toBe(42);
        expect(unmodifyProperty({ type: 'formula', formula: { type: 'string', string: 'abc' } })).toBe('abc');
    });

    it('should unmodify file_url', () => {
        expect(unmodifyProperty({ type: 'file_url', files: [{ external: { url: 'http://file.com' } }] })).toBe('http://file.com');
    });

    it('should handle array branches correctly', () => {
        expect(unmodifyProperty({ type: 'array', array: [] })).toEqual([]);
    });

    it('should return undefined for unknown types implicitly', () => {
        expect(unmodifyProperty({ type: 'unknown_type' })).toBeUndefined();
    });
});
