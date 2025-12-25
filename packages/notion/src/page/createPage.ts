import {Client } from '@notionhq/client'
import { logger } from '@workspace/winston-logger/index';
import { modifyResult } from '../utils/modifyResult';
import { modifyProperty } from '../utils/modifyProperty';

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

export const createNotionPage = async({apiToken,database_id, properties}:any) => {
    const body = await constructCreateBody(database_id, properties);
    logger.info(`body - ${JSON.stringify(body)}`);
    const response = await createPage({apiToken,body});
    return modifyResult(response);
}

async function constructCreateBody(database_id:any, properties:any) {
    const propertiesBody:any = {};
    for (let property of properties){
        propertiesBody[property.name] = await modifyProperty(property);
    }
    return {
        parent: {
            type: 'database_id',
            database_id: database_id
        },
        properties: propertiesBody
    };
}
