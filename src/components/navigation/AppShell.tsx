"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { BottomNavigation } from "./BottomNavigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPlayer = pathname?.startsWith("/player");

  const isHome = pathname === "/";

  return (
    <div
      id="app-shell"
      className={`mx-auto max-w-md ${
        isHome ? "h-[100dvh] max-h-[100dvh] overflow-hidden" : "min-h-screen min-h-[100dvh] bg-creme"
      } relative shadow-p1 flex flex-col transition-colors duration-500`}
      style={isHome ? { backgroundColor: "var(--home-bg, #F5E4DA)" } : undefined}
    >
      <div className={`flex-1 flex flex-col min-h-0 ${isHome ? "overflow-hidden" : ""}`}>
        {children}
      </div>
      {!isPlayer && <BottomNavigation />}
    </div>
  );
}
