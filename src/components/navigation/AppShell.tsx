"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { BottomNavigation } from "./BottomNavigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPlayer = pathname?.startsWith("/player");

  return (
    <div className="mx-auto max-w-md min-h-screen min-h-[100dvh] relative shadow-p1 bg-creme flex flex-col">
      <div className="flex-1 flex flex-col">{children}</div>
      {!isPlayer && <BottomNavigation />}
    </div>
  );
}
