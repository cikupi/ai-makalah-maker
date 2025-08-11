import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Type helpers to avoid `any` and satisfy eslint rules
type OAOutputItem = { type?: string; text?: string };
type OAResponsesData = { output_text?: string; output?: OAOutputItem[]; error?: { message?: string } };
type OAChatData = { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
type HFGenItem = { generated_text?: string; translation_text?: string };

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

    // Prefer Hugging Face when available (Option A)
    if (hfKey) {
      const model = process.env.HUGGING_FACE_MODEL || "mistralai/Mistral-7B-Instruct-v0.3";
      const prompt = `${system}\n\n${user}`;
      const res = await fetch(`https://api-inference.huggingface.co/models/${encodeURIComponent(model)}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${hfKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          inputs: prompt,
          parameters: { max_new_tokens: 500, temperature: 0.4, return_full_text: false },
          options: { wait_for_model: true },
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        const msg = (json && (json.error || json.message)) || `HF error: ${res.status}`;
        return NextResponse.json({ error: msg, provider: "huggingface", model }, { status: 500 });
      }
      let content = "";
      if (Array.isArray(json) && json[0]?.generated_text) content = json[0].generated_text as string;
      else if (typeof json === "object" && (json as any)?.generated_text) content = (json as any).generated_text as string;
      else if (typeof json === "string") content = json;
      else if (Array.isArray(json) && json[0]?.translation_text) content = json[0].translation_text as string;
      if (!content) content = JSON.stringify(json);
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
            const hfModel = process.env.HUGGING_FACE_MODEL || "mistralai/Mistral-7B-Instruct-v0.3";
            const prompt2 = `${system}\n\n${user}`;
            const r2 = await fetch(`https://api-inference.huggingface.co/models/${encodeURIComponent(hfModel)}`, {
              method: "POST",
              headers: { Authorization: `Bearer ${hfKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({ inputs: prompt2, parameters: { max_new_tokens: 500, temperature: 0.4, return_full_text: false }, options: { wait_for_model: true } }),
            });
            const j2: unknown = await r2.json();
            if (r2.ok) {
              let content2 = "";
              if (Array.isArray(j2) && isRecord(j2[0]) && typeof (j2[0] as HFGenItem).generated_text === "string") content2 = String((j2[0] as HFGenItem).generated_text);
              else if (isRecord(j2) && typeof (j2 as HFGenItem).generated_text === "string") content2 = String((j2 as HFGenItem).generated_text);
              else if (typeof j2 === "string") content2 = j2;
              else if (Array.isArray(j2) && isRecord(j2[0]) && typeof (j2[0] as HFGenItem).translation_text === "string") content2 = String((j2[0] as HFGenItem).translation_text);
              if (!content2) content2 = JSON.stringify(j2);
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
