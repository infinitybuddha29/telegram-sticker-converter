import type { Metadata } from 'next';
import type { Lang } from '@/lib/i18n';
import { getDictionary, isValidLang } from '@/lib/i18n';
import LangScript from '@/components/LangScript';

type Props = { params: Promise<{ lang: string }>; children: React.ReactNode };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const l: Lang = isValidLang(lang) ? lang : 'en';
  const dict = getDictionary(l);
  const baseUrl = process.env['NEXT_PUBLIC_BASE_URL'] ?? 'https://stickerweb-production.up.railway.app';

  return {
    title: dict.meta.title,
    description: dict.meta.description,
    alternates: {
      canonical: `${baseUrl}/${l}`,
      languages: {
        'en': `${baseUrl}/en`,
        'ru': `${baseUrl}/ru`,
        'x-default': `${baseUrl}/en`,
      },
    },
    openGraph: {
      title: dict.meta.title,
      description: dict.meta.description,
      url: `${baseUrl}/${l}`,
      type: 'website',
    },
  };
}

export function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'ru' }];
}

export default async function LangLayout({ params, children }: Props) {
  const { lang } = await params;
  const l: Lang = isValidLang(lang) ? lang : 'en';
  return (
    <>
      {/* Sets document.documentElement.lang correctly for screen readers & SEO */}
      <LangScript lang={l} />
      {children}
    </>
  );
}
