import { BrandLogo } from "@/components/brand/BrandLogo";

export const primaryButton = "flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-sauge-p px-6 py-4 text-[15px] font-medium text-white transition-colors hover:bg-encre focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sauge-p disabled:cursor-wait disabled:opacity-60";
export const inputClass = "mt-2 min-h-14 w-full rounded-md border border-filet bg-white px-4 py-3 text-base text-encre outline-none transition-colors focus:border-sauge-p focus:ring-2 focus:ring-sauge-voile disabled:opacity-60";

export function AccountBack({ onClick, label = "Retour" }: { onClick: () => void; label?: string }) {
  return <button type="button" onClick={onClick} className="inline-flex min-h-11 items-center gap-2 self-start rounded-full pr-4 text-sm text-gris-2 hover:text-encre focus-visible:outline-sauge-p">
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="m14 6-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>{label}
  </button>;
}

export function AccountBrand() {
  return <div className="flex justify-center py-7"><BrandLogo width={128} height={48} className="h-12 w-32 object-contain" /></div>;
}

export function GoogleIcon() {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.89-1.74 2.98-4.3 2.98-7.36Z" /><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.04.96-3.38.96-2.61 0-4.82-1.76-5.61-4.12H3.05v2.59A10 10 0 0 0 12 22Z" /><path fill="#FBBC05" d="M6.39 13.92a6 6 0 0 1 0-3.84V7.49H3.05a10 10 0 0 0 0 9.02l3.34-2.59Z" /><path fill="#EA4335" d="M12 5.96c1.47 0 2.79.5 3.82 1.49l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.95 5.49l3.34 2.59A5.99 5.99 0 0 1 12 5.96Z" /></svg>;
}

export function AppleIcon() {
  return <svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 12.54c.02 3.22 2.83 4.29 2.86 4.3-.02.08-.45 1.53-1.48 3.03-.89 1.3-1.82 2.59-3.28 2.62-1.43.04-1.89-.85-3.53-.85-1.63 0-2.15.82-3.5.89-1.41.05-2.48-1.41-3.38-2.7C2.9 17.18 1.5 12.34 3.39 9.07a5.26 5.26 0 0 1 4.47-2.7c1.39-.03 2.7.95 3.54.95.83 0 2.4-1.18 4.05-1.01.69.03 2.63.28 3.88 2.1-.1.06-2.31 1.35-2.28 4.13ZM14.38 4.57c.75-.91 1.26-2.17 1.12-3.43-1.08.04-2.39.72-3.17 1.63-.7.81-1.31 2.1-1.15 3.34 1.2.09 2.43-.62 3.2-1.54Z" /></svg>;
}
