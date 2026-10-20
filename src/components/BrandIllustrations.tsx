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
    <g>
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

/**
 * Empty State Illustration: No Quizzes Found / Create First Quiz
 */
export const EmptyQuizzesIllustration: React.FC<{ className?: string }> = ({
  className = 'w-28 h-24',
}) => (
  <svg viewBox="0 0 160 120" fill="none" className={className}>
    <circle cx="80" cy="60" r="46" fill="#FBBF24" fillOpacity="0.10" />
    <circle cx="46" cy="72" r="22" fill="#38BDF8" fillOpacity="0.12" />
    <circle cx="116" cy="44" r="20" fill="#FB7185" fillOpacity="0.12" />

    {/* Back tilted card */}
    <rect
      x="42"
      y="28"
      width="56"
      height="66"
      rx="12"
      transform="rotate(-8 42 28)"
      fill="#18181B"
      stroke="#3F3F46"
      strokeWidth="2.5"
    />

    {/* Front main card */}
    <rect
      x="58"
      y="24"
      width="58"
      height="68"
      rx="12"
      fill="#1F1F26"
      stroke="#52525B"
      strokeWidth="2.5"
    />
    <rect x="68" y="36" width="28" height="8" rx="4" fill="#FBBF24" />
    <rect x="68" y="50" width="38" height="6" rx="3" fill="#38BDF8" fillOpacity="0.85" />
    <rect x="68" y="61" width="32" height="6" rx="3" fill="#34D399" fillOpacity="0.85" />
    <rect x="68" y="72" width="22" height="6" rx="3" fill="#FB7185" fillOpacity="0.85" />

    {/* Floating Plus / Spark Badge */}
    <g>
      <circle cx="112" cy="78" r="16" fill="#FBBF24" />
      <path
        d="M112 71V85M105 78H119"
        stroke="#09090B"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M36 30L38 35L43 37L38 39L36 44L34 39L29 37L34 35L36 30Z"
        fill="#38BDF8"
      />
    </g>
  </svg>
);

/**
 * Empty State Illustration: No Reports / Class Diagnostics History Yet
 */
export const EmptyReportsIllustration: React.FC<{ className?: string }> = ({
  className = 'w-28 h-24',
}) => (
  <svg viewBox="0 0 160 120" fill="none" className={className}>
    <circle cx="80" cy="60" r="46" fill="#34D399" fillOpacity="0.10" />
    <circle cx="114" cy="68" r="24" fill="#38BDF8" fillOpacity="0.12" />

    {/* Analytics Board */}
    <rect
      x="34"
      y="24"
      width="92"
      height="72"
      rx="14"
      fill="#18181B"
      stroke="#3F3F46"
      strokeWidth="2.5"
    />

    {/* Rising Bars */}
    <rect x="50" y="64" width="12" height="18" rx="4" fill="#FB7185" />
    <rect x="68" y="52" width="12" height="30" rx="4" fill="#38BDF8" />
    <rect x="86" y="42" width="12" height="40" rx="4" fill="#34D399" />
    <rect x="104" y="34" width="12" height="48" rx="4" fill="#FBBF24" />

    {/* Trend Line */}
    <path
      d="M54 56L74 44L92 36L110 26"
      stroke="#F4F4F5"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="110" cy="26" r="4.5" fill="#FBBF24" />
  </svg>
);

/**
 * Student Waiting After Answering Illustration (Rocket / Paper Plane Launch)
 */
export const AnswerSentIllustration: React.FC<{ className?: string }> = ({
  className = 'w-24 h-24',
}) => (
  <svg viewBox="0 0 120 120" fill="none" className={className}>
    <circle cx="60" cy="60" r="46" fill="#34D399" fillOpacity="0.12" />
    <circle cx="40" cy="78" r="22" fill="#38BDF8" fillOpacity="0.12" />

    <g>
      {/* Glowing Sent Card */}
      <rect
        x="34"
        y="26"
        width="52"
        height="52"
        rx="16"
        fill="#18181B"
        stroke="#34D399"
        strokeWidth="3"
      />
      {/* Checkmark inside */}
      <path
        d="M48 52L56 60L73 43"
        stroke="#34D399"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Sparkles */}
      <path
        d="M94 26L96.5 32L102.5 34.5L96.5 37L94 43L91.5 37L85.5 34.5L91.5 32L94 26Z"
        fill="#FBBF24"
      />
      <circle cx="26" cy="42" r="4.5" fill="#38BDF8" />
    </g>

    {/* Speed lines */}
    <path
      d="M46 90V100M60 86V102M74 90V98"
      stroke="#38BDF8"
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * Student Round Result: Correct Answer Celebration Illustration
 */
export const CorrectAnswerIllustration: React.FC<{ className?: string }> = ({
  className = 'w-24 h-24',
}) => (
  <svg viewBox="0 0 120 120" fill="none" className={className}>
    <circle cx="60" cy="60" r="46" fill="#10B981" fillOpacity="0.16" />
    <circle cx="60" cy="60" r="32" fill="#10B981" fillOpacity="0.24" />

    <g>
      {/* Emerald Victory Shield/Circle */}
      <circle cx="60" cy="58" r="26" fill="#10B981" />
      <path
        d="M48 58L56 66L73 49"
        stroke="#09090B"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Confetti & Stars */}
      <path
        d="M94 24L96.5 30L102.5 32.5L96.5 35L94 41L91.5 35L85.5 32.5L91.5 30L94 24Z"
        fill="#FBBF24"
      />
      <path
        d="M26 30L28 34.5L32.5 36.5L28 38.5L26 43L24 38.5L19.5 36.5L24 34.5L26 30Z"
        fill="#38BDF8"
      />
      <circle cx="28" cy="82" r="5" fill="#FB7185" />
      <rect
        x="88"
        y="76"
        width="10"
        height="10"
        rx="3"
        transform="rotate(20 88 76)"
        fill="#FBBF24"
      />
    </g>
  </svg>
);

/**
 * Student Round Result: Encouraging Keep Going Illustration (for Incorrect Answer)
 */
export const KeepGoingIllustration: React.FC<{ className?: string }> = ({
  className = 'w-24 h-24',
}) => (
  <svg viewBox="0 0 120 120" fill="none" className={className}>
    <circle cx="60" cy="60" r="46" fill="#FB7185" fillOpacity="0.14" />
    <circle cx="76" cy="48" r="26" fill="#FBBF24" fillOpacity="0.12" />

    <g>
      {/* Target / Learning Bulb Badge */}
      <rect
        x="34"
        y="32"
        width="52"
        height="52"
        rx="16"
        fill="#18181B"
        stroke="#FB7185"
        strokeWidth="3"
      />
      {/* Upward learning arrow + spark */}
      <path
        d="M46 66L58 54L64 60L76 46"
        stroke="#FBBF24"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M67 46H76V55"
        stroke="#FBBF24"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="26" cy="48" r="4.5" fill="#FB7185" />
      <circle cx="94" cy="70" r="5" fill="#38BDF8" />
    </g>
  </svg>
);

/**
 * Student Round Result: Time Up Stopwatch Illustration
 */
export const TimeUpIllustration: React.FC<{ className?: string }> = ({
  className = 'w-24 h-24',
}) => (
  <svg viewBox="0 0 120 120" fill="none" className={className}>
    <circle cx="60" cy="62" r="44" fill="#FBBF24" fillOpacity="0.12" />

    <g>
      {/* Top stopwatch button */}
      <rect x="52" y="18" width="16" height="6" rx="3" fill="#FBBF24" />
      <path d="M60 24V30" stroke="#FBBF24" strokeWidth="4" strokeLinecap="round" />
      {/* Stopwatch body */}
      <circle
        cx="60"
        cy="62"
        r="30"
        fill="#18181B"
        stroke="#FBBF24"
        strokeWidth="3.5"
      />
      {/* Hands */}
      <path
        d="M60 46V62L70 68"
        stroke="#FB7185"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Alarm waves */}
      <path
        d="M24 42C20 48 20 56 24 62M96 42C100 48 100 56 96 62"
        stroke="#38BDF8"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </g>
  </svg>
);

/**
 * Student Round Result: Opinion / Word Cloud / Poll Contribution Illustration
 */
export const OpinionRegisteredIllustration: React.FC<{ className?: string }> = ({
  className = 'w-24 h-24',
}) => (
  <svg viewBox="0 0 120 120" fill="none" className={className}>
    <circle cx="60" cy="60" r="46" fill="#38BDF8" fillOpacity="0.14" />

    <g>
      {/* Back speech bubble */}
      <rect
        x="48"
        y="26"
        width="48"
        height="36"
        rx="12"
        fill="#38BDF8"
      />
      {/* Front speech bubble */}
      <rect
        x="24"
        y="46"
        width="54"
        height="40"
        rx="12"
        fill="#18181B"
        stroke="#34D399"
        strokeWidth="3"
      />
      <rect x="34" y="58" width="34" height="6" rx="3" fill="#34D399" />
      <rect x="34" y="70" width="22" height="6" rx="3" fill="#FBBF24" />
      <circle cx="94" cy="78" r="5" fill="#FB7185" />
    </g>
  </svg>
);

/**
 * Leaderboard / Ranking Podium Badge Illustration
 */
export const LeaderboardBadgeIllustration: React.FC<{ className?: string }> = ({
  className = 'w-24 h-24',
}) => (
  <svg viewBox="0 0 120 120" fill="none" className={className}>
    <circle cx="60" cy="60" r="46" fill="#FBBF24" fillOpacity="0.12" />
    <circle cx="60" cy="40" r="24" fill="#38BDF8" fillOpacity="0.12" />

    {/* Podium Steps */}
    <rect x="24" y="64" width="22" height="28" rx="5" fill="#38BDF8" />
    <rect x="49" y="48" width="22" height="44" rx="5" fill="#FBBF24" />
    <rect x="74" y="70" width="22" height="22" rx="5" fill="#FB7185" />

    {/* Floating Crown above 1st place */}
    <g>
      <path
        d="M48 38L52 26L60 33L68 26L72 38H48Z"
        fill="#FBBF24"
        stroke="#FEF08A"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="42" r="4" fill="#34D399" />
      <circle cx="88" cy="48" r="4.5" fill="#FB7185" />
    </g>
  </svg>
);

/**
 * AI Quiz Generator Studio Header Illustration
 */
export const AiStudioIllustration: React.FC<{ className?: string }> = ({
  className = 'w-20 h-16',
}) => (
  <svg viewBox="0 0 160 110" fill="none" className={className}>
    <circle cx="80" cy="55" r="42" fill="#FBBF24" fillOpacity="0.12" />
    <circle cx="48" cy="60" r="24" fill="#38BDF8" fillOpacity="0.14" />
    <circle cx="114" cy="48" r="22" fill="#34D399" fillOpacity="0.14" />

    {/* Source Document Card */}
    <rect
      x="26"
      y="28"
      width="44"
      height="54"
      rx="10"
      fill="#18181B"
      stroke="#38BDF8"
      strokeWidth="2.5"
    />
    <rect x="34" y="38" width="24" height="5" rx="2.5" fill="#38BDF8" />
    <rect x="34" y="48" width="28" height="4" rx="2" fill="#71717A" />
    <rect x="34" y="56" width="20" height="4" rx="2" fill="#71717A" />
    <rect x="34" y="64" width="26" height="4" rx="2" fill="#71717A" />

    {/* Magic Wand / AI Spark Bridge */}
    <path
      d="M74 55H88"
      stroke="#FBBF24"
      strokeWidth="3"
      strokeLinecap="round"
      strokeDasharray="4 4"
    />
    <path
      d="M81 24L84 32L92 35L84 38L81 46L78 38L70 35L78 32L81 24Z"
      fill="#FBBF24"
    />

    {/* Generated Interactive Quiz Cards */}
    <g>
      <rect
        x="92"
        y="24"
        width="46"
        height="58"
        rx="10"
        fill="#18181B"
        stroke="#34D399"
        strokeWidth="2.5"
      />
      <rect x="100" y="34" width="13" height="13" rx="3.5" fill="#FB7185" />
      <rect x="117" y="34" width="13" height="13" rx="3.5" fill="#38BDF8" />
      <rect x="100" y="51" width="13" height="13" rx="3.5" fill="#FBBF24" />
      <rect x="117" y="51" width="13" height="13" rx="3.5" fill="#34D399" />
      <rect x="102" y="70" width="26" height="5" rx="2.5" fill="#F4F4F5" />
    </g>
  </svg>
);

/**
 * Final Podium Celebration Header Illustration
 */
export const PodiumCelebrationIllustration: React.FC<{ className?: string }> = ({
  className = 'w-28 h-24',
}) => (
  <svg viewBox="0 0 160 120" fill="none" className={className}>
    <circle cx="80" cy="60" r="46" fill="#FBBF24" fillOpacity="0.14" />
    <circle cx="44" cy="68" r="24" fill="#38BDF8" fillOpacity="0.12" />
    <circle cx="116" cy="68" r="24" fill="#FB7185" fillOpacity="0.12" />

    <g>
      {/* Golden Trophy Cup */}
      <path
        d="M58 28H102V50C102 62.15 92.15 72 80 72C67.85 72 58 62.15 58 50V28Z"
        fill="url(#trophyGoldGrad)"
      />
      {/* Trophy Handles */}
      <path
        d="M58 34H48C44.5 34 42 36.5 42 40C42 46 47 51 53 51H58"
        stroke="#FBBF24"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M102 34H112C115.5 34 118 36.5 118 40C118 46 113 51 107 51H102"
        stroke="#FBBF24"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* Stem & Base */}
      <path d="M80 72V88" stroke="#F59E0B" strokeWidth="6" strokeLinecap="round" />
      <rect x="60" y="86" width="40" height="10" rx="5" fill="#FBBF24" />
      {/* Star inside Trophy */}
      <path
        d="M80 37L83 44L90 45L85 50L86 57L80 53.5L74 57L75 50L70 45L77 44L80 37Z"
        fill="#09090B"
      />

      {/* Celebratory Confetti & Sparkles */}
      <circle cx="30" cy="34" r="5" fill="#FB7185" />
      <circle cx="130" cy="32" r="5.5" fill="#34D399" />
      <rect
        x="28"
        y="74"
        width="10"
        height="10"
        rx="3"
        transform="rotate(-18 28 74)"
        fill="#38BDF8"
      />
      <rect
        x="124"
        y="72"
        width="10"
        height="10"
        rx="3"
        transform="rotate(22 124 72)"
        fill="#FB7185"
      />
    </g>

    <defs>
      <linearGradient
        id="trophyGoldGrad"
        x1="58"
        y1="28"
        x2="102"
        y2="72"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#FDE047" />
        <stop offset="1" stopColor="#F59E0B" />
      </linearGradient>
    </defs>
  </svg>
);

