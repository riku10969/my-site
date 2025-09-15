"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

type NavItem = { label: string; path: string };

// ★ Collection / My Hobbys を削除
const navItems: NavItem[] = [
  { label: "About",  path: "/project/about" },
  { label: "Works",  path: "/project/works" },
  { label: "Contact",path: "/project/contact" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  // ルートが変わったらモバイルメニューを閉じる
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header
      className="
        fixed top-0 left-0 z-1000 w-full
        bg-black/70 backdrop-blur
        border-b border-white/10
      "
      role="banner"
    >
      <div
        className="
          mx-auto max-w-6xl px-6 h-16
          flex items-center justify-between
        "
      >
        {/* Left: Hamburger (mobile) */}
        <button
          aria-label="Open menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className="
            md:hidden inline-flex flex-col gap-1.5
            items-center justify-center
            w-10 h-10 -ml-2
          "
        >
          <span className={`block h-0.5 w-6 bg-white transition-all ${menuOpen ? "translate-y-2 rotate-45" : ""}`} />
          <span className={`block h-0.5 w-6 bg-white transition-opacity ${menuOpen ? "opacity-0" : "opacity-100"}`} />
          <span className={`block h-0.5 w-6 bg-white transition-all ${menuOpen ? "-translate-y-2 -rotate-45" : ""}`} />
        </button>

        {/* Center-left: Logo */}
        <Link href="/" className="flex items-center">
          <Image
            src="/uiux-riku-transparent.png"
            alt="UI/UX RIKU"
            width={140}
            height={40}
            className="h-10 w-auto md:ml-14"
            priority
          />
        </Link>

        {/* Center: Desktop Nav */}
        <nav
          className="hidden md:flex flex-1 justify-center"
          aria-label="Main navigation"
        >
          <ul className="flex gap-[7rem]">
            {navItems.map((item) => {
              const active = pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    href={item.path}
                    className={`
                      relative font-semibold text-[1.1rem] transition-colors
                      ${active ? "text-cyan-300" : "text-white"}
                      hover:text-cyan-200
                    `}
                  >
                    <span className="relative">
                      {item.label}
                      <span
                        className={`
                          absolute left-0 -bottom-1 h-[2px] w-full origin-left scale-x-0
                          bg-cyan-300 transition-transform duration-300
                          ${active ? "scale-x-100" : "group-hover/ni:scale-x-100"}
                        `}
                        aria-hidden
                      />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Right spacer for layout balance */}
        <div className="w-10 md:w-14" aria-hidden />
      </div>

      {/* Mobile Drawer */}
      <div
        className={`
          md:hidden
          absolute top-16 left-0 w-full
          bg-black/95
          border-t border-white/10
          transition-[max-height,opacity]
          ${menuOpen ? "opacity-100 max-h-[60dvh]" : "opacity-0 max-h-0 overflow-hidden"}
        `}
      >
        <nav aria-label="Mobile navigation">
          <ul className="flex flex-col items-center gap-4 py-4">
            {navItems.map((item) => {
              const active = pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    href={item.path}
                    className={`
                      font-semibold text-lg
                      ${active ? "text-cyan-300" : "text-white"}
                    `}
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
