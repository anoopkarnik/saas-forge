import {
  Activity,
  AudioLines,
  BriefcaseBusiness,
  CalendarDays,
  Code2,
  FileSpreadsheet,
  Film,
  GraduationCap,
  Handshake,
  Headphones,
  ListChecks,
  MessageCircle,
  Newspaper,
  PenTool,
  Route,
  ShoppingBag,
  Store,
  Truck,
  Users,
  WalletCards,
  WandSparkles,
  Workflow,
  type LucideIcon,
} from "lucide-react";

import type { ScaffoldModuleId } from "./scaffold-modules";
import type { FormValues } from "../zod/download";

export type ProductTypeId =
  | "media-streaming"
  | "logistics-dispatch"
  | "document-sheet-collaboration"
  | "design-collaboration"
  | "crm-sales"
  | "project-task-management"
  | "customer-support"
  | "e-commerce"
  | "multi-vendor-marketplace"
  | "learning-platform"
  | "booking-events"
  | "content-membership"
  | "community-social"
  | "listings"
  | "financial-ledger"
  | "ai-content-generation"
  | "voice-agent-platform"
  | "ai-coding-platform"
  | "ai-chatbot"
  | "ai-rag-agentic"
  | "workflow-automation"
  | "developer-helping-platforms";

export type TierId =
  | "tier-1"
  | "tier-2"
  | "tier-3"
  | "tier-4"
  | "tier-5"
  | "tier-6";

export type VersionId = "lean" | "balanced" | "advanced";

export type StageEstimate =
  | { kind: "mvp" }
  | { kind: "beta" }
  | { kind: "mau"; value: number };

export interface ArchitectureNode {
  id: string;
  label: string;
  detail: string;
  kind: "client" | "application" | "data" | "service";
}

export interface CostComponent {
  name: string;
  low: number;
  high: number;
  covers: string;
}

export interface CostEstimate {
  currency: "USD";
  cadence: "month";
  low: number;
  high: number;
  components: CostComponent[];
  exclusions: string[];
  variableDrivers: string[];
  lastReviewed: string;
}

export interface DeliveryEstimate {
  starterSetup: string;
  workingLaunch: string;
  assumption: string;
}

export interface ServiceLimit {
  service: string;
  limit: string;
  bottleneck?: boolean;
}

export interface PresetStep {
  title: string;
  details: string[];
}

export interface ProductTypeBlueprint {
  id: ProductTypeId;
  name: string;
  icon: LucideIcon;
  examples: string[];
  summary: string;
  capabilities: string[];
  architecture: ArchitectureNode[];
  includedInScaffold: string[];
  addNext: string[];
  firstBottleneck: string;
  upgradeTrigger: string;
  variableCostDrivers: string[];
  costMultiplier: number;
  deliveryMultiplier: number;
  scaffoldValues?: Partial<FormValues>;
  scaffoldModules?: ScaffoldModuleId[];
}

interface VersionMetrics {
  lean: { low: number; high: number };
  balanced: { low: number; high: number };
  advanced: { low: number; high: number };
}

export interface TierBlueprint {
  id: TierId;
  order: number;
  name: string;
  versionNoun: string;
  mauLabel: string;
  goal: string;
  setupTime: Record<VersionId, string>;
  launchWeeks: VersionMetrics;
  baseMonthlyCost: VersionMetrics;
  architectureAdditions: ArchitectureNode[];
  serviceLimits: ServiceLimit[];
  upgradeTrigger: string;
  scaffoldValues?: Partial<FormValues>;
}

export interface VersionProfile {
  id: VersionId;
  label: string;
  description: string;
  tradeoff: string;
  scaffoldValues: Partial<FormValues>;
}

export interface ResolvedPreset {
  id: string;
  productType: ProductTypeBlueprint;
  tier: TierBlueprint;
  version: VersionProfile;
  name: string;
  tagline: string;
  architecture: ArchitectureNode[];
  includedInScaffold: string[];
  addNext: string[];
  firstBottleneck: string;
  upgradeTrigger: string;
  capacityLabel: string;
  serviceLimits: ServiceLimit[];
  accountsNeeded: string[];
  secretsToFill: string[];
  steps: PresetStep[];
  cost: CostEstimate;
  delivery: DeliveryEstimate;
  values: Partial<FormValues>;
  modules: ScaffoldModuleId[];
}

const CORE_ARCHITECTURE: ArchitectureNode[] = [
  {
    id: "client",
    label: "Browser / App",
    detail: "Responsive product UI",
    kind: "client",
  },
  {
    id: "api",
    label: "Next.js API",
    detail: "Routes, auth, and business logic",
    kind: "application",
  },
  {
    id: "database",
    label: "Postgres",
    detail: "Primary product data",
    kind: "data",
  },
];

function product(
  blueprint: Omit<
    ProductTypeBlueprint,
    | "includedInScaffold"
    | "architecture"
    | "costMultiplier"
    | "deliveryMultiplier"
  > &
    Partial<
      Pick<
        ProductTypeBlueprint,
        | "includedInScaffold"
        | "architecture"
        | "costMultiplier"
        | "deliveryMultiplier"
      >
    >,
): ProductTypeBlueprint {
  return {
    includedInScaffold: [
      "Authentication and user accounts",
      "Postgres data model and API foundation",
      "Responsive web UI and admin surfaces",
      "Email, storage, payments, and observability options",
    ],
    architecture: [],
    costMultiplier: 1,
    deliveryMultiplier: 1,
    ...blueprint,
  };
}

export const PRODUCT_TYPE_BLUEPRINTS: ProductTypeBlueprint[] = [
  product({
    id: "media-streaming",
    name: "Media & Streaming",
    icon: Film,
    examples: [
      "Netflix",
      "YouTube",
      "Twitch",
      "Spotify",
      "Audible",
      "Vimeo",
      "Cloudinary",
    ],
    summary:
      "Upload, process, protect, and stream video or audio at variable traffic levels.",
    capabilities: [
      "media catalog",
      "playback",
      "subscriptions",
      "creator uploads",
    ],
    architecture: [
      {
        id: "media-pipeline",
        label: "Media pipeline",
        detail: "Upload, transcode, and package",
        kind: "service",
      },
      {
        id: "cdn",
        label: "Object storage + CDN",
        detail: "Origin storage and global delivery",
        kind: "service",
      },
    ],
    addNext: [
      "Managed transcoding and adaptive bitrate playback",
      "Media CDN, DRM, and content moderation",
      "Playback analytics and recommendation jobs",
    ],
    firstBottleneck:
      "Video processing concurrency and CDN egress grow much faster than normal web traffic.",
    upgradeTrigger:
      "Move media work to queued workers when uploads wait or playback start time degrades.",
    variableCostDrivers: ["transcoding minutes", "stored media", "CDN egress"],
    costMultiplier: 3,
    deliveryMultiplier: 2,
    scaffoldModules: ["billing"],
  }),
  product({
    id: "logistics-dispatch",
    name: "Logistics & Dispatch",
    icon: Truck,
    examples: ["Uber", "Swiggy", "Porter", "Shiprocket"],
    summary:
      "Coordinate orders, agents, routes, live status, and operational exceptions.",
    capabilities: ["dispatch", "live location", "order state", "notifications"],
    architecture: [
      {
        id: "realtime",
        label: "Realtime gateway",
        detail: "Location and status events",
        kind: "service",
      },
      {
        id: "geo",
        label: "Maps + geospatial",
        detail: "Routes, distance, and service areas",
        kind: "service",
      },
    ],
    addNext: [
      "Maps, geocoding, and route optimization",
      "Realtime driver location and dispatch engine",
      "Background jobs for notifications and reconciliation",
    ],
    firstBottleneck:
      "High-frequency location writes and fan-out overwhelm a request-only API design.",
    upgradeTrigger:
      "Add an event stream and dedicated dispatch workers when concurrent active jobs climb.",
    variableCostDrivers: [
      "map requests",
      "location events",
      "SMS and push delivery",
    ],
    costMultiplier: 2,
    deliveryMultiplier: 1.8,
  }),
  product({
    id: "document-sheet-collaboration",
    name: "Document/Sheet Collaboration",
    icon: FileSpreadsheet,
    examples: ["Notion", "Google Docs", "Google Sheets", "Airtable"],
    summary:
      "Create structured documents or tables with sharing, presence, and collaborative editing.",
    capabilities: [
      "documents",
      "permissions",
      "version history",
      "collaboration",
    ],
    architecture: [
      {
        id: "collaboration",
        label: "Collaboration service",
        detail: "Presence, changes, and history",
        kind: "service",
      },
    ],
    addNext: [
      "CRDT or operational-transform collaboration engine",
      "Presence, cursor, and document snapshot storage",
      "Fine-grained sharing and export pipelines",
    ],
    firstBottleneck:
      "Concurrent document updates create conflicts and large revision histories.",
    upgradeTrigger:
      "Introduce durable collaboration rooms when simultaneous editors become common.",
    variableCostDrivers: [
      "realtime connections",
      "revision storage",
      "exports",
    ],
    costMultiplier: 1.6,
    deliveryMultiplier: 1.8,
  }),
  product({
    id: "design-collaboration",
    name: "Design Collaboration",
    icon: PenTool,
    examples: ["Figma", "Canva", "Lucidchart"],
    summary:
      "Build a shared visual canvas with assets, multiplayer state, comments, and exports.",
    capabilities: ["canvas", "assets", "multiplayer", "exports"],
    architecture: [
      {
        id: "canvas-sync",
        label: "Canvas sync",
        detail: "Multiplayer state and presence",
        kind: "service",
      },
      {
        id: "render-workers",
        label: "Render workers",
        detail: "Thumbnails and exports",
        kind: "service",
      },
    ],
    addNext: [
      "Canvas rendering and CRDT synchronization",
      "Asset transformation and export workers",
      "Presence, comments, and version history",
    ],
    firstBottleneck:
      "Large documents and multiplayer patches stress both browser memory and realtime fan-out.",
    upgradeTrigger:
      "Split rendering from collaboration when exports or large files block interactive work.",
    variableCostDrivers: [
      "asset storage",
      "realtime messages",
      "render minutes",
    ],
    costMultiplier: 2,
    deliveryMultiplier: 2,
  }),
  product({
    id: "crm-sales",
    name: "CRM & Sales",
    icon: Handshake,
    examples: ["Salesforge", "HubSpot", "Zoho CRM"],
    summary:
      "Manage contacts, pipelines, activities, automation, and revenue reporting.",
    capabilities: ["contacts", "pipelines", "tasks", "reporting"],
    architecture: [
      {
        id: "jobs",
        label: "Automation jobs",
        detail: "Sequences, reminders, and sync",
        kind: "service",
      },
    ],
    addNext: [
      "Pipeline and activity domain models",
      "Email/calendar synchronization",
      "Workflow automation and reporting aggregates",
    ],
    firstBottleneck:
      "Timeline queries and third-party synchronization jobs become slow and failure-prone.",
    upgradeTrigger:
      "Add a queue and precomputed reports when imports or dashboards time out.",
    variableCostDrivers: [
      "email delivery",
      "data enrichment",
      "integration sync",
    ],
  }),
  product({
    id: "project-task-management",
    name: "Project & Task Management",
    icon: ListChecks,
    examples: ["Asana", "Trello", "ClickUp"],
    summary:
      "Organize projects, tasks, assignments, comments, and team workflows.",
    capabilities: ["projects", "tasks", "teams", "activity"],
    architecture: [
      {
        id: "notifications",
        label: "Event jobs",
        detail: "Activity and notifications",
        kind: "service",
      },
    ],
    addNext: [
      "Project, task, and dependency models",
      "Activity feeds and notification delivery",
      "Realtime board updates and search",
    ],
    firstBottleneck:
      "Activity feeds and notification fan-out generate far more writes than core tasks.",
    upgradeTrigger:
      "Queue fan-out work when task updates slow down because of secondary notifications.",
    variableCostDrivers: [
      "notification delivery",
      "file storage",
      "search indexing",
    ],
  }),
  product({
    id: "customer-support",
    name: "Customer Support",
    icon: Headphones,
    examples: ["Zendesk", "Freshdesk"],
    summary:
      "Centralize tickets, customer conversations, help content, and service reporting.",
    capabilities: ["tickets", "inbox", "knowledge base", "SLAs"],
    architecture: [
      {
        id: "inbox",
        label: "Message ingestion",
        detail: "Email, chat, and webhook events",
        kind: "service",
      },
    ],
    addNext: [
      "Omnichannel message ingestion",
      "Ticket routing, SLAs, and agent assignment",
      "Knowledge search and satisfaction reporting",
    ],
    firstBottleneck:
      "Inbound email and webhook bursts compete with interactive agent requests.",
    upgradeTrigger:
      "Separate message ingestion into queued workers when backlog or duplicate delivery appears.",
    variableCostDrivers: ["email volume", "chat sessions", "knowledge search"],
  }),
  product({
    id: "e-commerce",
    name: "E-commerce",
    icon: ShoppingBag,
    examples: ["Blinkit", "Instacart", "boAt"],
    summary:
      "Sell products through catalog, cart, checkout, inventory, and fulfillment workflows.",
    capabilities: ["catalog", "cart", "checkout", "inventory"],
    architecture: [
      {
        id: "commerce-jobs",
        label: "Commerce jobs",
        detail: "Inventory, orders, and webhooks",
        kind: "service",
      },
    ],
    addNext: [
      "Catalog, inventory, cart, and order models",
      "Tax, shipping, and payment reconciliation",
      "Search and transactional notification jobs",
    ],
    firstBottleneck:
      "Inventory races and webhook retries can create overselling or duplicate fulfillment.",
    upgradeTrigger:
      "Add reserved inventory and durable order jobs before high-volume campaigns.",
    variableCostDrivers: [
      "payment fees",
      "image delivery",
      "search operations",
    ],
    costMultiplier: 1.5,
    deliveryMultiplier: 1.35,
    scaffoldModules: ["billing"],
  }),
  product({
    id: "multi-vendor-marketplace",
    name: "Multi-vendor Marketplace",
    icon: Store,
    examples: ["Amazon", "Flipkart", "eBay", "Etsy", "Upwork", "Patreon"],
    summary:
      "Connect buyers and sellers with listings, transactions, payouts, and trust controls.",
    capabilities: ["vendors", "listings", "orders", "payouts"],
    architecture: [
      {
        id: "ledger",
        label: "Order + payout ledger",
        detail: "Transactions and reconciliation",
        kind: "data",
      },
    ],
    addNext: [
      "Vendor onboarding and scoped administration",
      "Marketplace payouts, commissions, and reconciliation",
      "Search, reviews, disputes, and moderation",
    ],
    firstBottleneck:
      "Payout and inventory consistency become risky across independent sellers.",
    upgradeTrigger:
      "Introduce a durable transaction ledger before automated multi-party payouts.",
    variableCostDrivers: ["payment and payout fees", "search", "moderation"],
    costMultiplier: 1.8,
    deliveryMultiplier: 1.6,
    scaffoldModules: ["billing"],
  }),
  product({
    id: "learning-platform",
    name: "Learning Platform",
    icon: GraduationCap,
    examples: ["Udemy", "Coursera", "Teachable", "Duolingo", "Brilliant"],
    summary:
      "Deliver courses, exercises, progress tracking, credentials, and paid learning.",
    capabilities: ["courses", "progress", "assessments", "payments"],
    architecture: [
      {
        id: "learning-content",
        label: "Content delivery",
        detail: "Lessons, media, and progress events",
        kind: "service",
      },
    ],
    addNext: [
      "Course, enrollment, progress, and assessment models",
      "Media delivery and completion tracking",
      "Certificates, cohorts, and instructor reporting",
    ],
    firstBottleneck:
      "Media traffic and high-frequency progress events grow independently of user count.",
    upgradeTrigger:
      "Batch progress writes and move media to a CDN when lessons become media-heavy.",
    variableCostDrivers: ["video delivery", "assessment runs", "email"],
    costMultiplier: 1.4,
    deliveryMultiplier: 1.4,
    scaffoldModules: ["billing"],
  }),
  product({
    id: "booking-events",
    name: "Booking & Events",
    icon: CalendarDays,
    examples: ["Calendly", "Cal.com", "Practo", "Airbnb"],
    summary:
      "Publish availability and safely coordinate bookings, reminders, and payments.",
    capabilities: ["availability", "bookings", "calendar sync", "reminders"],
    architecture: [
      {
        id: "scheduling",
        label: "Scheduling engine",
        detail: "Availability and conflict checks",
        kind: "service",
      },
    ],
    addNext: [
      "Availability, timezone, and booking models",
      "Calendar provider synchronization",
      "Reminder jobs and payment policies",
    ],
    firstBottleneck:
      "Concurrent slot selection and calendar sync delays create double bookings.",
    upgradeTrigger:
      "Use database locks and durable sync jobs before opening high-demand inventory.",
    variableCostDrivers: ["calendar sync", "reminders", "payment fees"],
    costMultiplier: 1.2,
    deliveryMultiplier: 1.2,
    scaffoldModules: ["billing"],
  }),
  product({
    id: "content-membership",
    name: "Content & Membership",
    icon: Newspaper,
    examples: ["Medium", "Ghost", "Substack"],
    summary: "Publish content, grow an audience, and monetize member access.",
    capabilities: ["publishing", "memberships", "newsletters", "paywalls"],
    architecture: [
      {
        id: "publishing",
        label: "Publishing cache",
        detail: "Fast public content delivery",
        kind: "service",
      },
    ],
    addNext: [
      "Editorial workflow and content models",
      "Membership entitlements and paywalls",
      "Newsletter delivery and audience analytics",
    ],
    firstBottleneck:
      "Newsletter sends and uncached public traffic spike far above normal member activity.",
    upgradeTrigger:
      "Pre-render and cache public content before audience-driven traffic spikes.",
    variableCostDrivers: [
      "email subscribers",
      "public bandwidth",
      "media storage",
    ],
    scaffoldModules: ["billing"],
  }),
  product({
    id: "community-social",
    name: "Community & Social",
    icon: Users,
    examples: ["X", "Facebook", "LinkedIn", "Quora", "Reddit", "Skool"],
    summary:
      "Support profiles, follows, feeds, conversations, groups, and moderation.",
    capabilities: ["profiles", "social graph", "feeds", "moderation"],
    architecture: [
      {
        id: "feed",
        label: "Feed + fan-out workers",
        detail: "Rank and distribute activity",
        kind: "service",
      },
    ],
    addNext: [
      "Social graph and feed ranking",
      "Realtime conversations and notification fan-out",
      "Moderation, abuse reporting, and media processing",
    ],
    firstBottleneck:
      "Feed generation and notification fan-out grow faster than primary content writes.",
    upgradeTrigger:
      "Move feed assembly to cache and workers when timelines become slow or repetitive.",
    variableCostDrivers: ["feed reads", "media delivery", "moderation"],
    costMultiplier: 1.7,
    deliveryMultiplier: 1.7,
  }),
  product({
    id: "listings",
    name: "Listings",
    icon: BriefcaseBusiness,
    examples: ["Naukri", "Glassdoor", "Remote OK"],
    summary:
      "Publish and discover structured listings with search, applications, and alerts.",
    capabilities: ["listings", "search", "applications", "alerts"],
    architecture: [
      {
        id: "listing-search",
        label: "Search index",
        detail: "Filters, relevance, and alerts",
        kind: "service",
      },
    ],
    addNext: [
      "Listing, application, and employer models",
      "Faceted search and saved alerts",
      "Moderation and expiry workflows",
    ],
    firstBottleneck:
      "Complex filters and keyword search become expensive in transactional queries.",
    upgradeTrigger:
      "Add a search index when database filtering misses latency targets.",
    variableCostDrivers: [
      "search operations",
      "email alerts",
      "document storage",
    ],
    costMultiplier: 1.2,
    deliveryMultiplier: 1.15,
  }),
  product({
    id: "financial-ledger",
    name: "Financial & Ledger Platforms",
    icon: WalletCards,
    examples: ["Stripe", "Razorpay", "PayPal", "Paytm", "Google Pay", "Groww"],
    summary:
      "Track monetary events through auditable ledgers, reconciliation, and controlled workflows.",
    capabilities: ["ledger", "transactions", "reconciliation", "risk"],
    architecture: [
      {
        id: "financial-ledger",
        label: "Immutable ledger",
        detail: "Balanced entries and audit history",
        kind: "data",
      },
    ],
    addNext: [
      "Double-entry ledger and idempotent money movement",
      "Provider reconciliation and immutable audit trail",
      "KYC, AML, fraud, and jurisdiction-specific compliance",
    ],
    firstBottleneck:
      "Correctness and auditability fail before raw infrastructure capacity does.",
    upgradeTrigger:
      "Require ledger invariants, reconciliation, and security review before handling real funds.",
    variableCostDrivers: ["payment fees", "identity checks", "fraud tooling"],
    costMultiplier: 2.2,
    deliveryMultiplier: 2,
    scaffoldModules: ["billing"],
  }),
  product({
    id: "ai-content-generation",
    name: "AI Content Generation",
    icon: WandSparkles,
    examples: ["Jasper", "Midjourney", "Runway", "HeyGen"],
    summary:
      "Generate text, image, audio, or video with metering, history, and asynchronous jobs.",
    capabilities: [
      "generation",
      "prompting",
      "usage metering",
      "asset history",
    ],
    architecture: [
      {
        id: "generation-workers",
        label: "Generation workers",
        detail: "Queued long-running model calls",
        kind: "service",
      },
    ],
    addNext: [
      "Provider-specific generation workflows",
      "Durable jobs, retries, and asset lifecycle",
      "Safety filters and per-model cost controls",
    ],
    firstBottleneck:
      "Long-running model calls exhaust request timeouts and create unpredictable spend.",
    upgradeTrigger:
      "Queue generation when requests exceed interactive response windows.",
    variableCostDrivers: ["model tokens", "generated media", "GPU time"],
    costMultiplier: 1.7,
    deliveryMultiplier: 1.7,
    scaffoldModules: ["ai", "billing"],
    scaffoldValues: { NEXT_PUBLIC_AI_ENABLED: "true" },
  }),
  product({
    id: "voice-agent-platform",
    name: "Voice Agent Platform",
    icon: AudioLines,
    examples: ["ElevenLabs", "Vapi"],
    summary:
      "Run low-latency speech agents with telephony, streaming audio, tools, and call records.",
    capabilities: ["speech", "telephony", "agents", "call analytics"],
    architecture: [
      {
        id: "voice-runtime",
        label: "Realtime voice runtime",
        detail: "Streaming STT, agent, and TTS",
        kind: "service",
      },
    ],
    addNext: [
      "Telephony and bidirectional audio streaming",
      "Low-latency STT, model, and TTS orchestration",
      "Call recording, consent, and quality analytics",
    ],
    firstBottleneck:
      "End-to-end latency and concurrent audio sessions dominate product quality.",
    upgradeTrigger:
      "Use dedicated realtime infrastructure when call latency or disconnects become visible.",
    variableCostDrivers: [
      "telephony minutes",
      "speech minutes",
      "model tokens",
    ],
    costMultiplier: 2,
    deliveryMultiplier: 2,
    scaffoldModules: ["ai", "billing"],
    scaffoldValues: { NEXT_PUBLIC_AI_ENABLED: "true" },
  }),
  product({
    id: "ai-coding-platform",
    name: "AI Coding Platform",
    icon: Code2,
    examples: ["Claude Code", "GitHub Copilot", "Cursor"],
    summary:
      "Understand repositories and assist coding through tools, context, and controlled execution.",
    capabilities: [
      "code context",
      "agents",
      "tool execution",
      "usage metering",
    ],
    architecture: [
      {
        id: "code-sandbox",
        label: "Sandbox + index",
        detail: "Repository context and safe execution",
        kind: "service",
      },
    ],
    addNext: [
      "Repository ingestion and code-aware indexing",
      "Sandboxed tool execution and permission controls",
      "Agent traces, patch review, and evaluation",
    ],
    firstBottleneck:
      "Large repository context and untrusted execution pressure both cost and security.",
    upgradeTrigger:
      "Isolate execution before agents can run user-provided code or commands.",
    variableCostDrivers: ["model tokens", "sandbox compute", "code indexing"],
    costMultiplier: 1.8,
    deliveryMultiplier: 2,
    scaffoldModules: ["ai", "billing"],
    scaffoldValues: { NEXT_PUBLIC_AI_ENABLED: "true" },
  }),
  product({
    id: "ai-chatbot",
    name: "AI Chatbot",
    icon: MessageCircle,
    examples: ["ChatGPT", "Claude"],
    summary:
      "Deliver multi-model chat with streaming, conversation history, and usage controls.",
    capabilities: ["chat", "streaming", "history", "credits"],
    architecture: [
      {
        id: "ai-provider",
        label: "AI provider",
        detail: "Streaming model responses",
        kind: "service",
      },
    ],
    addNext: [
      "Product-specific prompts, tools, and guardrails",
      "Conversation retention and user controls",
      "Evaluation and model-routing policy",
    ],
    firstBottleneck:
      "Model throughput, context size, and concurrent streams drive latency and spend.",
    upgradeTrigger:
      "Add caching, routing, and async tools when sustained usage reaches the model rate limit.",
    variableCostDrivers: ["model tokens", "tool calls", "conversation storage"],
    costMultiplier: 1.5,
    deliveryMultiplier: 1.4,
    scaffoldModules: ["ai", "billing"],
    scaffoldValues: { NEXT_PUBLIC_AI_ENABLED: "true" },
  }),
  product({
    id: "ai-rag-agentic",
    name: "AI RAG & Agentic Apps",
    icon: Route,
    examples: ["Kickresume", "Glean"],
    summary:
      "Ground agents in private knowledge with ingestion, retrieval, tools, and traceable execution.",
    capabilities: ["ingestion", "retrieval", "agents", "evaluations"],
    architecture: [
      {
        id: "vector-index",
        label: "Vector index",
        detail: "Embeddings and retrieval",
        kind: "data",
      },
      {
        id: "agent-workers",
        label: "Agent workers",
        detail: "Durable tools and steps",
        kind: "service",
      },
    ],
    addNext: [
      "Document ingestion, chunking, and embedding pipelines",
      "Vector search with tenant-aware access",
      "Durable agent tools, traces, and evaluations",
    ],
    firstBottleneck:
      "Retrieval quality and ingestion freshness fail before simple request capacity.",
    upgradeTrigger:
      "Separate ingestion and agent jobs when documents or tool chains outlive a request.",
    variableCostDrivers: [
      "embedding tokens",
      "vector storage",
      "agent tool calls",
    ],
    costMultiplier: 1.8,
    deliveryMultiplier: 1.8,
    scaffoldModules: ["ai", "billing"],
    scaffoldValues: { NEXT_PUBLIC_AI_ENABLED: "true" },
  }),
  product({
    id: "workflow-automation",
    name: "Workflow Automation",
    icon: Workflow,
    examples: ["Dify", "Flowise", "Zapier", "n8n"],
    summary:
      "Design and execute reliable multi-step workflows across external systems.",
    capabilities: ["workflow builder", "connectors", "execution", "retries"],
    architecture: [
      {
        id: "workflow-engine",
        label: "Workflow engine",
        detail: "Durable steps, waits, and retries",
        kind: "service",
      },
    ],
    addNext: [
      "Workflow graph and execution state models",
      "Durable steps, schedules, retries, and secrets",
      "Connector SDK, rate controls, and execution logs",
    ],
    firstBottleneck:
      "Long-running workflows cannot safely live inside normal HTTP requests.",
    upgradeTrigger:
      "Adopt durable execution before workflows need waits, schedules, or multi-step retries.",
    variableCostDrivers: [
      "workflow operations",
      "connector API calls",
      "worker compute",
    ],
    costMultiplier: 1.5,
    deliveryMultiplier: 1.7,
    scaffoldModules: ["ai"],
    scaffoldValues: { NEXT_PUBLIC_AI_ENABLED: "true" },
  }),
  product({
    id: "developer-helping-platforms",
    name: "Developer Helping Platforms",
    icon: Activity,
    examples: ["Plausible", "Better Stack"],
    summary:
      "Collect, process, and explain telemetry or operational data for developers.",
    capabilities: ["ingestion", "dashboards", "alerts", "retention"],
    architecture: [
      {
        id: "telemetry",
        label: "Telemetry pipeline",
        detail: "Ingest, aggregate, and retain events",
        kind: "service",
      },
    ],
    addNext: [
      "High-volume event ingestion and retention policies",
      "Aggregation, dashboards, and alert evaluation",
      "Tenant quotas, sampling, and export controls",
    ],
    firstBottleneck:
      "Write-heavy telemetry workloads overwhelm a general transactional database.",
    upgradeTrigger:
      "Move events to an analytical store when ingestion competes with dashboard queries.",
    variableCostDrivers: ["events ingested", "retention", "alert evaluations"],
    costMultiplier: 1.2,
    deliveryMultiplier: 1.4,
  }),
];

const baseValues = (tier: TierId): Partial<FormValues> => {
  const tierNumber = Number(tier.split("-")[1]);
  const established = tierNumber >= 3;
  const scaled = tierNumber >= 4;

  return {
    NEXT_PUBLIC_PLATFORM: ["web"],
    NEXT_PUBLIC_CMS: tierNumber === 1 ? "constant" : "postgres",
    NEXT_PUBLIC_AUTH_FRAMEWORK: "better-auth",
    NEXT_PUBLIC_AUTH_PROVIDERS: established
      ? ["email_verification", "google", "github"]
      : ["email_verification", "github"],
    NEXT_PUBLIC_EMAIL_CLIENT: "resend",
    NEXT_PUBLIC_PAYMENT_GATEWAY: "none",
    NEXT_PUBLIC_IMAGE_STORAGE: scaled ? "cloudflare_r2" : "vercel_blob",
    NEXT_PUBLIC_OBSERVABILITY_FEATURES: established
      ? ["logging", "google_analytics", "rate_limiting"]
      : ["google_analytics"],
    NEXT_PUBLIC_ALLOW_RATE_LIMIT: "upstash",
    NEXT_PUBLIC_SUPPORT_FEATURES: [],
  };
};

export const TIER_BLUEPRINTS: TierBlueprint[] = [
  {
    id: "tier-1",
    order: 1,
    name: "MVP",
    versionNoun: "MVP",
    mauLabel: "Validate before scaling",
    goal: "Prove the core problem with the smallest credible product.",
    setupTime: { lean: "45–90 min", balanced: "2–4 hrs", advanced: "1–2 days" },
    launchWeeks: {
      lean: { low: 1, high: 2 },
      balanced: { low: 2, high: 4 },
      advanced: { low: 4, high: 8 },
    },
    baseMonthlyCost: {
      lean: { low: 0, high: 20 },
      balanced: { low: 10, high: 50 },
      advanced: { low: 40, high: 150 },
    },
    architectureAdditions: [],
    serviceLimits: [
      {
        service: "Managed free tiers",
        limit:
          "Suitable for validation traffic; expect sleeping instances and small quotas",
        bottleneck: true,
      },
      {
        service: "Single application region",
        limit: "Keep deployment simple until usage proves geographic demand",
      },
    ],
    upgradeTrigger:
      "Move to Beta when real users need repeat access, support, and safer operations.",
    scaffoldValues: baseValues("tier-1"),
  },
  {
    id: "tier-2",
    order: 2,
    name: "Beta Testing",
    versionNoun: "Beta",
    mauLabel: "Invite-only or early public users",
    goal: "Invite users, gather evidence, and make failures observable.",
    setupTime: { lean: "1–2 hrs", balanced: "3–5 hrs", advanced: "1–2 days" },
    launchWeeks: {
      lean: { low: 2, high: 4 },
      balanced: { low: 3, high: 6 },
      advanced: { low: 6, high: 10 },
    },
    baseMonthlyCost: {
      lean: { low: 10, high: 50 },
      balanced: { low: 25, high: 100 },
      advanced: { low: 100, high: 400 },
    },
    architectureAdditions: [
      {
        id: "cache-queue",
        label: "Redis / Queue",
        detail: "Rate limits, cache, and background work",
        kind: "service",
      },
    ],
    serviceLimits: [
      {
        service: "Postgres",
        limit:
          "Use managed backups and connection pooling before public launch",
        bottleneck: true,
      },
      {
        service: "Email + logs",
        limit: "Track verification, support, and errors during feedback cycles",
      },
    ],
    upgradeTrigger:
      "Move to Launch when acquisition is public and reliability affects conversion.",
    scaffoldValues: baseValues("tier-2"),
  },
  {
    id: "tier-3",
    order: 3,
    name: "Launch",
    versionNoun: "Launch",
    mauLabel: "0–10k MAU",
    goal: "Operate a public product with measurable reliability and conversion.",
    setupTime: { lean: "3–6 hrs", balanced: "1–2 days", advanced: "3–5 days" },
    launchWeeks: {
      lean: { low: 3, high: 6 },
      balanced: { low: 5, high: 9 },
      advanced: { low: 8, high: 14 },
    },
    baseMonthlyCost: {
      lean: { low: 25, high: 100 },
      balanced: { low: 75, high: 300 },
      advanced: { low: 250, high: 900 },
    },
    architectureAdditions: [
      {
        id: "cache-queue",
        label: "Redis / Queue",
        detail: "Caching, protection, and jobs",
        kind: "service",
      },
    ],
    serviceLimits: [
      {
        service: "Application + database",
        limit: "Monitor latency, connection count, and slow queries",
        bottleneck: true,
      },
      {
        service: "Observability",
        limit: "Logs, analytics, and rate limiting are part of the baseline",
      },
    ],
    upgradeTrigger:
      "Move to Growth when sustained MAU reaches 10k or queues and queries miss targets.",
    scaffoldValues: baseValues("tier-3"),
  },
  {
    id: "tier-4",
    order: 4,
    name: "Growth",
    versionNoun: "Growth",
    mauLabel: "10k–50k MAU",
    goal: "Increase throughput and operational safety without creating a platform team.",
    setupTime: {
      lean: "1–2 days",
      balanced: "3–5 days",
      advanced: "1–2 weeks",
    },
    launchWeeks: {
      lean: { low: 5, high: 9 },
      balanced: { low: 8, high: 14 },
      advanced: { low: 12, high: 22 },
    },
    baseMonthlyCost: {
      lean: { low: 100, high: 400 },
      balanced: { low: 300, high: 1200 },
      advanced: { low: 900, high: 3500 },
    },
    architectureAdditions: [
      {
        id: "cache-queue",
        label: "Redis + Queue",
        detail: "Hot data and durable jobs",
        kind: "service",
      },
      {
        id: "cdn",
        label: "Object storage + CDN",
        detail: "Global asset delivery",
        kind: "service",
      },
    ],
    serviceLimits: [
      {
        service: "Postgres connections",
        limit: "Pool connections and remove repeated expensive queries",
        bottleneck: true,
      },
      {
        service: "Background jobs",
        limit: "Retry external work away from interactive requests",
      },
    ],
    upgradeTrigger:
      "Move to Scale at 50k MAU or when one database/region limits planned growth.",
    scaffoldValues: baseValues("tier-4"),
  },
  {
    id: "tier-5",
    order: 5,
    name: "Scale",
    versionNoun: "Scale",
    mauLabel: "50k–250k MAU",
    goal: "Separate critical workloads and remove single-service capacity ceilings.",
    setupTime: {
      lean: "3–5 days",
      balanced: "1–2 weeks",
      advanced: "2–4 weeks",
    },
    launchWeeks: {
      lean: { low: 8, high: 14 },
      balanced: { low: 12, high: 22 },
      advanced: { low: 20, high: 36 },
    },
    baseMonthlyCost: {
      lean: { low: 400, high: 1500 },
      balanced: { low: 1000, high: 5000 },
      advanced: { low: 3500, high: 15000 },
    },
    architectureAdditions: [
      {
        id: "cache-queue",
        label: "Dedicated cache + queue",
        detail: "Isolated hot paths and workers",
        kind: "service",
      },
      {
        id: "read-models",
        label: "Read replicas / indexes",
        detail: "Independent query capacity",
        kind: "data",
      },
    ],
    serviceLimits: [
      {
        service: "Data architecture",
        limit: "Profile workload-specific stores, indexes, and retention",
        bottleneck: true,
      },
      {
        service: "Deployment",
        limit: "Use autoscaling workers and tested recovery procedures",
      },
    ],
    upgradeTrigger:
      "Move to Enterprise when 250k MAU, contractual controls, or multi-region recovery are required.",
    scaffoldValues: baseValues("tier-5"),
  },
  {
    id: "tier-6",
    order: 6,
    name: "Enterprise",
    versionNoun: "Enterprise",
    mauLabel: "250k+ MAU",
    goal: "Meet high-scale, compliance, recovery, and organizational requirements.",
    setupTime: {
      lean: "1–2 weeks",
      balanced: "2–4 weeks",
      advanced: "4–8 weeks",
    },
    launchWeeks: {
      lean: { low: 12, high: 22 },
      balanced: { low: 20, high: 36 },
      advanced: { low: 32, high: 52 },
    },
    baseMonthlyCost: {
      lean: { low: 1500, high: 6000 },
      balanced: { low: 5000, high: 20000 },
      advanced: { low: 15000, high: 60000 },
    },
    architectureAdditions: [
      {
        id: "regional-data",
        label: "Regional data tier",
        detail: "Replicas, recovery, and isolation",
        kind: "data",
      },
      {
        id: "platform-ops",
        label: "Platform operations",
        detail: "SLOs, security, and incident response",
        kind: "service",
      },
    ],
    serviceLimits: [
      {
        service: "Reliability + compliance",
        limit: "Capacity, recovery, access, and audit controls must be tested",
        bottleneck: true,
      },
      {
        service: "Organization",
        limit:
          "Ownership and incident response matter as much as infrastructure",
      },
    ],
    upgradeTrigger:
      "Revisit the architecture when geography, regulation, or workload shape changes materially.",
    scaffoldValues: baseValues("tier-6"),
  },
];

export const VERSION_PROFILES: VersionProfile[] = [
  {
    id: "lean",
    label: "Lean",
    description: "Fewest services and fastest path to evidence.",
    tradeoff: "More manual operations and less capacity headroom.",
    scaffoldValues: {
      NEXT_PUBLIC_AUTH_PROVIDERS: ["github"],
      NEXT_PUBLIC_EMAIL_CLIENT: "none",
      NEXT_PUBLIC_OBSERVABILITY_FEATURES: [],
      NEXT_PUBLIC_SUPPORT_FEATURES: [],
    },
  },
  {
    id: "balanced",
    label: "Balanced",
    description: "A reliable managed baseline without premature platform work.",
    tradeoff: "A few more accounts in exchange for safer operations.",
    scaffoldValues: {},
  },
  {
    id: "advanced",
    label: "Advanced",
    description:
      "More automation, visibility, and capacity for the selected stage.",
    tradeoff: "Higher setup time, cost, and operational surface area.",
    scaffoldValues: {
      NEXT_PUBLIC_AUTH_PROVIDERS: [
        "email_verification",
        "google",
        "github",
        "linkedin",
      ],
      NEXT_PUBLIC_EMAIL_CLIENT: "resend",
      NEXT_PUBLIC_OBSERVABILITY_FEATURES: [
        "logging",
        "google_analytics",
        "rate_limiting",
      ],
      NEXT_PUBLIC_SUPPORT_FEATURES: ["support_mail"],
    },
  },
];

const AVAILABLE_MODULES = new Set<ScaffoldModuleId>(["billing", "ai"]);

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function roundMoney(value: number): number {
  if (value === 0) return 0;
  if (value < 25) return Math.max(5, Math.round(value / 5) * 5);
  return Math.round(value / 25) * 25;
}

function buildCost(
  productType: ProductTypeBlueprint,
  tier: TierBlueprint,
  version: VersionProfile,
): CostEstimate {
  const base = tier.baseMonthlyCost[version.id];
  const low = roundMoney(base.low * productType.costMultiplier);
  const high = roundMoney(base.high * productType.costMultiplier);
  const shares = [
    { name: "App compute", share: 0.3, covers: "Web/API runtime and workers" },
    {
      name: "Postgres",
      share: 0.28,
      covers: "Primary data, backups, and pooling",
    },
    {
      name: "Cache / queue",
      share: 0.16,
      covers: "Caching, rate limits, and jobs",
    },
    {
      name: "Storage / delivery",
      share: 0.16,
      covers: "Files, assets, and bandwidth baseline",
    },
    { name: "Monitoring", share: 0.1, covers: "Logs, metrics, and alerting" },
  ];

  return {
    currency: "USD",
    cadence: "month",
    low,
    high,
    components: shares.map((component) => ({
      name: component.name,
      low: roundMoney(low * component.share),
      high: roundMoney(high * component.share),
      covers: component.covers,
    })),
    exclusions: [
      "taxes",
      "domain registration",
      "payment processing",
      "usage-based AI, SMS, and third-party API charges",
    ],
    variableDrivers: productType.variableCostDrivers,
    lastReviewed: "2026-08-02",
  };
}

function buildDelivery(
  productType: ProductTypeBlueprint,
  tier: TierBlueprint,
  version: VersionProfile,
): DeliveryEstimate {
  const base = tier.launchWeeks[version.id];
  const low = Math.max(
    1,
    Math.round(base.low * productType.deliveryMultiplier),
  );
  const high = Math.max(
    low + 1,
    Math.round(base.high * productType.deliveryMultiplier),
  );

  return {
    starterSetup: tier.setupTime[version.id],
    workingLaunch: `${low}–${high} weeks`,
    assumption:
      "One experienced full-time solo developer using SaaS Forge and managed services; excludes custom brand design, content production, data migration, and formal compliance certification.",
  };
}

function getAccounts(
  values: Partial<FormValues>,
  modules: ScaffoldModuleId[],
): string[] {
  const accounts = ["PostgreSQL provider"];
  const providers = values.NEXT_PUBLIC_AUTH_PROVIDERS ?? [];
  const observability = values.NEXT_PUBLIC_OBSERVABILITY_FEATURES ?? [];

  if (providers.includes("github")) accounts.push("GitHub OAuth app");
  if (providers.includes("google")) accounts.push("Google OAuth app");
  if (providers.includes("linkedin")) accounts.push("LinkedIn OAuth app");
  if (values.NEXT_PUBLIC_EMAIL_CLIENT === "resend") accounts.push("Resend");
  if (values.NEXT_PUBLIC_IMAGE_STORAGE === "vercel_blob")
    accounts.push("Vercel Blob");
  if (values.NEXT_PUBLIC_IMAGE_STORAGE === "cloudflare_r2")
    accounts.push("Cloudflare R2");
  if (observability.includes("rate_limiting")) accounts.push("Upstash Redis");
  if (observability.includes("logging")) accounts.push("Better Stack");
  if (observability.includes("google_analytics"))
    accounts.push("Google Analytics");
  if (modules.includes("billing")) accounts.push("Stripe or Dodo Payments");
  if (modules.includes("ai")) accounts.push("AI model provider");

  return unique(accounts);
}

function getSecrets(
  values: Partial<FormValues>,
  modules: ScaffoldModuleId[],
): string[] {
  const secrets = ["DATABASE_URL", "BETTER_AUTH_SECRET"];
  const providers = values.NEXT_PUBLIC_AUTH_PROVIDERS ?? [];
  const observability = values.NEXT_PUBLIC_OBSERVABILITY_FEATURES ?? [];

  if (providers.includes("github"))
    secrets.push("AUTH_GITHUB_CLIENT_ID", "AUTH_GITHUB_CLIENT_SECRET");
  if (providers.includes("google"))
    secrets.push("AUTH_GOOGLE_CLIENT_ID", "AUTH_GOOGLE_CLIENT_SECRET");
  if (providers.includes("linkedin"))
    secrets.push("AUTH_LINKEDIN_CLIENT_ID", "AUTH_LINKEDIN_CLIENT_SECRET");
  if (values.NEXT_PUBLIC_EMAIL_CLIENT === "resend")
    secrets.push("RESEND_API_KEY");
  if (values.NEXT_PUBLIC_IMAGE_STORAGE === "vercel_blob")
    secrets.push("BLOB_READ_WRITE_TOKEN");
  if (values.NEXT_PUBLIC_IMAGE_STORAGE === "cloudflare_r2")
    secrets.push(
      "R2_ACCOUNT_ID",
      "R2_ACCESS_KEY_ID",
      "R2_SECRET_ACCESS_KEY",
      "R2_BUCKET_NAME",
      "NEXT_PUBLIC_R2_PUBLIC_URL",
    );
  if (observability.includes("rate_limiting"))
    secrets.push("UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN");
  if (observability.includes("logging"))
    secrets.push(
      "BETTERSTACK_TELEMETRY_SOURCE_TOKEN",
      "BETTERSTACK_TELEMETRY_INGESTING_HOST",
    );
  if (observability.includes("google_analytics"))
    secrets.push("NEXT_PUBLIC_GOOGLE_ANALYTICS_MEASUREMENT_ID");
  if (modules.includes("billing"))
    secrets.push("STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET");
  if (modules.includes("ai")) secrets.push("OPENAI_API_KEY");

  return unique(secrets);
}

function buildSteps(
  productType: ProductTypeBlueprint,
  accounts: string[],
): PresetStep[] {
  return [
    {
      title: "Connect the managed foundation",
      details: accounts.map(
        (account) =>
          `Create or connect ${account}, then add its keys in Accounts & Keys.`,
      ),
    },
    {
      title: `Model the ${productType.name.toLowerCase()} core`,
      details: productType.capabilities.map(
        (capability) =>
          `Define the first ${capability} workflow and its success metric.`,
      ),
    },
    {
      title: "Deploy and test the critical path",
      details: [
        "Generate the scaffold and run database setup.",
        "Deploy a preview environment and exercise auth, data, and billing paths.",
        "Add the first product-specific component listed under You add next.",
      ],
    },
  ];
}

export function resolvePreset(
  productTypeId: ProductTypeId,
  tierId: TierId,
  versionId: VersionId,
): ResolvedPreset {
  const productType = PRODUCT_TYPE_BLUEPRINTS.find(
    (entry) => entry.id === productTypeId,
  );
  const tier = TIER_BLUEPRINTS.find((entry) => entry.id === tierId);
  const version = VERSION_PROFILES.find((entry) => entry.id === versionId);

  if (!productType || !tier || !version) {
    throw new Error(
      `Unknown preset combination: ${productTypeId}/${tierId}/${versionId}`,
    );
  }

  const requestedModules = productType.scaffoldModules ?? [];
  const modules = requestedModules.filter((moduleId) =>
    AVAILABLE_MODULES.has(moduleId),
  );
  const values: Partial<FormValues> = {
    ...tier.scaffoldValues,
    ...productType.scaffoldValues,
    ...version.scaffoldValues,
    SELECTED_MODULES: modules,
  };

  if (modules.includes("billing"))
    values.NEXT_PUBLIC_PAYMENT_GATEWAY = "stripe";
  if (modules.includes("ai")) values.NEXT_PUBLIC_AI_ENABLED = "true";

  const accountsNeeded = getAccounts(values, modules);
  const architecture = [
    ...CORE_ARCHITECTURE,
    ...tier.architectureAdditions,
    ...productType.architecture,
  ].filter(
    (node, index, nodes) =>
      nodes.findIndex((candidate) => candidate.id === node.id) === index,
  );

  return {
    id: `${productType.id}:${tier.id}:${version.id}`,
    productType,
    tier,
    version,
    name: `${version.label} ${tier.versionNoun}`,
    tagline: `${productType.name}: ${version.description}`,
    architecture,
    includedInScaffold: productType.includedInScaffold,
    addNext: productType.addNext,
    firstBottleneck: productType.firstBottleneck,
    upgradeTrigger:
      tier.order >= 3
        ? `${productType.upgradeTrigger} ${tier.upgradeTrigger}`
        : tier.upgradeTrigger,
    capacityLabel: tier.mauLabel,
    serviceLimits: tier.serviceLimits,
    accountsNeeded,
    secretsToFill: getSecrets(values, modules),
    steps: buildSteps(productType, accountsNeeded),
    cost: buildCost(productType, tier, version),
    delivery: buildDelivery(productType, tier, version),
    values,
    modules,
  };
}

export function recommendTier(stage: StageEstimate): TierId {
  if (stage.kind === "mvp") return "tier-1";
  if (stage.kind === "beta") return "tier-2";
  if (stage.value < 10_000) return "tier-3";
  if (stage.value < 50_000) return "tier-4";
  if (stage.value < 250_000) return "tier-5";
  return "tier-6";
}

export function getTier(tierId: TierId): TierBlueprint {
  const tier = TIER_BLUEPRINTS.find((entry) => entry.id === tierId);
  if (!tier) throw new Error(`Unknown tier: ${tierId}`);
  return tier;
}
