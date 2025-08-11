import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // ensure it runs at request time

export async function GET() {
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
  const hasHF = Boolean(process.env.HUGGING_FACE_TOKEN);

  const provider = hasOpenAI ? "openai" : hasHF ? "huggingface" : "none";
  const model = hasOpenAI
    ? process.env.OPENAI_MODEL || "gpt-4o-mini"
    : hasHF
    ? process.env.HUGGING_FACE_MODEL || "mistralai/Mistral-7B-Instruct-v0.3"
    : undefined;

  return NextResponse.json({
    ok: provider !== "none",
    provider,
    model,
    // do NOT include any secret values
  });
}
