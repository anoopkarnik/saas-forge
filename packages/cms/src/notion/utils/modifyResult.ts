import { unmodifyProperty } from './unmodifyProperty';

export async function modifyResult(result:any){
    const resultBody: any = {};
    const properties = result.properties;
    for (const prop in properties) {
        resultBody[prop] = unmodifyProperty(properties[prop]);
        console
    }
    resultBody['id'] = result.id;
    return resultBody;
}

