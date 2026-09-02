"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { SessionCard } from "@/components/ui/SessionCard";
import sessionsData from "@/generated/sessions.json";
import { getSituation, getAvailableSituations } from "@/lib/sessions";

export default function ExplorePage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filtered = sessionsData.filter((session) => {
    const matchesCategory =
      selectedCategory === "all" || session.metadata.situation === selectedCategory;
    const searchLower = searchQuery.toLowerCase();
    const title = session.metadata.title || "";
    const desc = session.metadata.shortDescription || "";
    const matchesSearch =
      searchQuery.trim() === "" ||
      title.toLowerCase().includes(searchLower) ||
      desc.toLowerCase().includes(searchLower);
    return matchesCategory && matchesSearch;
  });

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
          Toutes
        </button>
        {getAvailableSituations().map((sit) => {
          const isSelected = selectedCategory === sit.id;
          return (
            <button
              key={sit.id}
              onClick={() => setSelectedCategory(sit.id)}
              className="px-3.5 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all duration-120 flex items-center gap-1.5"
              style={{
                backgroundColor: isSelected ? sit.color : sit.voile,
                color: isSelected ? sit.textColor : sit.color,
                boxShadow: isSelected ? "var(--p1)" : "none",
              }}
            >
              <span 
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: isSelected ? sit.textColor : sit.color }}
              />
              {sit.shortLabel}
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
            const situation = getSituation(session.metadata.situation);
            return (
              <SessionCard
                key={session.id}
                title={session.metadata.title}
                duration={session.metadata.durationSeconds}
                situationName={situation?.shortLabel}
                situationColor={situation?.color}
                situationVoile={situation?.voile}
                onClick={() => router.push(`/player?id=${session.id}`)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
