import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Type helpers to avoid `any` and satisfy eslint rules
type OAOutputItem = { type?: string; text?: string };
type OAResponsesData = { output_text?: string; output?: OAOutputItem[]; error?: { message?: string } };
type OAChatData = { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
type HFGenItem = { generated_text?: string; translation_text?: string };
type GeminiPart = { text?: string };
type GeminiContent = { role?: string; parts?: GeminiPart[] };
type GeminiResponse = {
  candidates?: Array<{ content?: GeminiContent; finishReason?: string; safetyRatings?: unknown[] }>;
  promptFeedback?: unknown;
  error?: { message?: string };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { topic?: string; style?: string };
    const topic = (body.topic || "Makalah Tanpa Judul").toString().slice(0, 200);
    const style = (body.style || "ilmiah ringkas").toString().slice(0, 100);

    const system = `Anda adalah asisten penulis akademik. Tulis naskah makalah pembuka yang informatif, terstruktur, dengan bahasa Indonesia formal. Sertakan: Pendahuluan, Latar Belakang singkat, Rumusan Masalah poin, dan Tujuan Penelitian poin.`;
    const user = `Topik: ${topic}. Gaya/Struktur: ${style || "ilmiah ringkas"}. Tulis 4-6 paragraf (400-700 kata).`;

    const openaiKey = process.env.OPENAI_API_KEY;
    const hfKey = process.env.HUGGING_FACE_TOKEN;
    const googleKey = process.env.GOOGLE_API_KEY;

    // Prefer Google Gemini when available (highest priority)
    if (googleKey) {
      const model = (process.env.GOOGLE_MODEL || "gemini-1.5-flash").trim();
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(googleKey)}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: system },
                { text: user },
              ],
            },
          ],
          generationConfig: { temperature: 0.4 },
        }),
      });
      const data: unknown = await res.json();
      if (!res.ok) {
        let msg = `Gemini error: ${res.status}`;
        if (isRecord(data) && isRecord((data as GeminiResponse).error) && typeof (data as GeminiResponse).error?.message === "string") {
          msg = (data as GeminiResponse).error!.message as string;
        }
        return NextResponse.json({ error: msg, provider: "gemini", model }, { status: 500 });
      }
      const d = data as GeminiResponse;
      const content = d.candidates && d.candidates[0]?.content?.parts && d.candidates[0].content.parts[0]?.text
        ? String(d.candidates[0].content.parts[0].text)
        : "";
      return NextResponse.json({ content });
    }

    // Prefer Hugging Face when available (Option A) using HF OpenAI-compatible router
    if (hfKey) {
      const model = process.env.HUGGING_FACE_MODEL || "openai/gpt-oss-120b:fireworks-ai";
      const res = await fetch("https://router.huggingface.co/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hfKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          temperature: 0.4,
        }),
      });
      const data: unknown = await res.json();
      if (!res.ok) {
        let msg = `HF router error: ${res.status}`;
        if (isRecord(data) && isRecord(data.error) && typeof data.error.message === "string") {
          msg = data.error.message;
        }
        return NextResponse.json({ error: msg, provider: "huggingface", model }, { status: 500 });
      }
      const d = data as OAChatData;
      const content = d.choices && d.choices[0]?.message?.content ? d.choices[0].message.content : "";
      return NextResponse.json({ content });
    }

    // Else try OpenAI if key exists
    if (openaiKey) {
      const model = (process.env.OPENAI_MODEL || "gpt-4o-mini").trim();
      const prompt = `${system}\n\n${user}`;
      // 1) Try Responses API (works with project keys)
      try {
        const res = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
            "OpenAI-Beta": "assistants=v2",
          },
          body: JSON.stringify({ model, input: prompt, temperature: 0.4 }),
        });
        const data: unknown = await res.json();
        if (!res.ok) {
          let msg = `OpenAI error: ${res.status}`;
          if (isRecord(data) && isRecord(data.error) && typeof data.error.message === "string") {
            msg = data.error.message;
          }
          throw new Error(msg);
        }
        let content = "";
        const d = data as OAResponsesData;
        if (typeof d.output_text === "string") content = d.output_text;
        else if (Array.isArray(d.output)) {
          content = d.output
            .filter((it) => isRecord(it) && it.type === "output_text" && typeof it.text === "string")
            .map((it) => String((it as OAOutputItem).text))
            .join("");
        }
        return NextResponse.json({ content });
      } catch (err) {
        void err; // consume to avoid unused-var lint
        // 2) Fallback to Chat Completions
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: system },
              { role: "user", content: user },
            ],
            temperature: 0.4,
          }),
        });
        const data: unknown = await res.json();
        if (!res.ok) {
          let msg = `OpenAI error: ${res.status}`;
          if (isRecord(data) && isRecord(data.error) && typeof data.error.message === "string") {
            msg = data.error.message;
          }
          // Try HF fallback if available
          if (hfKey) {
            const hfModel = process.env.HUGGING_FACE_MODEL || "openai/gpt-oss-120b:fireworks-ai";
            const r2 = await fetch("https://router.huggingface.co/v1/chat/completions", {
              method: "POST",
              headers: { Authorization: `Bearer ${hfKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({ model: hfModel, messages: [ { role: "system", content: system }, { role: "user", content: user } ], temperature: 0.4 }),
            });
            const j2: unknown = await r2.json();
            if (r2.ok) {
              const dj = j2 as OAChatData;
              const content2 = dj.choices && dj.choices[0]?.message?.content ? dj.choices[0].message.content : "";
              return NextResponse.json({ content: content2 });
            }
          }
          return NextResponse.json({ error: msg, provider: "openai", model }, { status: 500 });
        }
        const d = data as OAChatData;
        const content = d.choices && d.choices[0]?.message?.content ? d.choices[0].message.content : "";
        return NextResponse.json({ content });
      }
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
    const provider = process.env.OPENAI_API_KEY ? "openai" : process.env.HUGGING_FACE_TOKEN ? "huggingface" : "none";
    const model = provider === "openai" ? (process.env.OPENAI_MODEL || "gpt-4o-mini").trim() : provider === "huggingface" ? (process.env.HUGGING_FACE_MODEL || "mistralai/Mistral-7B-Instruct-v0.3") : undefined;
    return NextResponse.json({ error: message, provider, model }, { status: 500 });
  }
}
