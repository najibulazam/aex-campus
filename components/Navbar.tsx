"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Menu, Search, UserCircle, LogOut } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useNavbarNotifications } from "@/lib/useNavbarNotifications";

interface NavbarProps {
  onMenuClick: () => void;
}

const NAVBAR_SEEN_NOTIFICATIONS_STORAGE_KEY = "aex.nav.notifications.seen.v1";

function readSeenNotificationIds(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(NAVBAR_SEEN_NOTIFICATIONS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is string => typeof item === "string" && item.length > 0)
      .slice(0, 300);
  } catch {
    return [];
  }
}

function formatNotificationDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Recently";
  }

  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const { user } = useAuth();
  const { notifications } = useNavbarNotifications();
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [seenNotificationIds, setSeenNotificationIds] = useState<string[]>(() =>
    readSeenNotificationIds()
  );
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const notificationPanelRef = useRef<HTMLDivElement | null>(null);

  const routeLabels: Record<string, string> = {
    "/": "Dashboard",
    "/dashboard": "Dashboard",
    "/tasks": "Tasks",
    "/courses": "Courses",
    "/schedule": "Schedule",
    "/groups": "Study Groups",
    "/study-groups": "Study Groups",
    "/settings": "Settings",
  };

  const workspaceLabel =
    routeLabels[pathname] ??
    Object.entries(routeLabels).find(([route]) =>
      route !== "/" && pathname.startsWith(`${route}/`)
    )?.[1] ??
    "Dashboard";

  const settingsHref = "/settings";

  const seenNotificationIdsSet = useMemo(
    () => new Set(seenNotificationIds),
    [seenNotificationIds]
  );

  const hasUnseenNotifications = notifications.some(
    (notification) => !seenNotificationIdsSet.has(notification.id)
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      NAVBAR_SEEN_NOTIFICATIONS_STORAGE_KEY,
      JSON.stringify(seenNotificationIds)
    );
  }, [seenNotificationIds]);

  useEffect(() => {
    const handleDocumentPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (accountMenuRef.current && !accountMenuRef.current.contains(target)) {
        setAccountMenuOpen(false);
      }

      if (notificationPanelRef.current && !notificationPanelRef.current.contains(target)) {
        setNotificationOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAccountMenuOpen(false);
        setNotificationOpen(false);
      }
    };

    document.addEventListener("mousedown", handleDocumentPointerDown);
    document.addEventListener("touchstart", handleDocumentPointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleDocumentPointerDown);
      document.removeEventListener("touchstart", handleDocumentPointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      await signOut(auth);
      router.replace("/login");
      router.refresh();

      // Fallback: force navigation if client-side routing gets stuck.
      if (typeof window !== "undefined") {
        window.location.replace("/login");
      }
    } catch (error) {
      console.error("[Navbar] Failed to sign out:", error);
      setLoggingOut(false);
    }
  };

  const toggleNotifications = () => {
    const willOpen = !notificationOpen;
    setNotificationOpen(willOpen);
    setAccountMenuOpen(false);

    if (willOpen) {
      setSeenNotificationIds((current) => {
        const merged = new Set(current);
        notifications.forEach((notification) => {
          merged.add(notification.id);
        });

        return Array.from(merged);
      });
    }
  };

  return (
    <header className="neo-topbar sticky top-0 z-30">
      <div className="h-16 px-4 md:px-6 flex items-center gap-3">
        <button
          type="button"
          aria-label="open sidebar"
          onClick={onMenuClick}
          className="hamburger-btn neo-btn neo-btn-ghost h-10 w-10 lg:hidden"
        >
          <Menu className="w-4 h-4" />
        </button>

        <Link href="/" className="lg:hidden font-semibold text-[1.05rem] tracking-tight neo-accent">
          AI Extension Campus
        </Link>

        <div className="hidden lg:flex flex-1">
          <p className="neo-text-secondary text-sm font-medium">Campus Workspace / {workspaceLabel}</p>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div className="neo-search-wrap hidden sm:block w-44 md:w-56">
              <label htmlFor="navbar-search" className="sr-only">
                Search workspace
              </label>
            <Search className="w-4 h-4" />
              <input
                id="navbar-search"
                type="text"
                placeholder="Search"
                className="neo-search text-sm"
              />
          </div>

          <div className="relative" ref={notificationPanelRef}>
            <button
              className="neo-btn neo-btn-ghost h-10 w-10 relative"
              aria-label="Notifications"
              aria-haspopup="menu"
              aria-expanded={notificationOpen}
              onClick={toggleNotifications}
              type="button"
            >
              <Bell className="w-4 h-4" />
              {hasUnseenNotifications && (
                <span className="absolute right-2.5 top-2.5 w-2 h-2 rounded-full bg-(--neo-primary) shadow-[0_0_10px_var(--neo-glow)]" />
              )}
            </button>

            {notificationOpen && (
              <div className="absolute right-0 mt-2 w-80 max-w-[90vw] neo-card p-2 space-y-2" role="menu">
                <div className="px-2 py-1 flex items-center justify-between">
                  <p className="text-sm font-medium neo-text-secondary">Notifications</p>
                  {notifications.length > 0 && hasUnseenNotifications && (
                    <button
                      type="button"
                      className="neo-btn neo-btn-ghost h-7 px-2 text-xs"
                      onClick={() => {
                        setSeenNotificationIds((current) => {
                          const merged = new Set(current);
                          notifications.forEach((notification) => {
                            merged.add(notification.id);
                          });
                          return Array.from(merged);
                        });
                      }}
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {notifications.length === 0 ? (
                  <div className="px-2 py-4 text-sm neo-text-muted">No notifications yet.</div>
                ) : (
                  <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                    {notifications.map((notification) => {
                      const isUnseen = !seenNotificationIdsSet.has(notification.id);

                      return (
                      <article
                        key={notification.id}
                        className={`rounded-xl border px-3 py-2.5 ${
                          isUnseen
                            ? "border-[rgba(34,229,140,0.35)] bg-[rgba(34,229,140,0.08)]"
                            : "border-(--neo-card-border) bg-(--neo-card-bg)"
                        }`}
                      >
                        <p className="text-sm font-medium neo-text-secondary">{notification.title}</p>
                        <p className="text-xs neo-text-muted mt-1">{notification.message}</p>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <p className="text-[11px] neo-text-muted">
                            {formatNotificationDateTime(notification.createdAt)}
                          </p>
                          {isUnseen && <span className="text-[11px] neo-accent">new</span>}
                        </div>
                      </article>
                    );})}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="relative" ref={accountMenuRef}>
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={accountMenuOpen}
              onClick={() => {
                setAccountMenuOpen((current) => !current);
                setNotificationOpen(false);
              }}
              className="list-none cursor-pointer neo-btn neo-btn-ghost h-10 w-10 md:w-auto md:px-3"
            >
              <UserCircle className="w-5 h-5" />
              <span className="hidden md:inline text-sm neo-text-secondary max-w-36 truncate">
                {user?.email ?? "Account"}
              </span>
            </button>

            {accountMenuOpen && (
              <div className="absolute right-0 mt-2 w-60 neo-card p-2 space-y-1" role="menu">
              <p className="px-2 pt-1 text-xs neo-text-muted">Signed in as</p>
              <p className="px-2 pb-2 text-sm neo-text-secondary truncate">{user?.email}</p>

              <Link
                href={settingsHref}
                className="block w-full text-left px-3 py-2 rounded-xl text-sm neo-text-secondary hover:bg-[rgba(34,229,140,0.07)] transition-colors duration-200"
                onClick={() => {
                  setAccountMenuOpen(false);
                  setNotificationOpen(false);
                }}
              >
                Settings
              </Link>

              <button
                onClick={async () => {
                  setAccountMenuOpen(false);
                  await handleLogout();
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-sm neo-accent hover:bg-[rgba(34,229,140,0.12)] transition-colors duration-200 inline-flex items-center gap-2"
                disabled={loggingOut}
              >
                <LogOut className="w-4 h-4" />
                {loggingOut ? "Logging out..." : "Logout"}
              </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
