import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth";
type Repo = { id: number; name: string; full_name: string; private: boolean };

export default async function Home() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const session = (await getServerSession(authOptions as any)) as any;

  async function createIssue(formData: FormData) {
    "use server";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const token = ((await getServerSession(authOptions as any)) as any)?.access_token as string | undefined;
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

  async function createCommitAndPR(formData: FormData) {
    "use server";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = (await getServerSession(authOptions as any)) as any;
    const token: string | undefined = s?.access_token as string | undefined;
    if (!token) return;

    const fullName = String(formData.get("repo") || ""); // owner/repo
    const newBranch = String(formData.get("branch") || "").trim();
    const filePath = String(formData.get("path") || "").trim();
    const commitMessage = String(formData.get("commitMessage") || "Add file via AI Makalah Maker").trim();
    const prTitle = String(formData.get("prTitle") || "AI Makalah Maker: Add new file").trim();
    const prBody = String(formData.get("prBody") || "").trim();
    const content = String(formData.get("content") || "");
    if (!fullName || !newBranch || !filePath || !commitMessage || !prTitle) return;

    const [owner, repo] = fullName.split("/");
    const gh = async (url: string, init?: RequestInit) => {
      return fetch(url, {
        ...(init || {}),
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          ...(init?.headers || {}),
        },
      });
    };

    // Find default branch from the already-fetched list when possible
    const baseBranch = (repos.find(r => r.full_name === fullName) as { default_branch?: string } | undefined)?.default_branch || "main";

    // 1) Get base branch SHA
    const refRes = await gh(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${baseBranch}`);
    if (!refRes.ok) return;
    const refJson = (await refRes.json()) as { object?: { sha?: string } };
    const baseSha = refJson.object?.sha;
    if (!baseSha) return;

    // 2) Create new branch (ignore if already exists)
    const createRefRes = await gh(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
      method: "POST",
      body: JSON.stringify({ ref: `refs/heads/${newBranch}`, sha: baseSha }),
    });
    if (!createRefRes.ok) {
      // If branch exists (422), continue
      if (createRefRes.status !== 422) return;
    }

    // 3) Commit file to the new branch
    const contentB64 = Buffer.from(content, "utf8").toString("base64");
    const putFileRes = await gh(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}`, {
      method: "PUT",
      body: JSON.stringify({
        message: commitMessage,
        content: contentB64,
        branch: newBranch,
      }),
    });
    if (!putFileRes.ok) return;

    // 4) Open PR
    const prRes = await gh(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
      method: "POST",
      body: JSON.stringify({
        title: prTitle,
        head: newBranch,
        base: baseBranch,
        body: prBody,
      }),
    });
    if (!prRes.ok) return;
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
      <p>Demo autentikasi dengan GitHub (NextAuth).</p>

      {!session ? (
        <form action="/api/auth/signin/github" method="post">
          <button type="submit" style={{ padding: "8px 14px" }}>Login with GitHub</button>
        </form>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <strong>Signed in as:</strong> {session.user?.name || session.user?.email}
          </div>
          <form action="/api/auth/signout" method="post">
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

          <section style={{ marginTop: 16 }}>
            <h2 style={{ fontSize: 18, marginBottom: 8 }}>Commit File + Buka PR</h2>
            <form action={createCommitAndPR} style={{ display: "grid", gap: 8, maxWidth: 560 }}>
              <label>
                <div>Repo (owner/repo):</div>
                <select name="repo" style={{ width: "100%", padding: 6 }} required>
                  {repos.map(r => (
                    <option key={r.id} value={r.full_name}>{r.full_name}</option>
                  ))}
                </select>
              </label>
              <label>
                <div>Nama Branch Baru:</div>
                <input name="branch" placeholder="ai-makalah-maker-branch" defaultValue="ai-makalah-maker-branch" style={{ width: "100%,", padding: 6 }} required />
              </label>
              <label>
                <div>Path File:</div>
                <input name="path" placeholder="makalah.md" defaultValue="makalah.md" style={{ width: "100%", padding: 6 }} required />
              </label>
              <label>
                <div>Isi File (Markdown):</div>
                <textarea name="content" rows={8} placeholder="# Makalah\n\nTulis isi makalah di sini..." style={{ width: "100%", padding: 6 }} />
              </label>
              <label>
                <div>Commit Message:</div>
                <input name="commitMessage" placeholder="Add makalah.md" defaultValue="Add makalah.md" style={{ width: "100%", padding: 6 }} required />
              </label>
              <label>
                <div>Judul PR:</div>
                <input name="prTitle" placeholder="AI Makalah Maker: Tambah makalah.md" defaultValue="AI Makalah Maker: Tambah makalah.md" style={{ width: "100%", padding: 6 }} required />
              </label>
              <label>
                <div>Deskripsi PR:</div>
                <textarea name="prBody" rows={5} placeholder="Ringkasan perubahan..." style={{ width: "100%", padding: 6 }} />
              </label>
              <button type="submit" style={{ padding: "8px 14px" }}>Buat PR</button>
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
