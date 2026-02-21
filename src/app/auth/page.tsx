'use client';
import { useState } from 'react';
export default function Auth() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setMsg(mode === 'login' ? 'Logged in!' : 'Account created!'); setLoading(false);
  };
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="bg-slate-800 rounded-2xl p-10 w-full max-w-md border border-slate-700">
        <h2 className="text-2xl font-bold text-slate-100 text-center mb-6">PlateauBreaker</h2>
        <div className="flex mb-6 bg-slate-900 rounded-lg p-1">
          {['login','signup'].map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`flex-1 py-2 rounded-md capitalize font-medium transition ${mode===m?'bg-indigo-600 text-white':'text-slate-400'}`}>{m}</button>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required className="p-3 bg-slate-900 border border-slate-600 rounded-lg text-slate-100" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required className="p-3 bg-slate-900 border border-slate-600 rounded-lg text-slate-100" />
          <button type="submit" disabled={loading} className="p-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition">{loading ? 'Loading...' : mode === 'login' ? 'Log In' : 'Sign Up'}</button>
        </form>
        {msg && <p className="text-green-400 text-center mt-4">{msg}</p>}
      </div>
    </div>
  );
}
