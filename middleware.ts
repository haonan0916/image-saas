import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import Negotiator from 'negotiator';
import { match } from '@formatjs/intl-localematcher';
import { locales, defaultLocale } from '@dict/index';

function getLocale(request: NextRequest): string {
  // 获取请求头
  const headers = {
    'accept-language': request.headers.get('accept-language') || ''
  };
  
  // 解析请求头
  const negotiator = new Negotiator({ headers });
  
  // 获取语言
  const languages = negotiator.languages();
  
  // 匹配语言
  const locale = match(languages, locales, defaultLocale);
  
  return locale;
}

export async function middleware(request: NextRequest) {
  // 检查路径是否已经包含语言前缀
  const pathname = request.nextUrl.pathname;
  
  // 跳过 API 路由和静态文件
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }
  
  // 检查路径是否已经包含支持的语言
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );
  
  if (pathnameHasLocale) {
    return NextResponse.next();
  }
  
  // 获取用户语言偏好
  const locale = getLocale(request);
  
  // 重定向到带语言前缀的路径
  const newUrl = new URL(`/${locale}${pathname}`, request.url);
  return NextResponse.redirect(newUrl);
}

export const config = {
  matcher: [
    // 匹配所有路径，除了 API 路由和静态文件
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
