import { NextResponse } from "next/server";
import { z } from "zod";

import { generateToneVariant } from "@/lib/phrasex";
import { toneVariantRequestSchema } from "@/lib/phrasex-schema";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const payload = toneVariantRequestSchema.parse(json);
    const variant = await generateToneVariant(payload);

    return NextResponse.json({ variant });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: error.issues[0]?.message ?? "Invalid request.",
        },
        { status: 400 }
      );
    }

    console.error("PhraseX tone error", error);

    return NextResponse.json(
      {
        error: "The tone request failed. Check your API key and try again.",
      },
      { status: 500 }
    );
  }
}
