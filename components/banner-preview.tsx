/* eslint-disable @next/next/no-img-element -- blob / remote Supabase preview */
"use client";

import { useEffect, useRef, useState } from "react";

import { THEMES, type Theme } from "@/lib/banners";

interface Props {
  eyebrow: string;
  title: string;
  subtitle: string;
  buttonText: string;
  imageSrc: string | null;
  theme: Theme;
  /** false when the banner has no action: the app then hides the button. */
  showButton: boolean;
  phone?: PhoneSize;
}

// Design size of the card on a phone (home-hero.tsx). It is drawn at exactly this size (1:1, never enlarged)
// and only scaled down when the container is narrower, so wrapping and spacing match the app at any width.
// Card width = phone screen width minus the 16px side margins. Large (430pt) is the default.
export const PHONE_SIZES = { small: 328, standard: 361, large: 398 } as const;
export type PhoneSize = keyof typeof PHONE_SIZES;
const H = 208; // every banner in the app is exactly this tall
// The phone uses its system font, not the admin's Geist, so line breaks match.
const PHONE_FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, system-ui, sans-serif';

export function BannerPreview({ eyebrow, title, subtitle, buttonText, imageSrc, theme, showButton, phone = "large" }: Props) {
  const W = PHONE_SIZES[phone];
  const t = THEMES[theme];
  const box = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState(H);

  useEffect(() => {
    const el = box.current;
    const inner = card.current;
    if (!el || !inner) return;
    // The card is at least H tall and grows with its text, exactly like the app's (minHeight: 176).
    const update = () => {
      setScale(Math.min(1, el.clientWidth / W));
      setHeight(inner.offsetHeight);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    observer.observe(inner);
    return () => observer.disconnect();
  }, [W]);

  return (
    <div ref={box} className="mx-auto w-full" style={{ maxWidth: W, height: height * scale }} aria-label="Banner preview">
      <div
        ref={card}
        className="relative flex items-center overflow-hidden"
        style={{ width: W, height: H, borderRadius: 24, backgroundColor: t.bg, transform: `scale(${scale})`, transformOrigin: "top left", fontFamily: PHONE_FONT }}
      >
        <div className="absolute rounded-full opacity-70" style={{ right: -40, top: -30, width: 190, height: 190, backgroundColor: t.circle }} />
        {imageSrc && (
          <div className="absolute" style={{ right: 10, top: 12, bottom: 12, width: "40%" }}>
            <img src={imageSrc} alt="" className="h-full w-full object-contain object-right" />
          </div>
        )}
        <div className="relative" style={{ width: "62%", padding: "16px 0 16px 16px" }}>
          {eyebrow.trim() && (
            <div className="truncate uppercase" style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: t.eyebrow }}>
              {eyebrow}
            </div>
          )}
          <div className="line-clamp-2" style={{ marginTop: 6, fontSize: 21, lineHeight: "26px", fontWeight: 900, color: t.title }}>
            {title || "Banner title"}
          </div>
          {subtitle && (
            <div className="line-clamp-2" style={{ marginTop: 6, fontSize: 12, lineHeight: "17px", color: t.subtitle }}>
              {subtitle}
            </div>
          )}
          {showButton && (
            <div
              className="inline-flex max-w-full items-center"
              style={{ marginTop: 16, height: 42, gap: 8, padding: "0 16px", borderRadius: 999, fontSize: 14, fontWeight: 700, backgroundColor: t.cta, color: t.ctaText }}
            >
              <span className="truncate">{buttonText || "Button"}</span>
              <span aria-hidden>→</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
