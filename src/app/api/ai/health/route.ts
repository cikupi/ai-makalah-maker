import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // ensure it runs at request time

export async function GET() {
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
  const hasHF = Boolean(process.env.HUGGING_FACE_TOKEN);
  const hasGoogle = Boolean(process.env.GOOGLE_API_KEY);

  // Priority: Gemini > Hugging Face > OpenAI
  const provider = hasGoogle ? "gemini" : hasHF ? "huggingface" : hasOpenAI ? "openai" : "none";
  const rawModel = provider === "gemini"
    ? process.env.GOOGLE_MODEL || "gemini-1.5-flash"
    : provider === "huggingface"
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
