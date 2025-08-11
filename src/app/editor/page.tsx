import Header from "@/components/Header";
import EditorClient from "@/components/EditorClient";

export default function EditorPage() {
  return (
    <main className="min-h-screen">
      <Header />
      <section className="max-w-6xl mx-auto px-5 py-6">
        <h1 className="text-white text-2xl font-bold">Editor</h1>
        <p className="text-slate-400">Tulis & revisi makalah Anda. Chat AI di sisi kanan.</p>
      </section>
      <section className="max-w-6xl mx-auto px-5 pb-10">
        <EditorClient />
      </section>
    </main>
  );
}
