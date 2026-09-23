import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { Search, MapPin, Calendar, Ticket, SlidersHorizontal, ArrowLeft, X } from 'lucide-react';

export const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const { events, searchQuery, setSearchQuery, selectedCategory, setSelectedCategory } = useApp();

  // Local filter states
  const [selectedCity, setSelectedCity] = useState<string>('Tous');
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>('Tous');

  const cities = ['Tous', 'Bujumbura', 'Gitega', 'Ngozi', 'Gihosha'];
  const priceRanges = [
    { label: 'Tous les prix', value: 'Tous' },
    { label: 'Gratuit / Soutien', value: '0' },
    { label: 'Moins de 5 000 FBu', value: 'under-5000' },
    { label: '5 000 - 25 000 FBu', value: '5000-25000' },
    { label: 'Plus de 25 000 FBu', value: 'over-25000' },
  ];

  const getMinPrice = (evt: typeof events[0]) => {
    if (!evt.ticketCategories || evt.ticketCategories.length === 0) return 0;
    return Math.min(...evt.ticketCategories.map((tc) => tc.price));
  };

  const formatPrice = (price: number) => {
    if (price === 0) return 'Gratuit';
    return `${price.toLocaleString('fr-FR')} FBu`;
  };

  // Perform search & filter operation
  const filteredEvents = events.filter((evt) => {
    // 1. Full text search query
    const matchesSearch =
      evt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.description.toLowerCase().includes(searchQuery.toLowerCase());

    // 2. Category selection
    const matchesCategory = selectedCategory === 'Tous' || evt.category === selectedCategory;

    // 3. City Selection
    const matchesCity =
      selectedCity === 'Tous' || evt.location.toLowerCase().includes(selectedCity.toLowerCase());

    // 4. Price selection
    const minPrice = getMinPrice(evt);
    let matchesPrice = true;
    if (selectedPriceRange !== 'Tous') {
      if (selectedPriceRange === '0') {
        matchesPrice = minPrice === 0;
      } else if (selectedPriceRange === 'under-5000') {
        matchesPrice = minPrice > 0 && minPrice < 5000;
      } else if (selectedPriceRange === '5000-25000') {
        matchesPrice = minPrice >= 5000 && minPrice <= 25000;
      } else if (selectedPriceRange === 'over-25000') {
        matchesPrice = minPrice > 25000;
      }
    }

    return matchesSearch && matchesCategory && matchesCity && matchesPrice;
  });

  return (
    <div className="flex-1 flex flex-col bg-[#F8FAFC]">
      
      {/* Top Search bar wrapper */}
      <div className="p-4 bg-white/95 border-b border-slate-200/80 sticky top-0 z-30 space-y-3.5 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSearchQuery('');
              navigate('/home');
            }}
            className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer border border-slate-200/40"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex-1 relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5" />
            <input
              type="text"
              id="input-search-events"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher match, concert, église..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-all font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="p-1 text-slate-400 hover:text-slate-700 absolute right-3"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Mini sliding horizontal category filters */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
          {['Tous', 'sport', 'musique', 'religion', 'corporate'].map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg font-bold text-[10px] whitespace-nowrap uppercase tracking-wider transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-iwacu-gradient text-white shadow-sm'
                    : 'bg-white text-slate-500 border border-slate-200/85 shadow-sm hover:text-slate-800'
                }`}
              >
                {cat === 'Tous' ? 'Tout' : cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Sidebar or Grid section */}
      <div className="px-5 py-4 space-y-5 flex-1 overflow-y-auto">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-sm">
          <h4 className="text-xs font-display font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-orange-500" />
            Filtres avancés
          </h4>

          {/* City Filter Grid */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-slate-400 uppercase font-mono font-semibold">Ville / Province</span>
            <div className="flex flex-wrap gap-1.5">
              {cities.map((city) => {
                const isSelected = selectedCity === city;
                return (
                  <button
                    key={city}
                    onClick={() => setSelectedCity(city)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-orange-50 text-orange-600 border-orange-200'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-800'
                    }`}
                  >
                    {city}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Price Range selectors */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-slate-400 uppercase font-mono font-semibold">Fourchette de tarif</span>
            <div className="flex flex-wrap gap-1.5">
              {priceRanges.map((range) => {
                const isSelected = selectedPriceRange === range.value;
                return (
                  <button
                    key={range.value}
                    onClick={() => setSelectedPriceRange(range.value)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-emerald-50 text-brand-green border-brand-green/20'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-800'
                    }`}
                  >
                    {range.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Results List section */}
        <div className="space-y-3 pb-8">
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold tracking-wider">
            <span>RÉSULTATS DE LA RECHERCHE</span>
            <span>{filteredEvents.length} événements</span>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="py-12 text-center bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <p className="text-slate-600 font-semibold text-sm">Aucun événement ne correspond</p>
              <p className="text-slate-400 text-xs mt-1">Essayez de modifier vos mots-clés ou de réinitialiser vos filtres.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('Tous');
                  setSelectedCity('Tous');
                  setSelectedPriceRange('Tous');
                }}
                className="mt-4 px-5 py-2.5 bg-iwacu-gradient hover:opacity-95 text-white rounded-xl text-[10px] font-btn uppercase tracking-wider shadow-md shadow-orange-500/15 transition-all"
              >
                Réinitialiser tout
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {filteredEvents.map((evt) => (
                <div
                  key={evt.id}
                  onClick={() => navigate(`/evenement/${evt.id}`)}
                  className="p-3 bg-white hover:bg-slate-50/50 border border-slate-200 rounded-xl flex gap-3 cursor-pointer transition-all active:scale-99 shadow-sm hover:border-orange-300 group"
                >
                  <img
                    referrerPolicy="no-referrer"
                    src={evt.imageUrl}
                    alt={evt.title}
                    className="w-16 h-16 rounded-lg object-cover shrink-0"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <h4 className="font-display font-bold text-xs text-slate-900 truncate group-hover:text-orange-600 transition-colors">
                      {evt.title}
                    </h4>
                    <p className="text-[10px] text-slate-600 truncate flex items-center gap-1 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-orange-500" />
                      {evt.date}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {evt.location.split(',')[0]}
                    </p>
                  </div>

                  <div className="shrink-0 text-right flex flex-col justify-center border-l border-slate-100 pl-2.5 min-w-[70px]">
                    <span className="text-[10px] text-slate-400 uppercase font-mono font-medium">Dès</span>
                    <span className="font-mono font-bold text-xs text-orange-600 mt-0.5">
                      {formatPrice(getMinPrice(evt))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
};
