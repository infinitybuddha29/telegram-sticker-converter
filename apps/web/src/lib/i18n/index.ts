import { en } from './en';
import { ru } from './ru';

export type { Dictionary } from './en';
export type Lang = 'en' | 'ru';

export const langs: Lang[] = ['en', 'ru'];

export function isValidLang(lang: string): lang is Lang {
  return langs.includes(lang as Lang);
}

const dictionaries = { en, ru };

export function getDictionary(lang: Lang) {
  return dictionaries[lang];
}
