import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Event } from '../types';
import { 
  Ticket, 
  Info, 
  Calendar, 
  MapPin, 
  ChevronLeft, 
  ChevronRight, 
  Flame, 
  Sparkles, 
  Play, 
  Pause,
  ShieldCheck,
  Tag
} from 'lucide-react';

interface NetflixHeroSliderProps {
  events: Event[];
  autoPlayInterval?: number;
}

export const NetflixHeroSlider: React.FC<NetflixHeroSliderProps> = ({
  events,
  autoPlayInterval = 5500,
}) => {
  const navigate = useNavigate();
  // Pick featured or top events (minimum 3, up to 5)
  const heroEvents = events.length > 0 
    ? (events.filter((e) => e.isFeatured).length >= 2 
        ? [...events.filter((e) => e.isFeatured), ...events.filter((e) => !e.isFeatured)].slice(0, 5)
        : events.slice(0, 5))
    : [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const total = heroEvents.length;

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % total);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  // Autoplay management
  useEffect(() => {
    if (!isPlaying || total <= 1) return;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % total);
    }, autoPlayInterval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, isPlaying, total, autoPlayInterval]);

  // Touch swipe handling for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      nextSlide();
    } else if (isRightSwipe) {
      prevSlide();
    }
    setTouchStart(null);
    setTouchEnd(null);
  };

  if (total === 0) return null;

  const currentEvent = heroEvents[currentIndex];

  const getMinPrice = (evt: Event) => {
    if (!evt.ticketCategories || evt.ticketCategories.length === 0) return 0;
    return Math.min(...evt.ticketCategories.map((tc) => tc.price));
  };

  const formatPrice = (price: number) => {
    if (price === 0) return 'Gratuit';
    return `${price.toLocaleString('fr-FR')} FBu`;
  };

  // Custom promotional labels for each slide
  const getBadgeForIndex = (index: number, evt: Event) => {
    if (index === 0) {
      return {
        label: 'TOP 1 AU BURUNDI • TENDANCE',
        color: 'bg-rose-600 text-white border-rose-500',
        icon: Flame,
      };
    }
    if (index === 1) {
      return {
        label: 'NOUVEAU SUR IWACUTIX • PLACE LIMITÉE',
        color: 'bg-amber-500 text-black font-extrabold border-amber-400',
        icon: Sparkles,
      };
    }
    if (evt.category === 'sport') {
      return {
        label: 'GRAND MATCH • DERBY NATIONAL',
        color: 'bg-emerald-600 text-white border-emerald-500',
        icon: Flame,
      };
    }
    return {
      label: 'ÉVÉNEMENT RECOMMANDÉ',
      color: 'bg-indigo-600 text-white border-indigo-500',
      icon: Sparkles,
    };
  };

  const badge = getBadgeForIndex(currentIndex, currentEvent);
  const BadgeIcon = badge.icon;

  return (
    <div
      className="relative w-full -mx-4 sm:-mx-6 md:-mx-8 lg:-mx-12 overflow-hidden bg-slate-950 select-none group"
      onMouseEnter={() => setIsPlaying(false)}
      onMouseLeave={() => setIsPlaying(true)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Dynamic Background Image Layers with cross-fade */}
      <div className="relative h-[clamp(420px,70vh,600px)] w-full overflow-hidden">
        {heroEvents.map((evt, idx) => {
          const isActive = idx === currentIndex;
          return (
            <div
              key={evt.id}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                isActive ? 'opacity-100 z-10 scale-100' : 'opacity-0 z-0 pointer-events-none scale-105'
              } transition-transform duration-7000`}
            >
              <img
                src={evt.imageUrl}
                alt={evt.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center transform scale-105 group-hover:scale-100 transition-transform duration-1000"
              />
            </div>
          );
        })}

        {/* Cinematic Netflix-style Vignette & Gradients */}
        {/* Bottom deep fade for content & typography */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-transparent z-20" />
        
        {/* Left-side dark mask for desktop readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/50 to-transparent z-20" />
        
        {/* Top subtle fade to blend with navbar */}
        <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-black/60 to-transparent z-20" />

        {/* Content Overlay (constrained & centered over full-bleed background) */}
        <div className="absolute inset-0 z-30">
          <div className="mx-auto flex h-full w-full max-w-[1400px] flex-col justify-between px-5 sm:px-6 md:px-8 lg:px-[clamp(24px,5vw,96px)] py-5 sm:py-8 md:py-10 lg:py-14 text-white">
          
          {/* Top Bar inside Billboard: Category tag & Controls */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-mono tracking-wider uppercase font-bold border shadow-lg truncate min-w-0 ${badge.color}`}>
                <BadgeIcon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate min-w-0">{badge.label}</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-white/10 backdrop-blur-md text-white/90 border border-white/15 shrink-0">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Billet 100% Officiel
              </span>
            </div>

            {/* Slide counter and Play/Pause */}
            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/15 text-xs font-mono shrink-0">
              <span className="text-amber-400 font-bold">{currentIndex + 1}</span>
              <span className="text-white/40">/</span>
              <span className="text-white/70">{total}</span>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="ml-1 text-white/80 hover:text-white transition-colors cursor-pointer"
                title={isPlaying ? 'Mettre en pause' : 'Lecture automatique'}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              </button>
            </div>
          </div>

          {/* Bottom Billboard Content: Event Details & Action Buttons */}
          <div className="w-full max-w-3xl lg:max-w-[66%] space-y-3 sm:space-y-4">
            
            {/* Category / Organizer chip */}
            <div className="flex items-center gap-2 text-xs sm:text-sm text-amber-400 font-mono font-semibold">
              <span className="uppercase tracking-widest">{currentEvent.category}</span>
              <span>•</span>
              <span className="text-white/80 truncate">{currentEvent.organisateur}</span>
            </div>

            {/* Giant Title */}
            <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-black tracking-tight text-white drop-shadow-md leading-tight line-clamp-2">
              {currentEvent.title}
            </h1>

            {/* Metadata (Date, Venue, Starting Price) */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 text-xs sm:text-sm text-slate-200">
              <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/10">
                <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-medium">{currentEvent.date}</span>
                <span className="text-white/40">|</span>
                <span className="text-amber-300 font-mono font-bold">{currentEvent.time}</span>
              </div>

              <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/10 truncate max-w-[240px] sm:max-w-none">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="truncate">{currentEvent.location}</span>
              </div>

              <div className="flex items-center gap-1.5 bg-amber-500/20 backdrop-blur-sm text-amber-300 px-2.5 py-1 rounded-lg border border-amber-500/30 font-mono font-bold">
                <Tag className="w-3.5 h-3.5" />
                <span>Dès {formatPrice(getMinPrice(currentEvent))}</span>
              </div>
            </div>

            {/* Description excerpt on larger screens */}
            <p className="hidden md:block text-sm lg:text-base text-slate-300 line-clamp-2 lg:line-clamp-3 leading-relaxed max-w-2xl font-normal drop-shadow">
              {currentEvent.description}
            </p>

            {/* Netflix-style Call-To-Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              {/* Primary Action Button (like Netflix Play) */}
              <button
                id={`btn-netflix-hero-book-${currentEvent.id}`}
                onClick={() => navigate(`/evenement/${currentEvent.id}`)}
                className="flex items-center justify-center gap-2.5 px-6 py-3 sm:py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-700 text-white font-extrabold text-sm sm:text-base shadow-xl shadow-orange-500/25 active:scale-95 transition-all cursor-pointer group/btn"
              >
                <Ticket className="w-5 h-5 group-hover/btn:rotate-12 transition-transform" />
                <span>Réserver mon ticket</span>
              </button>

              {/* Secondary Info Button (like Netflix More Info) */}
              <button
                id={`btn-netflix-hero-info-${currentEvent.id}`}
                onClick={() => navigate(`/evenement/${currentEvent.id}`)}
                className="flex items-center justify-center gap-2 px-5 py-3 sm:py-3.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-sm sm:text-base backdrop-blur-md border border-white/20 active:scale-95 transition-all cursor-pointer"
              >
                <Info className="w-4.5 h-4.5 text-white" />
                <span>Plus d'infos</span>
              </button>
            </div>

          </div>

          {/* Bottom Netflix Multi-Segment Indicator Bars */}
          <div className="pt-4 flex items-center gap-2 sm:gap-3 w-full">
            {heroEvents.map((evt, idx) => {
              const isActive = idx === currentIndex;
              return (
                <button
                  key={evt.id}
                  onClick={() => goToSlide(idx)}
                  className="flex-1 py-2 text-left group/bar focus:outline-none cursor-pointer"
                  title={evt.title}
                >
                  <div className="h-1 sm:h-1.5 w-full bg-white/25 rounded-full overflow-hidden transition-all duration-300 group-hover/bar:bg-white/40">
                    <div
                      className={`h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all ${
                        isActive ? 'w-full' : 'w-0'
                      }`}
                      style={{
                        transitionDuration: isActive && isPlaying ? `${autoPlayInterval}ms` : '300ms',
                        transitionTimingFunction: 'linear'
                      }}
                    />
                  </div>
                  {/* Title preview on larger screens */}
                  <span className={`hidden lg:block text-[10px] truncate mt-1.5 font-mono transition-colors ${
                    isActive ? 'text-amber-400 font-bold' : 'text-white/50 group-hover/bar:text-white/80'
                  }`}>
                    {evt.title.split(':')[0]}
                  </span>
                </button>
              );
            })}
          </div>
            </div>
          </div>

        {/* Floating Left / Right Navigation Chevrons */}
        <button
          onClick={prevSlide}
          className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-40 p-2.5 sm:p-3 rounded-full bg-black/40 hover:bg-black/70 text-white/80 hover:text-white backdrop-blur-md border border-white/15 transition-all active:scale-90 opacity-0 group-hover:opacity-100 cursor-pointer shadow-xl hidden sm:flex items-center justify-center"
          title="Précédent"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <button
          onClick={nextSlide}
          className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-40 p-2.5 sm:p-3 rounded-full bg-black/40 hover:bg-black/70 text-white/80 hover:text-white backdrop-blur-md border border-white/15 transition-all active:scale-90 opacity-0 group-hover:opacity-100 cursor-pointer shadow-xl hidden sm:flex items-center justify-center"
          title="Suivant"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

      </div>
    </div>
  );
};
