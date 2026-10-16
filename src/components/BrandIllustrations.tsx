import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
}

export const ValendoLogo: React.FC<LogoProps> = ({ size = 'md', showTagline = false }) => {
  const iconDimensions = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-12 h-12' : 'w-9 h-9';
  const textSize =
    size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl sm:text-3xl' : 'text-lg';

  return (
    <div className="inline-flex items-center gap-2.5 select-none group">
      {/* Playful Colorful Rounded Badge */}
      <div
        className={`${iconDimensions} rounded-2xl bg-zinc-900 border border-zinc-750 p-1 flex items-center justify-center shadow-sm group-hover:scale-105 group-hover:-rotate-3 transition-transform`}
      >
        <svg viewBox="0 0 128 128" fill="none" className="w-full h-full">
          <circle cx="30" cy="30" r="18" fill="#FB7185" fillOpacity="0.22" />
          <circle cx="98" cy="32" r="18" fill="#FBBF24" fillOpacity="0.22" />
          <circle cx="64" cy="98" r="22" fill="#34D399" fillOpacity="0.22" />

          {/* Left Wing (Coral -> Amber) */}
          <path
            d="M28 40C25.2 33.8 29.8 27 36.6 27H44C48.1 27 51.7 29.5 53.2 33.3L63.5 61L52 87C49 84.8 46.2 81 44 76.2L28 40Z"
            fill="url(#valendoLeftGrad)"
          />

          {/* Right Wing Checkmark (Sky -> Emerald) */}
          <path
            d="M52.5 85L75.5 32.2C77.1 28.4 80.8 26 85 26H92.2C99 26 103.6 33 100.8 39.2L73 95C70.6 99.8 65.8 102.5 60.5 102.5C55.2 102.5 50.5 99.5 48.3 94.8L52.5 85Z"
            fill="url(#valendoRightGrad)"
          />

          {/* Sunny Spark Dot */}
          <circle cx="98" cy="88" r="10" fill="#FBBF24" />
          <path
            d="M98 66L100.5 71.5L106 74L100.5 76.5L98 82L95.5 76.5L90 74L95.5 71.5L98 66Z"
            fill="#38BDF8"
          />

          <defs>
            <linearGradient
              id="valendoLeftGrad"
              x1="28"
              y1="27"
              x2="62"
              y2="88"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#FB7185" />
              <stop offset="1" stopColor="#FBBF24" />
            </linearGradient>
            <linearGradient
              id="valendoRightGrad"
              x1="96"
              y1="26"
              x2="52"
              y2="100"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#38BDF8" />
              <stop offset="0.55" stopColor="#34D399" />
              <stop offset="1" stopColor="#10B981" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="flex flex-col">
        <div className="flex items-baseline gap-0.5">
          <span
            className={`font-display font-extrabold tracking-tight text-zinc-100 group-hover:text-white transition-colors leading-none ${textSize}`}
          >
            Valendo
          </span>
          <span className={`font-display font-extrabold text-amber-400 leading-none ${textSize}`}>
            !
          </span>
        </div>
        {showTagline && (
          <span className="text-[10px] font-medium text-zinc-400 tracking-wide">
            tá valendo na sala!
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * Colorful flat-vector spot illustration for Step 1: Create / Choose Quiz
 */
export const StepCreateIllustration: React.FC<{ className?: string }> = ({
  className = 'w-20 h-20',
}) => (
  <svg viewBox="0 0 120 120" fill="none" className={className}>
    <circle cx="60" cy="60" r="48" fill="#F59E0B" fillOpacity="0.12" />
    {/* Floating Card */}
    <rect
      x="26"
      y="24"
      width="68"
      height="74"
      rx="14"
      fill="#18181B"
      stroke="#3F3F46"
      strokeWidth="3"
    />
    {/* Colorful Header Pill */}
    <rect x="36" y="36" width="32" height="10" rx="5" fill="#FB7185" />
    {/* Option Rows */}
    <rect x="36" y="54" width="48" height="8" rx="4" fill="#38BDF8" fillOpacity="0.85" />
    <rect x="36" y="68" width="40" height="8" rx="4" fill="#34D399" fillOpacity="0.85" />
    <rect x="36" y="82" width="28" height="8" rx="4" fill="#FBBF24" fillOpacity="0.85" />
    {/* Sparkle */}
    <path
      d="M94 22L97 30L105 33L97 36L94 44L91 36L83 33L91 30L94 22Z"
      fill="#FBBF24"
    />
  </svg>
);

/**
 * Colorful flat-vector spot illustration for Step 2: Project on Telão with QR & PIN
 */
export const StepProjectIllustration: React.FC<{ className?: string }> = ({
  className = 'w-20 h-20',
}) => (
  <svg viewBox="0 0 120 120" fill="none" className={className}>
    <circle cx="60" cy="60" r="48" fill="#38BDF8" fillOpacity="0.12" />
    {/* Projector Screen */}
    <rect
      x="18"
      y="26"
      width="84"
      height="58"
      rx="12"
      fill="#18181B"
      stroke="#38BDF8"
      strokeWidth="3"
    />
    {/* QR Box */}
    <rect x="28" y="36" width="24" height="24" rx="5" fill="#F4F4F5" />
    <rect x="32" y="40" width="6" height="6" rx="1" fill="#09090B" />
    <rect x="42" y="40" width="6" height="6" rx="1" fill="#09090B" />
    <rect x="32" y="50" width="6" height="6" rx="1" fill="#09090B" />
    <rect x="42" y="50" width="6" height="6" rx="1" fill="#10B981" />
    {/* PIN Bars */}
    <rect x="60" y="38" width="32" height="10" rx="4" fill="#FBBF24" />
    <rect x="60" y="54" width="24" height="6" rx="3" fill="#71717A" />
    {/* Stand */}
    <path d="M60 84V98M46 98H74" stroke="#52525B" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

/**
 * Colorful flat-vector spot illustration for Step 3: Students Answer on Mobile
 */
export const StepRespondIllustration: React.FC<{ className?: string }> = ({
  className = 'w-20 h-20',
}) => (
  <svg viewBox="0 0 120 120" fill="none" className={className}>
    <circle cx="60" cy="60" r="48" fill="#10B981" fillOpacity="0.12" />
    {/* Phone Body */}
    <rect
      x="36"
      y="18"
      width="48"
      height="84"
      rx="12"
      fill="#18181B"
      stroke="#34D399"
      strokeWidth="3"
    />
    {/* 4 Colorful Answer Tiles */}
    <rect x="43" y="34" width="15" height="15" rx="4" fill="#FB7185" />
    <rect x="62" y="34" width="15" height="15" rx="4" fill="#38BDF8" />
    <rect x="43" y="53" width="15" height="15" rx="4" fill="#FBBF24" />
    <rect x="62" y="53" width="15" height="15" rx="4" fill="#34D399" />
    {/* Bottom Check Pill */}
    <rect x="46" y="78" width="28" height="8" rx="4" fill="#F4F4F5" />
    {/* Floating Joy Dots */}
    <circle cx="24" cy="44" r="5" fill="#FB7185" />
    <circle cx="96" cy="52" r="6" fill="#FBBF24" />
    <circle cx="28" cy="76" r="4" fill="#38BDF8" />
  </svg>
);

/**
 * Playful Colorful Waiting Room / Lobby Illustration
 */
export const WaitingRoomIllustration: React.FC<{ className?: string }> = ({
  className = 'w-28 h-28',
}) => (
  <svg viewBox="0 0 160 120" fill="none" className={className}>
    <circle cx="80" cy="60" r="46" fill="#38BDF8" fillOpacity="0.10" />
    <circle cx="48" cy="52" r="24" fill="#FB7185" fillOpacity="0.12" />
    <circle cx="112" cy="66" r="26" fill="#FBBF24" fillOpacity="0.12" />

    {/* Floating Game Shapes */}
    <g className="animate-float-slow">
      <rect
        x="30"
        y="36"
        width="26"
        height="26"
        rx="8"
        transform="rotate(-12 30 36)"
        fill="#FB7185"
      />
      <rect
        x="67"
        y="26"
        width="28"
        height="28"
        rx="9"
        transform="rotate(8 67 26)"
        fill="#FBBF24"
      />
      <rect
        x="104"
        y="40"
        width="26"
        height="26"
        rx="8"
        transform="rotate(14 104 40)"
        fill="#34D399"
      />
    </g>

    {/* Connecting Signal Waves */}
    <path
      d="M44 84C64 72 96 72 116 84"
      stroke="#38BDF8"
      strokeWidth="3"
      strokeLinecap="round"
      strokeDasharray="6 6"
    />
    <circle cx="44" cy="84" r="5" fill="#38BDF8" />
    <circle cx="80" cy="75" r="6" fill="#FBBF24" />
    <circle cx="116" cy="84" r="5" fill="#34D399" />
  </svg>
);
