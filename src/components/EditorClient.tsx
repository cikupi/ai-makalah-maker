"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type React from "react";

export default function EditorClient() {
  const router = useRouter();
  const [title, setTitle] = useState("Makalah Baru");
  const [content, setContent] = useState("");
  const [loadingGen, setLoadingGen] = useState(false);
  const [loadingDocx, setLoadingDocx] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingFlow, setLoadingFlow] = useState(false);
  const [provider, setProvider] = useState<string>("");
  const [model, setModel] = useState<string>("");
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [contentSetByCode, setContentSetByCode] = useState(false);
  type ChatMsg = {
    role: "user" | "assistant";
    content: string;
    meta?: { createdAt?: number; startedAt?: number; endedAt?: number };
  };
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  type Theme = "system" | "light" | "dark";
  const [theme, setTheme] = useState<Theme>("system");

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

  async function exportPdf() {
    setLoadingPdf(true);
    try {
      const res = await fetch("/api/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content: plainText }),
      });
      if (!res.ok) throw new Error("Export PDF gagal");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${title.replace(/[^a-z0-9-_]+/gi, "-") || "makalah"}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Error export PDF";
      alert(message);
    } finally {
      setLoadingPdf(false);
    }
  }

  async function generateWorkflow() {
    setLoadingFlow(true);
    try {
      const res = await fetch("/api/ai/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: title }),
      });
      const data: {
        variables?: { var1?: string; var2?: string; var3?: string };
        title?: string;
        question?: string;
        issues?: string[];
        bab1?: { latarBelakang?: string; identifikasiPermasalahan?: string; persoalan?: string[]; ruangLingkup?: { subjek?: string; objek?: string; metode?: string } };
        error?: string;
      } = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menjalankan workflow");
      if (data.title) setTitle(data.title);
      const parts: string[] = [];
      if (data.bab1?.latarBelakang) {
        parts.push(`# BAB I — Pendahuluan\n\n## A. Latar Belakang\n${data.bab1.latarBelakang}`);
      }
      if (data.bab1?.identifikasiPermasalahan || data.question) {
        parts.push(`## B. Identifikasi Permasalahan\n${data.bab1?.identifikasiPermasalahan || data.question}`);
      }
      const isu = data.bab1?.persoalan || data.issues || [];
      if (isu.length) {
        parts.push(`## C. Persoalan-persoalan\n` + isu.map((s, i) => `${i + 1}. ${s}`).join("\n"));
      }
      const rl = data.bab1?.ruangLingkup;
      if (rl?.subjek || rl?.objek || rl?.metode) {
        parts.push(`## D. Ruang Lingkup\n- Subjek: ${rl.subjek || "-"}\n- Objek: ${rl.objek || "-"}\n- Metode: ${rl.metode || "-"}`);
      }
      const text = parts.join("\n\n");
      setContent((p) => {
        const next = (p ? p + "\n\n" : "") + text;
        return next;
      });
      setContentSetByCode(true);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Workflow error";
      alert(message);
    } finally {
      setLoadingFlow(false);
    }
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
    // fetch provider info
    void (async () => {
      try {
        const res = await fetch("/api/ai/health", { cache: "no-store" });
        const data: { ok?: boolean; provider?: string; model?: string } = await res.json();
        if (data?.provider) setProvider(String(data.provider));
        if (data?.model) setModel(String(data.model));
      } catch (_) {
        // ignore
      }
    })();
    // init theme from localStorage
    const stored = (localStorage.getItem("aimakalah-theme") as Theme | null) || "system";
    setTheme(stored);
  }, []);

  // Apply theme to root
  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (th: Theme) => {
      const isDark = th === 'dark' || (th === 'system' && media.matches);
      root.classList.toggle('dark', isDark);
    };
    apply(theme);
    // Modern event listener
    const onChange = () => { if (theme === 'system') apply('system'); };
    // Fallback for older browsers
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    } else if ('addListener' in media && typeof media.addListener === 'function') {
      // Older Safari versions use addListener/removeListener with MediaQueryListEvent
      const legacyListener = function(this: MediaQueryList, _e: MediaQueryListEvent) {
        onChange();
      };
      media.addListener(legacyListener);
      return () => media.removeListener(legacyListener);
    }
    return () => {};
  }, [theme]);

  function cycleTheme() {
    const next: Theme = theme === 'system' ? 'dark' : theme === 'dark' ? 'light' : 'system';
    setTheme(next);
    localStorage.setItem('aimakalah-theme', next);
  }

  // Push state content into contentEditable when it was set programmatically (workflow/AI)
  useEffect(() => {
    if (contentSetByCode && editorRef.current) {
      editorRef.current.innerText = content;
      setContentSetByCode(false);
    }
  }, [content, contentSetByCode]);

  function fmtDuration(ms?: number) {
    if (!ms || ms < 0) return "";
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const rs = s % 60;
    return m ? `${m}m ${rs}s` : `${rs}s`;
  }

  function fmtTime(ts?: number) {
    if (!ts) return "";
    const d = new Date(ts);
    return d.toLocaleString(undefined, { hour: "2-digit", minute: "2-digit", hour12: true, day: "2-digit", month: "short" });
  }

  async function sendChat() {
    const prompt = chatInput.trim();
    if (!prompt) return;
    const nextMsgs: ChatMsg[] = [...chatMessages, { role: "user", content: prompt, meta: { createdAt: Date.now() } }];
    setChatMessages(nextMsgs);
    setChatInput("");
    setSending(true);
    try {
      const startedAt = Date.now();
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMsgs, context: plainText, topic: title }),
      });
      const data: { message?: string; error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error || "Chat gagal");
      const endedAt = Date.now();
      const reply: ChatMsg = { role: "assistant", content: data.message || "", meta: { startedAt, endedAt, createdAt: endedAt } };
      setChatMessages((prev) => [...prev, reply]);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Chat error";
      alert(message);
    } finally {
      setSending(false);
    }
  }

  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = chatScrollRef.current; if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [chatMessages]);

  return (
    <div className={`relative grid gap-0 min-h-screen ${sidebarOpen ? 'md:grid-cols-[25%_1fr]' : 'md:grid-cols-1'}`}>
      {/* Left Chat Sidebar */}
      <aside className={`${sidebarOpen ? '' : 'hidden'} rounded-none border border-r-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 flex flex-col sticky top-0 h-screen`}>
        {/* Top bar with project and popdown menu trigger */}
        <div className="relative mb-2">
          <button
            type="button"
            className="w-[70%] flex items-center gap-2 px-2 py-1.5 rounded-lg text-slate-700 dark:text-slate-200"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <span className="flex items-center gap-2">
              <span className="font-semibold text-sm">AI Makalah Maker</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={`${menuOpen ? "rotate-180" : "rotate-0"} h-4 w-4 transition`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
              </svg>
            </span>
          </button>
          {/* Header right icons */}
          <div className="absolute right-0 top-0 h-full flex items-center gap-2 pr-1 text-slate-600 dark:text-slate-300">
            <button
              className="h-8 w-8 grid place-items-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-transform duration-150 active:scale-95 outline-none focus:outline-none focus:ring-0 bg-transparent border-0"
              title="Riwayat"
              aria-label="Riwayat"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-9 9Zm0 0h3" />
              </svg>
            </button>
            {sidebarOpen && (
              <button
                className="h-8 w-8 grid place-items-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-transform duration-150 active:scale-95 outline-none focus:outline-none focus:ring-0 bg-transparent border-0"
                title="Sembunyikan sidebar"
                aria-label="Sembunyikan sidebar"
                onClick={() => setSidebarOpen(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <path d="M9 3v18" />
                </svg>
              </button>
            )}
          </div>

          {menuOpen && (
            <div
              role="menu"
              tabIndex={-1}
              onMouseLeave={() => setMenuOpen(false)}
              className="absolute left-0 mt-2 w-[70%] rounded-xl border border-white/10 bg-white dark:bg-slate-900 shadow-xl z-20 overflow-hidden"
            >
              <div className="py-1">
                <button className="w-full flex items-center gap-3 px-3 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5" onClick={() => { setMenuOpen(false); router.push('/'); }}>
                  {/* Dashboard icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h7V3H3v9Zm0 9h7v-7H3v7Zm11 0h7V12h-7v9Zm0-18v7h7V3h-7Z" />
                  </svg>
                  <span className="text-sm">Go to Dashboard</span>
                </button>
              </div>
              <div className="border-t border-white/10" />
              <div className="py-1">
                <button className="w-full flex items-center gap-3 px-3 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5" onClick={() => setMenuOpen(false)}>
                  {/* Gift icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8m16 0H4m16 0V8a2 2 0 0 0-2-2h-5m-9 6V8a2 2 0 0 1 2-2h5m0 0a3 3 0 1 1 0-6c2 0 3 3 3 3s-1 3-3 3Zm0 0a3 3 0 1 0 0-6c-2 0-3 3-3 3s1 3 3 3Z" />
                  </svg>
                  <span className="text-sm">Get free credits</span>
                </button>
              </div>
              <div className="border-t border-white/10" />
              <div className="py-1">
                <button className="w-full flex items-center gap-3 px-3 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5" onClick={() => setMenuOpen(false)}>
                  {/* Settings icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317a1.5 1.5 0 0 1 3.35 0l.214 1.718a1.5 1.5 0 0 0 2.073 1.227l1.62-.681a1.5 1.5 0 0 1 1.95.832l.008.02a1.5 1.5 0 0 1-.584 1.823l-1.46.916a1.5 1.5 0 0 0 0 2.55l1.46.916a1.5 1.5 0 0 1 .584 1.823l-.008.02a1.5 1.5 0 0 1-1.95.832l-1.62-.681a1.5 1.5 0 0 0-2.073 1.227l-.214 1.718a1.5 1.5 0 0 1-3.35 0l-.214-1.718a1.5 1.5 0 0 0-2.073-1.227l-1.62.681a1.5 1.5 0 0 1-1.95-.832l-.008-.02a1.5 1.5 0 0 1 .584-1.823l1.46-.916a1.5 1.5 0 0 0 0-2.55l-1.46-.916a1.5 1.5 0 0 1-.584-1.823l.008-.02a1.5 1.5 0 0 1 1.95-.832l1.62.681a1.5 1.5 0 0 0 2.073-1.227l.214-1.718Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  <span className="text-sm">Settings</span>
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5" onClick={() => setMenuOpen(false)}>
                  {/* Rename icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 20h4l10-10-4-4L4 16v4Zm12.5-12.5 1.5-1.5 2 2-1.5 1.5-2-2Z" />
                  </svg>
                  <span className="text-sm">Rename project</span>
                </button>
              </div>
              <div className="border-t border-white/10" />
              <div className="py-1">
                <button className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5" onClick={() => { cycleTheme(); }}>
                  <span className="flex items-center gap-3">
                  {/* Appearance icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
                  </svg>
                  <span className="text-sm">Appearance</span>
                  </span>
                  <span className="text-xs opacity-70">{theme === 'system' ? 'System' : theme === 'dark' ? 'Dark' : 'Light'}</span>
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5" onClick={() => setMenuOpen(false)}>
                  {/* Help icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.09 9a3 3 0 1 1 5.83 1c0 2-3 2-3 4m.01 3h.01" />
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                  <span className="text-sm">Help</span>
                </button>
              </div>
            </div>
          )}
        </div>
        <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-2 bg-transparent nice-scroll">
          {chatMessages.length === 0 ? (
            <div className="text-slate-400 text-sm">Silahkan tanya AI untuk membantu menulis atau merevisi naskah...</div>
          ) : (
            <div className="space-y-3">
              {chatMessages.map((m, i) => (
                <div key={i} className={(m.role === "user" ? "text-right" : "text-left") + (m.role === "assistant" ? " group" : "") }>
                  {m.role === "user" ? (
                    <div className="inline-block max-w-[92%] rounded-2xl px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/20 text-slate-900 dark:text-slate-100">
                      <pre className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</pre>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-1 px-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-block h-4 w-4 rounded-full bg-gradient-to-br from-pink-500 to-orange-400" />
                          <span className="text-slate-700 dark:text-slate-200 text-sm font-semibold">AI Makalah</span>
                        </div>
                        <div
                          className="text-xs text-slate-400 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition"
                          title={(m.meta?.endedAt && m.meta?.startedAt) ? `Worked for ${fmtDuration(m.meta.endedAt - m.meta.startedAt)} • ${fmtTime(m.meta.endedAt)}` : (fmtTime(m.meta?.createdAt) || "")}
                        >
                          {m.meta?.endedAt && m.meta?.startedAt ? (
                            <span>Worked for {fmtDuration(m.meta.endedAt - m.meta.startedAt)} • {fmtTime(m.meta.endedAt)}</span>
                          ) : (
                            <span>{fmtTime(m.meta?.createdAt)}</span>
                          )}
                        </div>
                      </div>
                      <pre className="inline-block max-w-[92%] text-sm leading-relaxed whitespace-pre-wrap px-3 py-1.5 text-slate-700 dark:text-slate-300">{m.content}</pre>
                      <div className="flex items-center justify-end gap-2 pr-1 mt-1 text-slate-400">
                        <button className="h-6 w-6 grid place-items-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white" title="Suka" aria-label="Suka">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 10v10m10-7.5a3.5 3.5 0 0 1-3.5 3.5H9.5A2.5 2.5 0 0 1 7 13.5V10l5-6a2 2 0 0 1 2 2v2h1.5A2.5 2.5 0 0 1 18 10.5v0Z" />
                          </svg>
                        </button>
                        <button className="h-6 w-6 grid place-items-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white" title="Tidak suka" aria-label="Tidak suka">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 14V4M7 11.5A3.5 3.5 0 0 1 10.5 8H14.5A2.5 2.5 0 0 1 17 10.5V14l-5 6a2 2 0 0 1-2-2v-2H8.5A2.5 2.5 0 0 1 6 13.5v0Z" />
                          </svg>
                        </button>
                        <button className="h-6 w-6 grid place-items-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white" title="Salin" aria-label="Salin" onClick={() => navigator.clipboard.writeText(m.content)}>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
                            <rect x="9" y="9" width="11" height="11" rx="2" ry="2" />
                            <path d="M7 15H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1" />
                          </svg>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <input
              className="bg-transparent border border-transparent focus:border-slate-500 dark:focus:border-slate-400 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 outline-none"
              placeholder="Tanya AI..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendChat(); } }}
            />
            <button
              className="h-9 w-9 grid place-items-center text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-50 bg-transparent p-0 border-0 outline-none focus:outline-none focus:ring-0"
              onClick={() => void sendChat()}
              disabled={sending}
              aria-label="Kirim"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path d="M3 10a1 1 0 0 1 1-1h11.586l-3.293-3.293a1 1 0 1 1 1.414-1.414l5 5a1 1 0 0 1 0 1.414l-5 5a1 1 0 1 1-1.414-1.414L15.586 11H4a1 1 0 0 1-1-1Z"/>
              </svg>
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <button
                className="h-12 w-12 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 grid place-items-center text-xl font-medium transition-transform duration-150 active:scale-95 outline-none focus:outline-none focus:ring-0"
                title="Prompt baru"
                aria-label="Prompt baru"
              >
                +
              </button>
              <button
                className="px-4 h-12 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 transition-transform duration-150 active:scale-95 outline-none focus:outline-none focus:ring-0"
                title="Edit"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V6a2 2 0 0 1 2-2h2M20 8V6a2 2 0 0 0-2-2h-2M4 16v2a2 2 0 0 0 2 2h2M20 16v2a2 2 0 0 1-2 2h-2" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l4 4-6 2 2-6Z" />
                </svg>
                <span className="text-base">Edit</span>
              </button>
            </div>
            <div className="flex items-center ml-auto">
              <span className="px-2.5 h-8 rounded-full border border-slate-200 dark:border-white/20 flex items-center gap-1">💡 Chat</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Right Editor Pane */}
      <div className="rounded-none border border-l-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 min-h-screen flex flex-col">
        <div className="flex items-center justify-between gap-4 p-2 text-sm bg-white dark:bg-slate-950">
          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <>
                <div className="relative">
                  <button
                    type="button"
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-slate-700 dark:text-slate-200"
                    onClick={() => setMenuOpen((v) => !v)}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                  >
                    <span className="font-semibold text-sm">AI Makalah Maker</span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={`${menuOpen ? "rotate-180" : "rotate-0"} h-4 w-4 transition`}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                {menuOpen && (
                  <div
                    role="menu"
                    tabIndex={-1}
                    onMouseLeave={() => setMenuOpen(false)}
                    className="absolute left-0 mt-2 w-64 rounded-xl border border-white/10 bg-white dark:bg-slate-900 shadow-xl z-20 overflow-hidden"
                  >
                    <div className="py-1">
                      <button className="w-full flex items-center gap-3 px-3 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5" onClick={() => { setMenuOpen(false); router.push('/'); }}>
                        {/* Dashboard icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h7V3H3v9Zm0 9h7v-7H3v7Zm11 0h7V12h-7v9Zm0-18v7h7V3h-7Z" />
                        </svg>
                        <span className="text-sm">Go to Dashboard</span>
                      </button>
                      </div>
                      <div className="border-t border-white/10" />
                      <div className="py-1">
                        <button className="w-full flex items-center gap-3 px-3 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5" onClick={() => setMenuOpen(false)}>
                          {/* Settings icon */}
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317a1.5 1.5 0 0 1 3.35 0l.214 1.718a1.5 1.5 0 0 0 2.073 1.227l1.62-.681a1.5 1.5 0 0 1 1.95.832l.008.02a1.5 1.5 0 0 1-.584 1.823l-1.46.916a1.5 1.5 0 0 0 0 2.55l1.46.916a1.5 1.5 0 0 1 .584 1.823l-.008.02a1.5 1.5 0 0 1-1.95.832l-1.62-.681a1.5 1.5 0 0 0-2.073 1.227l-.214 1.718a1.5 1.5 0 0 1-3.35 0l-.214-1.718a1.5 1.5 0 0 0-2.073-1.227l-1.62.681a1.5 1.5 0 0 1-1.95-.832l-.008-.02a1.5 1.5 0 0 1 .584-1.823l1.46-.916a1.5 1.5 0 0 0 0-2.55l-1.46-.916a1.5 1.5 0 0 1-.584-1.823l.008-.02a1.5 1.5 0 0 1 1.95-.832l1.62.681a1.5 1.5 0 0 0 2.073-1.227l.214-1.718Z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                          <span className="text-sm">Settings</span>
                        </button>
                        <button className="w-full flex items-center gap-3 px-3 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5" onClick={() => setMenuOpen(false)}>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 20h4l10-10-4-4L4 16v4Zm12.5-12.5 1.5-1.5 2 2-1.5 1.5-2-2Z" />
                          </svg>
                          <span className="text-sm">Rename project</span>
                        </button>
                      </div>
                      <div className="border-t border-white/10" />
                      <div className="py-1">
                        <button className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5" onClick={() => { cycleTheme(); }}>
                          <span className="flex items-center gap-3">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
                            </svg>
                            <span className="text-sm">Appearance</span>
                          </span>
                          <span className="text-xs opacity-70">{theme === 'system' ? 'System' : theme === 'dark' ? 'Dark' : 'Light'}</span>
                        </button>
                        <button className="w-full flex items-center gap-3 px-3 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5" onClick={() => setMenuOpen(false)}>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.09 9a3 3 0 1 1 5.83 1c0 2-3 2-3 4m.01 3h.01" />
                            <circle cx="12" cy="12" r="10" />
                          </svg>
                          <span className="text-sm">Help</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="ml-2 h-8 w-8 grid place-items-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-transform duration-150 active:scale-95 outline-none focus:outline-none focus:ring-0 bg-transparent border-0"
                  title="Tampilkan sidebar"
                  aria-label="Tampilkan sidebar"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <path d="M9 3v18" />
                  </svg>
                </button>
                
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button onClick={exportDocx} disabled={loadingDocx} className="text-slate-700 dark:text-slate-200 hover:underline disabled:opacity-50">{loadingDocx?"Mengekspor...":"Export .docx"}</button>
            <button onClick={exportPdf} disabled={loadingPdf} className="text-slate-700 dark:text-slate-200 hover:underline disabled:opacity-50">{loadingPdf?"Mengekspor...":"Export .pdf"}</button>
            
          </div>
        </div>
        <div
          ref={editorRef}
          className="flex-1 h-0 bg-white text-slate-900 whitespace-pre-wrap p-6 outline-none rounded-xl dark:shadow-soft"
          contentEditable
          suppressContentEditableWarning
          onInput={(e: React.FormEvent<HTMLDivElement>) => { setContent(e.currentTarget.innerText); setContentSetByCode(false); }}
        />
      </div>
    </div>
  );
}
