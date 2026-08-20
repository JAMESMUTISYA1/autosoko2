"use client";

import { useState } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";

export default function ProductGallery({ images, name }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const gallery = images?.length ? images : [];

  function next() {
    setActiveIndex((i) => (i + 1) % gallery.length);
  }
  function prev() {
    setActiveIndex((i) => (i - 1 + gallery.length) % gallery.length);
  }
  function onKeyDown(e) {
    if (e.key === "Escape") setLightboxOpen(false);
    if (e.key === "ArrowRight") next();
    if (e.key === "ArrowLeft") prev();
  }

  return (
    <div>
      {/* Main image — click to open the larger lightbox view */}
      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        className="relative w-full aspect-[4/3] bg-bg rounded-md overflow-hidden border border-line group"
      >
        <Image
          src={gallery[activeIndex]}
          alt={`${name} — image ${activeIndex + 1} of ${gallery.length}`}
          fill
          className="object-cover"
          priority
        />
        <span className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-invert text-invert-fg text-xs px-2.5 py-1.5 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity">
          <ZoomIn size={13} />
          View larger
        </span>
      </button>

      {/* Scrollable thumbnail strip */}
      <div className="flex gap-2 mt-3 overflow-x-auto pb-1 -mx-1 px-1">
        {gallery.map((src, i) => (
          <button
            key={src + i}
            type="button"
            onClick={() => setActiveIndex(i)}
            aria-label={`Show image ${i + 1}`}
            aria-current={i === activeIndex}
            className={`relative shrink-0 w-20 h-20 rounded-sm overflow-hidden border-2 transition-colors ${
              i === activeIndex ? "border-fg" : "border-line hover:border-muted"
            }`}
          >
            <Image src={src} alt="" fill className="object-cover" />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${name} image viewer`}
          tabIndex={-1}
          onKeyDown={onKeyDown}
          className="fixed inset-0 z-[200] bg-invert/95 flex items-center justify-center p-4 md:p-10"
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close image viewer"
            className="absolute top-4 right-4 md:top-6 md:right-6 w-10 h-10 rounded-full bg-invert-soft text-invert-fg flex items-center justify-center hover:opacity-80"
          >
            <X size={20} />
          </button>

          {gallery.length > 1 && (
            <>
              <button
                type="button"
                onClick={prev}
                aria-label="Previous image"
                className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-invert-soft text-invert-fg flex items-center justify-center hover:opacity-80"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Next image"
                className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-invert-soft text-invert-fg flex items-center justify-center hover:opacity-80"
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}

          <div className="relative w-full max-w-3xl aspect-[4/3]">
            <Image
              src={gallery[activeIndex]}
              alt={`${name} — image ${activeIndex + 1} of ${gallery.length}`}
              fill
              className="object-contain"
            />
          </div>

          <span className="absolute bottom-4 md:bottom-6 text-invert-fg text-xs font-mono">
            {activeIndex + 1} / {gallery.length}
          </span>
        </div>
      )}
    </div>
  );
}
