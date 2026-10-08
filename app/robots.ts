import type { MetadataRoute } from 'next'

const BASE = process.env.NEXT_PUBLIC_APP_URL || 'https://flashletter.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/create/', '/campaigns', '/account', '/admin'],
    },
    sitemap: `${BASE}/sitemap.xml`,
  }
}
