import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Event } from '../types';
import { Calendar, MapPin, Ticket, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

interface NetflixEventRowProps {
  title: string;
  subtitle?: string;
  badge?: string;
  icon?: React.ElementType;
  events: Event[];
  showRankNumber?: boolean; // For Netflix "Top 10" style ranking numbers!
}

export const NetflixEventRow: React.FC<NetflixEventRowProps> = ({
  title,
  subtitle,
  badge,
  icon: Icon = Sparkles,
  events,
  showRankNumber = false,
}) => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollAmount = clientWidth * 0.75;
      scrollRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const getMinPrice = (evt: Event) => {
    if (!evt.ticketCategories || evt.ticketCategories.length === 0) return 0;
    return Math.min(...evt.ticketCategories.map((tc) => tc.price));
  };

  const formatPrice = (price: number) => {
    if (price === 0) return 'Gratuit';
    return `${price.toLocaleString('fr-FR')} FBu`;
  };

  if (events.length === 0) return null;

  return (
    <div className="space-y-3.5 relative group/row">
      {/* Header with Title and Scroll buttons */}
      <div className="flex items-end justify-between px-1">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-black text-base sm:text-lg text-slate-900 tracking-tight flex items-center gap-2">
              <Icon className="w-5 h-5 text-amber-500 fill-amber-500/20" />
              <span>{title}</span>
            </h3>
            {badge && (
              <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 border border-amber-500/20">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 font-medium">
              {subtitle}
            </p>
          )}
        </div>

        {/* Scroll Arrows on Desktop */}
        <div className="hidden sm:flex items-center gap-1.5 opacity-70 group-hover/row:opacity-100 transition-opacity">
          <button
            onClick={() => scroll('left')}
            className="p-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80 shadow-sm active:scale-95 transition-all cursor-pointer"
            title="Défiler vers la gauche"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80 shadow-sm active:scale-95 transition-all cursor-pointer"
            title="Défiler vers la droite"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Scrolling Card Track */}
      <div
        ref={scrollRef}
        className="flex gap-4 sm:gap-5 overflow-x-auto pb-3 pt-1 -mx-4 sm:-mx-6 md:-mx-8 lg:-mx-12 px-4 sm:px-6 md:px-8 lg:px-12 scrollbar-none scroll-smooth"
      >
        {events.map((evt, idx) => (
          <div
            key={evt.id}
            id={`netflix-card-${evt.id}`}
            onClick={() => navigate(`/evenement/${evt.id}`)}
            className="relative shrink-0 w-[240px] sm:w-[280px] md:w-[300px] lg:w-[320px] bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-xl hover:border-amber-400/50 hover:-translate-y-1 transition-all duration-300 cursor-pointer group/card"
          >
            {/* If Netflix style ranking number is enabled (#1, #2, #3, ...) */}
            {showRankNumber && (
              <div className="absolute -top-3 -left-2 z-20 pointer-events-none select-none">
                <span className="font-display font-black text-6xl text-slate-900/10 italic leading-none block">
                  {idx + 1}
                </span>
              </div>
            )}

            {/* Poster / Backdrop Image */}
            <div className="relative h-36 sm:h-40 md:h-44 lg:h-48 w-full overflow-hidden bg-slate-900">
              <img
                src={evt.imageUrl}
                alt={evt.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover/card:scale-108 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
              
              {/* Category pill */}
              <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold uppercase tracking-wider bg-black/60 text-white backdrop-blur-md border border-white/10">
                {evt.category}
              </span>

              {/* Price badge */}
              <span className="absolute bottom-2 right-2.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500 text-slate-950 shadow-md">
                Dès {formatPrice(getMinPrice(evt))}
              </span>
            </div>

            {/* Card Information */}
            <div className="p-3.5 space-y-2">
              <h4 className="font-display font-bold text-sm text-slate-900 leading-snug line-clamp-1 group-hover/card:text-orange-600 transition-colors">
                {evt.title}
              </h4>

              <div className="space-y-1 text-xs text-slate-600 font-medium">
                <div className="flex items-center gap-1.5 truncate">
                  <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="truncate">{evt.date}</span>
                </div>
                <div className="flex items-center gap-1.5 truncate text-slate-500">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{evt.location.split(',')[0]}</span>
                </div>
              </div>

              {/* Action row */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400 font-semibold uppercase truncate">
                  {evt.organisateur.split(' ')[0]}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 group-hover/card:translate-x-0.5 transition-transform">
                  Réserver
                  <Ticket className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
