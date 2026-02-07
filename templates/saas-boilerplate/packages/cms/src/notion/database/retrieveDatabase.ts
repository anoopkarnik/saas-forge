import {Client } from '@notionhq/client';

export const getDatabaseProperties = async ({apiToken,database_id}:any) =>{
    const notion = new Client({auth: apiToken})
    const response = await notion.databases.retrieve({ database_id: database_id })
    return response;
}