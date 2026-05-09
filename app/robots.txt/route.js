import { SITE_URL } from '@/lib/constants';

export async function GET() {
  const robotsTxt = `# CloudVault Robots.txt
User-agent: *
Allow: /
Disallow: /api/

# Sitemaps
Sitemap: ${SITE_URL}/sitemap.xml

# Crawl-delay for polite crawling
Crawl-delay: 1

# Specific bot rules
User-agent: Googlebot
Allow: /
Disallow: /api/

User-agent: Bingbot
Allow: /
Disallow: /api/

User-agent: Slurp
Allow: /
Disallow: /api/
`;

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
