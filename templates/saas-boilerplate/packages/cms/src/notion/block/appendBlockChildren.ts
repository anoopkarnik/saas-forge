import {Client } from '@notionhq/client'
import { modifyChildrenProperty } from '../utils/modifyChildrenProperty';

export const appendBlockChildren = async ({apiToken,block_id,children}:any) =>{
    const notion = new Client({auth: apiToken})
    const response = await notion.blocks.children.append({ block_id: block_id, children: children })
    return response;
}


async function addChildrenToPage(page_id:any, children:any) {
    const body = constructChildrenBody(children);
    const response = await appendBlockChildren({page_id, body});
    return { message: 'Added the children' };
}

function constructChildrenBody(children:any) {
    const childrenBodyList = children.map((child:any) => {
        return {
            [child.type]: modifyChildrenProperty(child)
        };
    });
    return { children: childrenBodyList };
}

