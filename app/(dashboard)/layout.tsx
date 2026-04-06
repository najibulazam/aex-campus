"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  Settings,
  Users,
  CheckSquare,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import campusTitle from "@/src/assets/aex_campus_transparent.webp";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [sidebarOpenPath, setSidebarOpenPath] = useState<string | null>(null);

  const isSidebarOpen = sidebarOpenPath === pathname;

  const closeSidebar = () => setSidebarOpenPath(null);
  const toggleSidebar = () => {
    setSidebarOpenPath((current) => (current === pathname ? null : pathname));
  };

  return (
    <RequireAuth>
      <div className="min-h-screen w-full relative lg:flex lg:items-start lg:justify-start">
        <button
          type="button"
          aria-label="close sidebar"
          onClick={closeSidebar}
          className={`fixed inset-0 z-40 bg-[rgba(14,19,22,0.72)] backdrop-blur-[1px] transition-opacity duration-200 lg:hidden ${
            isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        />

        <aside
          className={`neo-sidebar fixed top-0 bottom-0 left-0 z-50 w-72 transition-transform duration-200 ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0`}
        >
          <SidebarContent
            pathname={pathname}
            onNavigate={closeSidebar}
            userEmail={user?.email ?? null}
          />
        </aside>

        <div className="min-h-screen w-full flex flex-col justify-start lg:ml-72">
          <Navbar onMenuClick={toggleSidebar} />
          <main className="w-full flex-1 overflow-x-hidden overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </RequireAuth>
  );
}

function SidebarContent({
  pathname,
  onNavigate,
  userEmail,
}: {
  pathname: string;
  onNavigate: () => void;
  userEmail: string | null;
}) {
  const userInitial = userEmail?.trim().charAt(0).toUpperCase() || "U";

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const navLinkClass = (href: string) =>
    `neo-nav-link${isActive(href) ? " neo-nav-link-active" : ""}`;

  return (
    <aside className="w-full h-full flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-(--neo-card-border) shrink-0">
        <Link
          href="/"
          className="flex items-center"
        >
          <Image
            src={campusTitle}
            alt="AI Extension Campus"
            priority
                  className="h-11 w-auto object-contain"
          />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <ul className="space-y-1.5">
          <li className="neo-nav-label px-2 mb-2">
            Overview
          </li>
          <li>
            <Link
              href="/"
              className={navLinkClass("/")}
                  onClick={onNavigate}
            >
              <LayoutDashboard className="w-4.5 h-4.5" />
              Dashboard
            </Link>
          </li>
          <li>
            <Link
              href="/courses"
              className={navLinkClass("/courses")}
                  onClick={onNavigate}
            >
              <BookOpen className="w-4.5 h-4.5" />
              Courses
            </Link>
          </li>
          <li>
            <Link
              href="/schedule"
              className={navLinkClass("/schedule")}
                  onClick={onNavigate}
            >
              <CalendarDays className="w-4.5 h-4.5" />
              Schedule
            </Link>
          </li>
          <li>
            <Link
              href="/tasks"
              className={navLinkClass("/tasks")}
                  onClick={onNavigate}
            >
              <CheckSquare className="w-4.5 h-4.5" />
              Tasks
            </Link>
          </li>

          <li className="neo-nav-label px-2 mt-7 mb-2">
            Community
          </li>
          <li>
            <Link
              href="/groups"
              className={navLinkClass("/groups")}
                  onClick={onNavigate}
            >
              <Users className="w-4.5 h-4.5" />
              Study Groups
            </Link>
          </li>
        </ul>
      </div>

      <div className="p-4 border-t border-(--neo-card-border) shrink-0">
        <ul>
          <li>
            <Link
              href="/settings"
              className={navLinkClass("/settings")}
              onClick={onNavigate}
            >
              <Settings className="w-4.5 h-4.5" />
              Settings
            </Link>
          </li>
        </ul>

        <div className="mt-3 px-1.5 py-1.5 flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-full border border-[rgba(34,229,140,0.28)] bg-[rgba(34,229,140,0.12)] text-(--neo-primary) font-semibold text-sm inline-flex items-center justify-center shrink-0"
            aria-label="User avatar"
          >
            {userInitial}
          </div>
          <p className="text-xs neo-text-secondary truncate">{userEmail ?? "Account"}</p>
        </div>
      </div>
    </aside>
  );
}
