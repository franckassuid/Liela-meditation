import React from "react";
import { DownloadRecord } from "@/lib/storage";

// ── Typed prop interfaces ────────────────────────────────────────────────────

interface SettingsDownloadsProps {
  downloads: DownloadRecord[];
  favoritesCount: number;
  hasPendingFavorites: boolean;
  totalDownloadedMo: number;
  handleClearDownloads: () => void;
  onRemoveDownload?: (sessionId: string) => void;
  onBack: () => void;
}

interface SettingsHelpProps {
  expandedFaq: string | null;
  setExpandedFaq: (v: string | null) => void;
  onBack: () => void;
}

interface SettingsPrivacyProps {
  setShowExportSheet: (v: boolean) => void;
  setShowDeleteSheet: (v: boolean) => void;
  setShowFullPrivacy: (v: boolean) => void;
  onBack: () => void;
}

// ── Components ───────────────────────────────────────────────────────────────

export function SettingsDownloads({
  downloads,
  favoritesCount,
  hasPendingFavorites,
  totalDownloadedMo,
  handleClearDownloads,
  onRemoveDownload,
  onBack,
}: SettingsDownloadsProps) {
  return (
    <div className="p-marge pb-12 flex flex-col flex-1 max-w-[480px] w-full mx-auto animate-in fade-in">
      {/* Top sub */}
      <div className="flex items-center gap-[10px] pt-2 pb-[14px]">
        <button
          onClick={onBack}
          className="p-1 -ml-1 text-encre active:opacity-60 transition-opacity"
          aria-label="Retour aux réglages"
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#433528" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 5-7 7 7 7" />
          </svg>
        </button>
        <span className="font-poppins font-light text-[18px]">Téléchargements</span>
      </div>

      {/* Jauge */}
      <div className="bg-white rounded-[15px] p-[14px] mt-[2px] shadow-[0_1px_2px_rgba(67,53,40,0.04)]">
        <div className="flex items-baseline gap-2">
          <b className="font-poppins font-light text-[22px]">{totalDownloadedMo} Mo</b>
          <span className="text-[10.5px] text-[#9A8E7C]">
            {downloads.length} séance{downloads.length > 1 ? "s" : ""} · {favoritesCount} favori{favoritesCount > 1 ? "s" : ""}
          </span>
        </div>
        <div className="h-1 bg-[#F0E5D6] rounded-full mt-[10px] overflow-hidden">
          <i
            className="block h-full bg-[#5F6A52] rounded-full transition-all duration-300"
            style={{
              width: `${Math.max(2, Math.min(100, Math.round((totalDownloadedMo / 650) * 100)))}%`,
            }}
          />
        </div>
      </div>

      {hasPendingFavorites && (
        <p className="text-[10.5px] text-[#9A8E7C] leading-[1.5] mt-[7px] mx-[3px]">
          Un favori est en cours de téléchargement.
        </p>
      )}

      <p className="text-[10.5px] font-semibold text-[#9A8E7C] tracking-[0.02em] mt-[15px] mb-[6px] ml-[3px]">
        Sur cet appareil
      </p>
      <div className="bg-white rounded-[15px] overflow-hidden shadow-[0_1px_2px_rgba(67,53,40,0.04)]">
        {downloads.length === 0 ? (
          <div className="p-4 text-center text-[12.5px] text-[#7A6E5E]">
            Aucune séance téléchargée
          </div>
        ) : (
          downloads.map((item, idx) => {
            const itemMo = item.sizeBytes
              ? Math.round((item.sizeBytes / (1024 * 1024)) * 10) / 10
              : item.sizeMo ?? 0;

            return (
              <div
                key={`${item.sessionId}-${idx}`}
                className="flex items-center gap-[9px] p-[12px_13px] border-b border-[#F8EFE4] last:border-b-0"
              >
                <div className="flex-1 min-w-0">
                  <b className="block font-normal text-[13.5px] leading-[1.3] text-encre">
                    {item.title}
                  </b>
                  <span className="block text-[11px] text-[#9A8E7C] mt-0.5">
                    {itemMo > 0 ? `${itemMo} Mo · ` : ""}{Math.max(1, Math.round(item.duration / 60))} min
                  </span>
                </div>
                {item.isFavorite && (
                  <span className="flex shrink-0 mr-1" title="Dans vos favoris">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="#A26248"
                      stroke="#A26248"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-label="Favori"
                    >
                      <path d="M12 20s-7-4.4-7-9.2A3.8 3.8 0 0 1 12 8.4 3.8 3.8 0 0 1 19 10.8C19 15.6 12 20 12 20Z" />
                    </svg>
                  </span>
                )}
                {onRemoveDownload && (
                  <button
                    onClick={() => onRemoveDownload(item.sessionId)}
                    className="p-1.5 -mr-1 text-[#9A8E7C] hover:text-[#A0483C] active:scale-95 transition-colors cursor-pointer"
                    title="Supprimer cette séance"
                    aria-label={`Supprimer ${item.title}`}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {downloads.length > 0 && (
        <div className="bg-white rounded-[15px] overflow-hidden shadow-[0_1px_2px_rgba(67,53,40,0.04)] mt-[10px]">
          <div
            onClick={handleClearDownloads}
            className="flex items-center gap-[10px] p-[12px_13px] cursor-pointer active:bg-[#F8EFE4]/60 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <b className="block font-normal text-[13.5px] leading-[1.3] text-[#A0483C]">
                Tout supprimer
              </b>
            </div>
          </div>
        </div>
      )}

      <p className="text-[10.5px] text-[#9A8E7C] leading-[1.5] mt-[7px] mx-[3px]">
        Les téléchargements sont conservés dans le stockage local de cet appareil et restent disponibles sans connexion Internet.
      </p>
    </div>
  );
}

export function SettingsHelp({ expandedFaq, setExpandedFaq, onBack }: SettingsHelpProps) {
  return (
    <div className="p-marge pb-12 flex flex-col flex-1 max-w-[480px] w-full mx-auto animate-in fade-in">
      {/* Top sub */}
      <div className="flex items-center gap-[10px] pt-2 pb-[14px]">
        <button
          onClick={onBack}
          className="p-1 -ml-1 text-encre active:opacity-60 transition-opacity"
          aria-label="Retour aux réglages"
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#433528" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 5-7 7 7 7" />
          </svg>
        </button>
        <span className="font-poppins font-light text-[18px]">Aide et contact</span>
      </div>

      {/* FAQ */}
      <p className="text-[10.5px] font-semibold text-[#9A8E7C] tracking-[0.02em] mt-2 mb-[7px] ml-[3px]">
        Questions fréquentes
      </p>
      <div className="bg-white rounded-[15px] overflow-hidden shadow-[0_1px_2px_rgba(67,53,40,0.04)]">
        {/* Q1 */}
        <div
          onClick={() => setExpandedFaq(expandedFaq === "q1" ? null : "q1")}
          className="p-[12px_13px] border-b border-[#F8EFE4] cursor-pointer active:bg-[#F8EFE4]/60 transition-colors"
        >
          <div className="flex items-center justify-between gap-[10px]">
            <b className="font-normal text-[13.5px] leading-[1.3] text-encre">
              L&apos;audio se coupe quand je verrouille
            </b>
            <svg
              width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C6BBA9"
              strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
              className={`transition-transform duration-200 ${expandedFaq === "q1" ? "rotate-90" : ""}`}
            >
              <path d="m9 5 7 7-7 7" />
            </svg>
          </div>
          {expandedFaq === "q1" && (
            <p className="text-[11.5px] text-[#7A6E5E] leading-[1.55] mt-2 pt-2 border-t border-[#F8EFE4]">
              Liela a été pensée pour éviter le paradoxe du choix. Quand on a besoin d&apos;une pause, parcourir 200 séances rajoute de la charge mentale. L&apos;application choisit pour vous, en fonction de l&apos;heure et de vos besoins du moment.
            </p>
          )}
        </div>

        {/* Q2 */}
        <div
          onClick={() => setExpandedFaq(expandedFaq === "q2" ? null : "q2")}
          className="p-[12px_13px] border-b border-[#F8EFE4] cursor-pointer active:bg-[#F8EFE4]/60 transition-colors"
        >
          <div className="flex items-center justify-between gap-[10px]">
            <b className="font-normal text-[13.5px] leading-[1.3] text-encre">
              Comment fonctionne le minuteur
            </b>
            <svg
              width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C6BBA9"
              strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
              className={`transition-transform duration-200 ${expandedFaq === "q2" ? "rotate-90" : ""}`}
            >
              <path d="m9 5 7 7-7 7" />
            </svg>
          </div>
          {expandedFaq === "q2" && (
            <p className="text-[11.5px] text-[#7A6E5E] leading-[1.55] mt-2 pt-2 border-t border-[#F8EFE4]">
              Le minuteur d&apos;arrêt éteint progressivement la voix et le fond sonore pour vous laisser vous endormir paisiblement, sans réveil brutal ni sursaut.
            </p>
          )}
        </div>

        {/* Q3 */}
        <div
          onClick={() => setExpandedFaq(expandedFaq === "q3" ? null : "q3")}
          className="p-[12px_13px] cursor-pointer active:bg-[#F8EFE4]/60 transition-colors"
        >
          <div className="flex items-center justify-between gap-[10px]">
            <b className="font-normal text-[13.5px] leading-[1.3] text-encre">
              Puis-je écouter hors ligne
            </b>
            <svg
              width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C6BBA9"
              strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
              className={`transition-transform duration-200 ${expandedFaq === "q3" ? "rotate-90" : ""}`}
            >
              <path d="m9 5 7 7-7 7" />
            </svg>
          </div>
          {expandedFaq === "q3" && (
            <p className="text-[11.5px] text-[#7A6E5E] leading-[1.55] mt-2 pt-2 border-t border-[#F8EFE4]">
              En mode invité, sur votre appareil. Avec un compte, vos données sont synchronisées avec Firebase pour les retrouver sur vos autres appareils. Les fichiers audio téléchargés restent locaux.
            </p>
          )}
        </div>
      </div>

      {/* Nous écrire */}
      <p className="text-[10.5px] font-semibold text-[#9A8E7C] tracking-[0.02em] mt-4 mb-[7px] ml-[3px]">
        Nous écrire
      </p>
      <div className="bg-white rounded-[15px] overflow-hidden shadow-[0_1px_2px_rgba(67,53,40,0.04)]">
        <a
          href="mailto:bonjour@liela.app?subject=Question%20Liela"
          className="flex items-center gap-[10px] p-[12px_13px] cursor-pointer active:bg-[#F8EFE4]/60 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <b className="block font-normal text-[13.5px] leading-[1.3] text-encre">
              Envoyer un message
            </b>
            <i className="block not-italic text-[10.5px] text-[#9A8E7C] mt-[2px] leading-[1.35]">
              Réponse sous quelques jours
            </i>
          </div>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C6BBA9" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 5 7 7-7 7" />
          </svg>
        </a>
      </div>

      <p className="text-[10.5px] text-[#9A8E7C] leading-[1.5] mt-3 mx-[3px]">
        Liela n&apos;est pas un soin médical. Si vous traversez une période difficile, parlez-en à un professionnel de santé.
      </p>
    </div>
  );
}

export function SettingsPrivacy({ setShowExportSheet, setShowDeleteSheet, setShowFullPrivacy, onBack }: SettingsPrivacyProps) {
  return (
    <div className="p-marge pb-12 flex flex-col flex-1 max-w-[480px] w-full mx-auto animate-in fade-in">
      {/* Top sub */}
      <div className="flex items-center gap-[10px] pt-2 pb-[14px]">
        <button
          onClick={onBack}
          className="p-1 -ml-1 text-encre active:opacity-60 transition-opacity"
          aria-label="Retour aux réglages"
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#433528" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 5-7 7 7 7" />
          </svg>
        </button>
        <span className="font-poppins font-light text-[18px]">Confidentialité</span>
      </div>

      {/* Carte conf */}
      <div className="bg-white rounded-[15px] p-4 shadow-[0_1px_2px_rgba(67,53,40,0.04)]">
        <p className="font-poppins font-light text-[14.5px]">Ce que Liela sait de vous</p>
        <p className="text-[11.5px] text-[#7A6E5E] leading-[1.55] mt-[5px]">
          En mode invité, vos données restent sur cet appareil. Avec un compte, votre profil, vos favoris, votre historique, vos réglages et vos retours sont synchronisés avec Firebase.
        </p>

        <p className="font-poppins font-light text-[14.5px] mt-[14px]">Ce qui ne sort jamais</p>
        <p className="text-[11.5px] text-[#7A6E5E] leading-[1.55] mt-[5px]">
          Aucune donnée d&apos;usage n&apos;est envoyée à un serveur. Les recommandations sont calculées sur votre téléphone. Il n&apos;y a ni traceur, ni mesure d&apos;audience, ni publicité.
        </p>

        <p className="font-poppins font-light text-[14.5px] mt-[14px]">Ce que vous pouvez faire</p>
        <p className="text-[11.5px] text-[#7A6E5E] leading-[1.55] mt-[5px]">
          Exporter les données disponibles ou effacer vos données applicatives depuis les réglages. Le compte de connexion, les droits d’achat et les téléchargements sont conservés.
        </p>
      </div>

      <div className="bg-white rounded-[15px] overflow-hidden shadow-[0_1px_2px_rgba(67,53,40,0.04)] mt-[10px]">
        <div
          onClick={() => setShowFullPrivacy(true)}
          className="flex items-center gap-[10px] p-[12px_13px] cursor-pointer active:bg-[#F8EFE4]/60 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <b className="block font-normal text-[13.5px] leading-[1.3] text-encre">
              Politique complète
            </b>
          </div>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C6BBA9" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 5 7 7-7 7" />
          </svg>
        </div>
        <div
          onClick={() => setShowExportSheet(true)}
          className="flex items-center gap-[10px] p-[12px_13px] border-t border-[#F8EFE4] cursor-pointer active:bg-[#F8EFE4]/60 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <b className="block font-normal text-[13.5px] leading-[1.3] text-encre">
              Exporter mes données
            </b>
          </div>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C6BBA9" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 5 7 7-7 7" />
          </svg>
        </div>
        <div
          onClick={() => setShowDeleteSheet(true)}
          className="flex items-center gap-[10px] p-[12px_13px] border-t border-[#F8EFE4] cursor-pointer active:bg-[#F8EFE4]/60 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <b className="block font-normal text-[13.5px] leading-[1.3] text-[#A0483C]">
              Effacer mes données
            </b>
          </div>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C6BBA9" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 5 7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
}
