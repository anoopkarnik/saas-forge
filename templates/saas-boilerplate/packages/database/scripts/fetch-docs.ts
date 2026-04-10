import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import { queryAllNotionDatabase } from '@workspace/cms/notion/database/queryDatabase';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');
dotenv.config({ path: path.join(repoRoot, 'apps/web/.env') });

const notionClient = new Client({ auth: process.env.NOTION_API_TOKEN });
const n2m = new NotionToMarkdown({ notionClient: notionClient });

async function main() {
  const saasName = process.env.NEXT_PUBLIC_SAAS_NAME;
  if (!saasName) throw new Error("NEXT_PUBLIC_SAAS_NAME is missing from .env");

  console.log(`Fetching landing page data for: ${saasName}`);
  const landingPageResults = await queryAllNotionDatabase({
    apiToken: process.env.NOTION_API_TOKEN!,
    database_id: process.env.LANDING_DATABASE_ID!,
    filters: [{ name: "title", type: "title", condition: "contains", value: saasName }],
    filter_condition: "and",
    sorts: [],
  });

  const landingPageData = landingPageResults.results[0];
  if (!landingPageData) throw new Error("Could not find Landing Page in Notion");

  console.log(`Fetching documentation pages tied to Landing Page ID: ${landingPageData.id}`);
  const documentationResults = await queryAllNotionDatabase({
    apiToken: process.env.NOTION_API_TOKEN!,
    database_id: process.env.DOCUMENTATION_DATABASE_ID!,
    filters: [{ name: "SaaS Landing Page", type: "relation", condition: "contains", value: landingPageData.id }],
    filter_condition: "and",
    sorts: [{ name: "order", type: "number", direction: "ascending" }],
  });

  const docs = documentationResults.results.map((doc: any) => ({
    ...doc,
    slug: doc.Name.toLowerCase().replace(/ /g, "-")
  }));

  console.log(`Found ${docs.length} documentation pages.`);

  const constantsArray: any[] = [];
  const docsDir = path.resolve(__dirname, '../src/docs');
  await fs.mkdir(docsDir, { recursive: true });

  for (const doc of docs) {
    console.log(`Processing: ${doc.Name} [${doc.slug}]`);
    const mdBlocks = await n2m.pageToMarkdown(doc.id);
    const mdString = n2m.toMarkdownString(mdBlocks);
    
    // Create an mdx file
    const filePath = `${doc.slug}.mdx`;
    const fullFilePath = path.join(docsDir, filePath);
    
    // We add an H1 at the top of the file using the doc name if we want, or leave it to standard raw MD
    // but the n2m usually gives us exact blocks.
    await fs.writeFile(fullFilePath, mdString.parent || "");
    
    constantsArray.push({
      title: doc.Name,
      slug: doc.slug,
      type: doc.Type,
      order: doc.order,
      filePath: filePath
    });
  }

  // Now output the constants file
  const constantsFilePath = path.resolve(__dirname, '../src/constants/docs.ts');
  const fileContent = `export const documentationData = ${JSON.stringify(constantsArray, null, 2)};\n`;
  await fs.writeFile(constantsFilePath, fileContent, "utf-8");

  console.log("Successfully extracted documentation to MDX and generated docs.ts mapping!");
}

main().catch(console.error);
