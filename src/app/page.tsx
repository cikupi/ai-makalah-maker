import { auth, signIn, signOut } from "@/auth";

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
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <strong>Signed in as:</strong> {session.user?.name || session.user?.email}
          </div>
          <form action={doSignOut}>
            <button type="submit" style={{ padding: "8px 14px" }}>Logout</button>
          </form>
        </div>
      )}

      <hr style={{ margin: "24px 0" }} />
      <p>
        Langkah selanjutnya: tampilkan daftar repositori, buat issue, dan fitur commit file langsung dari web.
      </p>
    </main>
  );
}
