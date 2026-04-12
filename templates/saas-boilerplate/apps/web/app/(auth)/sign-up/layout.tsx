import { createSeoMetadata } from "@/lib/seo";
import type { ReactElement, ReactNode } from "react";

export const metadata = createSeoMetadata({
  title: "Sign Up",
  description: "Create your SaaS account.",
  pathname: "/sign-up",
});

export default function SignUpLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>): ReactElement {
  return <>{children}</>;
}
