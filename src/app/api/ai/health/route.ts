import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // ensure it runs at request time

export async function GET() {
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
  const hasHF = Boolean(process.env.HUGGING_FACE_TOKEN);

  // Prefer HF when available for current deployment configuration
  const provider = hasHF ? "huggingface" : hasOpenAI ? "openai" : "none";
  const rawModel = provider === "huggingface"
    ? process.env.HUGGING_FACE_MODEL || "mistralai/Mistral-7B-Instruct-v0.3"
    : provider === "openai"
    ? process.env.OPENAI_MODEL || "gpt-4o-mini"
    : undefined;
  const model = typeof rawModel === "string" ? rawModel.trim() : rawModel;

  return NextResponse.json({
    ok: provider !== "none",
    provider,
    model,
    // do NOT include any secret values
  });
}
