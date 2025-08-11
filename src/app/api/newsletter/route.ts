import { NextRequest, NextResponse } from "next/server";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const name = String(form.get("name") || "").trim();
    const email = String(form.get("email") || "").trim().toLowerCase();

    if (!name || !email || !isValidEmail(email)) {
      return NextResponse.redirect(new URL("/?subscribed=0", req.url));
    }

    const webhook = process.env.NEWSLETTER_WEBHOOK_URL;
    const ghToken = process.env.NEWSLETTER_GITHUB_TOKEN;
    const ghRepo = process.env.NEWSLETTER_REPO; // owner/repo

    if (webhook) {
      try {
        await fetch(webhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, ts: Date.now() }),
        });
      } catch {
        // ignore webhook failure and continue to redirect
      }
    } else if (ghToken && ghRepo && ghRepo.includes("/")) {
      const [owner, repo] = ghRepo.split("/");
      try {
        await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${ghToken}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: `Newsletter: ${name} <${email}>`,
            body: `New subscriber\n\n- Name: ${name}\n- Email: ${email}\n- Time: ${new Date().toISOString()}`,
            labels: ["newsletter"],
          }),
        });
      } catch {
        // ignore failure
      }
    }

    return NextResponse.redirect(new URL("/?subscribed=1", req.url));
  } catch (e) {
    return NextResponse.redirect(new URL("/?subscribed=0", req.url));
  }
}
