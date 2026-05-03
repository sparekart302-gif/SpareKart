import NextLink, { type LinkProps as NextLinkProps } from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";

type Params = Record<string, string | number>;

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> &
  Pick<NextLinkProps, "prefetch" | "replace" | "scroll"> & {
    children: ReactNode;
    href?: string;
    params?: Params;
    to?: string;
  };

function resolveHref(path: string, params?: Params) {
  if (!params) {
    return path;
  }

  return path.replace(/\$([a-zA-Z0-9_]+)/g, (_, key: string) => {
    const value = params[key];

    if (value === undefined) {
      throw new Error(`Missing route param "${key}" for path "${path}"`);
    }

    return encodeURIComponent(String(value));
  });
}

export function Link({ children, href, params, to, ...props }: LinkProps) {
  const resolvedHref = href ?? resolveHref(to ?? "#", params);

  return (
    <NextLink href={resolvedHref} scroll={props.scroll ?? true} {...props}>
      {children}
    </NextLink>
  );
}
