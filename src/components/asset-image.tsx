"use client";

import { useState } from "react";

type AssetImageProps = {
  alt: string;
  className?: string;
  fallback: string;
  src?: string;
};

export function AssetImage({ alt, className = "", fallback, src }: AssetImageProps) {
  const [failed, setFailed] = useState(!src);

  if (failed || !src) {
    return (
      <div
        aria-label={alt}
        className={`flex items-center justify-center bg-slate-100 text-xs font-semibold text-slate-500 ${className}`}
        role="img"
      >
        {fallback}
      </div>
    );
  }

  return (
    <img
      alt={alt}
      className={`object-cover ${className}`}
      decoding="async"
      loading="lazy"
      onError={() => setFailed(true)}
      src={src}
    />
  );
}
