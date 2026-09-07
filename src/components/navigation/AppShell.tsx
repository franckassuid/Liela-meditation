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
      className={`mx-auto max-w-md ${
        isHome ? "h-[100dvh] max-h-[100dvh] overflow-hidden" : "min-h-screen min-h-[100dvh]"
      } relative shadow-p1 bg-creme flex flex-col`}
    >
      <div className={`flex-1 flex flex-col min-h-0 ${isHome ? "overflow-hidden" : ""}`}>
        {children}
      </div>
      {!isPlayer && <BottomNavigation />}
    </div>
  );
}
