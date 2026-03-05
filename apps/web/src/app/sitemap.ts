import type { MetadataRoute } from 'next';

const BASE_URL = process.env['NEXT_PUBLIC_BASE_URL'] ?? 'https://stickerweb-production.up.railway.app';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE_URL}/en`, lastModified: new Date(), changeFrequency: 'monthly', priority: 1 },
    { url: `${BASE_URL}/ru`, lastModified: new Date(), changeFrequency: 'monthly', priority: 1 },
  ];
}
