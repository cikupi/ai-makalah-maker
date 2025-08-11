export default function Landing({ searchParams }: { searchParams?: { [key: string]: string | string[] | undefined } }) {
  return (
    <main className="lp-root">
      <header className="lp-header">
        <div className="container nav">
          <div className="brand">
            <span className="logo" aria-hidden>
              {/* Simple robot + paper logo (inline SVG) */}
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="5" width="10" height="14" rx="2" fill="#1DA1F2"/>
                <circle cx="8" cy="10" r="1.2" fill="white"/>
                <circle cx="11" cy="10" r="1.2" fill="white"/>
                <rect x="6.5" y="12.5" width="5" height="1.2" rx="0.6" fill="white"/>
                <path d="M14 7l4-2v14l-4 2V7z" fill="#0b1220"/>
                <path d="M18 8.5l2 1.5v7l-2 1.2V8.5z" fill="#1DA1F2"/>
              </svg>
            </span>
            <span className="name">AI Makalah Maker</span>
          </div>
          <nav className="menu">
            <a href="#home">Home</a>
            <a href="#fitur">Fitur</a>
            <a href="#tentang">Tentang Kami</a>
            <a href="#kontak">Kontak</a>
            <a href="#faq">FAQ</a>
            <button className="icon-btn" aria-label="Cari">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/><path d="M20 20l-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          </nav>
        </div>
      </header>

      <section id="home" className="hero">
        <div className="container hero-grid">
          <div className="hero-text">
            <h1>Buat Makalah Anda <span className="hl">Lebih Cepat</span> dengan AI</h1>
            <p>AI Makalah Maker membantu Anda menulis makalah dengan cepat, tepat, dan berkualitas tinggi.</p>
            {searchParams?.subscribed === "1" && (
              <div className="banner success">Terima kasih! Anda berhasil berlangganan.</div>
            )}
            {searchParams?.subscribed === "0" && (
              <div className="banner error">Gagal mendaftar. Periksa data Anda dan coba lagi.</div>
            )}
            <form className="newsletter" action="/api/newsletter" method="post">
              <input name="name" placeholder="Nama" aria-label="Nama" required />
              <input type="email" name="email" placeholder="Email" aria-label="Email" required />
              <button type="submit">Mulai Sekarang</button>
            </form>
            <div className="ctas">
              <form action="/api/auth/signin/github" method="post">
                <button className="primary" type="submit">Login dengan GitHub</button>
              </form>
              <a className="secondary" href="/dashboard">Lihat Dashboard</a>
            </div>
          </div>

          <div className="hero-visual">
            <div className="blob">
              {/* Illustration: person at laptop (minimal inline SVG) */}
              <svg viewBox="0 0 320 260" className="illus" xmlns="http://www.w3.org/2000/svg">
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

      <section id="fitur" className="features">
        <div className="container cards">
          <article className="card">
            <h3>Login <span className="hl">GitHub</span></h3>
            <p>Autentikasi aman dengan NextAuth. Akses repo publik dan privat.</p>
          </article>
          <article className="card">
            <h3>Buat <span className="hl">Issue</span></h3>
            <p>Buka issue langsung dari web untuk pelacakan tugas yang rapi.</p>
          </article>
          <article className="card">
            <h3>Commit & <span className="hl">PR</span></h3>
            <p>Buat branch, commit file makalah, dan buka Pull Request otomatis.</p>
          </article>
        </div>
      </section>

      <footer className="lp-footer" id="kontak">
        <div className="container foot">
          <p>© {new Date().getFullYear()} AI Makalah Maker</p>
          <nav className="foot-menu">
            <a href="#tentang">Tentang</a>
            <a href="#faq">FAQ</a>
            <a href="/dashboard">Dashboard</a>
          </nav>
        </div>
      </footer>

      <style>{`
        :root{
          --blue:#0b1220; /* dark navy */
          --blue-bright:#1DA1F2; /* highlight */
          --blue-sky:#0ea5e9; /* accent */
          --bg-grad: radial-gradient(1200px 600px at 10% -10%, #0ea5e933 0%, transparent 60%),
                      linear-gradient(180deg, #0b1a30 0%, #070b12 70%, #000 100%);
        }
        .lp-root{ color:#e5e7eb; background:var(--bg-grad); min-height:100svh; }
        .container{ max-width:1120px; margin:0 auto; padding:0 20px; }

        /* Header */
        .lp-header{ position:sticky; top:0; z-index:20; background:linear-gradient(180deg, rgba(0,0,0,.55), rgba(0,0,0,.15)); backdrop-filter:saturate(140%) blur(8px); border-bottom:1px solid rgba(255,255,255,.06); }
        .nav{ display:flex; align-items:center; justify-content:space-between; height:64px; }
        .brand{ display:flex; align-items:center; gap:10px; color:#fff; font-weight:700 }
        .brand .name{ letter-spacing:.2px }
        .menu{ display:flex; align-items:center; gap:18px; }
        .menu a{ color:#fff; text-decoration:none; font-weight:500; opacity:.9; transition:opacity .2s, transform .2s }
        .menu a:hover{ opacity:1; transform:translateY(-1px) }
        .icon-btn{ background:transparent; border:0; color:#fff; cursor:pointer; padding:6px; border-radius:8px; transition:background .2s }
        .icon-btn:hover{ background:rgba(255,255,255,.08) }

        /* Hero */
        .hero{ background: radial-gradient(800px 400px at 80% -10%, #1DA1F233 0%, transparent 60%), linear-gradient(180deg, #0b1220 0%, #0a0f19 50%, #000 100%); padding:72px 0 48px; }
        .hero-grid{ display:grid; grid-template-columns: 1.1fr 0.9fr; gap:32px; align-items:center; }
        .hero-text h1{ font-size: clamp(28px, 4.2vw, 54px); line-height:1.1; color:#fff; margin:0; font-weight:800 }
        .hero-text .hl{ color:var(--blue-bright) }
        .hero-text p{ color:#cbd5e1; margin:14px 0 20px; font-size: clamp(14px, 1.6vw, 18px) }
        .newsletter{ display:grid; grid-template-columns:1fr 1fr auto; gap:10px; background: rgba(255,255,255,.04); padding:10px; border-radius:14px; border:1px solid rgba(255,255,255,.06) }
        .newsletter input{ background:#0f1624; color:#e5e7eb; border:1px solid #243247; border-radius:10px; padding:12px 14px; outline:none; transition:border .2s, box-shadow .2s }
        .newsletter input:focus{ border-color:#1DA1F2; box-shadow:0 0 0 3px rgba(29,161,242,.2) }
        .newsletter button{ background: linear-gradient(180deg, #1DA1F2, #0ea5e9); color:#fff; border:0; border-radius:10px; padding:12px 16px; font-weight:700; cursor:pointer; transition: transform .15s ease, box-shadow .2s }
        .newsletter button:hover{ transform: translateY(-1px); box-shadow:0 10px 20px rgba(29,161,242,.24) }
        .banner{ margin-bottom:10px; padding:10px 12px; border-radius:10px; font-weight:600 }
        .banner.success{ background:rgba(16,185,129,.12); border:1px solid rgba(16,185,129,.35); color:#a7f3d0 }
        .banner.error{ background:rgba(239,68,68,.12); border:1px solid rgba(239,68,68,.35); color:#fecaca }

        .ctas{ display:flex; gap:12px; margin-top:14px }
        .primary{ background:linear-gradient(180deg, #1DA1F2, #0ea5e9); color:#fff; border:0; border-radius:10px; padding:10px 14px; font-weight:700; cursor:pointer; transition: transform .15s ease, box-shadow .2s }
        .primary:hover{ transform: translateY(-1px); box-shadow:0 10px 20px rgba(29,161,242,.24) }
        .secondary{ display:inline-block; border:1px solid rgba(255,255,255,.2); color:#fff; text-decoration:none; border-radius:10px; padding:10px 14px; transition: background .2s, transform .15s }
        .secondary:hover{ background:rgba(255,255,255,.06); transform: translateY(-1px) }

        .hero-visual{ display:flex; justify-content:center; }
        .blob{ width:min(520px, 90%); aspect-ratio: 4/3; background: radial-gradient(600px 300px at 10% 10%, #1DA1F219 0%, transparent 60%), #0b1220; border:1px solid rgba(255,255,255,.08); border-radius: 40% 60% 50% 50% / 50% 40% 60% 50%; box-shadow: inset 0 0 0 1px rgba(255,255,255,.04), 0 40px 80px rgba(0,0,0,.45); display:grid; place-items:center; position:relative; overflow:hidden }
        .blob::after{ content:""; position:absolute; inset:8px; border:1px solid rgba(255,255,255,.12); border-radius: inherit; pointer-events:none }
        .illus{ width:78%; height:auto; filter: drop-shadow(0 12px 24px rgba(0,0,0,.4)); }

        /* Features */
        .features{ padding:42px 0 64px; background: linear-gradient(180deg, #02060b, #090f17) }
        .cards{ display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:16px }
        .card{ background: linear-gradient(180deg, #0d1624, #0a111d); border:1px solid #1b2a41; border-radius:14px; padding:18px; color:#cbd5e1; transition: transform .15s, box-shadow .2s }
        .card:hover{ transform: translateY(-3px); box-shadow: 0 18px 36px rgba(0,0,0,.35) }
        .card h3{ color:#fff; margin:0 0 8px; font-size:18px }
        .card .hl{ color:#1DA1F2 }

        /* Footer */
        .lp-footer{ border-top:1px solid rgba(255,255,255,.06); background:linear-gradient(180deg, rgba(0,0,0,.1), rgba(0,0,0,.35)); padding:18px 0 }
        .foot{ display:flex; justify-content:space-between; align-items:center; color:#94a3b8 }
        .foot-menu{ display:flex; gap:14px }
        .foot-menu a{ color:#cbd5e1; text-decoration:none; opacity:.85 }
        .foot-menu a:hover{ opacity:1 }

        /* Responsive */
        @media (max-width: 860px){
          .menu{ display:none }
          .hero-grid{ grid-template-columns:1fr; }
          .newsletter{ grid-template-columns: 1fr; }
          .ctas{ flex-direction:column; align-items:flex-start }
          .cards{ grid-template-columns: 1fr; }
          .foot{ flex-direction:column; gap:10px }
        }
      `}</style>
    </main>
  );
}
