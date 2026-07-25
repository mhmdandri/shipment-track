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
  CreditCard,
  LogIn,
  User as UserIcon,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { getCurrentUserAction } from "@/actions/auth-action";
import { ProfileModal, UserProfileProps } from "@/components/auth/ProfileModal";

export function AppSidebar() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<UserProfileProps | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);

  const closeSidebar = () => setOpen(false);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await getCurrentUserAction();
        if (res.success && res.data) {
          setUser(res.data);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setLoadingUser(false);
      }
    }
    fetchUser();
  }, []);

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

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
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col justify-between transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0`}
      >
        <div className="space-y-6 p-4 overflow-y-auto">
          <div className="px-3 py-2 pt-4">
            <h2 className="text-xl font-black tracking-wider text-sidebar-primary-foreground">
              CS EKSIM TRACKER
            </h2>
            <p className="text-xs text-sidebar-foreground/60 mt-1">
              Freight Operational Dashboard
            </p>
          </div>
          <nav className="space-y-1">
            {!loadingUser &&
              (user?.role === "ADMIN" || user?.role === "OWNER") && (
                <>
                  <Link
                    href="/"
                    onClick={closeSidebar}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors group"
                  >
                    <LayoutDashboard className="w-5 h-5 text-sidebar-foreground/50 group-hover:text-sidebar-primary" />
                    <span className="text-sm font-medium">Dashboard</span>
                  </Link>
                  <Link
                    href="/shipments"
                    onClick={closeSidebar}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors group"
                  >
                    <Ship className="w-5 h-5 text-sidebar-foreground/50 group-hover:text-sidebar-primary" />
                    <span className="text-sm font-medium">Shipments</span>
                  </Link>
                  <Link
                    href="/todos"
                    onClick={closeSidebar}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors group"
                  >
                    <ListTodo className="w-5 h-5 text-sidebar-foreground/50 group-hover:text-sidebar-primary" />
                    <span className="text-sm font-medium">My Todos</span>
                  </Link>
                  <Link
                    href="/subscriptions"
                    onClick={closeSidebar}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors group"
                  >
                    <CreditCard className="w-5 h-5 text-sidebar-foreground/50 group-hover:text-sidebar-primary" />
                    <span className="text-sm font-medium">
                      Bot Subscriptions
                    </span>
                  </Link>
                </>
              )}

            <Link
              href="/tracker"
              onClick={closeSidebar}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors group"
            >
              <Search className="w-5 h-5 text-sidebar-foreground/50 group-hover:text-sidebar-primary" />
              <span className="text-sm font-medium">Carrier Live Track</span>
            </Link>
            <Link
              href="/terminal-tracker"
              onClick={closeSidebar}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors group"
            >
              <MapPin className="w-5 h-5 text-sidebar-foreground/50 group-hover:text-sidebar-primary" />
              <span className="text-sm font-medium">Track Container</span>
            </Link>
          </nav>
        </div>

        {/* Sidebar Footer with User Profile / Login Action */}
        <div className="border-t border-sidebar-border p-3">
          {!loadingUser && user ? (
            <button
              type="button"
              onClick={() => {
                setProfileModalOpen(true);
                closeSidebar();
              }}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all text-left group border border-transparent hover:border-sidebar-border"
            >
              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 ring-2 ring-primary/20 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                {getInitials(user.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate text-sidebar-foreground">
                  {getInitials(user.name)} ({user.name})
                </p>
                <p className="text-[10px] text-sidebar-foreground/60 truncate font-mono">
                  @{user.username}
                </p>
              </div>
              <UserIcon className="w-4 h-4 text-sidebar-foreground/40 group-hover:text-primary shrink-0" />
            </button>
          ) : !loadingUser ? (
            <Link
              href="/auth/login"
              onClick={closeSidebar}
              className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-md hover:opacity-90 transition-opacity"
            >
              <LogIn className="w-4 h-4" />
              <span>Login Sistem</span>
            </Link>
          ) : (
            <div className="p-2 text-center text-xs text-sidebar-foreground/40 font-mono">
              <span>CS EKSIM Tracker</span>
            </div>
          )}
        </div>
      </aside>

      {/* User Profile Modal */}
      <ProfileModal
        user={user}
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
      />
    </>
  );
}
