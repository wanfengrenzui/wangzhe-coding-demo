declare module "next/server.js" {
  export type NextRequest = Request;
}

declare module "next/dist/lib/metadata/types/metadata-interface.js" {
  export type ResolvingMetadata = unknown;
  export type ResolvingViewport = unknown;
}

declare module "next/types.js" {
  export type ResolvingMetadata = unknown;
  export type ResolvingViewport = unknown;
}

declare module "next/link" {
  import type { AnchorHTMLAttributes, ReactNode } from "react";

  export default function Link(
    props: AnchorHTMLAttributes<HTMLAnchorElement> & {
      href: string;
      children?: ReactNode;
    },
  ): ReactNode;
}

declare module "next/image" {
  import type { ImgHTMLAttributes, ReactNode } from "react";

  export default function Image(
    props: ImgHTMLAttributes<HTMLImageElement> & {
      alt: string;
      fill?: boolean;
      sizes?: string;
      src: string;
    },
  ): ReactNode;
}
