import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Types
type GeminiPart = { text?: string };
type GeminiContent = { role?: string; parts?: GeminiPart[] };
type GeminiResponse = {
  candidates?: Array<{ content?: GeminiContent }>;
  error?: { message?: string };
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

// Shape of API output
export type WorkflowOutput = {
  variables: {
    var1: string; // konsep permasalahan
    var2: string; // pendukung pemecahan
    var3: string; // outcome
  };
  title: string;
  question: string; // identifikasi masalah (pertanyaan utama)
  issues: string[]; // persoalan-persoalan
  bab1: {
    latarBelakang: string; // ~1500 kata (3 paragraf @500)
    identifikasiPermasalahan: string; // pertanyaan utama
    persoalan: string[]; // daftar persoalan
    ruangLingkup: {
      subjek: string;
      objek: string;
      metode: string;
    };
  };
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { topic?: string };
    const topic = (body.topic || "Topik Umum").toString().slice(0, 200);

    const system = `Anda adalah asisten penulis akademik yang disiplin format. Keluarkan jawaban dalam JSON valid.`;

    const instructions = `Buat workflow makalah otomatis dari Topik berikut.
Topik: ${topic}

Langkah-langkah:
1) Tentukan tiga variabel:
- var1 (Konsep Permasalahan): inti masalah/fokus kajian.
- var2 (Pendukung Pemecahan): faktor/aktivitas pendukung.
- var3 (Outcome): tujuan akhir.
2) Bentuk Judul akhir dengan format: {var1} guna {var2} dalam rangka {var3}.
3) Identifikasi Permasalahan: ubah judul menjadi pertanyaan utama (1 kalimat).
4) Buat 5-7 persoalan turunan berbasis teori terkait var1. Jika var1 berhubungan dengan manajemen, gunakan 5M (Man, Material, Money, Method, Machine) sebagai dimensi.
5) Susun Bab I – Pendahuluan:
A. Latar Belakang: 3 paragraf, tiap paragraf ~500 kata. Urutan isi per paragraf: (1) mulai dari var3 (Outcome), (2) lanjut var2 (Pendukung), (3) terakhir var1 (Konsep Permasalahan). Sertakan data/angka atau rujukan faktual seperlunya.
B. Identifikasi Permasalahan: cantumkan pertanyaan utama dari langkah 3.
C. Persoalan-persoalan: daftar dari langkah 4.
D. Ruang Lingkup: Subjek, Objek, Metode (ringkas).

Keluarkan HASIL dalam JSON dengan skema:
{
  "variables": { "var1": string, "var2": string, "var3": string },
  "title": string,
  "question": string,
  "issues": string[],
  "bab1": {
    "latarBelakang": string,
    "identifikasiPermasalahan": string,
    "persoalan": string[],
    "ruangLingkup": { "subjek": string, "objek": string, "metode": string }
  }
}
Tanpa tambahan teks di luar JSON.`;

    // Providers: Gemini > HF router > OpenAI
    const googleKey = process.env.GOOGLE_API_KEY;
    if (googleKey) {
      const model = (process.env.GOOGLE_MODEL || "gemini-1.5-flash").trim();
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(googleKey)}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: system }, { text: instructions }] }],
          generationConfig: { temperature: 0.35 },
        }),
      });
      const data: unknown = await res.json();
      if (!res.ok) {
        let msg = `Gemini error: ${res.status}`;
        if (isRecord(data) && isRecord((data as GeminiResponse).error) && typeof (data as GeminiResponse).error?.message === "string") msg = (data as GeminiResponse).error!.message as string;
        return NextResponse.json({ error: msg, provider: "gemini", model }, { status: 500 });
      }
      const d = data as GeminiResponse;
      const text = d.candidates?.[0]?.content?.parts?.[0]?.text || "";
      // Try to parse JSON
      let parsed: WorkflowOutput | null = null;
      try { parsed = JSON.parse(text) as WorkflowOutput; } catch { /* ignore */ }
      if (!parsed) {
        return NextResponse.json({ error: "Model tidak mengembalikan JSON yang valid" }, { status: 500 });
      }
      return NextResponse.json(parsed satisfies WorkflowOutput);
    }

    // If Gemini missing, reuse existing generate pipeline (HF router / OpenAI) to produce text, not implemented here for brevity
    return NextResponse.json({ error: "Missing AI provider key: set GOOGLE_API_KEY for local workflow" }, { status: 500 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Workflow error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
