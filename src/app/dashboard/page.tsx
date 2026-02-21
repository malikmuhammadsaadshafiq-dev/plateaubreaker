'use client';
import { useState } from 'react';
export default function Dashboard() {
  const [tab, setTab] = useState('overview');
  const tabs = ['overview','analysis','streaks','insights'];
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <nav className="bg-slate-800 p-4 flex gap-3 border-b border-slate-700">
        <span className="font-bold text-indigo-400 mr-4 text-lg">PlateauBreaker</span>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg capitalize font-medium transition ${tab===t?'bg-indigo-600 text-white':'text-slate-400 hover:text-white'}`}>{t}</button>
        ))}
      </nav>
      <main className="p-8 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold mb-6 capitalize">{tab}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {['Plateau Detection','Workout Progression','Recovery Metrics','Performance Trends'].map(c => (
            <div key={c} className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
              <h3 className="font-semibold text-indigo-300 mb-2">{c}</h3>
              <p className="text-slate-400 text-sm">AI-powered {c.toLowerCase()} tracking.</p>
              <button className="mt-4 w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">View Details</button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
