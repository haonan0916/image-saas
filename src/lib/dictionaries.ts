import { Locale, Dictionary } from '@/dictionaries';
import zhDict from '@/dictionaries/zh.json';
import enDict from '@/dictionaries/en.json';

const dictionaries = {
  zh: () => import('@/dictionaries/zh.json').then((module) => module.default),
  en: () => import('@/dictionaries/en.json').then((module) => module.default),
};

export const getDictionary = async (locale: Locale): Promise<Dictionary> => {
  return dictionaries[locale]();
};

// 客户端使用的同步版本
export const getDictionarySync = (locale: Locale): Dictionary => {
  if (locale === 'zh') {
    return zhDict;
  }
  return enDict;
};