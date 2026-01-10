import {Client } from '@notionhq/client'
import { CreateDatabaseParameters } from '@notionhq/client/build/src/api-endpoints';
import { createDatabaseProps } from '../props/request';

export const createDatabase = async ({apiToken,parent,title,properties}:createDatabaseProps) =>{
    const notion = new Client({auth: apiToken})
    let payload:CreateDatabaseParameters = {
        "parent": { "type": "page_id", "page_id": parent },
        "title": [
            {
                "type": "text",
                "text": {
                    "content": title
                }
            }
        ],
        "properties": properties
    }
    const response = await notion.databases.create(payload)
    return response;
}