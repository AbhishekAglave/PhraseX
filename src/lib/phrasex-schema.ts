import { z } from "zod";

export const submissionSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Enter a sentence or short paragraph.")
    .max(1_500, "Keep the input under 1,500 characters."),
});

const grammarIssueSchema = z.object({
  original: z.string().describe("The exact problematic phrase from the input."),
  correction: z
    .string()
    .describe("The corrected English wording for that phrase."),
  explanation: z
    .string()
    .describe("A concise explanation of the grammar or phrasing issue."),
});

export const analysisSchema = z.object({
  detectedInput: z
    .string()
    .describe("Short label such as English, Hindi, or Hinglish."),
  englishRewrite: z
    .string()
    .describe(
      "A clean English rewrite that preserves meaning, fixes grammar, and improves tone."
    ),
  improvedTone: z
    .string()
    .describe("A polished English version with stronger clarity and tone."),
  grammarSummary: z
    .string()
    .describe("One short summary of the main grammar or clarity problems."),
  grammarIssues: z
    .array(grammarIssueSchema)
    .max(6)
    .describe("Concrete grammar or phrasing mistakes. Use an empty array if none."),
});

export type PhraseXAnalysis = z.infer<typeof analysisSchema>;

export const toneSchema = z.enum([
  "casual",
  "friendly",
  "professional",
  "concise",
]);

export type PhraseXTone = z.infer<typeof toneSchema>;

export const toneVariantRequestSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "A base English sentence is required.")
    .max(1_500, "Keep the input under 1,500 characters."),
  tone: toneSchema,
});

export const toneVariantSchema = z.object({
  tone: toneSchema,
  rewrite: z
    .string()
    .describe("A single English rewrite in the requested tone only."),
});

export type PhraseXToneVariant = z.infer<typeof toneVariantSchema>;
