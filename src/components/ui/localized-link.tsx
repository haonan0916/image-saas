import Link, { LinkProps } from "next/link";
import { useLocale } from "@/hooks/useLocale";
import { createLocalizedPath } from "@/lib/i18n-utils";
import { ReactNode, MouseEventHandler } from "react";

interface LocalizedLinkProps extends Omit<LinkProps, 'href'> {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}

/**
 * 自动处理国际化路由的 Link 组件
 */
export function LocalizedLink({ href, children, className, onClick, ...props }: LocalizedLinkProps) {
  const { locale } = useLocale();
  
  // 如果是外部链接或锚点链接，直接使用原始 href
  if (href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:')) {
    return (
      <Link href={href} className={className} onClick={onClick} {...props}>
        {children}
      </Link>
    );
  }
  
  // 创建本地化路径
  const localizedHref = createLocalizedPath(locale, href);
  
  return (
    <Link href={localizedHref} className={className} onClick={onClick} {...props}>
      {children}
    </Link>
  );
}