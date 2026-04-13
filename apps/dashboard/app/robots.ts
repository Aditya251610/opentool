import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard/', '/api/'],
      },
      {
        userAgent: 'GPTBot',
        allow: ['/', '/docs', '/llms.txt'],
        disallow: ['/dashboard/', '/api/'],
      },
      {
        userAgent: 'ChatGPT-User',
        allow: ['/', '/docs', '/llms.txt'],
        disallow: ['/dashboard/', '/api/'],
      },
      {
        userAgent: 'PerplexityBot',
        allow: ['/', '/docs', '/llms.txt'],
        disallow: ['/dashboard/', '/api/'],
      },
      {
        userAgent: 'ClaudeBot',
        allow: ['/', '/docs', '/llms.txt'],
        disallow: ['/dashboard/', '/api/'],
      },
    ],
    sitemap: 'https://opentool.dev/sitemap.xml',
  }
}
