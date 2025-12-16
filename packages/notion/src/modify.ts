import { Client } from '@notionhq/client';
import { logger } from '@workspace/winston-logger/index';
import { queryDatabase, createPage, modifyPage, createDatabase, getPage, getBlockChildren, deleteBlock, appendBlockChildren, getDatabaseProperties } from './index'; // Adjust the import path accordingly

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

export const getNotionDatabaseProperties = async ({apiToken, database_id}:any) => {
    const response = await getDatabaseProperties({apiToken,database_id});
    return response;
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

async function modifyResult(result:any){
    const resultBody: any = {};
    const properties = result.properties;
    for (const prop in properties) {
        resultBody[prop] = unmodifyProperty(properties[prop]);
    }
    resultBody['id'] = result.id;
    return resultBody;
}

async function queryPageBlocks(page_id:any, type:any) {
    const response = await getBlockChildren(page_id);

    if (response.results.length > 0) {
        if (type === 'parent') {
            const results:any = {};
            for (const result of response.results) {
                try {
                    const parentResult = modifyBlock(result);
                    const parentResultId = parentResult?.id;
                    const parentResultName = parentResult?.name;
                    const childResults = await queryPageBlocks(parentResultId, 'child');
                    results[parentResultName] = {
                        id: parentResultId,
                        children: childResults
                    };
                } catch (error) {
                    logger.info(`Error in ${JSON.stringify(result)}`);
                }
            }
            return results;
        } else if (type === 'child') {
            return response.results.map(result => {
                const childResult = modifyBlock(result);
                const childResultName = childResult?.name;
                return childResultName.includes('\n') ? childResultName.split('\n') : childResultName;
            }).flat();
        }
    }
    return [];
}

function modifyBlock(block:any) {
    if (block.heading_3) {
        return {
            name: block.heading_3.rich_text[0].text.content,
            id: block.has_children ? block.id : undefined
        };
    } else if (block.numbered_list_item) {
        return {
            name: block.numbered_list_item.rich_text[0].text.content,
            id: block.has_children ? block.id : undefined
        };
    } else if (block.code) {
        return {
            name: block.code.rich_text[0].text.content,
            id: block.has_children ? block.id : undefined
        };
    }
}

export const modifyNotionPage = async ({apiToken,page_id, properties}:any) => {
    const body = await constructUpdateBody(properties);
    logger.info(`body - ${JSON.stringify(body)}`);
    const response = await modifyPage({apiToken, page_id, body});
    return modifyResult(response);
}

async function constructUpdateBody(properties:any) {
    const propertiesBody:any = {};
    for (let property of properties) {
        propertiesBody[property.name] = await modifyProperty(property);
    };
    return { properties: propertiesBody };
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

async function modifyProperty(property:any) {
    switch (property.type) {
        case 'text':
            return { rich_text: [{ text: { content: property.value } }] };
        case 'title':

            return { title: [{ text: { content: property.value } }] };
        case 'date':
            return { date: { start: property.value || '1900-01-01' } };
        case 'number':
            return { number: property.value };
        case 'file_url':
            return { files: [{ type: 'external', name: 'Cover', external: { url: property.value } }] };
        case 'url':
            return { url: property.value };
        case 'checkbox':
            return { checkbox: property.value };
        case 'select':
            return { select: { name: property.value } };
        case 'multi_select':
            return { multi_select: property.value.map((value:any) => ({ name: value })) };
        case 'relation':
            return { relation: property.value.map((value:any) => ({ id: value })) };
        case 'status':
            return { status: { name: property.value } };
    }
}

function unmodifyProperty(prop:any) {
    const dateOptions = {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }
    switch (prop.type) {
        case 'unique_id':
            return `${prop.unique_id.prefix}-${prop.unique_id.number}`;
        case 'relation':
            return prop.relation.map((x:any) => x.id);
        case 'number':
            return prop.number;
        case 'select':
            return prop.select ? prop.select.name : null;
        case 'title':
            if (prop.title.length > 0) {
                return prop.title[0].plain_text;
            }
            else{
                return '';
            }
        case 'rich_text':
            return prop.rich_text.length > 0 ? prop.rich_text.map((x: { text: { content: string } }) => x.text.content + "\n") : '';
        case 'rollup':
            return unmodifyProperty(prop.rollup);
        case 'people':
            return prop.people.map((x:any) => x.name);
        case 'status':
            return prop.status ? prop.status.name : null;
        case 'date':
            return prop.date ? prop.date.start : null;
        case 'last_edited_time':
            const date1 = new Date(prop.last_edited_time);
            const day1 = date1.getUTCDate().toString().padStart(2, '0');
            const month1 = date1.toLocaleString('en-GB', { month: 'short' });
            const hours1 = date1.getUTCHours().toString().padStart(2, '0');
            const minutes1 = date1.getUTCMinutes().toString().padStart(2, '0');
            return `${day1} ${month1} ${hours1}:${minutes1}`;
        case 'created_time':
            const date = new Date(prop.created_time);
            const day = date.getUTCDate().toString().padStart(2, '0');
            const month = date.toLocaleString('en-GB', { month: 'short' });
            const hours = date.getUTCHours().toString().padStart(2, '0');
            const minutes = date.getUTCMinutes().toString().padStart(2, '0');
            return `${day} ${month} ${hours}:${minutes}`;
        case 'multi_select':
            return prop.multi_select.map((x:any) => x.name);
        case 'array':
            return prop.array.map((x:any) => unmodifyProperty(x));
        case 'files':
            if (prop.files.length > 0) {
                if(prop.files[0].type === 'external'){
                    return prop.files.map((file: { external: { url: string } }) => file.external.url);
                }
                else if(prop.files[0].type === 'file'){
                    return prop.files.map((file: { file: { url: string } }) => file.file.url);
                }
            }
            return '';
        case 'url':
            return prop.url;
        case 'checkbox':
            return prop.checkbox;
        case 'formula':
            return prop.formula.number || prop.formula.string;
        case 'file_url':
            return prop.files[0].external.url;
    }
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

function modifyChildrenProperty(prop:any) {
    switch (prop.type) {
        case 'table_of_contents':
            return { color: 'default' };
        case 'callout':
            return prop.value;
        case 'embed':
            return { url: prop.value };
        default:
            return { rich_text: [{ text: { content: prop.value } }] };
    }
}

async function deletePageBlocks(page_id:any) {
    const response = await getBlockChildren(page_id);
    if (response.results.length > 0) {
        for (const result of response.results) {
            await deleteBlock(result.id);
        }
    }
    return { message: 'Deleted the children' };
}

export const getNotionPage = async ({apiToken,page_id}:any) => {
    const response = await getPage({apiToken,page_id});
    return modifyResult(response);
}
