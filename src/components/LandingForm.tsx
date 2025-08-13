"use client";
import { useState } from "react";

export default function LandingForm() {
  const [topic, setTopic] = useState("");
  const [advOpen, setAdvOpen] = useState(false);
  const [titles, setTitles] = useState<string[] | null>(null);
  const [loadingTitles, setLoadingTitles] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedWordRange, setSelectedWordRange] = useState("1000-3000");
  const [subject, setSubject] = useState("");

  async function genTitles() {
    setError(null);
    setTitles(null);
    const t = topic.trim();
    if (!t) { setError("Topik belum diisi"); return; }
    setLoadingTitles(true);
    try {
      const res = await fetch("/api/ai/titles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: t }),
      });
      const data: { titles?: string[]; error?: string } = await res.json();
      if (!res.ok || !data.titles?.length) throw new Error(data.error || "Gagal membuat judul");
      setTitles(data.titles.slice(0, 3));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error";
      setError(msg);
    } finally { setLoadingTitles(false); }
  }

  return (
    <form action="/editor" className="mt-6 flex flex-col gap-3">
      {/* Trigger auto-generate on editor open */}
      <input type="hidden" name="autogen" value="1" />
      <input
        name="topic"
        required
        placeholder="Masukan Topik"
        className="w-full rounded-xl bg-[#0f1624] border border-[#243247] px-4 py-3 text-slate-200 outline-none focus:border-[#1DA1F2]"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
      />

      {/* Advanced dropdown toggle */}
      <div className="-mt-1">
        <button
          type="button"
          className="text-xs text-slate-300 hover:text-white inline-flex items-center gap-1"
          onClick={() => setAdvOpen(v => !v)}
          aria-expanded={advOpen}
          aria-controls="adv-panel"
        >
          <span>Advanced</span>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={`h-3 w-3 transition ${advOpen ? "rotate-180" : "rotate-0"}`}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      {/* Advanced panel */}
      {advOpen && (
        <div id="adv-panel" className="rounded-xl border border-[#243247] bg-[#0d1624] p-3 text-slate-200 space-y-3">
          {/* 1) Title suggestions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold">Rekomendasi Judul</h4>
              <button type="button" className="text-xs text-sky-400 hover:underline disabled:opacity-50" onClick={() => void genTitles()} disabled={loadingTitles}>
                {loadingTitles ? "Memproses..." : "Generate dari Topik"}
              </button>
            </div>
            {error && <div className="text-xs text-rose-400">{error}</div>}
            {titles && (
              <div className="space-y-2">
                <div className="space-y-1">
                  {titles.map((t, i) => (
                    <label key={i} className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="title_choice"
                        value={t}
                        onChange={() => setTopic(t)}
                        className="mt-1"
                      />
                      <span className="text-sm leading-snug">{t}</span>
                    </label>
                  ))}
                </div>
                <div className="pt-2 border-t border-[#243247]">
                  <label className="text-xs font-semibold block mb-1">Buat Judul Sendiri</label>
                  <input
                    placeholder="Tulis judul Anda sendiri di sini"
                    className="w-full bg-[#0f1624] border border-[#243247] rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-[#1DA1F2]"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                  <div className="text-[11px] text-slate-400 mt-1">Mengisi kotak ini akan menggantikan pilihan judul di atas.</div>
                </div>
              </div>
            )}
          </div>

          {/* 2) Subjek Penulisan / Perspektif */}
          <div>
            <label className="text-sm font-semibold block mb-1">Subjek Penulisan</label>
            <input
              name="subject"
              placeholder="Contoh: Kapolri, Kapolres, Dirintel, Dirreskrim, Kapolres, dsb."
              className="w-full bg-[#0f1624] border border-[#243247] rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-[#1DA1F2]"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
            <div className="text-xs text-slate-400 mt-1">Perspektif/sudut pandang yang akan digunakan dalam penulisan naskah.</div>
          </div>

          {/* 3) Word count selection */}
          <div>
            <label className="text-sm font-semibold block mb-1">Jumlah Kata</label>
            <select
              name="words"
              className="w-full bg-[#0f1624] border border-[#243247] rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-[#1DA1F2]"
              value={selectedWordRange}
              onChange={(e) => setSelectedWordRange(e.target.value)}
            >
              <option value="500-1000">500 - 1000</option>
              <option value="1000-3000">1000 - 3000</option>
              <option value="3000-5000">3000 - 5000</option>
            </select>
          </div>
        </div>
      )}

      <button className="btn btn-primary px-5 py-3 self-start">Buat Naskah Sekarang</button>
    </form>
  );
}
