import {Client } from '@notionhq/client'
import { CreateDatabaseParameters } from '@notionhq/client/build/src/api-endpoints';
import { createDatabaseProps } from './props/request';
import { logger } from '@workspace/winston-logger/index';

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

export const queryDatabase = async ({apiToken,database_id, body}:any) =>{
    const notion = new Client({auth: apiToken})
    logger.info(`querying database ${database_id} with this ${JSON.stringify(body)}`)
    const response = await notion.databases.query({
        database_id: database_id,
        ...body
    })
    if (response.hasOwnProperty('status')){
        logger.error(JSON.stringify(response))
        return {results:[],has_more:false,next_cursor:''};
    }
    else{
        logger.info(`sucessfully queried database - length - ${response.results.length} - has_more - ${response.has_more} - cursor - ${response.next_cursor}`);
    }
    return response;
}

export const getDatabaseProperties = async ({apiToken,database_id}:any) =>{
    const notion = new Client({auth: apiToken})
    const response = await notion.databases.retrieve({ database_id: database_id })
    return response;
}

export const createPage = async({apiToken,body}:any)=>{
    const notion = new Client({auth: apiToken})
    logger.info(`creating page with this ${JSON.stringify(body)}`)
    const response = await notion.pages.create(body)
    if (response.hasOwnProperty('status')){
        logger.error(JSON.stringify(response))
    }
    else{
        logger.info(`sucessfully created page ${response.id}`);
    }
    return response;
}

export const modifyPage = async({apiToken,page_id,body}:any)=>{
    const notion = new Client({auth: apiToken})
    logger.info(`modifying page ${page_id} with this ${JSON.stringify(body)}`)
    const response = await notion.pages.update({
        page_id: page_id,
        ...body
    })
    if (response.hasOwnProperty('status')){
        logger.error(JSON.stringify(response))
    }
    else{
        logger.info(`sucessfully modified page ${response.id}`);
    }
    return response;
}

export const getPage = async ({apiToken,page_id}:any) =>{
    const notion = new Client({auth: apiToken})
    const response = await notion.pages.retrieve({ page_id: page_id })
    return response;
}

export const getBlockChildren = async ({apiToken,block_id}:any) =>{
    const notion = new Client({auth: apiToken})
    const response = await notion.blocks.children.list({ block_id: block_id })
    return response;
}

export const deleteBlock = async ({apiToken,block_id}:any) =>{
    const notion = new Client({auth: apiToken})
    const response = await notion.blocks.delete({ block_id: block_id })
    return response;
}

export const appendBlockChildren = async ({apiToken,block_id,children}:any) =>{
    const notion = new Client({auth: apiToken})
    const response = await notion.blocks.children.append({ block_id: block_id, children: children })
    return response;
}

export const deletePage = async ({apiToken,page_id}:any) =>{
    const notion = new Client({auth: apiToken})
    const response = await notion.pages.update({ page_id: page_id, in_trash: true })
    return response;
}
// import express from 'express';
// import {createCalendarPage } from './calendar/add_calendar_to_page';
// //const bodyParser = require("body-parser");
// const port = 5000;
// const app = express();

// app.use(express.json());
// app.get('/add_calendar_to_page',function(req,res){

// 	createCalendarPage({})//sends 401 to the result derfault 200 if works
// 	//res.json({name:"anoop", age: 31});
// })

// app.listen(port, function() {
// 	console.log(`Example app listening on port ${port}`)
// })