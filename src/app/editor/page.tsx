export default function EditorPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  // Note: Future work will connect AI and export features.
  return (
    <main className="min-h-screen">
      <section className="max-w-6xl mx-auto px-5 py-6">
        <h1 className="text-white text-2xl font-bold">Editor</h1>
        <p className="text-slate-400">Tulis & revisi makalah Anda. Chat AI di sisi kanan.</p>
      </section>
      <section className="max-w-6xl mx-auto px-5 pb-10 grid md:grid-cols-[1fr_380px] gap-5">
        {/* Left: Rich text area placeholder */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 min-h-[60vh]">
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
            <div className="flex gap-2 text-sm">
              {['B','I','H1','H2','List','Ref','Simpan','DOCX'].map(k => (
                <button key={k} className="px-2 py-1 rounded-lg border border-white/10 hover:bg-white/10 text-slate-200">{k}</button>
              ))}
            </div>
            <button className="btn btn-primary px-3 py-1.5">Export .docx</button>
          </div>
          <div className="text-slate-200 min-h-[48vh]" contentEditable suppressContentEditableWarning>
            <p className="mb-3">Mulai menulis di sini...</p>
          </div>
        </div>
        {/* Right: Chat box placeholder */}
        <aside className="rounded-xl border border-white/10 bg-white/5 p-3">
          <h3 className="text-white font-semibold mb-2">AI Chat (GPT-5)</h3>
          <div className="h-[48vh] overflow-y-auto rounded-lg border border-white/10 p-2 text-slate-200 bg-black/20">
            <div className="text-slate-400 text-sm">Belum ada pesan.</div>
          </div>
          <form className="mt-3 grid grid-cols-[1fr_auto] gap-2">
            <input className="rounded-xl bg-[#0f1624] border border-[#243247] px-3 py-2 text-slate-200 outline-none focus:border-[#1DA1F2]" placeholder="Tanyakan ke AI..." />
            <button className="btn btn-primary px-3">Kirim</button>
          </form>
          <div className="mt-2 text-xs text-slate-400">Mode AI Assist: AI dapat menulis langsung di dokumen (segera hadir).</div>
        </aside>
      </section>
    </main>
  );
}
