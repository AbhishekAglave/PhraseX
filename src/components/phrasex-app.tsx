'use client';

import {
  AlertCircle,
  ArrowRight,
  Languages,
  LoaderCircle,
  MessageSquareQuote,
  Sparkles,
  WandSparkles
} from 'lucide-react';
import { useState, useTransition } from 'react';

import { CopyButton } from '@/components/copy-button';
import type {
  PhraseXAnalysis,
  PhraseXTone,
  PhraseXToneVariant
} from '@/lib/phrasex-schema';
import { cn } from '@/lib/utils';

const samples = [
  'kal meeting me thoda late aaunga because traffic bahut heavy hoga',
  "i didn't went there because nobody were telling me the proper address",
  'mujhe client ko bolna hai ki we need more time to finish the dashboard'
];

const toneCards: PhraseXTone[] = ['casual', 'friendly', 'professional', 'concise'];

type ApiResponse = {
  analysis?: PhraseXAnalysis;
  error?: string;
};

type ToneResponse = {
  variant?: PhraseXToneVariant;
  error?: string;
};

function SectionFrame({
  title,
  subtitle,
  action,
  children
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-5 shadow-[0_24px_80px_rgba(3,7,18,0.45)] backdrop-blur">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.32em] text-cyan-300 uppercase">{title}</p>
          {subtitle ? <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

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

  function applySample(sample: string) {
    setText(sample);
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

  return (
    <div className="relative flex w-full flex-1 justify-center overflow-hidden">
      {/* <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.28),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(251,191,36,0.16),_transparent_28%)]" /> */}
      {/* <div className="pointer-events-none absolute inset-x-0 bottom-0 h-96 bg-[radial-gradient(circle_at_bottom,_rgba(14,165,233,0.12),_transparent_34%)]" /> */}

      <div className="flex w-full flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
        <header className="rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(8,15,31,0.94),rgba(6,10,20,0.86))] p-6 shadow-[0_30px_120px_rgba(8,15,31,0.5)] sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-semibold tracking-[0.32em] text-cyan-200 uppercase">
                <Sparkles className="size-3.5" />
                AI sentence studio
              </div>
              <h1 className="mt-5 text-4xl leading-tight font-semibold tracking-[-0.04em] text-white sm:text-5xl">
                Rewrite raw text into polished English without changing the meaning.
              </h1>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:max-w-[620px] xl:max-w-[720px]">
              {[
                {
                  label: 'Input styles',
                  value: 'English + Hindi + Hinglish'
                },
                {
                  label: 'Outputs',
                  value: 'Rewrite + issues + tones'
                },
                {
                  label: 'Stack',
                  value: 'Next.js + LangChain + OpenAI'
                }
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-[11px] tracking-[0.28em] text-slate-400 uppercase">{item.label}</p>
                  <p className="mt-2 text-sm font-medium text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.16fr)_minmax(0,0.84fr)] 2xl:grid-cols-[minmax(0,1.22fr)_minmax(0,0.78fr)]">
          <SectionFrame
            title="Input"
            subtitle="Keep it to a sentence or short paragraph. The model rewrites the text itself, not the intent behind it."
          >
            <form className="space-y-5" onSubmit={handleSubmit}>
              <label className="block">
                <span className="sr-only">Sentence input</span>
                <textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="Type or paste your sentence here..."
                  className="min-h-72 w-full resize-none rounded-[24px] border border-white/12 bg-black/20 px-5 py-4 text-base leading-7 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60 focus:bg-black/30"
                />
              </label>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-400">{text.length}/1500 characters</p>
                <button
                  type="submit"
                  disabled={isPending || text.trim().length === 0}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold tracking-[0.22em] uppercase transition',
                    isPending || text.trim().length === 0
                      ? 'cursor-not-allowed bg-slate-800 text-slate-500'
                      : 'bg-cyan-300 text-slate-950 hover:bg-cyan-200'
                  )}
                >
                  {isPending ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" />
                      Rewriting
                    </>
                  ) : (
                    <>
                      Analyze text
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6 border-t border-white/10 pt-5">
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <MessageSquareQuote className="size-4 text-cyan-300" />
                Try a sample
              </div>
              <div className="mt-3 flex flex-wrap gap-3">
                {samples.map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => applySample(sample)}
                    className="rounded-full border border-white/12 bg-white/5 px-4 py-2 text-left text-sm text-slate-300 transition hover:border-cyan-300/40 hover:bg-cyan-300/10 hover:text-white"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>
          </SectionFrame>

          <div className="space-y-6">
            <SectionFrame
              title="Primary rewrite"
              subtitle="The core English rewrite that preserves your meaning while cleaning up grammar and tone."
              action={result ? <CopyButton text={result.englishRewrite} /> : undefined}
            >
              {result ? (
                <div className="space-y-5">
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-medium tracking-[0.18em] text-emerald-200 uppercase">
                    <Languages className="size-3.5" />
                    Detected: {result.detectedInput}
                  </div>
                  <p className="text-xl leading-9 font-medium tracking-[-0.02em] text-white">{result.englishRewrite}</p>
                  <div className="rounded-3xl border border-white/8 bg-white/[0.04] p-4">
                    <p className="text-[11px] tracking-[0.28em] text-slate-500 uppercase">Improved tone</p>
                    <p className="mt-2 text-sm leading-7 text-slate-200">{result.improvedTone}</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-white/12 bg-black/10 p-8 text-sm leading-7 text-slate-400">
                  Your rewritten English sentence will appear here.
                </div>
              )}
            </SectionFrame>

            <SectionFrame
              title="Grammar notes"
              subtitle="Short, practical explanations of what was wrong in the original text."
            >
              {error ? (
                <div className="rounded-[24px] border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    <p>{error}</p>
                  </div>
                </div>
              ) : null}

              {result ? (
                <div className="space-y-4">
                  <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-4">
                    <p className="text-[11px] tracking-[0.28em] text-slate-500 uppercase">Summary</p>
                    <p className="mt-2 text-sm leading-7 text-slate-200">{result.grammarSummary}</p>
                  </div>

                  {result.grammarIssues.length > 0 ? (
                    <div className="space-y-3">
                      {result.grammarIssues.map((issue, index) => (
                        <article
                          key={`${issue.original}-${index}`}
                          className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4"
                        >
                          <div className="flex items-center gap-2 text-[11px] tracking-[0.28em] text-amber-200 uppercase">
                            <WandSparkles className="size-3.5" />
                            Issue {index + 1}
                          </div>
                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <div>
                              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Original</p>
                              <p className="mt-1 text-sm leading-6 text-slate-200">{issue.original}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Correction</p>
                              <p className="mt-1 text-sm leading-6 text-white">{issue.correction}</p>
                            </div>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-slate-400">{issue.explanation}</p>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[24px] border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm text-emerald-100">
                      No major grammar issues were found. The rewrite mainly improves tone and clarity.
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-white/12 bg-black/10 p-8 text-sm leading-7 text-slate-400">
                  Grammar explanations will show up here after analysis.
                </div>
              )}
            </SectionFrame>

            <SectionFrame
              title="Tone variants"
              subtitle="Generate only the single tone you need so you do not spend tokens on unused variants."
            >
              {result ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
                  {toneCards.map((tone) => (
                    <article key={tone} className="rounded-[24px] border border-white/8 bg-white/[0.04] p-4">
                      <div className="flex items-start justify-between gap-4">
                        <p className="text-xs font-semibold tracking-[0.28em] text-cyan-200 uppercase">{tone}</p>
                        {toneVariants[tone] ? <CopyButton text={toneVariants[tone] ?? ''} /> : null}
                      </div>

                      {toneVariants[tone] ? (
                        <p className="mt-3 text-sm leading-7 text-slate-200">{toneVariants[tone]}</p>
                      ) : (
                        <p className="mt-3 text-sm leading-7 text-slate-400">
                          Generate this tone only when you need it.
                        </p>
                      )}

                      {toneErrors[tone] ? (
                        <p className="mt-3 text-sm leading-6 text-rose-200">{toneErrors[tone]}</p>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => handleGenerateTone(tone)}
                        disabled={loadingTone[tone]}
                        className={cn(
                          'mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold tracking-[0.22em] uppercase transition',
                          loadingTone[tone]
                            ? 'cursor-not-allowed bg-slate-800 text-slate-500'
                            : 'bg-white/8 text-slate-100 hover:bg-cyan-300 hover:text-slate-950'
                        )}
                      >
                        {loadingTone[tone] ? (
                          <>
                            <LoaderCircle className="size-3.5 animate-spin" />
                            Generating
                          </>
                        ) : toneVariants[tone] ? (
                          'Regenerate'
                        ) : (
                          'Generate'
                        )}
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-white/12 bg-black/10 p-8 text-sm leading-7 text-slate-400">
                  Tone variants will be available after the base rewrite is ready.
                </div>
              )}
            </SectionFrame>
          </div>
        </div>
      </div>
    </div>
  );
}
