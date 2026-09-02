"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, ExploreIcon, HistoryIcon, ProfileIcon } from "../ui/Icons";

export function BottomNavigation() {
  const pathname = usePathname();

  if (pathname?.startsWith("/player")) {
    return null;
  }

  const navItems = [
    { href: "/", icon: HomeIcon, label: "Accueil" },
    { href: "/explore", icon: ExploreIcon, label: "Explorer" },
    { href: "/history", icon: HistoryIcon, label: "Historique" },
    { href: "/profile", icon: ProfileIcon, label: "Profil" },
  ];

  return (
    <nav className="sticky bottom-0 w-full flex justify-around pt-2 border-t border-filet pb-[max(1rem,env(safe-area-inset-bottom))] bg-creme z-20 mt-auto">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            aria-label={item.label}
            className={`p-2 transition-transform duration-120 active:scale-[0.97] ${
              isActive ? "text-encre" : "text-gris-3"
            }`}
          >
            <Icon size={24} />
          </Link>
        );
      })}
    </nav>
  );
}
