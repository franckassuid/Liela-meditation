"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { HomeIcon, LibraryIcon, SettingsIcon } from "../ui/Icons";

function BottomNavigationContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (pathname?.startsWith("/player")) {
    return null;
  }

  const isSleepCategory = pathname === "/library" && searchParams.get("situation") === "trouver-le-sommeil";

  const navItems = [
    { href: "/", icon: HomeIcon, label: "Accueil" },
    { href: "/library", icon: LibraryIcon, label: "Bibliothèque" },
    { href: "/settings", icon: SettingsIcon, label: "Réglages" },
  ];

  return (
    <nav
      className={`sticky bottom-0 w-full flex justify-around pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] z-20 mt-auto transition-colors duration-300 ${
        isSleepCategory
          ? "bg-[#3E4753] border-t border-[rgba(253,249,240,0.14)]"
          : pathname === "/"
          ? "bg-transparent border-t border-[rgba(67,53,40,0.09)]"
          : "bg-creme border-t border-filet"
      }`}
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href) || (item.href === "/settings" && pathname?.startsWith("/profile"));

        const textColor = isSleepCategory
          ? isActive
            ? "text-[#FDF9F0]"
            : "text-[rgba(253,249,240,0.5)]"
          : isActive
          ? "text-encre"
          : "text-gris-3";

        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            aria-label={item.label}
            onClick={(e) => {
              if (item.href === "/" && pathname === "/") {
                e.preventDefault();
                window.location.reload();
              }
            }}
            className={`flex flex-col items-center gap-1 p-2 min-w-[70px] transition-transform duration-120 active:scale-[0.97] ${textColor}`}
          >
            <Icon size={24} />
            <span className="text-[11px] font-medium tracking-wide">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNavigation() {
  return (
    <Suspense fallback={null}>
      <BottomNavigationContent />
    </Suspense>
  );
}

