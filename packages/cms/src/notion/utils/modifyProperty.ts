export async function modifyProperty(property:any) {
    const value = typeof property.value === 'string' ? property.value.trim() : property.value;
    switch (property.type) {
        case 'text':
            return { rich_text: [{ text: { content: value } }] };
        case 'title':
            return { title: [{ text: { content: value } }] };
        case 'date':
            return { date: { start: value || '1900-01-01' } };
        case 'number':
            return { number: value };
        case 'file_url':
            // Skip empty file URLs — Notion rejects external files with blank URLs
            if (!value) return null;
            // Notion-hosted file URLs cannot be set via the API as external — skip them
            if (value.includes('secure.notion-static.com') || value.includes('prod-files-secure.s3')) {
                return null;
            }
            return { files: [{ type: 'external', name: 'Cover', external: { url: value } }] };
        case 'url':
            return { url: value || null };
        case 'checkbox':
            return { checkbox: value };
        case 'select':
            if (!value) return null;
            return { select: { name: value } };
        case 'multi_select':
            return { multi_select: value.map((v:any) => ({ name: typeof v === 'string' ? v.trim() : v })) };
        case 'relation':
            return { relation: value.map((v:any) => ({ id: typeof v === 'string' ? v.trim() : v })) };
        case 'status':
            return { status: { name: value } };
    }
}