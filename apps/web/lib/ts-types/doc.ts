export interface DocumentationProps {
    title: string;
    logo: string;
    darkLogo: string;
    docs: DocProps[];
}

export interface DocProps {
    id: string;
    Name: string;
    Type: string;
    order: number;
    "Last edited time": string;
    "Created time": string;
    slug: string;
}