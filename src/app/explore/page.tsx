"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { SessionCard } from "@/components/ui/SessionCard";
import { ProModal } from "@/components/ui/ProModal";
import { SESSIONS_CATALOG, getCategoryInfo, DISCOVERY_COLLECTION, CatalogSession } from "@/config/sessionsCatalog";
import { getAvailableSituations } from "@/lib/sessions";

export default function ExplorePage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [proModalSession, setProModalSession] = useState<CatalogSession | null>(null);

  const availableSituations = getAvailableSituations();

  const allCategories = useMemo(() => {
    return [
      ...availableSituations.map((sit) => ({
        id: sit.id,
        label: sit.shortLabel,
        color: sit.color,
        voile: sit.voile,
        textColor: sit.textColor,
      })),
      {
        id: DISCOVERY_COLLECTION.id,
        label: DISCOVERY_COLLECTION.shortLabel,
        color: DISCOVERY_COLLECTION.color,
        voile: DISCOVERY_COLLECTION.voile,
        textColor: DISCOVERY_COLLECTION.textColor,
      },
    ];
  }, [availableSituations]);

  const filtered = useMemo(() => {
    return SESSIONS_CATALOG.filter((session) => {
      const matchesCategory =
        selectedCategory === "all" || session.situationId === selectedCategory;
      const searchLower = searchQuery.toLowerCase().trim();
      const title = session.title.toLowerCase();
      const desc = (session.description || "").toLowerCase();
      const catInfo = getCategoryInfo(session.situationId);
      const catLabel = catInfo.label.toLowerCase();

      const matchesSearch =
        searchLower === "" ||
        title.includes(searchLower) ||
        desc.includes(searchLower) ||
        catLabel.includes(searchLower);

      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const handleSessionClick = (session: CatalogSession) => {
    if (session.isAvailable) {
      router.push(`/player?id=${session.realSessionId || session.id}`);
    } else {
      setProModalSession(session);
    }
  };

  return (
    <div className="p-marge pb-8 flex flex-col flex-1">
      <h1 className="font-poppins font-light text-[24px] leading-[1.2] mb-4 mt-2">
        Recherche & Catalogue
      </h1>

      {/* Search Bar */}
      <div className="relative mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher une séance..."
          className="w-full bg-coquille border border-transparent focus:border-bord focus:bg-white text-encre placeholder-gris-3 rounded-sm px-4 py-3 text-[14px] outline-none transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gris-3 hover:text-encre text-[14px] p-1"
          >
            ✕
          </button>
        )}
      </div>

      {/* Category Filter Chips with color coding */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
        <button
          onClick={() => setSelectedCategory("all")}
          className={`px-3.5 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all duration-120 ${
            selectedCategory === "all"
              ? "bg-encre text-creme shadow-sm"
              : "bg-surface text-gris-2 shadow-[inset_0_0_0_1px_var(--bord)]"
          }`}
        >
          Toutes ({SESSIONS_CATALOG.length})
        </button>

        {allCategories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className="px-3.5 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all duration-120 flex items-center gap-1.5"
              style={{
                backgroundColor: isSelected ? cat.color : cat.voile,
                color: isSelected ? cat.textColor : cat.color,
                boxShadow: isSelected ? "var(--p1)" : "none",
              }}
            >
              <span 
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: isSelected ? cat.textColor : cat.color }}
              />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Session cards list */}
      {filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
          <p className="text-gris-2 text-[15px] mb-2">Aucune séance ne correspond à votre recherche.</p>
          <button
            onClick={() => {
              setSelectedCategory("all");
              setSearchQuery("");
            }}
            className="text-sauge-p text-[13px] font-semibold underline mt-2"
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((session) => {
            const catInfo = getCategoryInfo(session.situationId);
            return (
              <SessionCard
                key={session.id}
                title={session.title}
                duration={session.durationSeconds}
                situationName={catInfo.label}
                situationColor={catInfo.color}
                situationVoile={catInfo.voile}
                isLocked={!session.isAvailable}
                onClick={() => handleSessionClick(session)}
              />
            );
          })}
        </div>
      )}

      {/* Pro Modal */}
      <ProModal
        isOpen={proModalSession !== null}
        onClose={() => setProModalSession(null)}
        sessionTitle={proModalSession?.title}
      />
    </div>
  );
}
