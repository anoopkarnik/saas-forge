import { ReactNode } from "react";
import { FaGithub, FaLinkedin, FaStripe } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import {
  Mail, Shield, Sun, Moon, Monitor, Database,
  Cloud, Zap, CreditCard, Ban, CircleDot
} from "lucide-react";
import { SiNotion, SiStrapi, SiUpstash, SiVercel, SiCloudflare, SiResend } from "react-icons/si";

// ─── Theme color map for color swatches ────────────────────────────────
export const themeColors: Record<string, string> = {
  blue: "#3b82f6",
  green: "#22c55e",
  neutral: "#737373",
  orange: "#f97316",
  red: "#ef4444",
  rose: "#f43f5e",
  violet: "#8b5cf6",
  yellow: "#eab308",
};

// ─── Select options ────────────────────────────────────────────────────
export type SelectOption = {
  value: string;
  label: string;
  icon?: ReactNode;
};

export const selectOptions: Record<string, SelectOption[]> = {
  NEXT_PUBLIC_THEME: [
    { value: "blue", label: "Blue" },
    { value: "green", label: "Green" },
    { value: "neutral", label: "Neutral" },
    { value: "orange", label: "Orange" },
    { value: "red", label: "Red" },
    { value: "rose", label: "Rose" },
    { value: "violet", label: "Violet" },
    { value: "yellow", label: "Yellow" },
  ],
  NEXT_PUBLIC_THEME_TYPE: [
    { value: "light", label: "Light", icon: <Sun className="h-4 w-4" /> },
    { value: "dark", label: "Dark", icon: <Moon className="h-4 w-4" /> },
    { value: "system", label: "System", icon: <Monitor className="h-4 w-4" /> },
  ],
  DODO_PAYMENTS_ENVIRONMENT: [
    { value: "test_mode", label: "Test Mode", icon: <Zap className="h-4 w-4" /> },
    { value: "live_mode", label: "Live Mode", icon: <Zap className="h-4 w-4 text-green-500" /> },
  ],
  NEXT_PUBLIC_CMS: [
    { value: "notion", label: "Notion", icon: <SiNotion className="h-4 w-4" /> },
    { value: "strapi", label: "Strapi (Coming Soon)", icon: <SiStrapi className="h-4 w-4 text-muted-foreground" /> },
  ],
  NEXT_PUBLIC_PAYMENT_GATEWAY: [
    { value: "none", label: "None", icon: <Ban className="h-4 w-4 text-muted-foreground" /> },
    { value: "dodo", label: "Dodo Payments", icon: <CreditCard className="h-4 w-4 text-green-500" /> },
    { value: "stripe", label: "Stripe (Coming Soon)", icon: <FaStripe className="h-4 w-4 text-[#635bff]" /> },
  ],
  NEXT_PUBLIC_IMAGE_STORAGE: [
    { value: "vercel_blob", label: "Vercel Blob", icon: <SiVercel className="h-4 w-4" /> },
    { value: "cloudflare_r2", label: "Cloudflare R2 (Coming Soon)", icon: <SiCloudflare className="h-4 w-4 text-[#f48120]" /> },
  ],
  NEXT_PUBLIC_ALLOW_RATE_LIMIT: [
    { value: "upstash", label: "Upstash", icon: <SiUpstash className="h-4 w-4 text-[#00e9a3]" /> },
  ],
  NEXT_PUBLIC_EMAIL_CLIENT: [
    { value: "none", label: "None", icon: <Ban className="h-4 w-4 text-muted-foreground" /> },
    { value: "resend", label: "Resend", icon: <SiResend className="h-4 w-4" /> },
  ],
  NEXT_PUBLIC_AUTH_FRAMEWORK: [
    { value: "better-auth", label: "Better Auth", icon: <Shield className="h-4 w-4 text-amber-500" /> },
  ],
};

// ─── Multiselect options ───────────────────────────────────────────────
export type MultiselectOption = {
  value: string;
  label: string;
  icon?: ReactNode;
  color?: string;
};

export const multiselectOptions: Record<string, MultiselectOption[]> = {
  NEXT_PUBLIC_AUTH_PROVIDERS: [
    { value: "email_verification", label: "Email Verification", icon: <Mail className="h-5 w-5" />, color: "text-blue-500 border-blue-500/50 bg-blue-500/10" },
    { value: "linkedin", label: "LinkedIn", icon: <FaLinkedin className="h-5 w-5 text-[#0a66c2]" />, color: "text-[#0a66c2] border-[#0a66c2]/50 bg-[#0a66c2]/10" },
    { value: "google", label: "Google", icon: <FcGoogle className="h-5 w-5" />, color: "text-red-500 border-red-500/50 bg-red-500/10" },
    { value: "github", label: "GitHub", icon: <FaGithub className="h-5 w-5" />, color: "text-foreground border-foreground/50 bg-foreground/10" },
  ],
};