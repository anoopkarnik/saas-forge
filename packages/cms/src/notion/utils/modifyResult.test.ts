import { describe, it, expect, vi } from 'vitest';
import { modifyResult } from './modifyResult';
import { unmodifyProperty } from './unmodifyProperty';

vi.mock('./unmodifyProperty', () => ({
    unmodifyProperty: vi.fn((prop: any) => `unmodified_${prop.type}`)
}));

describe('modifyResult', () => {
    it('should iterate over properties and unmodify them', async () => {
        const result = {
            id: 'result_123',
            properties: {
                title_prop: { type: 'title', title: [{ plain_text: 'Title text' }] },
                number_prop: { type: 'number', number: 42 }
            }
        };

        const res = await modifyResult(result);

        expect(res).toEqual({
            id: 'result_123',
            title_prop: 'unmodified_title',
            number_prop: 'unmodified_number'
        });

        expect(unmodifyProperty).toHaveBeenCalledTimes(2);
        expect(unmodifyProperty).toHaveBeenCalledWith(result.properties.title_prop);
        expect(unmodifyProperty).toHaveBeenCalledWith(result.properties.number_prop);
    });
});
