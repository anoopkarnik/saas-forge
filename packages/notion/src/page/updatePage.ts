import {Client } from '@notionhq/client'
import { logger } from '@workspace/winston-logger/index';
import { modifyResult } from '../utils/modifyResult';
import { modifyProperty } from '../utils/modifyProperty';

export const updatePage = async({apiToken,page_id,body}:any)=>{
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

export const updateNotionPage = async ({apiToken,page_id, properties}:any) => {
    const body = await constructUpdateBody(properties);
    logger.info(`body - ${JSON.stringify(body)}`);
    const response = await updatePage({apiToken, page_id, body});
    return modifyResult(response);
}

async function constructUpdateBody(properties:any) {
    const propertiesBody:any = {};
    for (let property of properties) {
        propertiesBody[property.name] = await modifyProperty(property);
    };
    return { properties: propertiesBody };
}
