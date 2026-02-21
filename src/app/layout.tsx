import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Menu, X, Activity } from "lucide-react";

export const metadata: Metadata = {
  title: "PlateauBreaker - Forensic Weight Loss Analytics",
  description: "Identify which specific lifestyle variables actually break weight loss plateaus by correlating sleep, stress, meal timing, and macros against your historical weight data.",
  keywords: ["weight loss", "plateau", "analytics", "fitness", "macros", "sleep tracking", "correlation analysis"],
};

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.className} antialiased bg-slate-50`}>
        <nav className="bg-[#0F172A] text-white sticky top-0 z-50 border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
                <Activity className="h-6 w-6 text-cyan-400" aria-hidden="true" />
                <span className="font-bold text-xl tracking-tight">PlateauBreaker</span>
              </Link>

              <div className="hidden md:flex items-center gap-8">
                <Link href="/" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">
                  Home
                </Link>
                <Link href="/pricing" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">
                  Pricing
                </Link>
                <Link href="/dashboard" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">
                  Dashboard
                </Link>
              </div>

              <div className="hidden md:flex items-center gap-4">
                <Link 
                  href="/login" 
                  className="text-slate-300 hover:text-white transition-colors text-sm font-medium px-3 py-2"
                >
                  Login
                </Link>
                <Link 
                  href="/signup" 
                  className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-cyan-500/20"
                >
                  Get Started
                </Link>
              </div>

              <div className="md:hidden relative" id="mobile-menu">
                <div className="flex items-center">
                  <a 
                    href="#mobile-menu" 
                    className="p-2 hover:bg-slate-800 rounded-lg transition-colors target:hidden"
                    aria-label="Open menu"
                  >
                    <Menu className="h-6 w-6" />
                  </a>
                  <a 
                    href="#" 
                    className="p-2 hover:bg-slate-800 rounded-lg transition-colors hidden target:block"
                    aria-label="Close menu"
                  >
                    <X className="h-6 w-6" />
                  </a>
                </div>
                
                <div className="hidden target:flex absolute top-full right-0 mt-2 w-56 bg-[#0F172A] border border-slate-800 rounded-xl shadow-2xl p-4 flex-col gap-2">
                  <Link 
                    href="/" 
                    className="text-slate-300 hover:text-white hover:bg-slate-800 px-3 py-2 rounded-lg transition-colors text-sm font-medium"
                  >
                    Home
                  </Link>
                  <Link 
                    href="/pricing" 
                    className="text-slate-300 hover:text-white hover:bg-slate-800 px-3 py-2 rounded-lg transition-colors text-sm font-medium"
                  >
                    Pricing
                  </Link>
                  <Link 
                    href="/dashboard" 
                    className="text-slate-300 hover:text-white hover:bg-slate-800 px-3 py-2 rounded-lg transition-colors text-sm font-medium"
                  >
                    Dashboard
                  </Link>
                  <div className="h-px bg-slate-800 my-1" />
                  <Link 
                    href="/login" 
                    className="text-slate-300 hover:text-white hover:bg-slate-800 px-3 py-2 rounded-lg transition-colors text-sm font-medium"
                  >
                    Login
                  </Link>
                  <Link 
                    href="/signup" 
                    className="bg-cyan-500 hover:bg-cyan-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors text-center shadow-lg shadow-cyan-500/20"
                  >
                    Get Started
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </nav>

        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}