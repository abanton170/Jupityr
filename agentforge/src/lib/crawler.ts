import * as cheerio from "cheerio";

export interface CrawlResult {
  url: string;
  title: string;
  content: string;
}

interface CrawlOptions {
  maxDepth?: number;
  maxPages?: number;
}

/**
 * Extract the hostname from a URL for same-domain comparison.
 */
function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

/**
 * Resolve a potentially-relative href against a base URL.
 */
function resolveUrl(base: string, href: string): string | null {
  try {
    const resolved = new URL(href, base);
    // Only follow http(s) links
    if (resolved.protocol === "http:" || resolved.protocol === "https:") {
      // Strip fragment
      resolved.hash = "";
      return resolved.toString();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Extract main text content from an HTML string using cheerio.
 * Removes nav, header, footer, script, style, aside, and similar noise elements.
 */
function extractContent(html: string): { title: string; content: string; links: string[] } {
  const $ = cheerio.load(html);

  // Extract title
  const title =
    $("title").first().text().trim() ||
    $("h1").first().text().trim() ||
    "";

  // Remove non-content elements
  $(
    "nav, header, footer, script, style, aside, noscript, iframe, svg, " +
    "form, button, input, select, textarea, [role='navigation'], " +
    "[role='banner'], [role='contentinfo'], .nav, .navbar, .header, " +
    ".footer, .sidebar, .menu, .ad, .advertisement"
  ).remove();

  // Extract all same-page links before we pull text
  const links: string[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (href) {
      links.push(href);
    }
  });

  // Get text from body (or the whole doc if no body)
  const rawText = $("body").text() || $.text();

  // Clean up whitespace: collapse runs of whitespace into single space,
  // but preserve paragraph breaks (multiple newlines → double newline).
  const content = rawText
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n/g, "\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { title, content, links };
}

/**
 * Crawl a URL and optionally follow same-domain links up to maxDepth / maxPages.
 */
export async function crawlUrl(
  url: string,
  options?: CrawlOptions
): Promise<CrawlResult[]> {
  const maxDepth = options?.maxDepth ?? 3;
  const maxPages = options?.maxPages ?? 50;

  const visited = new Set<string>();
  const results: CrawlResult[] = [];
  const hostname = getHostname(url);

  if (!hostname) {
    throw new Error(`Invalid URL: ${url}`);
  }

  // BFS queue: [url, depth]
  const queue: Array<[string, number]> = [[url, 0]];

  while (queue.length > 0 && results.length < maxPages) {
    const [currentUrl, depth] = queue.shift()!;

    // Normalize and deduplicate
    const normalizedUrl = currentUrl.split("#")[0];
    if (visited.has(normalizedUrl)) continue;
    visited.add(normalizedUrl);

    try {
      const response = await fetch(normalizedUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; AgentForgeBot/1.0; +https://agentforge.ai)",
          Accept: "text/html,application/xhtml+xml",
        },
        signal: AbortSignal.timeout(15000),
        redirect: "follow",
      });

      if (!response.ok) continue;

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/html")) continue;

      const html = await response.text();
      const { title, content, links } = extractContent(html);

      if (content.length > 0) {
        results.push({
          url: normalizedUrl,
          title: title || normalizedUrl,
          content,
        });
      }

      // Follow links if we haven't reached max depth
      if (depth < maxDepth) {
        for (const href of links) {
          const resolved = resolveUrl(normalizedUrl, href);
          if (
            resolved &&
            !visited.has(resolved) &&
            getHostname(resolved) === hostname
          ) {
            queue.push([resolved, depth + 1]);
          }
        }
      }
    } catch {
      // Skip failed pages gracefully
      continue;
    }
  }

  return results;
}
