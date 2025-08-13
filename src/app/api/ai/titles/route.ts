import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { topic?: string };
    const topic = (body.topic || "").toString().slice(0, 200).trim();
    if (!topic) return NextResponse.json({ error: "Topic kosong" }, { status: 400 });

    const system = `Anda adalah asisten penulis akademik. Berdasarkan topik yang diberikan, usulkan 3 judul makalah yang singkat, jelas, dan menarik. Jawab hanya dengan daftar 3 judul, tanpa penjelasan.`;
    const user = `Topik: ${topic}`;

    const googleKey = process.env.GOOGLE_API_KEY;
    const hfKey = process.env.HUGGING_FACE_TOKEN;
    const openaiKey = process.env.OPENAI_API_KEY;

    // Prefer Google Gemini
    if (googleKey) {
      const model = (process.env.GOOGLE_MODEL || "gemini-1.5-flash").trim();
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(googleKey)}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: system }, { text: user }] }],
          generationConfig: { temperature: 0.4 },
        }),
      });
      const data: unknown = await res.json();
      if (!res.ok) {
        let msg = `Gemini error: ${res.status}`;
        if (isRecord(data) && isRecord((data as any).error) && typeof (data as any).error?.message === "string") {
          msg = (data as any).error!.message as string;
        }
        return NextResponse.json({ error: msg, provider: "gemini", model }, { status: 500 });
      }
      const text = (data as any)?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      const titles = String(text)
        .split(/\n+/)
        .map((s: string) => s.replace(/^[-*\d\.\)\s]+/, "").trim())
        .filter(Boolean)
        .slice(0, 3);
      if (titles.length === 0) return NextResponse.json({ error: "Tidak ada judul dihasilkan" }, { status: 500 });
      return NextResponse.json({ titles });
    }

    // Hugging Face Router (OpenAI-compatible)
    if (hfKey) {
      const model = process.env.HUGGING_FACE_MODEL || "openai/gpt-oss-120b:fireworks-ai";
      const res = await fetch("https://router.huggingface.co/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${hfKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          temperature: 0.4,
        }),
      });
      const data: any = await res.json();
      if (!res.ok) {
        const msg = (isRecord(data) && isRecord(data.error) && typeof data.error.message === "string") ? data.error.message : `HF router error: ${res.status}`;
        return NextResponse.json({ error: msg, provider: "huggingface", model }, { status: 500 });
      }
      const text = data?.choices?.[0]?.message?.content ?? "";
      const titles = String(text)
        .split(/\n+/)
        .map((s: string) => s.replace(/^[-*\d\.\)\s]+/, "").trim())
        .filter(Boolean)
        .slice(0, 3);
      if (titles.length === 0) return NextResponse.json({ error: "Tidak ada judul dihasilkan" }, { status: 500 });
      return NextResponse.json({ titles });
    }

    // OpenAI
    if (openaiKey) {
      const model = (process.env.OPENAI_MODEL || "gpt-4o-mini").trim();
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          temperature: 0.4,
        }),
      });
      const data: any = await res.json();
      if (!res.ok) {
        const msg = (isRecord(data) && isRecord(data.error) && typeof data.error.message === "string") ? data.error.message : `OpenAI error: ${res.status}`;
        return NextResponse.json({ error: msg, provider: "openai", model }, { status: 500 });
      }
      const text = data?.choices?.[0]?.message?.content ?? "";
      const titles = String(text)
        .split(/\n+/)
        .map((s: string) => s.replace(/^[-*\d\.\)\s]+/, "").trim())
        .filter(Boolean)
        .slice(0, 3);
      if (titles.length === 0) return NextResponse.json({ error: "Tidak ada judul dihasilkan" }, { status: 500 });
      return NextResponse.json({ titles });
    }

    return NextResponse.json({ error: "Missing AI provider key" }, { status: 500 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    const provider = process.env.GOOGLE_API_KEY ? "gemini" : process.env.OPENAI_API_KEY ? "openai" : process.env.HUGGING_FACE_TOKEN ? "huggingface" : "none";
    return NextResponse.json({ error: message, provider }, { status: 500 });
  }
}
