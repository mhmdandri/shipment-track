import Link from "next/link";
import { LayoutDashboard, Ship } from "lucide-react";

export function AppSidebar() {
  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen p-4 flex flex-col justify-between fixed top-0 left-0 bottom-0 z-50">
      <div className="space-y-6">
        <div className="px-3 py-2">
          <h2 className="text-xl font-black tracking-wider text-cyan-400">
            CS EKSIM TRACKER
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Freight Operational Dashboard
          </p>
        </div>
        <nav className="space-y-1">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 transition-colors group"
          >
            <LayoutDashboard className="w-5 h-5 text-slate-400 group-hover:text-cyan-400" />
            <span className="text-sm font-medium">Dashboard Board</span>
          </Link>
          <Link
            href="/shipments"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 transition-colors group"
          >
            <Ship className="w-5 h-5 text-slate-400 group-hover:text-cyan-400" />
            <span className="text-sm font-medium">Shipments Catalog</span>
          </Link>
        </nav>
      </div>
      <div className="border-t border-slate-800 pt-4 px-3 text-xs text-slate-500 font-mono">
        v1.2.0-Prod • Stable
      </div>
    </aside>
  );
}
