import { createSeoMetadata } from "@/lib/seo";
import type { ReactElement, ReactNode } from "react";

export const metadata = createSeoMetadata({
  title: "Sign In",
  description: "Sign in to your SaaS account.",
  pathname: "/sign-in",
});

export default function SignInLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>): ReactElement {
  return <>{children}</>;
}
