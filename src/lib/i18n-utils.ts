import { Locale } from "@/dictionaries";

/**
 * 创建带有语言前缀的路径
 * @param locale 当前语言
 * @param path 路径（不包含语言前缀）
 * @returns 完整的国际化路径
 */
export function createLocalizedPath(locale: Locale, path: string): string {
  // 确保路径以 / 开头
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // 如果路径已经包含语言前缀，直接返回
  if (normalizedPath.startsWith(`/${locale}/`)) {
    return normalizedPath;
  }
  
  // 添加语言前缀
  return `/${locale}${normalizedPath}`;
}

/**
 * 从路径中移除语言前缀
 * @param path 完整路径
 * @param locale 当前语言
 * @returns 不包含语言前缀的路径
 */
export function removeLocaleFromPath(path: string, locale: Locale): string {
  return path.replace(`/${locale}`, '') || '/';
}

/**
 * 检查路径是否包含语言前缀
 * @param path 路径
 * @param locale 语言
 * @returns 是否包含语言前缀
 */
export function hasLocalePrefix(path: string, locale: Locale): boolean {
  return path.startsWith(`/${locale}/`) || path === `/${locale}`;
}