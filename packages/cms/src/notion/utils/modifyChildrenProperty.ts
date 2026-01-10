export async function modifyChildrenProperty(prop:any) {
    switch (prop.type) {
        case 'table_of_contents':
            return { color: 'default' };
        case 'callout':
            return prop.value;
        case 'embed':
            return { url: prop.value };
        default:
            return { rich_text: [{ text: { content: prop.value } }] };
    }
}

