import { cn } from '@/lib/utils';

/**
 * PhraseX mark: a bold X for the name, with a sparkle for the AI rewrite.
 * Kept in sync with `src/app/icon.svg`, which serves the same artwork as
 * the favicon.
 */
export function PhraseXLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn('size-9 shrink-0', className)}
      role="img"
      aria-label="PhraseX"
    >
      <defs>
        <linearGradient id="phrasex-badge" x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f4bef4" />
          <stop offset="0.52" stopColor="#bc51d6" />
          <stop offset="1" stopColor="#8c34b2" />
        </linearGradient>
        <linearGradient id="phrasex-sheen" x1="10" y1="6" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.4" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect x="2" y="2" width="60" height="60" rx="18" fill="url(#phrasex-badge)" />
      <rect x="2" y="2" width="60" height="60" rx="18" fill="url(#phrasex-sheen)" />

      {/* The letter X, matching the wordmark: filled diagonals with flat
          horizontal terminals rather than round-capped strokes. */}
      <g fill="#ffffff">
        <path d="M17 19 L26 19 L43 45 L34 45 Z" />
        <path d="M43 19 L34 19 L17 45 L26 45 Z" />
      </g>

      <path
        d="M49 8c.5 3.78 2.22 5.5 6 6-3.78.5-5.5 2.22-6 6-.5-3.78-2.22-5.5-6-6 3.78-.5 5.5-2.22 6-6Z"
        fill="#ffffff"
      />
    </svg>
  );
}
