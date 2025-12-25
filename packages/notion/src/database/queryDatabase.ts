import {Client } from '@notionhq/client'
import { logger } from '@workspace/winston-logger/index';
import { modifyResult } from '../utils/modifyResult';

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

export const queryNotionDatabase = async ({apiToken, database_id, filters=[], filter_condition='and', sorts = [], includes=[],cursor=null}:any):Promise<any> => {
    let has_more = true;
    let results = [];

    let body = await constructFilterBody(filters,filter_condition, cursor);
    body = await constructSortBody(body, sorts);
    logger.info(`body - ${JSON.stringify(body)}`);
    let response = await queryDatabase({apiToken,database_id, body});
    if (response.results.length > 0) {
        has_more = response.has_more;
        cursor = response.next_cursor
        const modifiedResults = await Promise.all(response.results.map(async (result: any) => {
            const modifiedResult = await modifyResult(result);
            return modifiedResult;
        }));
        results.push(...modifiedResults);
        logger.info(`sucessfully modified results - length - ${results.length} - has_more - ${has_more}`);
    } 
    return { 
        "results": results,
        "has_more": has_more,
        "next_cursor": cursor
     };
}

export const queryAllNotionDatabase = async ({apiToken, database_id, filters, filter_condition='and',sorts = []}:any):Promise<any> => {
    let has_more = true;
    let cursor = null;
    let results = [];
    while (has_more) {
        let body = await constructFilterBody(filters, filter_condition, cursor);
        body = await constructSortBody(body, sorts);
        logger.info(`body - ${JSON.stringify(body)}`);
        let response = await queryDatabase({apiToken,database_id, body});
        if (response.results.length > 0) {
            has_more = response.has_more;
            cursor = response.next_cursor
            const modifiedResults = await Promise.all(response.results.map(async (result: any) => {
                const modifiedResult = await modifyResult(result);
                return modifiedResult;
            }));
            results.push(...modifiedResults);
            logger.info(`sucessfully modified results - length - ${results.length} - has_more - ${has_more}`);
        } else {
            has_more = false;
        }
    }
    return { "results": results };
}

async function constructSortBody(body:any, sorts:any) {
    if (sorts.length > 0) {
        body['sorts']= sorts.map(modifySort);
    }
    return body;
}

function modifySort(sort:any) {
    if (sort.type === 'last_edited_time') {
        return { timestamp: 'last_edited_time', direction: sort.direction };
    } else if (['date', 'checkbox', 'multi_select', 'select', 'relation','number'].includes(sort.type)) {
        return { property: sort.name, direction: sort.direction };
    } else if (sort.type === 'created_time') {
        return { timestamp: 'created_time', direction: sort.direction };
    }
}

async function constructFilterBody(filters:any,filter_condition:any, cursor:any) {
    const filtersBody:any = { filter: { } };
    filtersBody.filter[filter_condition] = [];
    if (cursor) {
        filtersBody['start_cursor'] = cursor;
    }
    filtersBody.filter[filter_condition] = filters.map(modifyFilter);

    return filtersBody;
}

function modifyFilter(filter:any) {
    if (filter.type === 'last_edited_time') {
        return { timestamp: 'last_edited_time', last_edited_time: { [filter.condition]: filter.value } };
    } else if (['title','date', 'checkbox', 'multi_select', 'select',  'relation', 'status','rich_text','number'].includes(filter.type)) {
        return { property: filter.name, [filter.type]: { [filter.condition]: filter.value } };
    } else if (filter.type === 'created_time'){
        return { timestamp: 'created_time', created_time: { [filter.condition]: filter.value } };
    } else if (filter.type === 'ID'){
        return { property: filter.name, "unique_id": { [filter.condition]: filter.value } };
    }
}


