'use client';

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import { Toaster } from "react-hot-toast";
import Link from "next/link";
import { BarChart2, Search, DatabaseZap, Settings, LogOut } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { removeToken } from '../lib/auth';


const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const showSidebar = pathname !== '/login';

  const handleLogout = () => {
    removeToken();
    router.push('/login');
  };

  return (

    <html lang="en" className="dark">
      <body className={`${inter.className} bg-slate-900 text-slate-200`}>
        <Providers>
          <div className="flex min-h-screen">
            {showSidebar && (
              <aside className="w-64 bg-slate-800/60 backdrop-blur-xl border-r border-slate-700/80 p-6 flex flex-col">
                <div>
                  <div className="flex items-center gap-3 mb-10">
                    <div className="p-2 bg-white/10 rounded-lg">
                      <BarChart2 size={28} className="text-cyan-300"/>
                    </div>
                    <h1 className="text-2xl font-bold text-white">Symbol Admin</h1>
                  </div>
                  <nav className="flex flex-col gap-4">
                    <Link href="/" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700/50 transition-colors">
                      <BarChart2 size={20} />
                      <span>Dashboard</span>
                    </Link>
                    <Link href="/discovery" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700/50 transition-colors">
                      <Search size={20} />
                      <span>Symbol Discovery</span>
                    </Link>
                    <Link href="/ingestion" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700/50 transition-colors">
                      <DatabaseZap size={20} />
                      <span>Ingestion</span>
                    </Link>
                    <Link href="/settings" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700/50 transition-colors">
                      <Settings size={20} />
                      <span>Settings</span>
                    </Link>
                  </nav>
                </div>

                <div className="mt-auto pt-4 border-t border-slate-700/80">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 p-3 rounded-lg text-red-400 hover:bg-slate-700/50 hover:text-red-300 transition-colors"
                  >
                    <LogOut size={20} />
                    <span>Logout</span>
                  </button>
                </div>
              </aside>
            )}

            <main className="flex-1 p-6 sm:p-8 lg:p-10">
              {children}
            </main>
          </div>
          <Toaster position="bottom-right" />
        </Providers>
      </body>
    </html>
  );
}
