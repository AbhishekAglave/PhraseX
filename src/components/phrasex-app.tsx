'use client';

import { AlertCircle, Check, Heart, Languages, LoaderCircle, Shuffle, Sparkles, WandSparkles } from 'lucide-react';
import { useEffect, useRef, useState, useTransition } from 'react';

import { AuroraBackground } from '@/components/aurora-background';
import { CopyButton } from '@/components/copy-button';
import { PhraseXLogo } from '@/components/phrasex-logo';
import type { PhraseXAnalysis, PhraseXTone, PhraseXToneVariant } from '@/lib/phrasex-schema';
import { cn } from '@/lib/utils';

/** Pool the "Try sample" button draws from — English, Hindi and Hinglish. */
const samples = [
  'kal meeting me thoda late aaunga because traffic bahut heavy hoga',
  "i didn't went there because nobody were telling me the proper address",
  'mujhe client ko bolna hai ki we need more time to finish the dashboard',
  'sir mai kal office nahi aa paunga kyunki meri tabiyat kharab hai',
  "he don't have any idea about how much efforts we putted in this release",
  'aap please ek baar check kar lijiye ki payment gateway sahi kaam kar raha hai ya nahi',
  'team ko bol dena ki demo postpone ho gaya hai till next monday',
  'i am working on this issue since morning but still it is not resolving',
  'humein customer ko batana padega ki refund process me 5-7 din lagenge',
  'she told me that the report was already send to the manager yesterday'
];

const toneCards: PhraseXTone[] = ['casual', 'friendly', 'professional', 'concise'];

/** Shown in the footer — the short version of what the app is good for. */
const features = [
  'Detects English, Hindi or Hinglish',
  'Rewrites without changing your meaning',
  'Explains every grammar fix',
  'Original vs correction, side by side',
  'Four tones, generated only on demand',
  'One-click copy on every output'
];

type ApiResponse = {
  analysis?: PhraseXAnalysis;
  error?: string;
};

type ToneResponse = {
  variant?: PhraseXToneVariant;
  error?: string;
};

/**
 * Shared styling for the action buttons (Analyze, Generate, Regenerate) so
 * they stay identical — only the label differs.
 *
 * - `idle`  — the accent gradient call to action.
 * - `busy`  — request in flight.
 * - `muted` — available but secondary, or not usable yet.
 */
function actionButtonClass(state: 'idle' | 'busy' | 'muted') {
  return cn(
    'inline-flex items-center gap-2 self-start rounded-full px-4 py-2 text-xs font-semibold transition',
    state === 'busy' && 'cursor-not-allowed bg-accent-soft text-accent',
    state === 'muted' &&
      'border border-glass-line-soft bg-white/38 text-ink-2 hover:border-accent/35 hover:text-accent',
    state === 'idle' &&
      'bg-gradient-to-br from-accent-2 to-accent text-white shadow-[0_8px_20px_rgba(188,81,214,0.28)] hover:shadow-[0_12px_26px_rgba(188,81,214,0.36)]'
  );
}

function GlassCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <section
      className={cn(
        'rounded-[28px] border border-glass-line bg-glass shadow-[var(--shadow-card)] backdrop-blur-3xl',
        className
      )}
    >
      {children}
    </section>
  );
}

function CardHead({
  title,
  subtitle,
  meta,
  action
}: {
  title: string;
  subtitle?: string;
  meta?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-5 pb-4">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.2em] text-ink-3 uppercase">{title}</p>
        {subtitle ? (
          <p className="mt-1.5 font-display text-lg leading-tight font-semibold tracking-[-0.015em] text-ink">
            {subtitle}
          </p>
        ) : null}
      </div>
      {action ??
        (meta ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {typeof meta === 'string' ? <Chip className="tabular-nums">{meta}</Chip> : meta}
          </div>
        ) : null)}
    </div>
  );
}

/** Small rounded label used for counters and static facts. */
function Chip({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-glass-line-soft bg-glass-soft px-3 py-1.5 text-[11px] font-semibold text-ink-2',
        className
      )}
    >
      {children}
    </span>
  );
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-white/45 bg-white/12 px-6 py-10 text-center text-sm font-medium text-ink-3">
      {children}
    </div>
  );
}

export function PhraseXApp() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<PhraseXAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [toneVariants, setToneVariants] = useState<Partial<Record<PhraseXTone, string>>>({});
  const [toneErrors, setToneErrors] = useState<Partial<Record<PhraseXTone, string>>>({});
  const [loadingTone, setLoadingTone] = useState<Partial<Record<PhraseXTone, boolean>>>({});
  /** Button label while a request runs: 'Analyzing' for the first second, then 'Rewriting'. */
  const [analyzeStage, setAnalyzeStage] = useState<'analyzing' | 'rewriting'>('analyzing');
  const stageTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (stageTimer.current !== null) {
        window.clearTimeout(stageTimer.current);
      }
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setAnalyzeStage('analyzing');

    if (stageTimer.current !== null) {
      window.clearTimeout(stageTimer.current);
    }

    stageTimer.current = window.setTimeout(() => {
      setAnalyzeStage('rewriting');
      stageTimer.current = null;
    }, 1000);

    startTransition(async () => {
      setError(null);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      });

      const data = (await response.json()) as ApiResponse;

      if (!response.ok || !data.analysis) {
        setResult(null);
        setToneVariants({});
        setToneErrors({});
        setError(data.error ?? 'Something went wrong.');
        return;
      }

      setResult(data.analysis);
      setToneVariants({});
      setToneErrors({});
    });
  }

  /**
   * Drops a random sample into the textarea. Never repeats what is already
   * there, so a second click always visibly changes something.
   */
  function applyRandomSample() {
    const pool = samples.filter((sample) => sample !== text);
    const next = pool[Math.floor(Math.random() * pool.length)];

    setText(next);
    setError(null);
  }

  async function handleGenerateTone(tone: PhraseXTone) {
    if (!result?.englishRewrite || loadingTone[tone]) {
      return;
    }

    setToneErrors((current) => ({ ...current, [tone]: undefined }));
    setLoadingTone((current) => ({ ...current, [tone]: true }));

    const response = await fetch('/api/tone', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: result.englishRewrite,
        tone
      })
    });

    const data = (await response.json()) as ToneResponse;

    setLoadingTone((current) => ({ ...current, [tone]: false }));

    if (!response.ok || !data.variant) {
      setToneErrors((current) => ({
        ...current,
        [tone]: data.error ?? 'Tone generation failed.'
      }));
      return;
    }

    setToneVariants((current) => ({
      ...current,
      [tone]: data.variant?.rewrite
    }));
  }

  const generatedTones = toneCards.filter((tone) => Boolean(toneVariants[tone])).length;
  const isGeneratingTone = toneCards.some((tone) => Boolean(loadingTone[tone]));
  const isBusy = isPending || isGeneratingTone;

  return (
    <div className="relative w-full flex-1">
      <AuroraBackground busy={isBusy} />

      <div className="relative z-10 mx-auto w-full max-w-[1380px] px-5 pb-24 sm:px-7 lg:px-10">
        {/* Single-row glass top bar — no hero banner, no tagline */}
        <header className="sticky top-4 z-20 mt-4 mb-6 flex items-center justify-between gap-3 rounded-full border border-glass-line bg-glass-strong px-4 py-2.5 shadow-[var(--shadow-card)] backdrop-blur-3xl sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <PhraseXLogo className="drop-shadow-[0_6px_16px_rgba(188,81,214,0.32)]" />
            <p className="font-display text-[19px] leading-none font-semibold tracking-[-0.02em] text-ink">PhraseX</p>
          </div>

          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition',
              isBusy ? 'bg-accent-soft text-accent' : 'border border-glass-line-soft bg-white/34 text-ink-2'
            )}
          >
            {isBusy ? (
              <>
                <LoaderCircle className="size-3.5 animate-spin" />
                Working
              </>
            ) : (
              <>
                <Sparkles className="size-3.5 text-accent" />
                Ready
              </>
            )}
          </span>
        </header>

        {/*
          Two columns on desktop: input + tone variants on the left, rewrite +
          grammar on the right. On mobile the wrappers collapse to
          `display: contents`, so all five cards become direct grid items and
          the `order-*` classes keep the original single-column sequence:
          input → error → rewrite → grammar → tones.
        */}
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          {/* ------------- INPUT + TONE VARIANTS ------------- */}
          <div className="contents lg:block lg:space-y-5">
            <GlassCard className="order-1">
              <CardHead
                title="Input"
                subtitle="Your text"
                meta={
                  <>
                    <Chip>English · Hindi · Hinglish</Chip>
                    <Chip className="tabular-nums">{text.length} / 1500</Chip>
                  </>
                }
              />

              <div className="px-6 pb-6">
                <form onSubmit={handleSubmit}>
                  <label className="block">
                    <span className="sr-only">Sentence input</span>
                    <textarea
                      value={text}
                      onChange={(event) => setText(event.target.value)}
                      placeholder="Type or paste your sentence here..."
                      spellCheck={false}
                      className="text-soft min-h-60 w-full resize-y rounded-3xl border border-glass-line-soft bg-white/26 px-5 py-4 text-xl leading-relaxed font-bold tracking-[-0.014em] caret-accent shadow-[inset_0_1px_2px_rgba(255,255,255,0.6)] outline-none transition placeholder:font-normal placeholder:text-ink-3 placeholder:[text-shadow:none] focus:border-accent/45 focus:bg-white/42 focus:ring-4 focus:ring-accent-soft"
                    />
                  </label>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs font-medium text-ink-3 tabular-nums">{text.length} / 1500 characters</p>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={applyRandomSample}
                        disabled={isPending}
                        className={cn(actionButtonClass('muted'), isPending && 'cursor-not-allowed')}
                      >
                        <Shuffle className="size-3.5" />
                        Try sample
                      </button>

                      <button
                        type="submit"
                        disabled={isPending || text.trim().length === 0}
                        className={cn(
                          actionButtonClass(isPending ? 'busy' : text.trim().length === 0 ? 'muted' : 'idle'),
                          text.trim().length === 0 && 'cursor-not-allowed'
                        )}
                      >
                        {isPending ? (
                          <>
                            <LoaderCircle className="size-3.5 animate-spin" />
                            {analyzeStage === 'analyzing' ? 'Analyzing' : 'Rewriting'}
                          </>
                        ) : (
                          <>
                            <Sparkles className="size-3.5" />
                            Analyze text
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </GlassCard>
            <GlassCard className="order-5">
              <CardHead
                title="Tone variants"
                subtitle="Generate only the tone you need"
                meta={result ? `${generatedTones} / ${toneCards.length} generated` : undefined}
              />

              <div className="px-6 pb-6">
                {result ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {toneCards.map((tone) => {
                      const variant = toneVariants[tone];

                      return (
                        <article
                          key={tone}
                          className={cn(
                            'flex flex-col rounded-3xl border px-5 py-4 transition',
                            variant
                              ? 'border-white/55 bg-white/45 shadow-[var(--shadow-card)]'
                              : 'border-glass-line-soft bg-white/18'
                          )}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">{tone}</p>
                            {variant ? <CopyButton text={variant} iconOnly /> : null}
                          </div>

                          {variant ? (
                            <p className="text-soft mt-3 flex-1 text-[15px] leading-relaxed font-semibold tracking-[-0.01em] text-ink">
                              {variant}
                            </p>
                          ) : (
                            <p className="mt-3 flex-1 text-sm leading-relaxed font-medium text-ink-3">
                              Not generated yet — create it only when you need it.
                            </p>
                          )}

                          {toneErrors[tone] ? (
                            <p className="mt-3 text-[13px] leading-snug font-semibold text-bad">{toneErrors[tone]}</p>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => handleGenerateTone(tone)}
                            disabled={loadingTone[tone]}
                            className={cn(
                              'mt-4',
                              actionButtonClass(loadingTone[tone] ? 'busy' : variant ? 'muted' : 'idle')
                            )}
                          >
                            {loadingTone[tone] ? (
                              <>
                                <LoaderCircle className="size-3.5 animate-spin" />
                                Generating
                              </>
                            ) : (
                              <>
                                <Sparkles className="size-3.5" />
                                {variant ? 'Regenerate' : 'Generate'}
                              </>
                            )}
                          </button>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <Placeholder>Tone variants will be available after the base rewrite is ready.</Placeholder>
                )}
              </div>
            </GlassCard>
          </div>

          {/* ------------- REWRITE + GRAMMAR ------------- */}
          <div className="contents lg:block lg:space-y-5">
            {error ? (
              <div className="order-2 flex items-start gap-3 rounded-[28px] border border-white/45 bg-bad-soft px-5 py-4 text-sm font-semibold text-bad backdrop-blur-3xl">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <p>{error}</p>
              </div>
            ) : null}

            {/* PRIMARY REWRITE */}
            <GlassCard className="order-3 border-white/55 bg-glass-strong shadow-[var(--shadow-lift)]">
              <CardHead
                title="Primary rewrite"
                subtitle="Same meaning, cleaner English"
                action={result ? <CopyButton text={result.englishRewrite} /> : undefined}
              />

              <div className="px-6 pb-6">
                {result ? (
                  <div>
                    <span className="inline-flex items-center gap-2 rounded-full bg-good-soft px-3 py-1.5 text-[11px] font-semibold tracking-[0.08em] text-good uppercase">
                      <Languages className="size-3.5" />
                      Detected input: {result.detectedInput}
                    </span>

                    {/* Painted with the action buttons' gradient via bg-clip-text. */}
                    <p className="mt-4 bg-gradient-to-br from-accent-2 to-accent bg-clip-text font-display text-[26px] leading-[1.4] font-semibold tracking-[-0.025em] text-transparent drop-shadow-[0_1px_2px_rgba(188,81,214,0.4)] sm:text-[28px]">
                      {result.englishRewrite}
                    </p>

                    <div className="mt-5 rounded-3xl border border-glass-line-soft bg-white/26 px-5 py-4">
                      <p className="text-[11px] font-semibold tracking-[0.2em] text-accent uppercase">Improved tone</p>
                      <p className="text-soft mt-2 text-[15px] leading-relaxed font-medium text-ink-2">{result.improvedTone}</p>
                    </div>
                  </div>
                ) : (
                  <Placeholder>Your rewritten English sentence will appear here.</Placeholder>
                )}
              </div>
            </GlassCard>

            {/* GRAMMAR NOTES */}
            <GlassCard className="order-4">
              <CardHead
                title="Grammar notes"
                subtitle="What was wrong, and why"
                meta={result ? `${result.grammarIssues.length} issues` : undefined}
              />

              <div className="px-6 pb-6">
                {result ? (
                  <div>
                    <div className="rounded-3xl border border-glass-line-soft bg-accent-soft px-5 py-4">
                      <p className="text-[11px] font-semibold tracking-[0.2em] text-accent uppercase">Summary</p>
                      <p className="text-soft mt-2 text-[15px] leading-relaxed font-medium text-ink-2">{result.grammarSummary}</p>
                    </div>

                    {result.grammarIssues.length > 0 ? (
                      <div className="mt-4 space-y-3">
                        {result.grammarIssues.map((issue, index) => (
                          <article
                            key={`${issue.original}-${index}`}
                            className="overflow-hidden rounded-3xl border border-glass-line-soft bg-white/26"
                          >
                            <div className="flex items-center gap-2 border-b border-white/38 px-5 py-3 text-[11px] font-semibold tracking-[0.18em] text-ink-3 uppercase">
                              <WandSparkles className="size-3.5 text-accent" />
                              <span className="text-ink">Issue {String(index + 1).padStart(2, '0')}</span>
                            </div>

                            <div className="grid sm:grid-cols-2">
                              <div className="border-b border-white/38 px-5 py-4 sm:border-b-0 sm:border-r">
                                <p className="text-[10px] font-semibold tracking-[0.18em] text-bad uppercase">
                                  Original
                                </p>
                                <p className="text-soft mt-2 text-[15px] leading-snug font-semibold text-bad line-through decoration-[color:var(--bad)]/40">
                                  {issue.original}
                                </p>
                              </div>
                              <div className="px-5 py-4">
                                <p className="text-[10px] font-semibold tracking-[0.18em] text-good uppercase">
                                  Correction
                                </p>
                                <p className="text-soft mt-2 text-[15px] leading-snug font-semibold text-good">
                                  {issue.correction}
                                </p>
                              </div>
                            </div>

                            <p className="text-soft border-t border-white/38 bg-white/18 px-5 py-4 text-sm leading-relaxed font-medium text-ink-2">
                              {issue.explanation}
                            </p>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-4 flex items-start gap-3 rounded-3xl border border-glass-line-soft bg-good-soft px-5 py-4 text-sm font-semibold text-good">
                        <Check className="mt-0.5 size-4 shrink-0" />
                        <p>No major grammar issues were found. The rewrite mainly improves tone and clarity.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <Placeholder>Grammar explanations will show up here after analysis.</Placeholder>
                )}
              </div>
            </GlassCard>
            {/* FOOTER */}
            <GlassCard className="mt-5">
              <div className="px-6 pt-5 pb-6">
                <p className="text-[11px] font-semibold tracking-[0.2em] text-ink-3 uppercase">What PhraseX does</p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {features.map((feature) => (
                    <Chip key={feature}>{feature}</Chip>
                  ))}
                </div>

                <p className="mt-5 border-t border-white/38 pt-4 text-center text-xs font-medium text-ink-3">
                  <span className="font-semibold lowercase text-accent">abhishek</span> · made with{' '}
                  <Heart className="inline size-3.5 align-[-2px] fill-accent text-accent" />
                </p>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}
