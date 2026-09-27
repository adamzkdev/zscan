"use client";

import { useEffect, useRef, useState } from "react";

/** An image that falls back to a label when it can't load (e.g. IPFS unavailable). */
export function NftImage({ src, fallback }: { src: string; fallback: string }) {
  const [failed, setFailed] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  // An error before hydration never reaches onError; catch it on mount.
  useEffect(() => {
    const el = img.current;
    if (el?.complete && el.naturalWidth === 0) setFailed(true);
  }, []);
  if (failed)
    return <div className="flex size-full items-center justify-center p-3 text-center text-xs text-muted">{fallback}</div>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={img}
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className="size-full object-contain [image-rendering:pixelated]"
    />
  );
}
