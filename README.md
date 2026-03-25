# PhraseX

PhraseX is a Next.js app that rewrites English, Hindi, or Hinglish into polished English using LangChain and OpenAI. It focuses on sentence improvement, grammar feedback, and tone variations instead of answering the underlying request.

## Features

- English rewrite with corrected grammar and better tone
- Hindi and Hinglish to English conversion
- Concise grammar issue explanations
- On-demand casual, friendly, professional, and concise variants
- App Router API route with typed validation

## Tech stack

- Next.js 16
- React 19
- Tailwind CSS 4
- LangChain
- OpenAI
- Zod

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Create your env file:

```bash
cp .env.example .env
```

3. Add your OpenAI key to `.env`:

```bash
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini
```

4. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## API

`POST /api/analyze`

Request body:

```json
{
  "text": "kal meeting me thoda late aaunga because traffic bahut heavy hoga"
}
```

The response returns a typed `analysis` object with the English rewrite and grammar notes.

`POST /api/tone`

Request body:

```json
{
  "text": "I may be a little late to the meeting tomorrow because traffic will likely be heavy.",
  "tone": "concise"
}
```

This route generates only one requested tone variant at a time to reduce token usage.
