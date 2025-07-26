'use client';

import { BarChart2, Search, DatabaseZap, Settings } from 'lucide-react';
import Link from 'next/link';
import withAuth from '@/components/withAuth';

function DashboardPage() {
  return (
    <div>
      <h1 className="text-4xl font-bold text-white tracking-tight mb-6">Dashboard</h1>
      <p className="text-slate-400 mb-10 max-w-3xl">
        Welcome to the Symbol Admin Panel. This is your central hub for managing financial symbols, overseeing data ingestion, and configuring system settings.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/discovery" className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/80 rounded-lg p-6 hover:bg-slate-700/50 transition-all shadow-lg">
          <div className="flex items-center gap-4 mb-3">
            <Search className="text-blue-400" size={24} />
            <h2 className="text-xl font-semibold text-slate-100">Symbol Discovery</h2>
          </div>
          <p className="text-slate-400 text-sm">
            Find new symbols by name, description, exchange, or type.
          </p>
        </Link>

        <Link href="/ingestion" className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/80 rounded-lg p-6 hover:bg-slate-700/50 transition-all shadow-lg">
          <div className="flex items-center gap-4 mb-3">
            <DatabaseZap className="text-green-400" size={24} />
            <h2 className="text-xl font-semibold text-slate-100">Ingestion Management</h2>
          </div>
          <p className="text-slate-400 text-sm">
            Manage symbols currently being ingested by the system.
          </p>
        </Link>

        <Link href="/settings" className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/80 rounded-lg p-6 hover:bg-slate-700/50 transition-all shadow-lg">
          <div className="flex items-center gap-4 mb-3">
            <Settings className="text-purple-400" size={24} />
            <h2 className="text-xl font-semibold text-slate-100">System Settings</h2>
          </div>
          <p className="text-slate-400 text-sm">
            Configure data ingestion schedules and other system parameters.
          </p>
        </Link>
      </div>
    </div>
  );
}

export default withAuth(DashboardPage);
