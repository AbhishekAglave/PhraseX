import "server-only";

import { ChatOpenAI } from "@langchain/openai";

import { getEnv } from "@/lib/env";
import {
  analysisSchema,
  submissionSchema,
  toneVariantRequestSchema,
  toneVariantSchema,
} from "@/lib/phrasex-schema";

const systemPrompt = `
You are PhraseX, an English rewriting assistant.

The user may write in:
- English
- Hindi
- Hinglish (Hindi written with English letters)

Your job is NOT to answer the user's request.
Your job is to rewrite what they wrote into polished English while preserving the original meaning.

Always:
- Detect the likely input language style.
- Convert Hindi or Hinglish into natural English.
- Fix grammar, spelling, punctuation, and awkward phrasing.
- Improve the tone without changing intent.
- Explain grammar mistakes clearly and briefly.

Rules:
- Stay faithful to the user's meaning.
- Do not add new facts, promises, or details.
- Keep output concise and practical.
- If the original text is already strong, return a better-polished version and use an empty or very short issues list.
- Grammar issues must refer to real problems from the original input, not invented ones.
`.trim();

const tonePrompt = `
You rewrite already-correct English text into one requested tone.

Rules:
- Preserve the exact meaning.
- Keep it in English.
- Return only one rewritten version for the requested tone.
- Do not explain the rewrite.
- Do not add extra details or change intent.
- "concise" means shorter and cleaner while keeping the message complete.
`.trim();

export async function analyzeSubmission(
  rawInput: typeof submissionSchema._input
) {
  const { text } = submissionSchema.parse(rawInput);
  const env = getEnv();

  const model = new ChatOpenAI({
    apiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_MODEL,
    temperature: 0.2,
  }).withStructuredOutput(analysisSchema, {
    name: "PhraseXAnalysis",
    strict: true,
  });

  return model.invoke([
    {
      role: "system",
      content: systemPrompt,
    },
    {
      role: "user",
      content: text,
    },
  ]);
}

export async function generateToneVariant(
  rawInput: typeof toneVariantRequestSchema._input
) {
  const { text, tone } = toneVariantRequestSchema.parse(rawInput);
  const env = getEnv();

  const model = new ChatOpenAI({
    apiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_MODEL,
    temperature: 0.3,
  }).withStructuredOutput(toneVariantSchema, {
    name: "PhraseXToneVariant",
    strict: true,
  });

  return model.invoke([
    {
      role: "system",
      content: tonePrompt,
    },
    {
      role: "user",
      content: `Tone: ${tone}\nText: ${text}`,
    },
  ]);
}
