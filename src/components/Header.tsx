"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-50 transition-all ${scrolled ? "backdrop-blur bg-black/40 border-b border-white/10" : "bg-transparent"}`}>
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 text-white font-bold">
          <span className="inline-grid place-items-center w-8 h-8 rounded-lg bg-[#1DA1F2]">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="32" height="32">
              <circle cx="100" cy="100" r="72" fill="#0A1931"/>
              <circle cx="100" cy="100" r="48" fill="#1DA1F2"/>
              <circle cx="100" cy="100" r="26" fill="#081226"/>
              <circle cx="110" cy="90" r="6" fill="#fff" opacity="0.9"/>
              <path d="M60 160 L140 160" stroke="#081226" strokeWidth="8" strokeLinecap="round" opacity="0.2"/>
            </svg>
          </span>
          <span>AI Makalah Maker</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-slate-200">
          <Link className="link-hover" href="/">Home</Link>
          <a className="link-hover" href="#fitur">Fitur</a>
          <a className="link-hover" href="#carakerja">Cara Kerja</a>
          <a className="link-hover" href="#paket">Paket Harga</a>
          <a className="link-hover" href="#tentang">Tentang Kami</a>
          <a className="link-hover" href="#kontak">Kontak</a>
        </nav>

        <div className="flex items-center gap-2">
          <form action="/api/auth/signin/github" method="post">
            <button className="btn px-3 py-2 text-sm border border-white/20 text-white rounded-xl hover:bg-white/10">Masuk</button>
          </form>
          <Link href="/dashboard" className="btn btn-primary px-3 py-2 text-sm">Daftar Gratis</Link>
        </div>
      </div>
    </header>
  );
}
