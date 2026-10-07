import type { MetadataRoute } from 'next'

const BASE = process.env.NEXT_PUBLIC_APP_URL || 'https://flashletter.app'

export default function sitemap(): MetadataRoute.Sitemap {
  return ['', '/pricing', '/signup', '/login', '/terms', '/privacy'].map((path) => ({
    url: `${BASE}${path}`,
    changeFrequency: path === '' || path === '/pricing' ? 'weekly' : 'monthly',
    priority: path === '' ? 1 : 0.6,
  }))
}
