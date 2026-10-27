import {
  Bell,
  Bot,
  ChartColumn,
  ChartNoAxesCombined,
  Clock,
  CreditCard,
  Database,
  FileText,
  Flag,
  HardDrive,
  KeyRound,
  Languages,
  Layers,
  ListChecks,
  LogIn,
  Mail,
  MonitorSmartphone,
  Plug,
  RefreshCw,
  Rocket,
  ScrollText,
  Settings,
  Sparkles,
  Users,
  Webhook,
} from "lucide-react";
import type { FeatureDetails } from "../../lib/feature-content";

const icons = {
  mail: Mail,
  "log-in": LogIn,
  database: Database,
  "hard-drive": HardDrive,
  "file-text": FileText,
  "monitor-smartphone": MonitorSmartphone,
  "credit-card": CreditCard,
  "chart-no-axes-combined": ChartNoAxesCombined,
  users: Users,
  "list-checks": ListChecks,
  bell: Bell,
  sparkles: Sparkles,
  bot: Bot,
  clock: Clock,
  plug: Plug,
  "key-round": KeyRound,
  webhook: Webhook,
  flag: Flag,
  "scroll-text": ScrollText,
  "chart-column": ChartColumn,
  settings: Settings,
  languages: Languages,
  rocket: Rocket,
  "refresh-cw": RefreshCw,
  layers: Layers,
} satisfies Record<FeatureDetails["icon"], typeof Layers>;

export function FeatureIcon({
  name,
  className,
}: {
  name?: string;
  className?: string;
}) {
  const Icon =
    name && Object.hasOwn(icons, name)
      ? icons[name as keyof typeof icons]
      : Layers;
  return <Icon aria-hidden="true" className={className} />;
}
