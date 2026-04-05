export function modifyBlock(block:any) {
    if (block.heading_3) {
        return {
            name: block.heading_3.rich_text[0].text.content,
            id: block.has_children ? block.id : undefined
        };
    } else if (block.numbered_list_item) {
        return {
            name: block.numbered_list_item.rich_text[0].text.content,
            id: block.has_children ? block.id : undefined
        };
    } else if (block.code) {
        return {
            name: block.code.rich_text[0].text.content,
            id: block.has_children ? block.id : undefined
        };
    }
}

