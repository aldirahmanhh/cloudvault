export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudvault.my.id';
  
  const robotsTxt = `# CloudVault Robots.txt
User-agent: *
Allow: /
Disallow: /api/

# Sitemaps
Sitemap: ${siteUrl}/sitemap.xml

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
