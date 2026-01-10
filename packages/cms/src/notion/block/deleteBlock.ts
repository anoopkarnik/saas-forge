import {Client } from '@notionhq/client'
import { retrieveBlockChildren } from './retrieveBlockChildren';

export const deleteBlock = async ({apiToken,block_id}:any) =>{
    const notion = new Client({auth: apiToken})
    const response = await notion.blocks.delete({ block_id: block_id })
    return response;
}

async function deletePageBlocks(page_id:any) {
    const response = await retrieveBlockChildren({block_id: page_id});
    if (response.results.length > 0) {
        for (const result of response.results) {
            await deleteBlock(result.id);
        }
    }
    return { message: 'Deleted the children' };
}
