"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  Ship,
  Menu,
  X,
  Search,
  ListTodo,
  MapPin,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function AppSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger button */}
      <Button
        id="sidebar-toggle"
        variant="outline"
        size="icon"
        className="lg:hidden fixed top-4 left-4 z-60 bg-sidebar text-sidebar-foreground border-sidebar-border shadow-md"
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle navigation"
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Overlay (mobile only) */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col justify-between transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0`}
      >
        <div className="space-y-6 p-4">
          <div className="px-3 py-2 pt-4">
            <h2 className="text-xl font-black tracking-wider text-sidebar-primary-foreground">
              CS EKSIM TRACKER
            </h2>
            <p className="text-xs text-sidebar-foreground/60 mt-1">
              Freight Operational Dashboard
            </p>
          </div>
          <nav className="space-y-1">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors group"
            >
              <LayoutDashboard className="w-5 h-5 text-sidebar-foreground/50 group-hover:text-sidebar-primary" />
              <span className="text-sm font-medium">Dashboard</span>
            </Link>
            <Link
              href="/shipments"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors group"
            >
              <Ship className="w-5 h-5 text-sidebar-foreground/50 group-hover:text-sidebar-primary" />
              <span className="text-sm font-medium">Shipments</span>
            </Link>
            <Link
              href="/todos"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors group"
            >
              <ListTodo className="w-5 h-5 text-sidebar-foreground/50 group-hover:text-sidebar-primary" />
              <span className="text-sm font-medium">My Todos</span>
            </Link>
            <Link
              href="/tracker"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors group"
            >
              <Search className="w-5 h-5 text-sidebar-foreground/50 group-hover:text-sidebar-primary" />
              <span className="text-sm font-medium">Carrier Live Track</span>
            </Link>
            <Link
              href="/terminal-tracker"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors group"
            >
              <MapPin className="w-5 h-5 text-sidebar-foreground/50 group-hover:text-sidebar-primary" />
              <span className="text-sm font-medium">Track Container</span>
            </Link>
          </nav>
        </div>
        <div className="border-t border-sidebar-border px-6 py-4 text-xs text-sidebar-foreground/40 font-mono">
          <p className="text-center">
            <span className="font-semibold">CS EKSIM</span> by
            <span className="font-semibold"> mohaproject</span> © 2026
          </p>
        </div>
      </aside>
    </>
  );
}
