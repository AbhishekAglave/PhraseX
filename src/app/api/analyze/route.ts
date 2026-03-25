import { NextResponse } from "next/server";
import { z } from "zod";

import { analyzeSubmission } from "@/lib/phrasex";
import { submissionSchema } from "@/lib/phrasex-schema";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const payload = submissionSchema.parse(json);
    const analysis = await analyzeSubmission(payload);

    return NextResponse.json({ analysis });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: error.issues[0]?.message ?? "Invalid request.",
        },
        { status: 400 }
      );
    }

    console.error("PhraseX analyze error", error);

    return NextResponse.json(
      {
        error: "The rewrite request failed. Check your API key and try again.",
      },
      { status: 500 }
    );
  }
}
