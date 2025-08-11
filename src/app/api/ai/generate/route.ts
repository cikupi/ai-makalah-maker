import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

export async function POST(req: NextRequest) {
  try {
    const { topic, style } = await req.json();
    if (!topic || typeof topic !== "string") {
      return NextResponse.json({ error: "Invalid topic" }, { status: 400 });
    }
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const system = `Anda adalah asisten penulis akademik. Tulis naskah makalah pembuka yang informatif, terstruktur, dengan bahasa Indonesia formal. Sertakan: Pendahuluan, Latar Belakang singkat, Rumusan Masalah poin, dan Tujuan Penelitian poin.`;
    const user = `Topik: ${topic}. Gaya/Struktur: ${style || "ilmiah ringkas"}. Tulis 4-6 paragraf (400-700 kata).`;

    const resp = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.4,
    });

    const content = resp.choices?.[0]?.message?.content || "";
    return NextResponse.json({ content });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "AI error" }, { status: 500 });
  }
}
