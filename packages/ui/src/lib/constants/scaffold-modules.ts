export type ScaffoldModuleId =
  | "billing"
  | "multi_tenancy"
  | "ai"
  | "api_keys"
  | "notifications";

export type ScaffoldModuleOption = {
  id: ScaffoldModuleId;
  label: string;
  description: string;
  creditsCost: number;
  available: boolean;
};

export const BASE_SCAFFOLD_CREDITS_COST = 10;

export const SCAFFOLD_MODULE_OPTIONS: ScaffoldModuleOption[] = [
  {
    id: "billing",
    label: "Billing & Payments",
    description: "Checkout, transactions, credits purchase UI, and payment webhooks.",
    creditsCost: 10,
    available: true,
  },
  {
    id: "multi_tenancy",
    label: "Organizations / Teams",
    description: "Org workspaces, invites, memberships, and scoped RBAC.",
    creditsCost: 15,
    available: false,
  },
  {
    id: "ai",
    label: "AI",
    description: "Provider SDK integration, chat flows, and AI-specific platform helpers.",
    creditsCost: 15,
    available: false,
  },
  {
    id: "api_keys",
    label: "API Keys",
    description: "Programmable access with scoped key management.",
    creditsCost: 5,
    available: false,
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "In-app notifications and future multi-channel delivery hooks.",
    creditsCost: 5,
    available: false,
  },
];

export function calculateScaffoldCredits(selectedModules: ScaffoldModuleId[]) {
  const selectedSet = new Set(selectedModules);
  const moduleCredits = SCAFFOLD_MODULE_OPTIONS.filter((module) =>
    selectedSet.has(module.id),
  ).map((module) => ({
    moduleId: module.id,
    credits: module.creditsCost,
    label: module.label,
  }));

  return {
    baseCredits: BASE_SCAFFOLD_CREDITS_COST,
    moduleCredits,
    totalCredits:
      BASE_SCAFFOLD_CREDITS_COST +
      moduleCredits.reduce((sum, entry) => sum + entry.credits, 0),
  };
}

