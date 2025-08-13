"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Small overlay to show "Page X of Y" badges at the bottom of each virtual page
const PageNumberOverlay: React.FC<{
  getPagesCount: () => number;
  pageHeightPx: number;
  pageGap: number;
}> = ({ getPagesCount, pageHeightPx }) => {
  const pages = Math.max(1, getPagesCount());
  const items = Array.from({ length: pages }, (_, i) => i + 1);
  return (
    <div className="pointer-events-none absolute inset-0 page-number-overlay">
      {items.map((page) => (
        <div
          key={page}
          className="absolute text-[11px] text-slate-600 bg-white/80 dark:bg-slate-900/70 border border-slate-300 dark:border-slate-700 rounded px-2 py-0.5 shadow"
          style={{
            top: page * pageHeightPx - 22,
            right: 8,
          }}
        >
          Page {page} of {pages}
        </div>
      ))}
    </div>
  );
};

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
  const [subject, setSubject] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  type Theme = "system" | "light" | "dark";
  const [theme, setTheme] = useState<Theme>("system");
  // Toggle: when ON, AI replies are applied into the document automatically
  const [applyAiToDoc, setApplyAiToDoc] = useState<boolean>(false);
  type ApplyMode = 'revise' | 'insert';
  const [applyMode, setApplyMode] = useState<ApplyMode>('revise');
  type ApplyScope = 'selection' | 'document';
  const [applyScope, setApplyScope] = useState<ApplyScope>('selection');
  // Ribbon tabs: Home / Insert / Layout
  const [activeTab, setActiveTab] = useState<'home' | 'insert' | 'layout'>('home');
  // Multi column layout for editor surface
  const [columns, setColumns] = useState<number>(1);

  // Page layout states (MS Word-like)
  type PageSize = 'A4P' | 'A4L';
  const [pageSize, setPageSize] = useState<PageSize>('A4P');
  const [zoom, setZoom] = useState<number>(1);
  const [lineSpacing, setLineSpacing] = useState<number>(1.5);
  const [margins, setMargins] = useState<{top:number;right:number;bottom:number;left:number}>({ top: 96, right: 96, bottom: 96, left: 96 }); // px, 96px = 1in
  const [displayMode, setDisplayMode] = useState<'read' | 'print' | 'web'>('web');
  // Safety: if any legacy state sets 'print', coerce to 'web' since Print Layout is removed from UI
  useEffect(() => {
    if (displayMode === 'print') setDisplayMode('web');
  }, [displayMode]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pageGap = 32; // px gap between pages (visual only)
  const pagesRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // UI state to reflect current font family and size (in px) for the controls
  const [fontNameUI, setFontNameUI] = useState<string>("");
  const [fontSizeUI, setFontSizeUI] = useState<number>(16);
  const cssFromPx = (n?: number) => (n ? `${n}px` : undefined);

  const pageDim = useMemo(() => {
    // 96 DPI mapping
    const a4 = { w: Math.round(8.27 * 96), h: Math.round(11.69 * 96) };
    return pageSize === 'A4P' ? a4 : { w: a4.h, h: a4.w };
  }, [pageSize]);

  const pageHeightPx = useMemo(() => Math.round(pageDim.h * zoom), [pageDim.h, zoom]);
  // Height available for text per page (excluding top/bottom margins)
  const contentAreaHeightPx = useMemo(
    () => Math.round((pageDim.h - margins.top - margins.bottom) * zoom),
    [pageDim.h, margins.top, margins.bottom, zoom]
  );
  // Paddings applied to the editor surface to respect margins
  const paddingTopPx = useMemo(() => Math.round(margins.top * zoom), [margins.top, zoom]);
  const paddingBottomPx = useMemo(() => Math.round(margins.bottom * zoom), [margins.bottom, zoom]);

  // Apply columns to editable surface
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.style.columnCount = String(columns);
      editorRef.current.style.columnGap = columns > 1 ? '2rem' : '0';
    }
  }, [columns]);

  // Keep font selects in sync with current selection formatting
  useEffect(() => {
    const allowedFonts = new Set(["Arial", "Times New Roman", "Georgia", "Calibri", "Verdana", "Montserrat"]);
    const onSelChange = () => {
      try {
        const fn = (document.queryCommandValue('fontName') || '') as string;
        // Normalize font name: strip quotes and pick first family
        let normalized = fn.replace(/^\s*"|"\s*$/g, '').split(',')[0]?.trim();
        if (!allowedFonts.has(normalized)) {
          // Try title case match for common variants
          const maybe = normalized?.toLowerCase();
          if (maybe === 'times new roman') normalized = 'Times New Roman';
          else if (maybe === 'arial') normalized = 'Arial';
          else if (maybe === 'georgia') normalized = 'Georgia';
          else if (maybe === 'calibri') normalized = 'Calibri';
          else if (maybe === 'verdana') normalized = 'Verdana';
          else if (maybe === 'montserrat') normalized = 'Montserrat';
        }
        setFontNameUI(allowedFonts.has(normalized) ? normalized : "");
        // Compute px from focused node
        const sel = window.getSelection();
        let targetEl: Element | null = null;
        if (sel && sel.focusNode) {
          const node = sel.focusNode.nodeType === Node.TEXT_NODE ? sel.focusNode.parentElement : (sel.focusNode as Element);
          targetEl = node instanceof Element ? node : null;
        }
        const el = targetEl || editorRef.current;
        if (el) {
          const pxStr = getComputedStyle(el).fontSize;
          const px = parseInt(pxStr, 10);
          if (!Number.isNaN(px)) setFontSizeUI(px);
        }
      } catch {
        // ignore
      }
    };
    document.addEventListener('selectionchange', onSelChange);
    return () => document.removeEventListener('selectionchange', onSelChange);
  }, []);

  // Helpers for editing commands
  // focusEditor is defined later as a function; use that single definition to avoid duplicates.

  const execCmd = (command: string, value?: string) => {
    focusEditor();
    try {
      document.execCommand(command, false, value);
    } catch (e) {
      // noop
    }
  };

  const insertHTMLAtCursor = (html: string) => {
    focusEditor();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    range.deleteContents();
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const frag = document.createDocumentFragment();
    let node: ChildNode | null;
    let lastNode: ChildNode | null = null;
    // eslint-disable-next-line no-cond-assign
    while ((node = temp.firstChild)) {
      lastNode = frag.appendChild(node);
    }
    range.insertNode(frag);
    if (lastNode) {
      const newRange = document.createRange();
      newRange.setStartAfter(lastNode);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    }
  };

  const handleCopy = () => {
    const sel = window.getSelection();
    const text = sel?.toString() || '';
    if (text) navigator.clipboard.writeText(text);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) insertHTMLAtCursor(text.replace(/\n/g, '<br/>'));
    } catch {
      // Clipboard permission may block; fallback no-op
    }
  };

  const handleInsertPictureClick = () => fileInputRef.current?.click();
  const handleInsertPicture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    insertHTMLAtCursor(`<img src="${url}" alt="" style="max-width:100%; height:auto;"/>`);
    e.target.value = '';
  };

  const handleInsertShape = () => {
    insertHTMLAtCursor(`<div style="width:160px;height:90px;border:2px solid #64748b;border-radius:6px;background:rgba(148,163,184,0.08);"></div>`);
  };

  const handleInsertIcon = () => {
    // simple star icon SVG
    insertHTMLAtCursor(`<svg viewBox="0 0 24 24" width="20" height="20" fill="#f59e0b" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle;"><path d="M12 2l2.9 6.26L22 9.27l-5 4.87L18.2 22 12 18.77 5.8 22 7 14.14 2 9.27l7.1-1.01L12 2z"/></svg>`);
  };

  const handleInsertTable = (rows = 3, cols = 3) => {
    let html = '<table style="width:100%;border-collapse:collapse"><tbody>';
    for (let r = 0; r < rows; r++) {
      html += '<tr>';
      for (let c = 0; c < cols; c++) {
        html += '<td style="border:1px solid #cbd5e1;padding:6px;">&nbsp;</td>';
      }
      html += '</tr>';
    }
    html += '</tbody></table>';
    insertHTMLAtCursor(html);
  };

  const handleInsertChart = () => {
    // Very simple inline bar chart using SVG
    insertHTMLAtCursor(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 80" width="200" height="80" style="display:block;"><rect x="10" y="30" width="30" height="40" fill="#60a5fa"/><rect x="50" y="10" width="30" height="60" fill="#34d399"/><rect x="90" y="20" width="30" height="50" fill="#f472b6"/><rect x="130" y="35" width="30" height="35" fill="#f59e0b"/></svg>`);
  };

  // Vertical mask to clip content to top/bottom margins on each page in print layout
  const verticalPageMask = useMemo(() => {
    if (displayMode !== 'print') return undefined;
    const block = pageHeightPx + pageGap; // one page + gap
    const topWin = Math.round(margins.top * zoom);
    const winH = contentAreaHeightPx; // content height inside margins
    return `repeating-linear-gradient(to bottom, transparent 0, transparent ${topWin}px, black ${topWin}px, black ${topWin + winH}px, transparent ${topWin + winH}px, transparent ${block}px)`;
  }, [displayMode, pageHeightPx, pageGap, margins.top, zoom, contentAreaHeightPx]);

  // Render paginated view in print mode by flowing blocks across fixed-height page contents
  useEffect(() => {
    if (displayMode !== 'print') return;
    const host = pagesRef.current;
    if (!host) return;
    // Clear previous
    host.innerHTML = '';
    // Build a working fragment of current content
    const temp = document.createElement('div');
    temp.innerHTML = content || '';
    // Helper: create a new page content container
    const createPage = () => {
      const page = document.createElement('div');
      page.style.position = 'absolute';
      page.style.left = '0px';
      page.style.width = String(Math.round(pageDim.w * zoom)) + 'px';
      page.style.height = String(pageHeightPx) + 'px';
      page.style.pointerEvents = 'none'; // visual only, editing occurs in web/read
      page.style.background = 'white';
      page.style.border = '1px solid rgba(203,213,225,0.9)';
      page.style.boxShadow = '0 12px 28px rgba(0,0,0,0.18)';
      const inner = document.createElement('div');
      inner.style.position = 'absolute';
      inner.style.top = String(paddingTopPx) + 'px';
      inner.style.left = String(Math.round(margins.left * zoom)) + 'px';
      inner.style.width = String(Math.round((pageDim.w - margins.left - margins.right) * zoom)) + 'px';
      inner.style.height = String(contentAreaHeightPx) + 'px';
      inner.style.overflow = 'hidden';
      inner.style.lineHeight = String(lineSpacing);
      inner.style.fontFamily = '"Times New Roman", Times, serif';
      inner.style.fontSize = '16px';
      inner.className = 'doc-surface doc-surface-page text-slate-900';
      page.appendChild(inner);
      return { page, inner };
    };
    let pageIndex = 0;
    let { page, inner } = createPage();
    page.style.top = String(pageIndex * (pageHeightPx + pageGap)) + 'px';
    host.appendChild(page);
    // Move block-level nodes into pages
    const blocks: Node[] = Array.from(temp.childNodes);
    const fits = () => inner.scrollHeight <= inner.clientHeight + 1; // tolerance
    for (let i = 0; i < blocks.length; i++) {
      const node = blocks[i];
      inner.appendChild(node);
      // If overflow, move node to next page
      if (!fits()) {
        inner.removeChild(node);
        // Start next page
        pageIndex++;
        const next = createPage();
        next.page.style.top = String(pageIndex * (pageHeightPx + pageGap)) + 'px';
        host.appendChild(next.page);
        page = next.page; inner = next.inner;
        inner.appendChild(node);
        // If single node still overflows (very tall), try to split text nodes inside paragraphs
        if (!fits() && node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          // Only attempt for paragraphs
          if (el.tagName === 'P') {
            // Split by words to fit
            const words = el.innerText.split(/\s+/);
            const p1 = document.createElement('p');
            const p2 = document.createElement('p');
            p1.setAttribute('style', el.getAttribute('style') || '');
            p2.setAttribute('style', el.getAttribute('style') || '');
            el.replaceWith(p1); // place p1 where el was (inside inner)
            let j = 0;
            for (; j < words.length; j++) {
              p1.textContent = words.slice(0, j + 1).join(' ');
              if (!fits()) { // last word caused overflow
                p1.textContent = words.slice(0, j).join(' ');
                break;
              }
            }
            p2.textContent = words.slice(j).join(' ');
            if (p2.textContent.trim()) {
              // Add remaining to next pages as needed
              while (p2.textContent && p2.textContent.length > 0) {
                if (fits()) break;
                // If current page full, start new page
                pageIndex++;
                const more = createPage();
                more.page.style.top = String(pageIndex * (pageHeightPx + pageGap)) + 'px';
                host.appendChild(more.page);
                page = more.page; inner = more.inner;
                inner.appendChild(p2);
              }
            }
          }
        }
      }
    }
    // Update pagesCount to match created pages
    setPagesCount(host.childElementCount);
  }, [displayMode, content, pageDim.w, pageHeightPx, pageGap, zoom, margins.left, margins.right, paddingTopPx, contentAreaHeightPx, lineSpacing]);
  const snapTimeout = useRef<number | undefined>(undefined);
  const onScrollSnap = useMemo(() => {
    return () => {
      if (displayMode !== 'print') return;
      const el = scrollRef.current; if (!el) return;
      if (snapTimeout.current) window.clearTimeout(snapTimeout.current);
      snapTimeout.current = window.setTimeout(() => {
        const st = el.scrollTop;
        const page = Math.round(st / (pageHeightPx + pageGap));
        const target = page * (pageHeightPx + pageGap);
        el.scrollTo({ top: target, behavior: 'smooth' });
      }, 120);
    };
  }, [displayMode, pageHeightPx]);

  // Compute pages based on content height
  const [pagesCount, setPagesCount] = useState(1);
  const pagesTotalHeight = useMemo(() => {
    return displayMode === 'print'
      ? pagesCount * pageHeightPx + (pagesCount - 1) * pageGap
      : Math.max(pageHeightPx, editorRef.current?.scrollHeight || pageHeightPx);
  }, [displayMode, pagesCount, pageHeightPx]);
  useEffect(() => {
    if (!editorRef.current) return;
    const measure = () => {
      const el = editorRef.current;
      const h = el?.scrollHeight || pageHeightPx;
      // subtract padding top/bottom to get actual text content height
      const inner = Math.max(0, h - paddingTopPx - paddingBottomPx);
      const perPage = Math.max(1, contentAreaHeightPx);
      const pages = Math.max(1, Math.ceil(inner / perPage));
      setPagesCount(pages);
    };
    const id = window.requestAnimationFrame(measure);
    return () => window.cancelAnimationFrame(id);
  }, [content, zoom, margins, lineSpacing, pageHeightPx, displayMode, paddingTopPx, paddingBottomPx, contentAreaHeightPx]);

  // Insert a page break element that exports properly
  const insertPageBreak = () => {
    // Ensure editor is focused
    editorRef.current?.focus();
    const brHtml = '<div class="page-break" style="page-break-before: always;" contenteditable="false"></div>';
    if (document.queryCommandSupported && document.queryCommandSupported('insertHTML')) {
      document.execCommand('insertHTML', false, brHtml);
    } else {
      // Fallback: append at caret via Selection API
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const temp = document.createElement('div');
        temp.innerHTML = brHtml;
        const node = temp.firstChild as Node;
        range.insertNode(node);
      }
    }
    // sync state
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
      setContentSetByCode(false);
    }
  };

  // Ruler helpers
  const cmPx = 96 / 2.54; // pixels per cm at 96dpi
  const rulerMarks = useMemo(() => {
    const width = pageDim.w;
    const totalCm = Math.floor(width / cmPx);
    return Array.from({ length: totalCm + 1 }, (_, i) => i);
  }, [pageDim.w]);

  const plainText = useMemo(() => content.replace(/<[^>]+>/g, ""), [content]);

  async function generateAI(wordRange?: string, subjectArg?: string) {
    setLoadingGen(true);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: title, style: "ilmiah ringkas", words: wordRange, subject: subjectArg ?? subject }),
      });
      const data = await res.json();
      if (res.ok && data.content) {
        setContent((p) => (p ? p + "\n\n" : "") + data.content);
        setContentSetByCode(true);
      }
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
        body: JSON.stringify({
          title,
          content: plainText,
          contentHtml: content,
          layout: {
            pageSize,
            marginsPx: margins,
          },
        }),
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
    const words = sp.get("words") || undefined;
    const subj = sp.get("subject") || "";
    if (subj) setSubject(subj);
    const autogen = sp.get("autogen");
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
    // init applyAiToDoc from localStorage
    const storedApply = localStorage.getItem('aimakalah-apply-ai-to-doc');
    if (storedApply === 'true') setApplyAiToDoc(true);
    const storedMode = localStorage.getItem('aimakalah-apply-mode') as ApplyMode | null;
    if (storedMode === 'insert' || storedMode === 'revise') setApplyMode(storedMode);
    const storedScope = localStorage.getItem('aimakalah-apply-scope') as ApplyScope | null;
    if (storedScope === 'selection' || storedScope === 'document') setApplyScope(storedScope);

    // Auto generate on open if requested from landing page
    if (autogen) {
      void generateAI(words || undefined, subj || undefined);
    }
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
  // persist toggle
  useEffect(() => {
    localStorage.setItem('aimakalah-apply-ai-to-doc', applyAiToDoc ? 'true' : 'false');
  }, [applyAiToDoc]);
  useEffect(() => {
    localStorage.setItem('aimakalah-apply-mode', applyMode);
  }, [applyMode]);
  useEffect(() => {
    localStorage.setItem('aimakalah-apply-scope', applyScope);
  }, [applyScope]);

  // Util: escape regex
  function escapeRegExp(str: string) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Parse simple Indonesian replace intent: "ganti X menjadi Y" or "ubah X ke Y"
  function extractReplaceIntent(prompt: string): { find: string; replace: string } | null {
    const re = /(ganti|ubah)\s+\"?([^\"]+?)\"?\s+(menjadi|ke)\s+\"?([^\"]+?)\"?$/i;
    const m = prompt.trim().match(re);
    if (!m) return null;
    const find = m[2].trim();
    const rep = m[4].trim();
    if (!find || !rep) return null;
    return { find, replace: rep };
  }

  // Replace across text nodes inside editor (document scope), case-sensitive by default
  function replaceAllInEditor(find: string, rep: string) {
    const root = editorRef.current; if (!root) return 0;
    const rx = new RegExp(escapeRegExp(find), 'g');
    let count = 0;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const textNodes: Text[] = [];
    let n: Node | null;
    while ((n = walker.nextNode())) {
      if (n.nodeType === Node.TEXT_NODE && n.nodeValue && n.nodeValue.includes(find)) {
        textNodes.push(n as Text);
      }
    }
    for (const tn of textNodes) {
      const before = tn.nodeValue || '';
      const after = before.replace(rx, (match) => { count++; return rep; });
      if (after !== before) tn.nodeValue = after;
    }
    return count;
  }

  // Selection helpers to provide AI with context of what to edit
  function getEditorSelectionInfo(): { within: boolean; html?: string; text?: string } {
    const el = editorRef.current; if (!el) return { within: false };
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return { within: false };
    const range = sel.getRangeAt(0);
    // Verify selection is inside editor
    const container = range.commonAncestorContainer as Node;
    const within = el.contains(container.nodeType === 1 ? container as Element : container.parentElement as Element);
    if (!within) return { within: false };
    const temp = document.createElement('div');
    temp.appendChild(range.cloneContents());
    const html = temp.innerHTML;
    const text = sel.toString();
    return { within: true, html, text };
  }

  // Print CSS: ensure print preview matches on-screen layout
  function pxToIn(px: number) { return px / 96; }
  useEffect(() => {
    const id = 'aimakalah-print-style';
    let styleEl = document.getElementById(id) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = id;
      document.head.appendChild(styleEl);
    }
    const orient = pageSize === 'A4P' ? 'portrait' : 'landscape';
    const t = pxToIn(margins.top).toFixed(3);
    const r = pxToIn(margins.right).toFixed(3);
    const b = pxToIn(margins.bottom).toFixed(3);
    const l = pxToIn(margins.left).toFixed(3);
    styleEl.textContent = `
      @page { size: A4 ${orient}; margin: ${t}in ${r}in ${b}in ${l}in; }
      @media print {
        :root { color-scheme: light; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        aside, .print-hide { display: none !important; }
        .page-number-overlay, .page-frames, .page-masks { display: none !important; }
        .doc-surface { box-shadow: none !important; background: white !important; padding: 0 !important; width: auto !important; min-height: auto !important; }
      }
    `;
    return () => { /* keep style for next prints */ };
  }, [pageSize, margins.top, margins.right, margins.bottom, margins.left]);

  // Push state content into contentEditable when it was set programmatically (workflow/AI)
  function mdToHtmlBasic(md: string): string {
    // Normalize line endings
    const text = md.replace(/\r\n/g, '\n');
    const lines = text.split('\n');
    const out: string[] = [];
    let inUL = false; let inOL = false;
    const closeLists = () => {
      if (inUL) { out.push('</ul>'); inUL = false; }
      if (inOL) { out.push('</ol>'); inOL = false; }
    };
    const strong = (s: string) => s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    const em = (s: string) => s.replace(/(^|[^*])\*(?!\*)([^*]+)\*(?!\*)/g, '$1<em>$2</em>').replace(/(^|[^_])_([^_]+)_/g, '$1<em>$2</em>');
    const codeInline = (s: string) => s.replace(/`([^`]+)`/g, '<code>$1</code>');
    const link = (s: string) => s.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    const transformInline = (s: string) => link(codeInline(em(strong(s))));

    for (const raw of lines) {
      const line = raw.trimEnd();
      if (!line.trim()) { closeLists(); out.push('<br/>'); continue; }
      // Headings
      const h = /^(#{1,6})\s+(.*)$/.exec(line);
      if (h) {
        closeLists();
        const lvl = h[1].length; const body = transformInline(h[2]);
        out.push(`<h${lvl}>${body}</h${lvl}>`);
        continue;
      }
      // Blockquote
      const bq = /^>\s?(.*)$/.exec(line);
      if (bq) { closeLists(); out.push(`<blockquote>${transformInline(bq[1])}</blockquote>`); continue; }
      // Ordered list
      if (/^\d+\.\s+/.test(line)) {
        if (!inOL) { closeLists(); out.push('<ol>'); inOL = true; }
        out.push(`<li>${transformInline(line.replace(/^\d+\.\s+/, ''))}</li>`);
        continue;
      }
      // Unordered list
      if (/^[-*+]\s+/.test(line)) {
        if (!inUL) { closeLists(); out.push('<ul>'); inUL = true; }
        out.push(`<li>${transformInline(line.replace(/^[-*+]\s+/, ''))}</li>`);
        continue;
      }
      // Paragraph
      closeLists();
      out.push(`<p>${transformInline(line)}</p>`);
    }
    closeLists();
    return out.join('\n');
  }

  useEffect(() => {
    if (contentSetByCode && editorRef.current) {
      // When content is set by code, render as HTML.
      // If it looks like Markdown/plain text, convert to basic HTML first.
      const looksHtml = /<\w+[^>]*>[\s\S]*<\/\w+>|<br\s*\/?\s*>/i.test(content);
      const html = looksHtml ? content : mdToHtmlBasic(content);
      editorRef.current.innerHTML = html;
      setContentSetByCode(false);
    }
  }, [content, contentSetByCode]);

  // Formatting helpers for the contentEditable editor
  function focusEditor() {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
  }

  function exec(cmd: string, value?: string) {
    focusEditor();
    try {
      // Using deprecated but broadly supported execCommand for quick RTE controls
      document.execCommand(cmd, false, value);
    } catch {
      // no-op
    }
  }

  function toggleBold() { exec('bold'); }
  function toggleItalic() { exec('italic'); }
  function toggleUnderline() { exec('underline'); }
  function makeH(level: 1 | 2 | 3) { exec('formatBlock', `H${level}`); }
  function makeParagraph() { exec('formatBlock', 'P'); }
  function makeBullets() { exec('insertUnorderedList'); }
  function makeNumbers() { exec('insertOrderedList'); }
  function makeQuote() { exec('formatBlock', 'BLOCKQUOTE'); }
  function createLink() {
    const url = prompt('Masukkan URL');
    if (!url) return;
    exec('createLink', url);
  }
  function clearFormatting() { exec('removeFormat'); makeParagraph(); }

  // Additional MS Word-like features
  function toggleStrike() { exec('strikeThrough'); }
  function toggleSubscript() { exec('subscript'); }
  function toggleSuperscript() { exec('superscript'); }
  function alignLeft() { exec('justifyLeft'); }
  function alignCenter() { exec('justifyCenter'); }
  function alignRight() { exec('justifyRight'); }
  function alignJustify() { exec('justifyFull'); }
  function indent() { exec('indent'); }
  function outdent() { exec('outdent'); }
  function undo() { exec('undo'); }
  function redo() { exec('redo'); }
  function setTextColor(color: string) { exec('foreColor', color); }
  function setHighlight(color: string) { exec('hiliteColor', color); }
  function setFontSizePx(px: number) {
    focusEditor();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    // Try to wrap selection with a span and apply px size
    const span = document.createElement('span');
    span.style.fontSize = `${px}px`;
    try {
      if (!range.collapsed) {
        range.surroundContents(span);
        // Move caret to end of span
        sel.removeAllRanges();
        const newRange = document.createRange();
        newRange.selectNodeContents(span);
        newRange.collapse(false);
        sel.addRange(newRange);
      } else {
        // Collapsed caret: insert an empty span that will affect subsequent typing
        span.innerHTML = '\u200B';
        range.insertNode(span);
        // Place caret inside the span after the ZWSP
        sel.removeAllRanges();
        const newRange = document.createRange();
        newRange.setStart(span.firstChild || span, 1);
        newRange.collapse(true);
        sel.addRange(newRange);
      }
      setFontSizeUI(px);
    } catch {
      // Fallback: replace selection with styled span HTML
      if (!range.collapsed) {
        const text = range.toString();
        document.execCommand('insertHTML', false, `<span style="font-size:${px}px">${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>`);
        setFontSizeUI(px);
      }
    }
  }
  function setFontName(name: string) { exec('fontName', name); setFontNameUI(name); }

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
    const selInfo = getEditorSelectionInfo();
    const nextMsgs: ChatMsg[] = [...chatMessages, { role: "user", content: prompt, meta: { createdAt: Date.now() } }];
    setChatMessages(nextMsgs);
    setChatInput("");
    setSending(true);
    try {
      const startedAt = Date.now();
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMsgs,
          context: plainText,
          topic: title,
          selectionText: selInfo.within ? selInfo.text : undefined,
          selectionHtml: selInfo.within ? selInfo.html : undefined,
          intent: applyAiToDoc ? (applyMode === 'revise' ? 'revise' : 'insert') : 'chat_only',
          applyMode,
          applyScope,
        }),
      });
      const data: { message?: string; error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error || "Chat gagal");
      const endedAt = Date.now();
      const reply: ChatMsg = { role: "assistant", content: data.message || "", meta: { startedAt, endedAt, createdAt: endedAt } };
      setChatMessages((prev) => [...prev, reply]);
      // Auto-apply AI reply into the document when toggled ON
      if (applyAiToDoc && reply.content) {
        // If scope is document and user asked for a replacement, do a global replace
        if (applyScope === 'document') {
          const intent = extractReplaceIntent(prompt);
          if (intent) {
            const applied = replaceAllInEditor(intent.find, intent.replace);
            if (applied > 0) {
              const elNow = editorRef.current;
              if (elNow) {
                setContent(elNow.innerHTML);
                setContentSetByCode(false);
              }
              return; // Skip inserting the reply text, since we already applied the change
            }
          }
        }
        const el = editorRef.current;
        if (el) {
          // Convert markdown/plain to HTML blocks
          const html = mdToHtmlBasic(reply.content);
          // Ensure editor focused and selection inside editor
          el.focus();
          const sel = window.getSelection();
          const canExec = typeof (document as any).execCommand === 'function' && document.queryCommandSupported && document.queryCommandSupported('insertHTML');
          if (canExec) {
            // Insert mode: do not replace selection; collapse to end then insert
            if (sel && sel.rangeCount > 0 && applyMode === 'insert') {
              const r = sel.getRangeAt(0).cloneRange();
              r.collapse(false);
              sel.removeAllRanges();
              sel.addRange(r);
            }
            document.execCommand('insertHTML', false, html + '\n');
          } else {
            if (sel && sel.rangeCount > 0) {
              const range = sel.getRangeAt(0);
              if (applyMode === 'insert') {
                range.collapse(false);
              } else {
                range.deleteContents();
              }
              const temp = document.createElement('div');
              temp.innerHTML = html;
              const frag = document.createDocumentFragment();
              while (temp.firstChild) frag.appendChild(temp.firstChild);
              range.insertNode(frag);
            } else {
              el.innerHTML = (el.innerHTML ? el.innerHTML + '\n' : '') + html;
            }
          }
          // Sync state after DOM mutation
          setContent(el.innerHTML);
          setContentSetByCode(false);
        }
      }
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
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="28" height="28" className="inline-block mr-1">
                <circle cx="100" cy="100" r="72" fill="#0A1931"/>
                <circle cx="100" cy="100" r="48" fill="#1DA1F2"/>
                <circle cx="100" cy="100" r="26" fill="#081226"/>
                <circle cx="110" cy="90" r="6" fill="#fff" opacity="0.9"/>
                <path d="M60 160 L140 160" stroke="#081226" strokeWidth="8" strokeLinecap="round" opacity="0.2"/>
              </svg>
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
                      <div className="inline-block max-w-[92%] text-sm leading-relaxed px-3 py-1.5 text-slate-700 dark:text-slate-300 prose prose-slate dark:prose-invert prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0 prose-code:px-1 prose-code:py-0.5 prose-pre:my-2">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            strong: (props) => <strong className="font-semibold" {...props} />,
                            em: (props) => <em className="italic" {...props} />,
                            p: (props) => <p className="my-2" {...props} />,
                            ul: (props) => <ul className="list-disc pl-5 my-2" {...props} />,
                            ol: (props) => <ol className="list-decimal pl-5 my-2" {...props} />,
                            li: (props) => <li className="my-0" {...props} />,
                            a: ({ href, children, ...rest }) => (
                              <a href={href} target="_blank" rel="noopener noreferrer" className="text-sky-600 dark:text-sky-400 underline" {...rest}>
                                {children}
                              </a>
                            ),
                            code(rawProps: any) {
                              const { inline, className, children, ...props } = rawProps || {};
                              const match = /language-(\w+)/.exec(className || "");
                              if (inline) {
                                return (
                                  <code className="bg-slate-100 dark:bg-slate-800 rounded px-1 py-0.5" {...props}>
                                    {children}
                                  </code>
                                );
                              }
                              return (
                                <pre className="bg-slate-950/90 text-slate-100 rounded-lg p-3 overflow-auto">
                                  <code className={match ? `language-${match[1]}` : undefined} {...props}>
                                    {children}
                                  </code>
                                </pre>
                              );
                            },
                          }}
                        >
                          {m.content}
                        </ReactMarkdown>
                      </div>
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
        className="h-12 w-12 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 grid place-items-center text-xl font-medium transition-transform duration-150 active:scale-95 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
        title="Prompt baru"
        aria-label="Prompt baru"
      >
        +
      </button>
      <button
        className="px-4 h-12 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 transition-transform duration-150 active:scale-95 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
        title="Edit"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V6a2 2 0 0 1 2-2h2M20 8V6a2 2 0 0 0-2-2h-2M4 16v2a2 2 0 0 0 2 2h2M20 16v2a2 2 0 0 1-2 2h-2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l4 4-6 2 2-6Z" />
        </svg>
        <span className="text-base">Edit</span>
      </button>
    </div>
            <div className="flex items-center ml-auto gap-2">
              <button
                type="button"
                onClick={() => setApplyAiToDoc(v => !v)}
                className={
                  `px-3 h-8 rounded-full border flex items-center gap-1 transition-colors ` +
                  (applyAiToDoc
                    ? 'bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-600/20 dark:border-yellow-700 dark:text-yellow-200'
                    : 'border-slate-200 dark:border-white/20 text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5')
                }
                title={applyAiToDoc ? 'Auto-apply ON: AI akan langsung menerapkan ke naskah' : 'Auto-apply OFF: hanya chat dengan AI'}
                aria-pressed={applyAiToDoc}
                aria-label="Toggle auto-apply AI to document"
              >
                <span>💡</span>
                <span className="text-sm">Chat</span>
              </button>
              <select
                className="px-2 h-8 rounded-full border border-slate-200 dark:border-white/20 bg-transparent text-xs text-slate-700 dark:text-slate-200 focus:text-white dark:focus:text-white focus:bg-slate-900 dark:focus:bg-slate-800 focus:border-slate-900 dark:focus:border-white/60"
                title="Mode penerapan AI"
                value={applyMode}
                onChange={(e)=> setApplyMode(e.target.value as ApplyMode)}
              >
                <option value="revise">Revisi seleksi</option>
                <option value="insert">Sisip di kursor</option>
              </select>
              <select
                className="px-2 h-8 rounded-full border border-slate-200 dark:border-white/20 bg-transparent text-xs text-slate-700 dark:text-slate-200 focus:text-slate-900"
                title="Cakupan penerapan AI"
                value={applyScope}
                onChange={(e)=> setApplyScope(e.target.value as ApplyScope)}
              >
                <option value="selection">Seleksi saja</option>
                <option value="document">Seluruh dokumen</option>
              </select>
            </div>
          </div>
        </div>
      </aside>

      {/* Right Editor Pane */}
      <div className="relative rounded-none border border-l-0 border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 h-screen flex flex-col overflow-hidden">
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
            {/* Layout controls */}
            <span className="hidden md:inline-block text-slate-400">|</span>
            <select className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-transparent focus:text-white dark:focus:text-white focus:bg-slate-900 dark:focus:bg-slate-800 focus:border-slate-900 dark:focus:border-white/60"
              title="Ukuran Kertas" value={pageSize} onChange={(e)=>setPageSize(e.target.value as PageSize)}>
              <option value="A4P">A4 Portrait</option>
              <option value="A4L">A4 Landscape</option>
            </select>
            
            
            <button type="button" onClick={insertPageBreak} title="Sisipkan Page Break" className="px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10">Page Break</button>
          </div>
        </div>
        {/* Ribbon tabs */}
        <div className="px-4 pb-1 pt-0">
          {/* Tab headers */}
          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              onClick={() => setActiveTab('home')}
              className={`px-3 py-1.5 rounded ${activeTab==='home' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'hover:bg-black/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200'}`}
            >Home</button>
            <button
              type="button"
              onClick={() => setActiveTab('insert')}
              className={`px-3 py-1.5 rounded ${activeTab==='insert' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'hover:bg-black/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200'}`}
            >Insert</button>
            <button
              type="button"
              onClick={() => setActiveTab('layout')}
              className={`px-3 py-1.5 rounded ${activeTab==='layout' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'hover:bg-black/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200'}`}
            >Layout</button>
          </div>
          {/* Tab content */}
          {activeTab === 'home' && (
            <div className="flex flex-wrap items-center gap-1 text-slate-700 dark:text-slate-200">
              <button type="button" onClick={toggleBold} title="Tebal (Ctrl+B)" aria-label="Tebal" className="px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10">B</button>
              <button type="button" onClick={toggleItalic} title="Miring (Ctrl+I)" aria-label="Miring" className="px-2 py-1 rounded italic hover:bg-black/5 dark:hover:bg-white/10">I</button>
              <button type="button" onClick={toggleUnderline} title="Garis bawah (Ctrl+U)" aria-label="Garis bawah" className="px-2 py-1 rounded underline hover:bg-black/5 dark:hover:bg-white/10">U</button>
              <button type="button" onClick={toggleStrike} title="Coret" aria-label="Coret" className="px-2 py-1 rounded line-through hover:bg-black/5 dark:hover:bg-white/10">S</button>
              <button type="button" onClick={toggleSubscript} title="Subscript" aria-label="Subscript" className="px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10">x<sub>2</sub></button>
              <button type="button" onClick={toggleSuperscript} title="Superscript" aria-label="Superscript" className="px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10">x<sup>2</sup></button>
              <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />
              <button type="button" onClick={() => makeH(1)} title="Heading 1" aria-label="Heading 1" className="px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10">H1</button>
              <button type="button" onClick={() => makeH(2)} title="Heading 2" aria-label="Heading 2" className="px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10">H2</button>
              <button type="button" onClick={() => makeH(3)} title="Heading 3" aria-label="Heading 3" className="px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10">H3</button>
              <button type="button" onClick={makeParagraph} title="Paragraf" aria-label="Paragraf" className="px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10">P</button>
              <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />
              <button type="button" onClick={makeBullets} title="List bullet" aria-label="List bullet" className="px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10">• List</button>
              <button type="button" onClick={makeNumbers} title="List bernomor" aria-label="List bernomor" className="px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10">1. List</button>
              <button type="button" onClick={makeQuote} title="Kutipan" aria-label="Kutipan" className="px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10">“ Quote”</button>
              <button type="button" onClick={createLink} title="Sisipkan tautan" aria-label="Sisipkan tautan" className="px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10">Link</button>
              <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />
              <button type="button" onClick={clearFormatting} title="Bersihkan format" aria-label="Bersihkan format" className="px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10">Clear</button>
              <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />
              <button type="button" onClick={alignLeft} title="Rata kiri" aria-label="Rata kiri" className="px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10">⟸</button>
              <button type="button" onClick={alignCenter} title="Tengah" aria-label="Tengah" className="px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10">⇔</button>
              <button type="button" onClick={alignRight} title="Rata kanan" aria-label="Rata kanan" className="px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10">⟹</button>
              <button type="button" onClick={alignJustify} title="Rata kiri-kanan" aria-label="Rata kiri-kanan" className="px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10">≋</button>
              <button type="button" onClick={outdent} title="Outdent" aria-label="Outdent" className="px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10">Out</button>
              <button type="button" onClick={indent} title="Indent" aria-label="Indent" className="px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10">In</button>
              <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />
              {/* Print icon near font */}
              <button type="button" onClick={() => window.print()} title="Print" aria-label="Print" className="px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M6 9V2h12v7" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 14h12v8H6z" /></svg>
              </button>
              <select
                className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-transparent focus:text-white dark:focus:text-white focus:bg-slate-900 dark:focus:bg-slate-800 focus:border-slate-900 dark:focus:border-white/60"
                title="Font"
                value={fontNameUI}
                onChange={(e) => setFontName(e.target.value)}
                style={{ fontFamily: fontNameUI || undefined, fontSize: cssFromPx(fontSizeUI) }}
              >
                <option value="" disabled>Pilih font</option>
                <option value="Arial">Arial</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Georgia">Georgia</option>
                <option value="Calibri">Calibri</option>
                <option value="Verdana">Verdana</option>
                <option value="Montserrat">Montserrat</option>
              </select>
              <select
                className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-transparent focus:text-white dark:focus:text-white focus:bg-slate-900 dark:focus:bg-slate-800 focus:border-slate-900 dark:focus:border-white/60"
                title="Ukuran font"
                value={String(fontSizeUI)}
                onChange={(e) => setFontSizePx(Number(e.target.value))}
                style={{ fontFamily: fontNameUI || undefined, fontSize: cssFromPx(fontSizeUI) }}
              >
                <option value="" disabled>Ukuran</option>
                <option value="8">8</option>
                <option value="9">9</option>
                <option value="10">10</option>
                <option value="11">11</option>
                <option value="12">12</option>
                <option value="14">14</option>
                <option value="16">16</option>
                <option value="18">18</option>
                <option value="20">20</option>
                <option value="24">24</option>
                <option value="26">26</option>
                <option value="28">28</option>
                <option value="36">36</option>
                <option value="48">48</option>
                <option value="72">72</option>
              </select>
              <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />
              <label className="px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer" title="Warna teks">
                Teks
                <input type="color" onChange={(e) => setTextColor(e.target.value)} className="ml-2 align-middle h-5 w-8 p-0 border-0 bg-transparent" />
              </label>
              <label className="px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer" title="Highlight">
                Highlight
                <input type="color" onChange={(e) => setHighlight(e.target.value)} className="ml-2 align-middle h-5 w-8 p-0 border-0 bg-transparent" />
              </label>
              <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />
              <button type="button" onClick={handleCopy} title="Salin" aria-label="Salin" className="px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10">Copy</button>
              <button type="button" onClick={() => void handlePaste()} title="Tempel" aria-label="Tempel" className="px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10">Paste</button>
              <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />
              <button type="button" onClick={undo} title="Undo" aria-label="Undo" className="px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10">Undo</button>
              <button type="button" onClick={redo} title="Redo" aria-label="Redo" className="px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10">Redo</button>
            </div>
          )}
          {activeTab === 'insert' && (
            <div className="flex flex-wrap items-center gap-2 text-slate-700 dark:text-slate-200">
              <button type="button" onClick={handleInsertPictureClick} className="px-3 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10">Gambar…</button>
              <button type="button" onClick={handleInsertShape} className="px-3 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10">Bentuk</button>
              <button type="button" onClick={handleInsertIcon} className="px-3 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10">Ikon</button>
              <button type="button" onClick={() => handleInsertTable(3,3)} className="px-3 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10">Tabel 3x3</button>
              <button type="button" onClick={handleInsertChart} className="px-3 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10">Chart</button>
              {/* Hidden file input for image */}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleInsertPicture} />
            </div>
          )}
          {activeTab === 'layout' && (
            <div className="flex flex-wrap items-center gap-2 text-slate-700 dark:text-slate-200">
              <select className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-transparent" title="Ukuran Kertas" value={pageSize} onChange={(e)=>setPageSize(e.target.value as PageSize)}>
                <option value="A4P">A4 Portrait</option>
                <option value="A4L">A4 Landscape</option>
              </select>
              <select className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-transparent" title="Margin" onChange={(e)=>{
                const v = e.target.value;
                if (v==='normal') setMargins({top:96,right:96,bottom:96,left:96});
                else if (v==='narrow') setMargins({top:48,right:48,bottom:48,left:48});
                else if (v==='wide') setMargins({top:144,right:144,bottom:144,left:144});
              }} defaultValue="normal">
                <option value="normal">Margin Normal</option>
                <option value="narrow">Margin Sempit</option>
                <option value="wide">Margin Lebar</option>
              </select>
              <select className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-transparent" title="Spasi Baris" value={String(lineSpacing)} onChange={(e)=>setLineSpacing(Number(e.target.value))}>
                <option value="1">1.0</option>
                <option value="1.15">1.15</option>
                <option value="1.5">1.5</option>
                <option value="2">2.0</option>
              </select>
              <select className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-transparent" title="Kolom" value={String(columns)} onChange={(e)=> setColumns(Number(e.target.value))}>
                <option value="1">1 kolom</option>
                <option value="2">2 kolom</option>
                <option value="3">3 kolom</option>
              </select>
              <button type="button" onClick={insertPageBreak} className="px-3 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10">Page Break</button>
            </div>
          )}
        </div>
        {/* Ruler (non-scroll) */}
        <div className="px-4 py-1 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
          <div className="w-full grid place-items-center">
            <div
              className="relative select-none text-[10px] text-slate-500 dark:text-slate-400"
              style={{ width: Math.round(pageDim.w * zoom) }}
            >
              <div className="h-7 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 rounded border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="relative h-full">
                  {rulerMarks.map((cm) => {
                    const left = Math.round(cm * cmPx * zoom);
                    const isMajor = cm % 5 === 0;
                    const height = isMajor ? 16 : 10;
                    return (
                      <div key={cm} className="absolute bottom-0" style={{ left }}>
                        <div className="w-px bg-slate-300 dark:bg-slate-700" style={{ height }} />
                        {isMajor && (
                          <div className="absolute -bottom-5 -translate-x-1/2">{cm}</div>
                        )}
                      </div>
                    );
                  })}
                  {/* Margin guides */}
                  <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: Math.round(margins.left * zoom) }}>
                    <div className="w-0.5 h-full bg-sky-300/50" />
                  </div>
                  <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: Math.round((pageDim.w - margins.right) * zoom) }}>
                    <div className="w-0.5 h-full bg-sky-300/50" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Paper canvas (only this scrolls) */}
        <div
          ref={scrollRef}
          className="flex-1 h-0 overflow-auto py-6 nice-scroll"
          style={displayMode === 'print' ? { background: '#eef2f7' } : undefined}
        >
          <div className="w-full grid place-items-center">
            <div className="relative" style={{ width: Math.round(pageDim.w * zoom), height: pagesTotalHeight }}>
              {/* Page frames (visual pages) */}
              {displayMode === 'print' && (
                <div className="absolute inset-0 z-0 page-frames pointer-events-none" style={{ display: 'none' }}>
                  {Array.from({ length: pagesCount }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-sm bg-white"
                      style={{
                        position: 'absolute',
                        top: i * (pageHeightPx + pageGap),
                        left: 0,
                        width: Math.round(pageDim.w * zoom),
                        height: pageHeightPx,
                        boxShadow: '0 12px 28px rgba(0,0,0,0.18)',
                        border: '1px solid rgba(203,213,225,0.9)'
                      }}
                    />
                  ))}
                  {/* Top margin masks */}
                  {Array.from({ length: pagesCount }).map((_, i) => (
                    <div
                      key={`tm-${i}`}
                      className="pointer-events-none page-masks"
                      style={{
                        position: 'absolute',
                        left: Math.round(margins.left * zoom),
                        width: Math.round((pageDim.w - margins.left - margins.right) * zoom),
                        top: i * (pageHeightPx + pageGap),
                        height: Math.round(margins.top * zoom) + 2,
                        background: 'white',
                        zIndex: 60,
                      }}
                    />
                  ))}
                  {/* Bottom margin masks */}
                  {Array.from({ length: pagesCount }).map((_, i) => (
                    <div
                      key={`bm-${i}`}
                      className="pointer-events-none page-masks"
                      style={{
                        position: 'absolute',
                        left: Math.round(margins.left * zoom),
                        width: Math.round((pageDim.w - margins.left - margins.right) * zoom),
                        top: i * (pageHeightPx + pageGap) + Math.round((pageDim.h - margins.bottom) * zoom),
                        height: Math.round(margins.bottom * zoom) + 2,
                        background: 'white',
                        zIndex: 60,
                      }}
                    />
                  ))}
                  {/* Left margin masks */}
                  {Array.from({ length: pagesCount }).map((_, i) => (
                    <div
                      key={`lm-${i}`}
                      className="pointer-events-none page-masks"
                      style={{
                        position: 'absolute',
                        left: 0,
                        width: Math.round(margins.left * zoom) + 2,
                        top: i * (pageHeightPx + pageGap),
                        height: pageHeightPx,
                        background: 'white',
                        zIndex: 60,
                      }}
                    />
                  ))}
                  {/* Right margin masks */}
                  {Array.from({ length: pagesCount }).map((_, i) => (
                    <div
                      key={`rm-${i}`}
                      className="pointer-events-none page-masks"
                      style={{
                        position: 'absolute',
                        left: Math.round((pageDim.w - margins.right) * zoom) - 2,
                        width: Math.round(margins.right * zoom) + 2,
                        top: i * (pageHeightPx + pageGap),
                        height: pageHeightPx,
                        background: 'white',
                        zIndex: 60,
                      }}
                    />
                  ))}
                  {/* Gap masks between pages to fully hide flowing text */}
                  {Array.from({ length: Math.max(0, pagesCount - 1) }).map((_, i) => (
                    <div
                      key={`gap-${i}`}
                      className="pointer-events-none page-masks"
                      style={{
                        position: 'absolute',
                        left: 0,
                        width: Math.round(pageDim.w * zoom),
                        top: (i + 1) * pageHeightPx + i * pageGap,
                        height: pageGap,
                        background: '#eef2f7',
                        zIndex: 65,
                      }}
                    />
                  ))}
                </div>
              )}
              {/* Paginated rendered content in print mode */}
              <div
                ref={pagesRef}
                aria-hidden={displayMode !== 'print'}
                className="doc-pages-render"
                style={{
                  display: displayMode === 'print' ? 'block' : 'none',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  zIndex: 10,
                  width: Math.round(pageDim.w * zoom),
                  minHeight: pagesTotalHeight,
                }}
              />

              {/* Editable surface (hidden in print mode) */}
              <div
                ref={editorRef}
                className="outline-none rounded-sm doc-surface text-slate-900"
                style={{
                  display: displayMode === 'print' ? 'none' : 'block',
                  position: displayMode === 'print' ? 'absolute' : 'relative',
                  top: 0,
                  left: 0,
                  zIndex: 10,
                  width: Math.round(pageDim.w * zoom),
                  minHeight: displayMode === 'print' ? pageHeightPx : pageHeightPx,
                  paddingTop: paddingTopPx,
                  paddingRight: Math.round(margins.right * zoom),
                  paddingBottom: paddingBottomPx,
                  paddingLeft: Math.round(margins.left * zoom),
                  lineHeight: String(lineSpacing),
                  fontFamily: '\"Times New Roman\", Times, serif',
                  fontSize: '16px',
                  whiteSpace: 'normal',
                  overflowWrap: 'break-word',
                  wordBreak: 'break-word',
                  overflow: 'visible',
                  WebkitMaskImage: undefined as any,
                  maskImage: undefined as any,
                  background: displayMode === 'print' ? 'transparent' : 'white',
                  boxShadow: displayMode === 'print' ? 'none' : '0 10px 30px rgba(0,0,0,0.15)',
                }}
                contentEditable={displayMode !== 'read'}
                suppressContentEditableWarning
                onInput={(e: React.FormEvent<HTMLDivElement>) => { setContent(e.currentTarget.innerHTML); setContentSetByCode(false); }}
              />

              {/* Page number overlay in paged mode */}
              {displayMode === 'print' && (
                <PageNumberOverlay
                  getPagesCount={() => pagesCount}
                  pageHeightPx={pageHeightPx}
                  pageGap={pageGap}
                />
              )}
            </div>
            {/* Ensure media fits page width */}
            <style jsx global>{`
              .doc-surface img { max-width: 100% !important; height: auto; }
              .doc-surface table { width: 100%; table-layout: fixed; }
              .doc-surface table, .doc-surface th, .doc-surface td { border-collapse: collapse; }
              .doc-surface pre { white-space: pre-wrap; word-wrap: break-word; }
              .doc-surface code { white-space: pre-wrap; }
              .doc-surface .page-break { border-top: 2px dashed rgba(100,116,139,0.5); margin: 16px 0; height: 0; }
              @media print {
                .doc-surface .page-break { break-before: page; border: 0; margin: 0; height: 0; }
              }
            `}</style>
          </div>
        </div>
        {/* Footer bar for view mode (inside editor area) */}
        <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2 py-1 flex items-center justify-end gap-3 text-xs">
          <select className="px-2 h-7 rounded border border-slate-200 dark:border-slate-700 bg-transparent text-xs text-slate-700 dark:text-slate-200 focus:text-white dark:focus:text-white focus:bg-slate-900 dark:focus:bg-slate-800 focus:border-slate-900 dark:focus:border-white/60"
            title="Margin" onChange={(e)=>{
              const v = e.target.value;
              if (v==='normal') setMargins({top:96,right:96,bottom:96,left:96});
              else if (v==='narrow') setMargins({top:48,right:48,bottom:48,left:48});
              else if (v==='wide') setMargins({top:144,right:144,bottom:144,left:144});
            }} defaultValue="normal">
            <option value="normal">Margin Normal</option>
            <option value="narrow">Margin Sempit</option>
            <option value="wide">Margin Lebar</option>
          </select>
          <select className="px-2 h-7 rounded border border-slate-200 dark:border-slate-700 bg-transparent text-xs text-slate-700 dark:text-slate-200 focus:text-white dark:focus:text-white focus:bg-slate-900 dark:focus:bg-slate-800 focus:border-slate-900 dark:focus:border-white/60"
            title="Line Spacing" value={String(lineSpacing)} onChange={(e)=>setLineSpacing(Number(e.target.value))}>
            <option value="1">1.0</option>
            <option value="1.15">1.15</option>
            <option value="1.5">1.5</option>
            <option value="2">2.0</option>
          </select>
          
          <select className="px-2 h-7 rounded border border-slate-200 dark:border-slate-700 bg-transparent text-xs text-slate-700 dark:text-slate-200 focus:text-white dark:focus:text-white focus:bg-slate-900 dark:focus:bg-slate-800 focus:border-slate-900 dark:focus:border-white/60"
            title="Zoom" value={zoom} onChange={(e) => setZoom(Number(e.target.value))}>
            <option value="0.75">75%</option>
            <option value="1">100%</option>
            <option value="1.25">125%</option>
            <option value="1.5">150%</option>
          </select>
          <button
            type="button"
            onClick={() => setDisplayMode('read')}
            title="Read Mode"
            aria-pressed={displayMode === 'read'}
            className={`inline-flex items-center gap-1 px-1 h-7 bg-transparent border-0 rounded-none text-xs transition-colors ${displayMode === 'read' ? 'text-slate-900 dark:text-white font-semibold' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
              <path d="M3 4.75A2.75 2.75 0 0 1 5.75 2h4.5A2.75 2.75 0 0 1 13 4.75V21a.75.75 0 0 1-1.2.6l-1.8-1.35-1.8 1.35A.75.75 0 0 1 7 21V4.75C7 3.784 6.216 3 5.25 3S3.5 3.784 3.5 4.75V20a1 1 0 0 1-1-1V4.75Z" />
              <path d="M13 4.75A2.75 2.75 0 0 1 15.75 2h4.5A2.75 2.75 0 0 1 23 4.75V19a1 1 0 0 1-1 1V4.75C22 3.784 21.216 3 20.25 3S19 3.784 19 4.75V21a.75.75 0 0 1-1.2.6L16 20.25l-1.8 1.35A.75.75 0 0 1 13 21V4.75Z"/>
            </svg>
            <span>Read</span>
          </button>
          <button
            type="button"
            onClick={() => setDisplayMode('web')}
            title="Web Layout"
            aria-pressed={displayMode === 'web'}
            className={`inline-flex items-center gap-1 px-1 h-7 bg-transparent border-0 rounded-none text-xs transition-colors ${displayMode === 'web' ? 'text-slate-900 dark:text-white font-semibold' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21c4.971 0 9-4.029 9-9s-4.029-9-9-9-9 4.029-9 9 4.029 9 9 9Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M12 3c2.5 2.8 4 6 4 9s-1.5 6.2-4 9c-2.5-2.8-4-6-4-9s1.5-6.2 4-9Z" />
            </svg>
            <span>Web</span>
          </button>
        </div>
      </div>
    </div>
  );
}
