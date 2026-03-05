import type { Lang } from '@/lib/i18n';
import { getDictionary, isValidLang } from '@/lib/i18n';
import ConverterClient from './ConverterClient';

type Props = { params: Promise<{ lang: string }> };

export default async function Page({ params }: Props) {
  const { lang } = await params;
  const l: Lang = isValidLang(lang) ? lang : 'en';
  const dict = getDictionary(l);
  return <ConverterClient dict={dict} />;
}
