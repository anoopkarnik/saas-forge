import {Client } from '@notionhq/client'
import { modifyResult } from '../utils/modifyResult';

export const retrievePage = async ({apiToken,page_id}:any) =>{
    const notion = new Client({auth: apiToken})
    const response = await notion.pages.retrieve({ page_id: page_id })
    return response;
}

export const getNotionPage = async ({apiToken,page_id}:any) => {
    const response = await retrievePage({apiToken,page_id});
    return modifyResult(response);
}
