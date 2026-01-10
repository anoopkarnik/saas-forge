export async function modifyProperty(property:any) {
    switch (property.type) {
        case 'text':
            return { rich_text: [{ text: { content: property.value } }] };
        case 'title':

            return { title: [{ text: { content: property.value } }] };
        case 'date':
            return { date: { start: property.value || '1900-01-01' } };
        case 'number':
            return { number: property.value };
        case 'file_url':
            return { files: [{ type: 'external', name: 'Cover', external: { url: property.value } }] };
        case 'url':
            return { url: property.value };
        case 'checkbox':
            return { checkbox: property.value };
        case 'select':
            return { select: { name: property.value } };
        case 'multi_select':
            return { multi_select: property.value.map((value:any) => ({ name: value })) };
        case 'relation':
            return { relation: property.value.map((value:any) => ({ id: value })) };
        case 'status':
            return { status: { name: property.value } };
    }
}