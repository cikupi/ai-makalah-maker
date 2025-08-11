import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  try {
    const { topic, style } = await req.json();
    if (!topic || typeof topic !== "string") {
      return NextResponse.json({ error: "Invalid topic" }, { status: 400 });
    }

    const system = `Anda adalah asisten penulis akademik. Tulis naskah makalah pembuka yang informatif, terstruktur, dengan bahasa Indonesia formal. Sertakan: Pendahuluan, Latar Belakang singkat, Rumusan Masalah poin, dan Tujuan Penelitian poin.`;
    const user = `Topik: ${topic}. Gaya/Struktur: ${style || "ilmiah ringkas"}. Tulis 4-6 paragraf (400-700 kata).`;

    const openaiKey = process.env.OPENAI_API_KEY;
    const hfKey = process.env.HUGGING_FACE_TOKEN;

    // Prefer OpenAI if available
    if (openaiKey) {
      const client = new OpenAI({ apiKey: openaiKey });
      const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
      const resp = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.4,
      });
      const content = resp.choices?.[0]?.message?.content || "";
      return NextResponse.json({ content });
    }

    // Else use Hugging Face Inference API
    if (hfKey) {
      const model = process.env.HUGGING_FACE_MODEL || "mistralai/Mistral-7B-Instruct-v0.3";
      const prompt = `${system}\n\n${user}`;
      const res = await fetch(`https://api-inference.huggingface.co/models/${encodeURIComponent(model)}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hfKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: { max_new_tokens: 500, temperature: 0.4, return_full_text: false },
          options: { wait_for_model: true },
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        const msg = (json && (json.error || json.message)) || `HF error: ${res.status}`;
        return NextResponse.json({ error: msg }, { status: 500 });
      }

      // Response normalization
      let content = "";
      if (Array.isArray(json) && json[0]?.generated_text) content = json[0].generated_text;
      else if (typeof json === "object" && json?.generated_text) content = json.generated_text;
      else if (typeof json === "string") content = json;
      else if (Array.isArray(json) && json[0]?.translation_text) content = json[0].translation_text;
      if (!content) content = JSON.stringify(json);

      return NextResponse.json({ content });
    }

    return NextResponse.json({ error: "Missing AI provider key: set OPENAI_API_KEY or HUGGING_FACE_TOKEN" }, { status: 500 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "AI error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
