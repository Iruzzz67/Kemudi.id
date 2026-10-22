"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Moon, Sun, Menu, X, Car } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { AuthModal } from "@/components/AuthModal";

const navLinks = [
  { href: "/", label: "Beranda" },
  { href: "/kursus", label: "Kursus & Mentor" },
  { href: "/materi", label: "Materi Teori" },
  { href: "/simulasi", label: "Simulasi 3D" },
  { href: "/dashboard", label: "Dashboard Siswa" },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, studentProfile, updateProfile, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      if (saved) return saved === "dark";
      return document.documentElement.classList.contains("dark") || window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return true;
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const toggleDarkMode = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  if (pathname === "/login" || pathname === "/register") {
    return null;
  }

  const displayName = user?.name || studentProfile?.name || "Siswa";
  const displayInitial = displayName.charAt(0).toUpperCase();

  return (
    <>
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/90 dark:bg-neutral-950/90 border-b border-slate-200 dark:border-neutral-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Wordmark */}
          <Link
            href="/"
            className="flex items-center gap-2 text-left group focus:outline-none"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Car className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Kemudi<span className="text-blue-600 dark:text-blue-500">.id</span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
            {navLinks.map((link) => {
              const isActive =
                link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`transition-colors relative py-1 focus:outline-none whitespace-nowrap ${
                    isActive
                      ? "text-blue-600 dark:text-blue-400 font-semibold"
                      : "text-slate-600 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Action Tools */}
          <div className="flex items-center gap-2.5">
            {/* Dark / Light Toggle */}
            <button
              onClick={toggleDarkMode}
              title={isDarkMode ? "Beralih ke Mode Terang" : "Beralih ke Mode Gelap"}
              aria-label="Toggle tema gelap/terang"
              className="w-9 h-9 rounded-full flex items-center justify-center text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>

            {/* Profile & Logout section */}
            {user ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  title="Klik untuk melihat dan mengedit profil siswa"
                  className="flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-full border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-900 hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-800 dark:text-neutral-200 transition shadow-sm whitespace-nowrap cursor-pointer"
                >
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                    {displayInitial}
                  </div>
                  <span className="max-w-[100px] sm:max-w-[140px] truncate">{displayName}</span>
                </button>
                <button
                  onClick={() => logout()}
                  title="Keluar dari akun"
                  className="text-xs font-semibold text-slate-500 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400 px-2.5 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
                >
                  Keluar
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="px-4 py-1.5 text-xs font-semibold rounded-full bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm"
              >
                Masuk
              </Link>
            )}

            {/* Mobile hamburger button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 focus:outline-none"
              aria-label="Menu navigasi"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/95 px-4 pt-3 pb-5 space-y-2 backdrop-blur-md">
            {navLinks.map((link) => {
              const isActive =
                link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold"
                      : "text-slate-700 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-900"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        )}
      </header>

      {/* Auth / Profile Modal */}
      {user && (
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          profile={studentProfile}
          onSaveProfile={(updated) => updateProfile(updated)}
        />
      )}
    </>
  );
}
