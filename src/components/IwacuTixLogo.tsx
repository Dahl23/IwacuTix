import React from 'react';

export interface IwacuTixLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'horizontal' | 'badge' | 'icon' | 'wordmark' | 'stacked';
  theme?: 'light' | 'dark';
  showTagline?: boolean;
}

/**
 * Signature Ticket Emblem Icon
 * Featuring speed motion streaks, rotated admission pass, star punch cutout, and perforation line
 */
export const IwacuTicketEmblem: React.FC<{
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}> = ({ className = '', size = 'md' }) => {
  const iconPixelSizes = {
    xs: 'w-6 h-5',
    sm: 'w-7 h-6',
    md: 'w-9 h-7 sm:w-10 sm:h-8',
    lg: 'w-12 h-10 sm:w-14 sm:h-12',
    xl: 'w-16 h-14 sm:w-20 sm:h-16',
  };

  return (
    <div className={`relative shrink-0 flex items-center justify-center ${iconPixelSizes[size]} ${className}`}>
      <svg
        viewBox="0 0 44 36"
        className="w-full h-full drop-shadow-sm overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="itxEmblemGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFA114" />
            <stop offset="45%" stopColor="#FF6B00" />
            <stop offset="100%" stopColor="#FF2E00" />
          </linearGradient>
          <filter id="itxEmblemGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#FF6B00" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Speed motion streaks on the left */}
        <g stroke="url(#itxEmblemGradient)" strokeLinecap="round" opacity="0.95">
          <line x1="3" y1="9.5" x2="9" y2="8" strokeWidth="2.2" />
          <line x1="0.5" y1="18" x2="10.5" y2="15.5" strokeWidth="2.4" />
          <line x1="4.5" y1="26.5" x2="11.5" y2="25" strokeWidth="2.2" />
        </g>

        {/* Rotated Flying Ticket with Notches and Star Cutout */}
        <g transform="translate(25, 18) rotate(-13)" filter="url(#itxEmblemGlow)">
          {/* Main ticket body with rounded corners & entrance notches */}
          <path
            d="M -13,-9.5 
               L 12,-9.5 
               A 3.5,3.5 0 0,0 12,-2.5 
               L 12,2.5 
               A 3.5,3.5 0 0,0 12,9.5 
               L -13,9.5 
               A 3.8,3.8 0 0,0 -13,3 
               L -13,-3 
               A 3.8,3.8 0 0,0 -13,-9.5 Z"
            fill="url(#itxEmblemGradient)"
          />

          {/* Ticket Perforation Dashed Line */}
          <line
            x1="5"
            y1="-8.5"
            x2="5"
            y2="8.5"
            stroke="#090A0F"
            strokeWidth="1.2"
            strokeDasharray="1.8 1.8"
            strokeLinecap="round"
            opacity="0.8"
          />

          {/* Admission Star Punch Cutout */}
          <polygon
            points="-3.5,-5 -2,-1.4 1.8,-1.4 -1.2,0.9 -0.1,4.6 -3.5,2.4 -6.8,4.6 -5.7,0.9 -8.7,-1.4 -4.9,-1.4"
            fill="#090A0F"
          />
        </g>
      </svg>
    </div>
  );
};

export const IwacuTixLogo: React.FC<IwacuTixLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'horizontal',
  theme = 'light',
  showTagline = false,
}) => {
  const isDark = theme === 'dark';

  // 1. ICON ONLY VARIANT
  if (variant === 'icon') {
    return <IwacuTicketEmblem size={size} className={className} />;
  }

  // 2. BADGE VARIANT (Featured on Splash Screen & Hero)
  if (variant === 'badge') {
    const badgeCardSizes = {
      xs: 'w-40 py-3 px-4 rounded-2xl gap-2',
      sm: 'w-52 py-4 px-5 rounded-2xl gap-2.5',
      md: 'w-64 sm:w-72 py-6 px-6 sm:px-8 rounded-3xl gap-3.5',
      lg: 'w-80 py-7 px-8 rounded-[2rem] gap-4',
      xl: 'w-96 py-9 px-10 rounded-[2.5rem] gap-5',
    };

    const emblemBadgeSize = {
      xs: 'sm' as const,
      sm: 'md' as const,
      md: 'lg' as const,
      lg: 'xl' as const,
      xl: 'xl' as const,
    };

    const textBadgeSizes = {
      xs: 'text-xl',
      sm: 'text-2xl',
      md: 'text-3xl sm:text-4xl',
      lg: 'text-4xl sm:text-5xl',
      xl: 'text-5xl sm:text-6xl',
    };

    return (
      <div
        className={`relative flex flex-col items-center justify-center bg-[#090A0F] shadow-[0_20px_50px_-10px_rgba(249,115,22,0.3)] border border-neutral-800/90 overflow-hidden select-none group ${badgeCardSizes[size]} ${className}`}
      >
        {/* Subtle warm ambient lighting */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-orange-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* Dynamic Flying Ticket Emblem */}
        <IwacuTicketEmblem size={emblemBadgeSize[size]} className="drop-shadow-lg" />

        {/* Brand Name */}
        <div className={`font-display font-extrabold tracking-tight leading-none ${textBadgeSizes[size]}`}>
          <span className="text-white drop-shadow-sm">Iwacu</span>
          <span className="bg-gradient-to-r from-[#FFA114] via-[#FF6B00] to-[#FF2E00] bg-clip-text text-transparent drop-shadow-sm">
            Tix
          </span>
        </div>

        {/* Tagline Badge */}
        {showTagline && (
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-neutral-300 font-bold tracking-widest uppercase font-sans border-t border-neutral-800/80 pt-2.5 mt-0.5 w-full justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse shrink-0" />
            <span className="truncate">Tes tickets, tes événements</span>
          </div>
        )}
      </div>
    );
  }

  // 3. STACKED VARIANT
  if (variant === 'stacked') {
    return (
      <div className={`flex flex-col items-center justify-center text-center gap-2 select-none ${className}`}>
        <IwacuTicketEmblem size={size} />
        <div className="font-display font-extrabold tracking-tight leading-none text-2xl sm:text-3xl">
          <span className={isDark ? 'text-white' : 'text-slate-900'}>Iwacu</span>
          <span className="bg-gradient-to-r from-[#FFA114] via-[#FF6B00] to-[#FF2E00] bg-clip-text text-transparent">
            Tix
          </span>
        </div>
        {showTagline && (
          <span
            className={`font-semibold tracking-wider font-sans uppercase text-[10px] sm:text-xs ${
              isDark ? 'text-neutral-400' : 'text-slate-500'
            }`}
          >
            Tes tickets, tes événements
          </span>
        )}
      </div>
    );
  }

  // 4. WORDMARK ONLY VARIANT (without emblem)
  if (variant === 'wordmark') {
    const textSizes = {
      xs: 'text-base',
      sm: 'text-lg',
      md: 'text-xl sm:text-2xl',
      lg: 'text-3xl sm:text-4xl',
      xl: 'text-4xl sm:text-5xl',
    };

    return (
      <div className={`inline-flex items-center select-none font-display font-extrabold tracking-tight leading-none ${textSizes[size]} ${className}`}>
        <span className={isDark ? 'text-white' : 'text-slate-900'}>Iwacu</span>
        <span className="bg-gradient-to-r from-[#FFA114] via-[#FF6B00] to-[#FF2E00] bg-clip-text text-transparent">
          Tix
        </span>
      </div>
    );
  }

  // 5. HORIZONTAL / FULL VARIANT (Default: Perfectly adjusted Emblem + IwacuTix + Tagline)
  const textSizes = {
    xs: 'text-sm sm:text-base',
    sm: 'text-base sm:text-lg',
    md: 'text-xl sm:text-2xl',
    lg: 'text-2xl sm:text-3xl',
    xl: 'text-3xl sm:text-4xl',
  };

  const gapSizes = {
    xs: 'gap-1.5',
    sm: 'gap-2',
    md: 'gap-2.5 sm:gap-3',
    lg: 'gap-3 sm:gap-4',
    xl: 'gap-4 sm:gap-5',
  };

  return (
    <div className={`inline-flex items-center select-none ${gapSizes[size]} ${className}`}>
      {/* Emblem */}
      <IwacuTicketEmblem size={size} />

      {/* Brand Text Block */}
      <div className="flex items-center gap-2.5">
        <div className={`font-display font-extrabold tracking-tight leading-none ${textSizes[size]}`}>
          <span className={isDark ? 'text-white' : 'text-slate-900'}>Iwacu</span>
          <span className="bg-gradient-to-r from-[#FFA114] via-[#FF6B00] to-[#FF2E00] bg-clip-text text-transparent">
            Tix
          </span>
        </div>

        {/* Tagline: displayed gracefully on medium+ screens so header never wraps or stretches */}
        {showTagline && (
          <span
            className={`hidden sm:inline-flex items-center font-bold tracking-wider font-sans uppercase text-[9px] sm:text-[10px] border-l pl-2.5 ml-1 select-none leading-tight ${
              isDark
                ? 'border-neutral-700/80 text-neutral-400'
                : 'border-slate-300/80 text-slate-500'
            }`}
          >
            Tes tickets, tes événements
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * Pixel-precise Standalone SVG vector of the IwacuTix logo
 * With mathematical bounding box and no clipping, perfect for SVG downloads, PDF generation, or vector exports.
 */
export const IwacuTixLogoSVG: React.FC<{ theme?: 'light' | 'dark'; className?: string }> = ({
  theme = 'light',
  className = 'h-8 w-auto',
}) => {
  const isDark = theme === 'dark';
  const textColor = isDark ? '#FFFFFF' : '#0F172A';

  return (
    <svg
      viewBox="0 0 220 40"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="IwacuTix"
    >
      <defs>
        <linearGradient id="itxSvgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFA114" />
          <stop offset="50%" stopColor="#FF6B00" />
          <stop offset="100%" stopColor="#FF2E00" />
        </linearGradient>
      </defs>

      {/* Speed lines */}
      <g stroke="url(#itxSvgGrad)" strokeLinecap="round">
        <line x1="3" y1="11" x2="8.5" y2="9.5" strokeWidth="2.2" />
        <line x1="0.5" y1="20" x2="10" y2="17.5" strokeWidth="2.4" />
        <line x1="4.5" y1="29" x2="11.5" y2="27.5" strokeWidth="2.2" />
      </g>

      {/* Rotated Flying Ticket */}
      <g transform="translate(24, 20) rotate(-13)">
        <path
          d="M -13,-9.5 L 12,-9.5 A 3.5,3.5 0 0,0 12,-2.5 L 12,2.5 A 3.5,3.5 0 0,0 12,9.5 L -13,9.5 A 3.8,3.8 0 0,0 -13,3 L -13,-3 A 3.8,3.8 0 0,0 -13,-9.5 Z"
          fill="url(#itxSvgGrad)"
        />
        <line
          x1="5"
          y1="-8.5"
          x2="5"
          y2="8.5"
          stroke="#090A0F"
          strokeWidth="1.2"
          strokeDasharray="1.8 1.8"
          strokeLinecap="round"
          opacity="0.8"
        />
        <polygon
          points="-3.5,-5 -2,-1.4 1.8,-1.4 -1.2,0.9 -0.1,4.6 -3.5,2.4 -6.8,4.6 -5.7,0.9 -8.7,-1.4 -4.9,-1.4"
          fill="#090A0F"
        />
      </g>

      {/* Text Iwacu */}
      <text
        x="46"
        y="28"
        fontFamily="'Plus Jakarta Sans', 'Sora', system-ui, sans-serif"
        fontWeight="800"
        fontSize="26"
        fill={textColor}
        letterSpacing="-0.8"
      >
        Iwacu
      </text>

      {/* Text Tix */}
      <text
        x="132"
        y="28"
        fontFamily="'Plus Jakarta Sans', 'Sora', system-ui, sans-serif"
        fontWeight="800"
        fontSize="26"
        fill="url(#itxSvgGrad)"
        letterSpacing="-0.8"
      >
        Tix
      </text>
    </svg>
  );
};

export default IwacuTixLogo;

