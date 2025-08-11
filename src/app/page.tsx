import Header from "../components/Header";

export default function Landing() {
  return (
    <main>
      <Header />

      {/* Hero */}
      <section id="home" className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#0b1220] via-[#0a101a] to-black" />
        <div className="max-w-6xl mx-auto px-5 py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-white font-extrabold leading-tight text-4xl md:text-5xl">
              Buat Makalah Anda dalam <span className="text-[#1DA1F2]">Hitungan Menit</span> dengan AI
            </h1>
            <p className="text-slate-300 mt-4">Masukkan topik, biarkan AI menulis, dan unduh makalah Anda dalam format .docx. Diskusikan dan revisi langsung dengan AI GPT-5.</p>
            <form action="/editor" className="mt-6 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
              <input name="topic" required placeholder="Nama Topik" className="w-full rounded-xl bg-[#0f1624] border border-[#243247] px-4 py-3 text-slate-200 outline-none focus:border-[#1DA1F2]" />
              <button className="btn btn-primary px-5 py-3">Buat Naskah Sekarang</button>
            </form>
            <div className="mt-4 text-xs text-slate-400">Contoh: Dampak Sosial Media pada Remaja</div>
          </div>
          <div className="flex justify-center">
            <div className="w-[520px] max-w-full aspect-[4/3] rounded-[40%_60%_50%_50%/50%_40%_60%_50%] border border-white/10 bg-[#0b1220] grid place-items-center shadow-[inset_0_0_0_1px_rgba(255,255,255,.04),0_40px_80px_rgba(0,0,0,.45)]">
              <svg viewBox="0 0 320 260" className="w-[78%] h-auto" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#1DA1F2"/>
                    <stop offset="100%" stopColor="#0ea5e9"/>
                  </linearGradient>
                </defs>
                <rect x="20" y="160" width="280" height="14" rx="7" fill="#0b1220" opacity=".2"/>
                <rect x="60" y="120" width="200" height="30" rx="6" fill="#0b1220" opacity=".25"/>
                <rect x="70" y="70" width="180" height="60" rx="8" fill="url(#g1)"/>
                <circle cx="130" cy="95" r="16" fill="#fff"/>
                <rect x="120" y="108" width="70" height="6" rx="3" fill="#fff" opacity=".9"/>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Fitur */}
      <section id="fitur" className="py-12 md:py-16 bg-gradient-to-b from-[#02060b] to-[#090f17]">
        <div className="max-w-6xl mx-auto px-5">
          <h2 className="text-center text-white text-2xl md:text-3xl font-bold">Fitur Utama</h2>
          <div className="mt-6 grid md:grid-cols-3 gap-4">
            {[{t:"Generator Naskah Otomatis",d:"Topik → naskah lengkap, siap ekspor sebagai file docx."},{t:"Chat Revisi AI GPT-5",d:"Diskusikan naskah Anda secara interaktif untuk revisi dan tambahan."},{t:"Ekspor Fleksibel",d:"Unduh naskah Anda dalam format .docx, PDF."}].map((c,i)=> (
              <article key={i} className="rounded-xl border border-[#1b2a41] bg-gradient-to-b from-[#0d1624] to-[#0a111d] p-5 text-slate-300 hover:-translate-y-1 hover:shadow-2xl transition">
                <div className="w-10 h-10 rounded-lg bg-[#1DA1F2]/20 grid place-items-center text-[#1DA1F2] mb-3">{i+1}</div>
                <h3 className="text-white font-semibold mb-1">{c.t}</h3>
                <p>{c.d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Cara Kerja */}
      <section id="carakerja" className="py-12 md:py-16">
        <div className="max-w-6xl mx-auto px-5">
          <h2 className="text-center text-white text-2xl md:text-3xl font-bold">Cara Kerja</h2>
          <ol className="mt-6 grid sm:grid-cols-5 gap-4 text-center text-slate-300">
            {[
              "Masukkan Topik",
              "Pilih Gaya & Struktur",
              "AI Membuat Naskah",
              "Chat & Revisi",
              "Unduh Naskah",
            ].map((s,idx)=> (
              <li key={idx} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-[#1DA1F2]/20 text-[#1DA1F2] grid place-items-center font-bold">{idx+1}</div>
                <div>{s}</div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Demo */}
      <section id="demo" className="py-12 md:py-16">
        <div className="max-w-6xl mx-auto px-5">
          <h2 className="text-center text-white text-2xl md:text-3xl font-bold">Coba Demo</h2>
          <form action="/editor" className="mt-6 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
            <input name="topic" placeholder="Dampak Sosial Media pada Remaja" className="w-full rounded-xl bg-[#0f1624] border border-[#243247] px-4 py-3 text-slate-200 outline-none focus:border-[#1DA1F2]" />
            <button className="btn btn-primary px-5 py-3">Coba Sekarang</button>
          </form>
          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-5 text-slate-300">
            <p className="mb-2">Sosial media menciptakan dinamika baru dalam interaksi remaja, memengaruhi persepsi diri, pola komunikasi, dan kebiasaan belajar...</p>
            <p className="mb-2">Di satu sisi, platform digital membuka akses informasi; di sisi lain, risiko distraksi dan misinformasi perlu dikelola...</p>
          </div>
        </div>
      </section>

      {/* Paket Harga */}
      <section id="paket" className="py-12 md:py-16 bg-gradient-to-b from-[#02060b] to-[#090f17]">
        <div className="max-w-6xl mx-auto px-5">
          <h2 className="text-center text-white text-2xl md:text-3xl font-bold">Paket Harga</h2>
          <div className="mt-6 grid md:grid-cols-3 gap-4">
            {[{n:"Gratis",p:"Rp0",d:["3 makalah/bulan"]},{n:"Pro",p:"Rp99k",d:["Tak terbatas","Chat GPT-5 prioritas"]},{n:"Premium",p:"Rp199k",d:["Semua fitur Pro","GPT-5 Turbo"]}].map((pk,i)=> (
              <div key={i} className={`rounded-2xl border p-6 ${i===1?"border-[#1DA1F2] bg-[#0d1624]":"border-white/10 bg-white/5"}`}>
                <h3 className="text-white text-xl font-semibold">{pk.n}</h3>
                <div className="text-3xl text-white mt-2">{pk.p}</div>
                <ul className="mt-4 text-slate-300 space-y-1 list-disc list-inside">
                  {pk.d.map((it,idx)=>(<li key={idx}>{it}</li>))}
                </ul>
                <a href="/dashboard" className="btn btn-primary mt-5 px-4 py-2 inline-flex">Mulai</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="kontak" className="border-t border-white/10 bg-black/50">
        <div className="max-w-6xl mx-auto px-5 py-6 flex flex-col md:flex-row items-center justify-between text-slate-400 gap-3">
          <p>© {new Date().getFullYear()} AI Makalah Maker</p>
          <nav className="flex gap-4">
            <a className="link-hover" href="#tentang">Tentang</a>
            <a className="link-hover" href="#paket">Paket</a>
            <a className="link-hover" href="/dashboard">Dashboard</a>
          </nav>
          <form action="/api/newsletter" method="post" className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
            <input name="email" type="email" placeholder="Email" className="rounded-xl bg-[#0f1624] border border-[#243247] px-3 py-2 text-slate-200 outline-none focus:border-[#1DA1F2]" />
            <button className="btn btn-primary px-3 py-2">Berlangganan</button>
          </form>
        </div>
      </footer>
    </main>
  );
}
