import {Client } from '@notionhq/client'
import { logger } from '@workspace/winston-logger/index';
import { modifyBlock } from '../utils/modifyBlock';

export const retrieveBlockChildren = async ({apiToken,block_id}:any) =>{
    const notion = new Client({auth: apiToken})
    const response = await notion.blocks.children.list({ block_id: block_id })
    return response;
}

export const retrieveBlockChildrenAll = async ({apiToken, block_id}:any)=> {
    const blocks: any[] = [];
    let cursor: string | undefined = undefined;
    const notion = new Client({auth: apiToken})


    while (true) {
        const res = await notion.blocks.children.list({block_id, start_cursor: cursor, page_size: 100})
        blocks.push(...res.results);
        if (!res.has_more) break;
        cursor = res.next_cursor ?? undefined;
    }
    return blocks
}

export const retrieveBlocksTree = async ({apiToken, block_id}:any):Promise<any[]> => {
    const blocks = await retrieveBlockChildrenAll({apiToken, block_id});

    // Attach children for blocks that have them
    const withChildren = await Promise.all(
        blocks.map(async (block:any) => {
            if (block.has_children) {
                const children = await retrieveBlocksTree({apiToken, block_id: block.id});
                return { ...block, children };
            }
            return {...block, children: []}
        })
    )

    return withChildren;
}