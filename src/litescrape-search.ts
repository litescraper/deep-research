// Candidate for etheia-agent-map; repository access returned HTTP 404.
// Checked on 2026-10-25.
// See: https://github.com/Etheia-Consulting-LLC/etheia-agent-map

import type FirecrawlApp from '@mendable/firecrawl-js';
import type { SearchResponse } from '@mendable/firecrawl-js';

type OrganicResult = { link?: string; title?: string };

export async function searchWithLitescrape(
  firecrawl: FirecrawlApp,
  query: string,
): Promise<SearchResponse> {
  const key = process.env.LITESCRAPE_API_KEY;
  if (!key) throw new Error('LITESCRAPE_API_KEY is required');
  const base = (
    process.env.LITESCRAPE_BASE_URL || 'https://api.litescrape.com'
  ).replace(/\/+$/, '');
  const url = new URL(base + '/api/google/search');
  url.search = new URLSearchParams({ q: query, num: '5' }).toString();
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok)
    throw new Error('Search provider returned HTTP ' + response.status);
  const body = (await response.json()) as { organic_results?: OrganicResult[] };
  const data: SearchResponse['data'] = [];
  for (const hit of (body.organic_results ?? []).slice(0, 5)) {
    if (!hit.link) continue;
    // Keep the existing full-page extraction, not just search snippets.
    const page = await firecrawl.scrapeUrl(hit.link, { formats: ['markdown'] });
    if (!page.success) throw new Error('Firecrawl page extraction failed');
    data.push({ ...page, url: hit.link });
  }
  return { success: true, data };
}
