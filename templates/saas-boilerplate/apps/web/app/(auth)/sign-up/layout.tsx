import type { Metadata } from "next";
import { siteMetadata } from "@/lib/site-config/metadata";
import type { ReactElement, ReactNode } from "react";

export async function generateMetadata(): Promise<Metadata> {
  return siteMetadata({
    title: "Sign Up",
    description: "Create your SaaS account.",
    pathname: "/sign-up",
  });
}

export default function SignUpLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>): ReactElement {
  return <>{children}</>;
}
