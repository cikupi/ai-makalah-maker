export default function Landing() {
  return (
    <main style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial" }}>
      <section style={{ padding: "64px 24px", textAlign: "center", background: "linear-gradient(180deg,#0ea5e9,#22d3ee)", color: "white" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <h1 style={{ fontSize: 44, lineHeight: 1.1, margin: 0 }}>AI Makalah Maker</h1>
          <p style={{ fontSize: 18, opacity: 0.95, marginTop: 12 }}>
            Buat makalah, commit ke GitHub, dan buka Pull Request secara otomatis. Cepat, aman, dan terintegrasi.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24 }}>
            <form action="/api/auth/signin/github" method="post">
              <button type="submit" style={{ padding: "12px 18px", background: "white", color: "#0ea5e9", border: 0, borderRadius: 8, fontWeight: 600 }}>Mulai dengan GitHub</button>
            </form>
            <a href="/dashboard" style={{ padding: "12px 18px", border: "2px solid white", color: "white", borderRadius: 8, fontWeight: 600, textDecoration: "none" }}>Lihat Dashboard</a>
          </div>
        </div>
      </section>

      <section style={{ padding: "40px 24px", background: "#f8fafc" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "grid", gap: 16 }}>
          <h2 style={{ textAlign: "center", marginBottom: 8 }}>Fitur Utama</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16 }}>
            <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16 }}>
              <strong>Login GitHub</strong>
              <p style={{ marginTop: 8 }}>Autentikasi aman dengan NextAuth. Akses repo publik dan privat.</p>
            </div>
            <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16 }}>
              <strong>Buat Issue</strong>
              <p style={{ marginTop: 8 }}>Buka issue langsung dari web untuk pelacakan tugas yang rapi.</p>
            </div>
            <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16 }}>
              <strong>Commit & PR</strong>
              <p style={{ marginTop: 8 }}>Buat branch, commit file makalah, dan buka PR otomatis.</p>
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: "40px 24px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "grid", gap: 12 }}>
          <h2 style={{ textAlign: "center" }}>Cara Kerja</h2>
          <ol style={{ maxWidth: 720, margin: "0 auto", display: "grid", gap: 8 }}>
            <li>Login dengan akun GitHub Anda.</li>
            <li>Pilih repo tujuan atau buat repo baru.</li>
            <li>Tulis/unggah konten makalah dan buka PR.</li>
            <li>Review di GitHub dan merge ke branch utama.</li>
          </ol>
        </div>
      </section>

      <section style={{ padding: "40px 24px", background: "#f1f5f9" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", textAlign: "center" }}>
          <h2>Siap mulai?</h2>
          <p>Masuk dengan GitHub dan kelola makalah Anda langsung dari dashboard.</p>
          <form action="/api/auth/signin/github" method="post" style={{ marginTop: 12 }}>
            <button type="submit" style={{ padding: "12px 18px", background: "#0ea5e9", color: "white", border: 0, borderRadius: 8, fontWeight: 600 }}>Login dengan GitHub</button>
          </form>
        </div>
      </section>
    </main>
  );
}
