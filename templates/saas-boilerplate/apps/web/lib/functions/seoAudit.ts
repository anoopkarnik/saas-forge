import { parse } from "node-html-parser";
import { fetchDocumentation } from "@/lib/functions/fetchDocumentation";
import { PUBLIC_SEO_STATIC_ROUTES } from "@/lib/seo";
import type {
  SeoAuditResponse,
  PageAuditResult,
  SeoCheckResult,
  SeoCheckStatus,
} from "@/lib/ts-types/seo";

const SITE_WIDE_CHECK_IDS = new Set(["robots", "sitemap"]);

function check(
  id: string,
  label: string,
  category: SeoCheckResult["category"],
  status: SeoCheckStatus,
  detail: string
): SeoCheckResult {
  return { id, label, status, detail, category };
}

async function checkRobotsTxt(baseUrl: string): Promise<SeoCheckResult> {
  try {
    const res = await fetch(`${baseUrl}/robots.txt`, { cache: "no-store" });
    return res.ok
      ? check("robots", "robots.txt accessible", "technical", "pass", "robots.txt returned 200")
      : check("robots", "robots.txt accessible", "technical", "fail", `robots.txt returned ${res.status}`);
  } catch (e) {
    return check("robots", "robots.txt accessible", "technical", "fail", `Failed to fetch robots.txt: ${(e as Error).message}`);
  }
}

async function checkSitemap(baseUrl: string): Promise<SeoCheckResult> {
  try {
    const res = await fetch(`${baseUrl}/sitemap.xml`, { cache: "no-store" });
    return res.ok
      ? check("sitemap", "sitemap.xml accessible", "technical", "pass", "sitemap.xml returned 200")
      : check("sitemap", "sitemap.xml accessible", "technical", "fail", `sitemap.xml returned ${res.status}`);
  } catch (e) {
    return check("sitemap", "sitemap.xml accessible", "technical", "fail", `Failed to fetch sitemap.xml: ${(e as Error).message}`);
  }
}

async function checkPageSpeed(url: string): Promise<SeoCheckResult> {
  const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY;
  if (!apiKey) {
    return check("pagespeed", "Google PageSpeed Insights performance", "performance", "warn", "API key not configured");
  }
  try {
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${apiKey}&category=performance`;
    const res = await fetch(apiUrl, { cache: "no-store" });
    if (!res.ok) {
      return check("pagespeed", "Google PageSpeed Insights performance", "performance", "warn", `PageSpeed API returned ${res.status}`);
    }
    const data = await res.json();
    const score = Math.round(
      (data.lighthouseResult?.categories?.performance?.score ?? 0) * 100
    );
    if (score >= 90) {
      return check("pagespeed", "Google PageSpeed Insights performance", "performance", "pass", `Score: ${score}/100`);
    } else if (score >= 50) {
      return check("pagespeed", "Google PageSpeed Insights performance", "performance", "warn", `Score: ${score}/100`);
    }
    return check("pagespeed", "Google PageSpeed Insights performance", "performance", "fail", `Score: ${score}/100`);
  } catch (e) {
    return check("pagespeed", "Google PageSpeed Insights performance", "performance", "warn", `PageSpeed check failed: ${(e as Error).message}`);
  }
}

async function resolvePagesToCheck(): Promise<string[]> {
  let docRoutes: string[] = [];

  try {
    const documentation = await fetchDocumentation();
    docRoutes = documentation.docs.map((doc) => `/landing/doc/${doc.slug}`);
  } catch (e) {
    console.error("[SEO] audit documentation route error:", e);
  }

  return [...PUBLIC_SEO_STATIC_ROUTES, ...docRoutes];
}

function scoreChecks(checks: SeoCheckResult[]): number {
  if (checks.length === 0) {
    return 0;
  }

  const score = checks.reduce((sum, checkResult) => {
    if (checkResult.status === "pass") {
      return sum + 1;
    }

    if (checkResult.status === "warn") {
      return sum + 0.75;
    }

    return sum;
  }, 0);

  return Math.round((score / checks.length) * 100);
}

function auditHtml(html: string): SeoCheckResult[] {
  const root = parse(html);
  const checks: SeoCheckResult[] = [];

  // Meta: title
  const titleEl = root.querySelector("title");
  const titleText = titleEl?.text?.trim();
  checks.push(
    titleText
      ? check("title", "Title tag present", "meta", "pass", `Title: "${titleText}"`)
      : check("title", "Title tag present", "meta", "fail", "No <title> tag found")
  );

  // Meta: description
  const descEl = root.querySelector('meta[name="description"]');
  const descContent = descEl?.getAttribute("content")?.trim();
  checks.push(
    descContent
      ? check("description", "Meta description present", "meta", "pass", `Description: "${descContent.slice(0, 80)}..."`)
      : check("description", "Meta description present", "meta", "fail", "No meta description found")
  );

  // OG tags
  for (const tag of ["og:title", "og:description", "og:image"] as const) {
    const el = root.querySelector(`meta[property="${tag}"]`);
    const content = el?.getAttribute("content")?.trim();
    checks.push(
      content
        ? check(tag, `${tag} present`, "og", "pass", `${tag}: "${content.slice(0, 80)}"`)
        : check(tag, `${tag} present`, "og", "fail", `No ${tag} meta tag found`)
    );
  }

  // Canonical
  const canonicalEl = root.querySelector('link[rel="canonical"]');
  const href = canonicalEl?.getAttribute("href")?.trim();
  checks.push(
    href
      ? check("canonical", "Canonical URL present", "technical", "pass", `Canonical: ${href}`)
      : check("canonical", "Canonical URL present", "technical", "fail", "No canonical link found")
  );

  // Headings: single H1
  const h1s = root.querySelectorAll("h1");
  if (h1s.length === 1) {
    checks.push(check("single-h1", "Single H1 per page", "headings", "pass", `H1: "${h1s[0]!.text.trim().slice(0, 60)}"`));
  } else if (h1s.length === 0) {
    checks.push(check("single-h1", "Single H1 per page", "headings", "fail", "No H1 tag found"));
  } else {
    checks.push(check("single-h1", "Single H1 per page", "headings", "fail", `Found ${h1s.length} H1 tags (expected 1)`));
  }

  // Headings: no skipped levels
  const headingEls = root.querySelectorAll("h1, h2, h3, h4, h5, h6");
  const levels = headingEls.map((el) => parseInt(el.tagName.replace("H", ""), 10));
  let skipped = false;
  for (let i = 1; i < levels.length; i++) {
    if (levels[i]! - levels[i - 1]! > 1) {
      skipped = true;
      break;
    }
  }
  checks.push(
    skipped
      ? check("heading-hierarchy", "No skipped heading levels", "headings", "fail", `Heading levels skip detected (e.g., H${levels.find((_, i) => i > 0 && levels[i]! - levels[i - 1]! > 1) ?? "?"}→H${levels[levels.findIndex((_, i) => i > 0 && levels[i]! - levels[i - 1]! > 1)] ?? "?"})`)
      : check("heading-hierarchy", "No skipped heading levels", "headings", "pass", "Heading hierarchy is sequential")
  );

  return checks;
}

async function auditPage(
  baseUrl: string,
  path: string,
  siteWideChecks: SeoCheckResult[]
): Promise<PageAuditResult> {
  const url = `${baseUrl}${path}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    const html = await res.text();
    const htmlChecks = auditHtml(html);
    const pageSpeedCheck = await checkPageSpeed(url);
    const allChecks = [...htmlChecks, ...siteWideChecks, pageSpeedCheck];
    const pageScoredChecks = allChecks.filter((c) => !SITE_WIDE_CHECK_IDS.has(c.id));
    const score = scoreChecks(pageScoredChecks);
    return { url, path, score, checks: allChecks };
  } catch (e) {
    return {
      url,
      path,
      score: 0,
      checks: [
        check("fetch", "Page accessible", "technical", "fail", `Failed to fetch page: ${(e as Error).message}`),
        ...siteWideChecks,
      ],
    };
  }
}

export async function runSeoAudit(baseUrl: string): Promise<SeoAuditResponse> {
  const pagesToCheck = await resolvePagesToCheck();
  const [robotsCheck, sitemapCheck] = await Promise.all([
    checkRobotsTxt(baseUrl),
    checkSitemap(baseUrl),
  ]);
  const siteWideChecks = [robotsCheck, sitemapCheck];

  const pages = await Promise.all(
    pagesToCheck.map((path) => auditPage(baseUrl, path, siteWideChecks))
  );

  const siteWideScore = scoreChecks(siteWideChecks);
  const overallScore = pages.length > 0
    ? Math.round(
        (pages.reduce((sum, p) => sum + p.score, 0) + siteWideScore) /
          (pages.length + 1)
      )
    : siteWideScore;

  return {
    pages,
    overallScore,
    timestamp: new Date().toISOString(),
  };
}
