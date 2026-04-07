export function formatList(values: string[]) {
    if (values.length === 0) return "None selected yet";
    if (values.length === 1) return values[0];
    if (values.length === 2) return `${values[0]} & ${values[1]}`;
    return `${values.slice(0, -1).join(", ")} & ${values[values.length - 1]}`;
}
