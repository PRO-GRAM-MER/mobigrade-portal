"use client";

import { useState } from "react";
import { FileText, ImageOff } from "lucide-react";
import { getImageUrl } from "@/lib/image";
import s from "../../admin.module.css";

interface Props {
  src: string;
  label: string;
}

export default function DocImage({ src: rawSrc, label }: Props) {
  const src = getImageUrl(rawSrc);
  const [errored, setErrored] = useState(false);

  return (
    <div className={s.docImageWrap}>
      <span className={s.docImageLabel}>{label}</span>

      {errored ? (
        /* Fallback when image can't be loaded */
        <a href={src} target="_blank" rel="noreferrer">
          <div
            className={s.docImage}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              background: "var(--color-background)",
              color: "var(--color-muted-foreground)",
              fontSize: "0.72rem",
              cursor: "pointer",
            }}
          >
            <ImageOff size={20} />
            <span>Preview unavailable</span>
          </div>
        </a>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <a href={src} target="_blank" rel="noreferrer" title={`Open ${label}`}>
          <img
            src={src}
            alt={label}
            className={s.docImage}
            onError={() => setErrored(true)}
          />
        </a>
      )}

      <a
        href={src}
        target="_blank"
        rel="noreferrer"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: "0.75rem",
          color: "var(--color-muted-foreground)",
          marginTop: 2,
        }}
      >
        <FileText size={12} /> View / Download
      </a>
    </div>
  );
}
