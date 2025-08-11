import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type Msg = { role: "user" | "assistant"; content: string };

type GeminiPart = { text?: string };

type GeminiResp = {
  candidates?: Array<{ content?: { parts?: GeminiPart[] } }>; 
  error?: { message?: string };
};

function toGeminiContents(messages: Msg[], system: string): Array<{ role?: string; parts?: GeminiPart[] }> {
  const arr: Array<{ role?: string; parts?: GeminiPart[] }> = [];
  if (system) arr.push({ role: "user", parts: [{ text: system }] });
  for (const m of messages) {
    arr.push({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] });
  }
  return arr;
}

export async function POST(req: NextRequest) {
  try {
    const { messages = [], context = "", topic = "" } = (await req.json()) as {
      messages?: Msg[];
      context?: string;
      topic?: string;
    };

    const googleKey = process.env.GOOGLE_API_KEY;
    if (!googleKey) return NextResponse.json({ error: "Missing GOOGLE_API_KEY" }, { status: 500 });
    const model = (process.env.GOOGLE_MODEL || "gemini-1.5-flash").trim();

    const system = `Anda adalah asisten revisi makalah. Gunakan konteks dokumen (jika ada) untuk memberi saran per paragraf, perbaiki logika, tata bahasa, dan tambahkan data/rujukan seperlunya. Balas ringkas dan langsung ke poin yang diminta pengguna. Topik: ${topic}.`; 

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(googleKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: toGeminiContents(messages.concat([{ role: "user", content: `Konteks dokumen saat ini:\n${context}` }]), system),
        generationConfig: { temperature: 0.3 },
      }),
    });
    const data = (await res.json()) as GeminiResp;
    if (!res.ok) {
      const msg = data?.error?.message || `Gemini error ${res.status}`;
      return NextResponse.json({ error: msg }, { status: 500 });
    }
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return NextResponse.json({ message: text });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Chat error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
