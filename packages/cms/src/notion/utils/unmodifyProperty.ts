export function unmodifyProperty(prop:any) {
    const dateOptions = {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        year: 'numeric',
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
            const year1 = date1.getUTCFullYear().toString();
            const hours1 = date1.getUTCHours().toString().padStart(2, '0');
            const minutes1 = date1.getUTCMinutes().toString().padStart(2, '0');
            return `${day1} ${month1} ${year1} ${hours1}:${minutes1}`;
        case 'created_time':
            const date = new Date(prop.created_time);
            const day = date.getUTCDate().toString().padStart(2, '0');
            const month = date.toLocaleString('en-GB', { month: 'short' });
            const year = date.getUTCFullYear().toString();
            const hours = date.getUTCHours().toString().padStart(2, '0');
            const minutes = date.getUTCMinutes().toString().padStart(2, '0');
            return `${day} ${month} ${year} ${hours}:${minutes}`;
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