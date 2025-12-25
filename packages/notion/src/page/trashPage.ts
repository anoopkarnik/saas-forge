import {Client } from '@notionhq/client'

export const trashPage = async ({apiToken,page_id}:any) =>{
    const notion = new Client({auth: apiToken})
    const response = await notion.pages.update({ page_id: page_id, in_trash: true })
    return response;
}