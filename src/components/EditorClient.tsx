"use client";
import { useEffect, useMemo, useState } from "react";
import type React from "react";

export default function EditorClient() {
  const [title, setTitle] = useState("Makalah Baru");
  const [content, setContent] = useState("");
  const [loadingGen, setLoadingGen] = useState(false);
  const [loadingDocx, setLoadingDocx] = useState(false);

  const plainText = useMemo(() => content.replace(/<[^>]+>/g, ""), [content]);

  async function generateAI() {
    setLoadingGen(true);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: title, style: "ilmiah ringkas" }),
      });
      const data = await res.json();
      if (res.ok && data.content) setContent((p) => (p ? p + "\n\n" : "") + data.content);
      else alert(data.error || "Gagal menghasilkan teks");
    } finally { setLoadingGen(false); }
  }

  async function exportDocx() {
    setLoadingDocx(true);
    try {
      const res = await fetch("/api/export/docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content: plainText }),
      });
      if (!res.ok) throw new Error("Export gagal");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${title.replace(/[^a-z0-9-_]+/gi, "-") || "makalah"}.docx`; a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Error export";
      alert(message);
    }
    finally { setLoadingDocx(false); }
  }

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const t = sp.get("topic"); if (t) setTitle(t);
  }, []);

  return (
    <div className="grid md:grid-cols-[1fr_380px] gap-5">
      <div className="rounded-xl border border-white/10 bg-white/5 p-3 min-h-[60vh]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-2 mb-3">
          <input className="rounded-lg bg-[#0f1624] border border-[#243247] px-3 py-2 text-slate-200 outline-none focus:border-[#1DA1F2] min-w-[220px]" value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Judul/Nama Topik" />
          <div className="flex flex-wrap gap-2 text-sm">
            <button onClick={generateAI} disabled={loadingGen} className="px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 text-slate-200">{loadingGen?"Menghasilkan...":"Generate AI"}</button>
            <button onClick={exportDocx} disabled={loadingDocx} className="btn btn-primary px-3 py-1.5">{loadingDocx?"Mengekspor...":"Export .docx"}</button>
          </div>
        </div>
        <div
          className="text-slate-200 min-h-[48vh] rounded-lg bg-black/20 border border-white/10 p-3"
          contentEditable
          suppressContentEditableWarning
          onInput={(e: React.FormEvent<HTMLDivElement>) => setContent(e.currentTarget.innerText)}
        >
          <p className="mb-3">Mulai menulis di sini...</p>
        </div>
      </div>
      <aside className="rounded-xl border border-white/10 bg-white/5 p-3">
        <h3 className="text-white font-semibold mb-2">AI Chat (GPT-5)</h3>
        <div className="h-[48vh] overflow-y-auto rounded-lg border border-white/10 p-2 text-slate-200 bg-black/20">
          <div className="text-slate-400 text-sm">Ketik instruksi untuk menambah/meringkas isi. Integrasi chat penuh akan ditambahkan berikutnya.</div>
        </div>
        <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
          <input className="rounded-xl bg-[#0f1624] border border-[#243247] px-3 py-2 text-slate-200 outline-none focus:border-[#1DA1F2]" placeholder="Tanyakan ke AI... (segera)" />
          <button className="btn btn-primary px-3" disabled>Kirim</button>
        </div>
      </aside>
    </div>
  );
}
