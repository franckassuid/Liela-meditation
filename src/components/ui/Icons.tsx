import React from "react";

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

export function HomeIcon({ size = 24, className = "", ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z" />
    </svg>
  );
}

export function ExploreIcon({ size = 24, className = "", ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <circle cx="11" cy="11" r="6.8" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

export function LibraryIcon({ size = 24, className = "", ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M4 5.5h5v14H4zM11.5 5.5h3v14h-3z" />
      <path d="m17.5 6.4 3 13.1" />
    </svg>
  );
}

export function HistoryIcon({ size = 24, className = "", ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </svg>
  );
}

export function ProfileIcon({ size = 24, className = "", ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <circle cx="12" cy="9" r="3.6" />
      <path d="M5.5 19.5c1.4-3 3.9-4.5 6.5-4.5s5.1 1.5 6.5 4.5" />
    </svg>
  );
}

export function SettingsIcon({ size = 24, className = "", ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <circle cx="12" cy="12" r="3.2"/>
      <path d="M19.4 14.5a1.6 1.6 0 0 0 .3 1.8 2 2 0 1 1-2.8 2.8 1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5 2 2 0 1 1-4 0 1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3 2 2 0 1 1-2.8-2.8 1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1 2 2 0 1 1 0-4 1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8 2 2 0 1 1 2.8-2.8 1.6 1.6 0 0 0 1.8.3 1.6 1.6 0 0 0 1-1.5 2 2 0 1 1 4 0 1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3 2 2 0 1 1 2.8 2.8 1.6 1.6 0 0 0-.3 1.8 1.6 1.6 0 0 0 1.5 1 2 2 0 1 1 0 4 1.6 1.6 0 0 0-1.5 1Z"/>
    </svg>
  );
}

export function SleepIcon({ size = 24, className = "", ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z" />
    </svg>
  );
}

export function StressIcon({ size = 24, className = "", ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M3 12h3l2-5 3 10 2.5-7 1.8 4H21" />
    </svg>
  );
}

export function FocusIcon({ size = 24, className = "", ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function BreathIcon({ size = 24, className = "", ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3.5v2.6M12 17.9v2.6M3.5 12h2.6M17.9 12h2.6" />
    </svg>
  );
}

export function EnergyIcon({ size = 24, className = "", ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M12 3.2c4 3.4 6 6.4 6 9a6 6 0 0 1-12 0c0-2.6 2-5.6 6-9Z" />
    </svg>
  );
}

export function EmotionsIcon({ size = 24, className = "", ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M4 16.5c3.5-1 5.5-4 6.5-8.5 2.5 3.5 5 5 9 5" />
      <circle cx="19.5" cy="13" r="1.6" />
    </svg>
  );
}

export function PlayIcon({ size = 24, className = "", ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M6 4l14 8-14 8V4z" />
    </svg>
  );
}

export function DownloadIcon({ size = 24, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M12 15V3M12 15L8 11M12 15L16 11M21 21H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function HeartIcon({ size = 24, className = "", filled = false }: IconProps & { filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M12.62 20.81c-.34.12-.9.12-1.24 0C8.48 19.82 2 15.69 2 8.69 2 5.6 4.49 3.1 7.56 3.1c1.82 0 3.43.88 4.44 2.24a5.53 5.53 0 0 1 4.44-2.24C19.51 3.1 22 5.6 22 8.69c0 7-6.48 11.13-9.38 12.12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function PauseIcon({ size = 24, className = "", ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M9 5v14M15 5v14" />
    </svg>
  );
}

export function RewindIcon({ size = 24, className = "", ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M11 5.5 4 12l7 6.5M20 5.5 13 12l7 6.5" />
    </svg>
  );
}

export function ForwardIcon({ size = 24, className = "", ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M13 5.5 20 12l-7 6.5M4 5.5 11 12l-7 6.5" />
    </svg>
  );
}

export function SoundMixerIcon({ size = 24, className = "", ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  );
}

export function LockIcon({ size = 16, className = "", ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

export function ShareIcon({ size = 20, className = "", ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

export function PlusSquareIcon({ size = 20, className = "", ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

export function SmartphoneIcon({ size = 20, className = "", ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <rect x="5" y="2" width="14" height="20" rx="3" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}

export function AppleIcon({ size = 18, className = "", ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.85c.57-.69.96-1.65.85-2.61-.83.03-1.84.55-2.44 1.25-.53.61-.99 1.58-.87 2.52.93.07 1.89-.47 2.46-1.16Z" />
    </svg>
  );
}

export function AndroidIcon({ size = 18, className = "", ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-1.0002s.4482-.9997.9993-.9997c.5516 0 .9997.4481.9997.9997 0 .5516-.4481 1.0002-.9997 1.0002m-11.046 0c-.5511 0-.9993-.4486-.9993-1.0002s.4482-.9997.9993-.9997c.5516 0 .9997.4481.9997.9997 0 .5516-.4481 1.0002-.9997 1.0002m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.411 13.8533 8 12 8s-3.5902.411-5.1368.9506L4.841 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.6889-7.5743-6.1185-9.4396" />
    </svg>
  );
}

export function MoreVerticalIcon({ size = 20, className = "", ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="12" cy="19" r="1.5" />
    </svg>
  );
}

export function MaximizeIcon({ size = 20, className = "", ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </svg>
  );
}

export function MinimizeIcon({ size = 20, className = "", ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
    </svg>
  );
}

export function WhatsAppIcon({ size = 20, className = "", ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path d="M17.472 14.382c-.301-.15-1.78-.878-2.056-.979-.276-.1-.476-.15-.677.15-.2.3-.777.98-1.002 1.23-.226.25-.452.28-.753.13-.301-.15-1.27-.468-2.42-1.493-.895-.798-1.5-1.785-1.676-2.086-.176-.301-.019-.464.132-.614.135-.135.301-.351.452-.527.15-.176.2-.301.301-.502.1-.2.05-.376-.025-.526-.075-.15-.677-1.633-.928-2.235-.245-.587-.494-.507-.677-.517-.176-.01-.376-.01-.577-.01-.2 0-.527.075-.803.376-.276.3-1.053 1.029-1.053 2.509s1.079 2.91 1.229 3.11c.15.2 2.122 3.24 5.141 4.544.718.31 1.278.496 1.715.635.722.23 1.378.197 1.898.12.58-.087 1.78-.727 2.03-1.429.251-.702.251-1.304.176-1.429-.075-.126-.276-.201-.577-.351zM12.04 2C6.527 2 2.05 6.478 2.05 11.99c0 1.956.564 3.784 1.542 5.337L2 22l4.836-1.541a9.92 9.92 0 0 0 5.204 1.472c5.513 0 9.99-4.478 9.99-9.99C22.03 6.478 17.553 2 12.04 2zm0 18.232a8.27 8.27 0 0 1-4.223-1.157l-.303-.18-2.87.915.932-2.798-.198-.314a8.267 8.267 0 1 1 6.662 3.534z" />
    </svg>
  );
}

export function LielaEmblem({
  width = 14,
  height = 14,
  className = "",
}: {
  width?: number;
  height?: number;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 100 100" width={width} height={height} className={`block shrink-0 ${className}`} aria-hidden="true">
      <path
        fill="#919780"
        d="M15.23 6.27C14.97 6.55 14.97 6.55 14.99 34.79C15.01 63.04 15.01 63.04 15.23 64.48C15.98 69.58 17.66 74.06 20.41 78.24C21.04 79.18 22.26 80.83 22.73 81.37C24.46 83.32 24.79 83.65 26.6 85.22C27.61 86.11 30.54 88.15 31.88 88.9C33.2 89.65 34.69 90.34 36.84 91.2C37.55 91.49 39.6 92.11 41.15 92.51C46.7 93.94 53.08 94 59.4 92.69C60.45 92.48 60.85 92.37 62.32 91.91C67.7 90.27 71.9 87.92 75.84 84.35C77.18 83.15 77.53 82.73 77.23 82.73C77.17 82.73 76.82 82.94 76.46 83.19C76.1 83.44 75.64 83.73 75.43 83.84C74.71 84.25 71.49 85.87 70.74 86.22C67.82 87.51 64.74 88.35 61.7 88.66C61.18 88.72 60.51 88.8 60.22 88.85C59.53 88.96 55.9 88.96 55.05 88.85C54.69 88.8 54.07 88.72 53.68 88.67C52.02 88.46 49.22 87.79 47.45 87.18C46.34 86.8 43.93 85.59 42.67 84.79C39.54 82.79 38.22 81.68 36.09 79.3C35.05 78.14 33.3 75.76 32.75 74.76C32.65 74.59 32.46 74.25 32.33 74.02C31.52 72.59 30.63 70.68 30.27 69.62C29.92 68.58 29.44 66.84 29.34 66.3C29.28 66 29.22 65.74 29.2 65.7C29.12 65.57 28.68 62.84 28.57 61.79C28.49 61 28.45 54.83 28.4 38.2C28.36 16.64 28.35 15.66 28.18 15.13C28.09 14.82 27.98 14.41 27.93 14.2C27.5 12.16 26.01 9.86 24.2 8.47C21.94 6.72 19.82 6 16.98 6C15.5 6 15.5 6 15.23 6.27Z"
      />
      <path
        fill="#D09B83"
        stroke="#FDF9F0"
        strokeWidth="2.4"
        d="M84.25 49.45C84.19 49.54 82.63 50.58 81.69 51.19C81.04 51.59 80.2 52.02 79.35 52.38C78.94 52.57 78.5 52.75 78.4 52.8C77.4 53.26 75.29 53.91 74.04 54.14C73.64 54.22 73.12 54.32 72.89 54.37C72.5 54.47 71.85 54.55 70.01 54.74C68.83 54.87 65.01 55.1 62.05 55.21C60.61 55.27 59.19 55.36 58.9 55.4C58.61 55.44 58.09 55.52 57.73 55.57C57.08 55.66 56.85 55.72 55.18 56.19C52.86 56.84 50.87 57.7 49.18 58.79C47.6 59.8 45.7 61.54 44.48 63.07C43.11 64.77 41.56 67.71 41.15 69.4C41.02 69.92 40.87 70.52 40.81 70.71C40.61 71.46 40.36 73.22 40.36 73.9C40.36 74.88 40.62 77.06 40.77 77.42C40.85 77.59 40.98 77.73 41.06 77.73C41.15 77.73 42.11 76.82 43.19 75.7C44.29 74.59 45.57 73.36 46.04 72.98C46.97 72.21 49.05 70.8 50.47 69.94C51.64 69.23 53.54 68.34 55.22 67.71C55.63 67.55 56.13 67.37 56.32 67.29C57.51 66.85 58.75 66.5 59.91 66.28C60.29 66.21 60.9 66.09 61.25 66.01C62.2 65.8 62.41 65.82 62.41 66.09C62.41 66.26 62.36 66.31 62.08 66.36C61.33 66.48 57.29 68.24 56.07 68.97C55.86 69.09 55.61 69.23 55.5 69.28C55.28 69.39 53.69 70.45 53.01 70.96C52.76 71.15 52.19 71.56 51.76 71.88C50.15 73.07 48.8 74.44 46.99 76.71C46.05 77.89 45.58 78.58 45.29 79.23C45.18 79.48 45 79.85 44.9 80.07C44.8 80.29 44.71 80.53 44.71 80.62C44.71 81.21 48.23 82.78 51.11 83.46C54.21 84.2 56.9 84.29 60.56 83.79C63.93 83.32 67.7 81.89 70.75 79.91C73.52 78.13 77.01 74.77 78.64 72.34C79.41 71.19 80.21 69.95 80.21 69.9C80.21 69.87 80.37 69.56 80.59 69.23C82.05 66.81 83.79 62.09 84.25 59.33C84.27 59.13 84.36 58.75 84.43 58.5C84.54 58.08 84.72 56.56 84.93 54.05C85.03 52.99 84.95 49.78 84.82 49.53C84.74 49.36 84.33 49.3 84.25 49.45Z"
      />
    </svg>
  );
}


