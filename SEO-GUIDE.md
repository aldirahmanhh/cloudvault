# CloudVault - SEO Configuration Guide

## Environment Variables

Add to Vercel environment variables:

```env
NEXT_PUBLIC_SITE_URL=https://cloudvault.my.id
```

**Note**: Default URL is already set to `https://cloudvault.my.id`. Only add this environment variable if you need to override it.

## SEO Features Implemented

### 1. **Enhanced Metadata** (`app/layout.js`)
- Comprehensive title templates
- Rich descriptions with keywords
- Open Graph tags for social sharing
- Twitter Card support
- Proper meta tags (keywords, author, creator)
- Canonical URLs
- Robots directives

### 2. **Structured Data (JSON-LD)**
- Schema.org WebApplication markup
- Feature list
- Pricing information (free)
- Aggregate ratings
- Helps search engines understand your app

### 3. **Robots.txt** (`/robots.txt`)
- Allows all search engines
- Blocks API routes from indexing
- Sitemap reference
- Crawl-delay for polite crawling
- Specific rules for major bots (Google, Bing, Yahoo)

### 4. **Sitemap** (`/sitemap.xml`)
- XML sitemap with all public pages
- Priority and change frequency hints
- Auto-updates with current date
- Helps search engines discover pages

### 5. **PWA Manifest** (`public/manifest.json`)
- Enhanced descriptions
- App categories (utilities, productivity, storage)
- Screenshots
- Shortcuts for quick actions
- Better app store presentation

### 6. **Share Page Metadata** (`app/share/layout.js`)
- Dedicated OG tags for share page
- Optimized for social sharing

## Verification & Testing

### Test SEO Implementation:

1. **Open Graph Preview**
   - Facebook: https://developers.facebook.com/tools/debug/ (test with https://cloudvault.my.id)
   - LinkedIn: https://www.linkedin.com/post-inspector/
   - Twitter: https://cards-dev.twitter.com/validator

2. **Structured Data**
   - Google Rich Results Test: https://search.google.com/test/rich-results
   - Schema Markup Validator: https://validator.schema.org/

3. **Sitemap & Robots**
   - Visit: https://cloudvault.my.id/robots.txt
   - Visit: https://cloudvault.my.id/sitemap.xml

4. **Google Search Console**
   - Add your site: https://search.google.com/search-console
   - Submit sitemap
   - Monitor indexing status

### Add Verification Codes:

In `app/layout.js`, uncomment and add your verification codes:

```javascript
verification: {
  google: 'your-google-verification-code',
  yandex: 'your-yandex-verification-code',
  bing: 'your-bing-verification-code',
},
```

## SEO Best Practices Applied

✅ **Technical SEO**
- Semantic HTML structure
- Mobile-responsive (viewport meta)
- Fast loading (Next.js optimization)
- HTTPS (Vercel default)
- Canonical URLs

✅ **On-Page SEO**
- Descriptive titles (< 60 chars)
- Meta descriptions (< 160 chars)
- Keyword optimization
- Structured data markup

✅ **Social SEO**
- Open Graph tags
- Twitter Cards
- Rich preview images
- Proper aspect ratios

✅ **Crawlability**
- robots.txt
- XML sitemap
- Clean URL structure
- No duplicate content

## Next Steps (Optional)

1. **Analytics**
   - Add Google Analytics 4
   - Add Vercel Analytics
   - Track user behavior

2. **Performance**
   - Enable Vercel Speed Insights
   - Optimize images with next/image
   - Add lazy loading

3. **Content**
   - Add blog/documentation pages
   - Create FAQ section
   - Add use case examples

4. **Backlinks**
   - Submit to product directories (Product Hunt, Hacker News)
   - Share on social media
   - Write technical blog posts

5. **Local SEO** (if applicable)
   - Add location data
   - Create Google Business Profile

## Monitoring

Track these metrics:
- Google Search Console impressions/clicks
- Core Web Vitals scores
- Indexing status
- Mobile usability
- Structured data errors

## Support

For SEO issues:
1. Check Vercel deployment logs
2. Verify environment variables
3. Test with SEO tools above
4. Monitor Search Console for errors
