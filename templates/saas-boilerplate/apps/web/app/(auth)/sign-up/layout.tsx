import type { Metadata } from "next";
import { siteMetadata } from "@/lib/site-config/metadata";
import { getTranslations } from "next-intl/server";
import type { ReactElement, ReactNode } from "react";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.meta");
  return siteMetadata({
    title: t("signUpTitle"),
    description: t("signUpDescription"),
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
