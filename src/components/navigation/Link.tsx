"use client";

import NextLink, { type LinkProps as NextLinkProps } from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { beginRouteProgress } from "./RouteProgressBar";

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
    <NextLink
      href={resolvedHref}
      scroll={props.scroll ?? true}
      {...props}
      onClick={(event) => {
        props.onClick?.(event);

        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          typeof resolvedHref !== "string" ||
          resolvedHref.startsWith("#") ||
          resolvedHref.startsWith("http://") ||
          resolvedHref.startsWith("https://") ||
          resolvedHref.startsWith("mailto:") ||
          resolvedHref.startsWith("tel:")
        ) {
          return;
        }

        beginRouteProgress();
      }}
    >
      {children}
    </NextLink>
  );
}
