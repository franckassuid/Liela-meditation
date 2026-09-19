import React from "react";
import { HeartIcon } from "@/components/ui/Icons";
import { getCatalogSessionById, getCategoryInfo, CatalogSession } from "@/config/sessionsCatalog";
import { getSessionById, getSituation } from "@/lib/sessions";
import { Favori, SessionHistoryItem } from "@/lib/storage";
import { formatHistoryDate } from "@/lib/history";

interface FavoritesListProps {
  favorites: Favori[];
  downloadedIds: Set<string>;
  onDiscover: () => void;
  handleSessionClick: (session: CatalogSession) => void;
  handleToggleFavorite: (session: CatalogSession, fromFavorites: boolean) => void;
}

interface HistoryListProps {
  history: SessionHistoryItem[];
  historyThisWeek: SessionHistoryItem[];
  historyEarlier: SessionHistoryItem[];
  favorites: Favori[];
  downloadedIds: Set<string>;
  onDiscover: () => void;
  onPlay: (sessionId: string) => void;
  handleToggleHistoryFavorite: (sessionId: string) => void;
}

export function FavoritesList({ favorites, downloadedIds, onDiscover, handleSessionClick, handleToggleFavorite }: FavoritesListProps) {
  return (
    <div className="flex flex-col flex-1">
      {favorites.length === 0 ? (
        /* Écran 6 : Favoris vide */
        <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-2">
          <span className="inline-flex w-[58px] h-[58px] rounded-full bg-coquille items-center justify-center mb-[14px]">
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#D8CAB4"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 20s-7-4.4-7-9.2A3.8 3.8 0 0 1 12 8.4 3.8 3.8 0 0 1 19 10.8C19 15.6 12 20 12 20Z" />
            </svg>
          </span>
          <p className="font-poppins font-light text-[19px] text-encre">
            Rien ici pour l&apos;instant
          </p>
          <p className="text-[13px] text-gris-2 leading-[1.5] mt-[8px] max-w-[280px]">
            À la fin d&apos;une séance, on vous demandera si vous voulez la retrouver. Celles que vous gardez apparaîtront ici.
          </p>
          <button
            onClick={onDiscover}
            className="inline-block mt-[16px] text-[13.5px] font-medium px-[18px] py-[11px] rounded-[12px] shadow-[inset_0_0_0_1px_var(--bord)] transition-colors active:bg-coquille"
          >
            Voir les situations
          </button>
        </div>
      ) : (
        /* Écran 5 : Liste des favoris */
        <div className="flex flex-col">
          <p className="text-[12.5px] font-medium text-gris-3 m-[6px_0_6px_2px]">
            {favorites.length} {favorites.length > 1 ? "séances" : "séance"}
          </p>
          <div className="flex flex-col">
            {favorites.map((fav) => {
              const session = getCatalogSessionById(fav.sessionId);
              if (!session) return null;
              const catInfo = getCategoryInfo(session.situationId);
              const isDownloaded = downloadedIds.has(session.realSessionId || session.id);

              return (
                <div
                  key={session.id}
                  onClick={() => handleSessionClick(session)}
                  className="flex items-center gap-[12px] py-[13px] px-[2px] border-b border-filet last:border-b-0 cursor-pointer active:bg-coquille/40 transition-colors"
                >
                  {/* Pastille de situation */}
                  <span
                    className="w-[9px] h-[9px] rounded-full shrink-0"
                    style={{ background: catInfo.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <b className="font-normal text-[15.5px] leading-[1.25] text-encre">
                        {session.title}
                      </b>
                      {isDownloaded && (
                        <span
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-[#5F6A52] bg-[#5F6A52]/10 px-1.5 py-0.5 rounded-full shrink-0"
                          title="Disponible hors ligne"
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Hors ligne
                        </span>
                      )}
                    </div>
                    <i className="block not-italic text-[12.5px] text-gris-3 mt-[2px]">
                      {Math.round(session.durationSeconds / 60)} min · {catInfo.label}
                    </i>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(session, true);
                    }}
                    className="p-1.5 -mr-1.5 transition-transform active:scale-90"
                    aria-label="Retirer des favoris"
                  >
                    <HeartIcon size={20} filled={true} className="text-[#A26248]" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function HistoryList({ history, historyThisWeek, historyEarlier, favorites, downloadedIds, onDiscover, onPlay, handleToggleHistoryFavorite }: HistoryListProps) {
  return (
    <div className="flex flex-col flex-1">
      {history.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-2">
          <span className="inline-flex w-[58px] h-[58px] rounded-full bg-coquille items-center justify-center mb-[14px]">
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#D8CAB4"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </span>
          <p className="font-poppins font-light text-[19px] text-encre">
            Aucune séance pour le moment
          </p>
          <p className="text-[13px] text-gris-2 leading-[1.5] mt-[8px] max-w-[280px]">
            Vos séances terminées apparaîtront ici.
          </p>
          <button
            onClick={onDiscover}
            className="inline-block mt-[16px] text-[13.5px] font-medium px-[18px] py-[11px] rounded-[12px] shadow-[inset_0_0_0_1px_var(--bord)] transition-colors active:bg-coquille"
          >
            Découvrir les séances
          </button>
        </div>
      ) : (
        <div className="flex flex-col">
          {[{ label: "Cette semaine", items: historyThisWeek }, { label: "Plus tôt", items: historyEarlier }].map(({ label, items }) => items.length > 0 && (
            <div key={label} className="flex flex-col">
              <p className="text-[13px] font-semibold text-gris-3 m-[16px_0_6px_2px]">
                {label}
              </p>
              <div className="flex flex-col">
                {items.map((item, idx) => {
                  const rawSession = getSessionById(item.sessionId);
                  const catSession = getCatalogSessionById(item.sessionId);
                  const title = rawSession?.metadata?.title || catSession?.title;
                  if (!title) return null;

                  const situationId = rawSession?.metadata?.situation || catSession?.situationId;
                  const sit = getSituation(situationId);
                  const durationSec = item.duration || rawSession?.metadata?.durationSeconds || catSession?.durationSeconds || 600;
                  const isFav = favorites.some((f) => f.sessionId === item.sessionId);
                  const playId = rawSession?.id || catSession?.realSessionId || item.sessionId;
                  const isDownloaded = downloadedIds.has(playId);

                  return (
                    <div
                      key={`${item.sessionId}-${item.startedAt}-${idx}`}
                      onClick={() => onPlay(playId)}
                      className="flex items-center gap-[12px] py-[13px] px-[2px] border-b border-filet last:border-b-0 cursor-pointer active:bg-coquille/40 transition-colors"
                    >
                      <span
                        className="w-[9px] h-[9px] rounded-full shrink-0"
                        style={{ background: sit?.color || "var(--bord)" }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <b className="font-normal text-[15.5px] leading-[1.25] text-encre whitespace-nowrap overflow-hidden text-ellipsis">
                            {title}
                          </b>
                          {isDownloaded && (
                            <span
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-[#5F6A52] bg-[#5F6A52]/10 px-1.5 py-0.5 rounded-full shrink-0"
                              title="Disponible hors ligne"
                            >
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              Hors ligne
                            </span>
                          )}
                        </div>
                        <i className="block not-italic text-[12.5px] text-gris-3 mt-[2px]">
                          {formatHistoryDate(item.startedAt)} ·{" "}
                          {Math.max(1, Math.round(durationSec / 60))} min
                        </i>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleHistoryFavorite(item.sessionId);
                        }}
                        className="p-1.5 -mr-1.5 transition-transform active:scale-90"
                        aria-label={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
                      >
                        <HeartIcon
                          size={20}
                          filled={isFav}
                          className={isFav ? "text-[#A26248]" : "text-[#C6BBA9]"}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
