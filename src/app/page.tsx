import Header from "../components/Header";
import LandingForm from "../components/LandingForm";
import Image from "next/image";

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
            <p className="text-slate-300 mt-4">Masukkan topik, biarkan AI menulis, dan unduh makalah Anda dalam format .docx atau .pdf. Diskusikan dan revisi langsung dengan AI.</p>
            <LandingForm />
            <div className="mt-4 text-xs text-slate-400">Contoh: Perkembangan Teknologi Digital terhadap Keamanan</div>
          </div>
          <div className="flex justify-center">
            <div className="relative w-full max-w-[1100px] lg:max-w-[1400px] xl:max-w-[1600px] aspect-[16/12] overflow-hidden drop-shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
              <Image
                src="/women.svg"
                alt="Ilustrasi wanita dengan headset di depan laptop"
                fill
                sizes="(max-width: 768px) 95vw, (max-width: 1024px) 1100px, (max-width: 1440px) 1400px, 1600px"
                className="object-cover object-left"
                priority
              />
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
            <input name="topic" placeholder="Perkembangan Teknologi Digital terhadap Keamanan" className="w-full rounded-xl bg-[#0f1624] border border-[#243247] px-4 py-3 text-slate-200 outline-none focus:border-[#1DA1F2]" />
            <button className="btn btn-primary px-5 py-3">Coba Sekarang</button>
          </form>
          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-5 text-slate-300">
            <p className="mb-2">Judul : Strategi Peningkatan Kualitas Teknologi Digital Polri Guna Penanggulangan Kejahatan Siber Dalam Rangka Mewujudkan Keamanan Dalam Negeri</p>          </div>
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
