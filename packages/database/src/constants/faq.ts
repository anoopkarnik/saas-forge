export const faqSectionData = {
  heading: "Questions before you build",
  description:
    "What ships, what you choose, and how your project stays up to date.",
  faqs: [
    {
      id: "sf-faq-1",
      question: "What is included in every starter?",
      answer:
        "The core includes the Next.js web app, Better Auth, tRPC, Prisma/Postgres, shared UI, a landing site, documentation, an admin CMS, email integration, image storage and environment validation. Optional modules and desktop/mobile clients follow your selection.",
    },
    {
      id: "sf-faq-2",
      question: "Which optional modules can I choose?",
      answer:
        "Billing & Payments, Organizations / Teams, AI Platform, AI Agents & RAG, API Keys, MCP server, Background jobs & cron, Notifications, Audit log, Outgoing webhooks, Feature flags, Onboarding and Product analytics. The builder includes required dependencies in the selection.",
    },
    {
      id: "sf-faq-3",
      question: "How do downloads and upgrades cost credits?",
      answer:
        "A new starter costs 20 base credits plus the selected modules and any stage adjustments shown in the quote. Adding a module later costs its listed credits; moving a stage costs 3 credits per step. Provider switches and release updates for code you already own are free. Review the quote before confirming.",
    },
    {
      id: "sf-faq-4",
      question: "Can I use the source repository for free?",
      answer:
        "Yes. The source repository is MIT licensed and includes all modules and the SaaS Forge platform. A paid download compiles a focused starter for your selection. Hosting, payment processing, email and model providers have their own charges.",
    },
    {
      id: "sf-faq-5",
      question: "How do I receive fixes after downloading?",
      answer:
        "My Projects shows release notes and security updates for the modules you own. Use the Upgrade Center or create-saas-forge status and upgrade commands to review a free release kit. Kits contain a change specification and staged files to merge with your custom code.",
    },
    {
      id: "sf-faq-6",
      question: "Do I need every integration to run locally?",
      answer:
        "No. Configure the providers and modules your project uses. Run pnpm doctor to fill local environment files and check configured services. Some integrations have development fallbacks, such as inline jobs; production features still need their provider credentials.",
    },
    {
      id: "sf-faq-7",
      question: "How are AI features organized?",
      answer:
        "AI Platform adds streaming chat, prompt versions, voice and usage metering. AI Agents & RAG adds the Python FastAPI/LangGraph service and requires AI Platform and Jobs. The MCP server is a separate module for exposing read-only account tools to AI clients.",
    },
    {
      id: "sf-faq-8",
      question: "Can I edit the content and branding?",
      answer:
        "Yes. With Postgres CMS, admins edit landing sections and documentation in the app. With constant CMS, content lives in TypeScript and Markdown files. Runtime settings cover branding and themes; image storage supports Vercel Blob or Cloudflare R2.",
    },
    {
      id: "sf-faq-9",
      question: "What helps me get a new project running?",
      answer:
        "Each saved project has a Launchpad with steps for local setup, your MVP, launch and operations, tailored to its selection. The CLI, generated SETUP.md, setup doctor and documentation support the same path. Optional AI help can explain or troubleshoot a selected task.",
    },
  ],
};
