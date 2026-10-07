import type { Metadata } from "next";
import { siteMetadata } from "@/lib/site-config/metadata";
import type { ReactElement, ReactNode } from "react";

export async function generateMetadata(): Promise<Metadata> {
  return siteMetadata({
    title: "Sign In",
    description: "Sign in to your SaaS account.",
    pathname: "/sign-in",
  });
}

export default function SignInLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>): ReactElement {
  return <>{children}</>;
}
