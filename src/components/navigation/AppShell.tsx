"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import { BottomNavigation } from "./BottomNavigation";
import { PwaProvider, InstallPwaBanner, InstallPwaModal } from "@/components/pwa";
import { ReminderScheduler } from "@/components/notifications/ReminderScheduler";
import { SplashScreen } from "@/components/ui/SplashScreen";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPlayer = pathname?.startsWith("/player");

  const isHome = pathname === "/";

  // Empêcher tout décalage de défilement résiduel après rechargement ou survol
  useEffect(() => {
    if (typeof window !== "undefined") {
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "manual";
      }
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  return (
    <PwaProvider>
      <SplashScreen />
      <div
        id="app-shell"
        className={`mx-auto ${
          isPlayer
            ? "w-full max-w-none h-[100dvh] max-h-[100dvh] overflow-hidden"
            : isHome
            ? "max-w-md h-[100dvh] max-h-[100dvh] overflow-hidden"
            : "max-w-md min-h-screen min-h-[100dvh] bg-creme"
        } relative shadow-p1 flex flex-col transition-colors duration-500`}
        style={isHome ? { backgroundColor: "var(--home-bg, #F5E4DA)" } : undefined}
      >
        <div className={`flex-1 flex flex-col min-h-0 ${isHome || isPlayer ? "overflow-hidden" : ""}`}>
          {children}
        </div>
        {!isPlayer && <BottomNavigation />}
        <InstallPwaBanner />
        <InstallPwaModal />
        <ReminderScheduler />
      </div>
    </PwaProvider>
  );
}
