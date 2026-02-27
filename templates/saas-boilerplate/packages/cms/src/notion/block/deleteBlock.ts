import {Client } from '@notionhq/client'
import { retrieveBlockChildren } from './retrieveBlockChildren';

export const deleteBlock = async ({apiToken,block_id}:any) =>{
    const notion = new Client({auth: apiToken})
    const response = await notion.blocks.delete({ block_id: block_id })
    return response;
}

export async function deletePageBlocks(apiToken: string, page_id: any) {
    const response = await retrieveBlockChildren({ apiToken, block_id: page_id });
    if (response.results.length > 0) {
        for (const result of response.results) {
            await deleteBlock({ apiToken, block_id: result.id });
        }
    }
    return { message: 'Deleted the children' };
}
