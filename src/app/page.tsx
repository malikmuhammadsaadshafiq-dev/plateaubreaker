'use client';
export default function Home() {
  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-8">
      <h1 className="text-5xl font-bold text-indigo-400 mb-4">PlateauBreaker</h1>
      <p className="text-xl text-slate-400 text-center max-w-xl">Break through fitness plateaus with AI-powered workout analysis.</p>
      <a href="/dashboard" className="mt-8 px-8 py-3 bg-indigo-600 text-white rounded-xl font-semibold text-lg hover:bg-indigo-700 transition">Open Dashboard</a>
    </main>
  );
}
