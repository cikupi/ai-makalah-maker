import { auth, signIn, signOut } from "@/auth";
type Repo = { id: number; name: string; full_name: string; private: boolean };

export default async function Home() {
  const session = await auth();

  async function doSignIn() {
    "use server";
    await signIn("github");
  }

  async function doSignOut() {
    "use server";
    await signOut();
  }

  async function createIssue(formData: FormData) {
    "use server";
    const token = (await auth())?.access_token as string | undefined;
    if (!token) return;
    const fullName = String(formData.get("repo") || ""); // owner/repo
    const title = String(formData.get("title") || "");
    const body = String(formData.get("body") || "");
    if (!fullName || !title) return;
    await fetch(`https://api.github.com/repos/${fullName}/issues`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github+json",
      },
      body: JSON.stringify({ title, body }),
      // Node fetch defaults are fine
    });
    // No explicit return; optimistic UX
  }

  let repos: Repo[] = [];
  if (session) {
    const token = session.access_token as string | undefined;
    if (token) {
      const res = await fetch("https://api.github.com/user/repos?per_page=50&sort=updated", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/vnd.github+json",
        },
        // Revalidate per request
        cache: "no-store",
      });
      if (res.ok) {
        repos = await res.json();
      }
    }
  }

  return (
    <main style={{
      maxWidth: 720,
      margin: "0 auto",
      padding: 24,
      fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial"
    }}>
      <h1>AI Makalah Maker</h1>
      <p>Demo autentikasi dengan GitHub (NextAuth v5).</p>

      {!session ? (
        <form action={doSignIn}>
          <button type="submit" style={{ padding: "8px 14px" }}>Login with GitHub</button>
        </form>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <strong>Signed in as:</strong> {session.user?.name || session.user?.email}
          </div>
          <form action={doSignOut}>
            <button type="submit" style={{ padding: "8px 14px" }}>Logout</button>
          </form>

          <section style={{ marginTop: 8 }}>
            <h2 style={{ fontSize: 18, marginBottom: 8 }}>Repositori Anda</h2>
            {repos.length === 0 ? (
              <p>Tidak ada repo atau token tidak memiliki akses. Pastikan memberi akses yang cukup saat login.</p>
            ) : (
              <ul style={{ paddingLeft: 18 }}>
                {repos.slice(0, 10).map(r => (
                  <li key={r.id}>{r.full_name} {r.private ? "(private)" : ""}</li>
                ))}
              </ul>
            )}
          </section>

          <section style={{ marginTop: 8 }}>
            <h2 style={{ fontSize: 18, marginBottom: 8 }}>Buat Issue</h2>
            <form action={createIssue} style={{ display: "grid", gap: 8, maxWidth: 560 }}>
              <label>
                <div>Repo (owner/repo):</div>
                <select name="repo" style={{ width: "100%", padding: 6 }}>
                  {repos.map(r => (
                    <option key={r.id} value={r.full_name}>{r.full_name}</option>
                  ))}
                </select>
              </label>
              <label>
                <div>Judul Issue:</div>
                <input name="title" placeholder="Contoh: Bug pada halaman X" style={{ width: "100%", padding: 6 }} required />
              </label>
              <label>
                <div>Deskripsi:</div>
                <textarea name="body" placeholder="Langkah reproduksi, harapan, dll." rows={5} style={{ width: "100%", padding: 6 }} />
              </label>
              <button type="submit" style={{ padding: "8px 14px" }}>Kirim Issue</button>
            </form>
          </section>
        </div>
      )}

      <hr style={{ margin: "24px 0" }} />
      <p>
        Langkah selanjutnya: tampilkan daftar repositori, buat issue, dan fitur commit file langsung dari web.
      </p>
    </main>
  );
}
