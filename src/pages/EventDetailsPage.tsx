import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { Calendar, MapPin, ShieldCheck, ChevronLeft, Share2, Info, Star, Copy, Check, X, Ticket } from 'lucide-react';
import { parseEventDate, getGoogleCalendarUrl, downloadIcal } from '../utils/calendar';

export const EventDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { events, followedEventIds, followEvent, unfollowEvent } = useApp();

  const event = events.find((evt) => evt.id === id);

  if (!event) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-[#F8FAFC] h-full">
        <Info className="w-12 h-12 text-brand-primary mb-4" />
        <h3 className="text-lg font-display font-bold text-slate-900">Événement introuvable</h3>
        <p className="text-sm text-slate-500 mt-2">Désolé, cet événement n'existe pas ou a été annulé.</p>
        <button
          onClick={() => navigate('/home')}
          className="mt-6 px-6 py-2.5 bg-brand-primary rounded-xl text-white font-medium text-xs uppercase tracking-wider"
        >
          Retour à l'accueil
        </button>
      </div>
    );
  }

  const isFollowed = followedEventIds.includes(event.id);

  const formatPrice = (price: number) => {
    if (price === 0) return 'Gratuit';
    return `${price.toLocaleString('fr-FR')} FBu`;
  };

  const minPrice = Math.min(...event.ticketCategories.map((tc) => tc.price));

  const [showShareSheet, setShowShareSheet] = useState(false);
  const [copied, setCopied] = useState(false);

  const eventShareUrl = `${window.location.origin}/evenement/${event.id}`;
  const shareText = `Réservez vos places pour "${event.title}" sur IwacuTix Burundi ! 🎫\nDate : ${event.date} à ${event.time}\nLieu : ${event.location}\n`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${eventShareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback
      const textArea = document.createElement("textarea");
      textArea.value = `${shareText}\n${eventShareUrl}`;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-[#F8FAFC] relative overflow-hidden">
      
      {/* Floating Action Header on top of cover image */}
      <div className="absolute top-3 left-4 right-4 flex items-center justify-between z-20">
        <button
          id="btn-event-detail-back"
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-white/90 hover:bg-white text-slate-800 backdrop-blur-md shadow-md border border-slate-200/80 cursor-pointer active:scale-90 transition-transform"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-1.5">
          {/* Follow / Star toggle button */}
          <button
            onClick={() => isFollowed ? unfollowEvent(event.id) : followEvent(event.id)}
            className={`p-2 rounded-xl backdrop-blur-md shadow-md border cursor-pointer active:scale-90 transition-all ${
              isFollowed 
                ? 'bg-amber-500 border-amber-400 text-white shadow-amber-500/10' 
                : 'bg-white/90 hover:bg-white text-slate-800 backdrop-blur-md border-slate-200/80'
            }`}
            title={isFollowed ? 'Ne plus suivre' : 'Suivre l\'événement'}
          >
            <Star className={`w-4 h-4 ${isFollowed ? 'fill-current text-white' : 'text-slate-600'}`} />
          </button>
          <button
            onClick={() => setShowShareSheet(true)}
            className="p-2 rounded-xl bg-white/90 hover:bg-white text-slate-800 backdrop-blur-md shadow-md border border-slate-200/80 cursor-pointer active:scale-90 transition-transform"
            title="Partager l'événement"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Cover Image - compact height for card preview */}
      <div className="h-44 sm:h-48 w-full relative shrink-0">
        <img
          referrerPolicy="no-referrer"
          src={event.imageUrl}
          alt={event.title}
          className="w-full h-full object-cover"
        />
        {/* Subtle decorative vignetting gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#F8FAFC] via-transparent to-black/30"></div>
        
        {/* Category Floating Badge */}
        <span className="absolute bottom-3 left-4 bg-brand-primary/95 text-white text-[10px] font-mono font-bold uppercase tracking-widest px-2.5 py-1 rounded-full shadow-md border border-brand-primary/10">
          {event.category}
        </span>
      </div>

      {/* Content area */}
      <div className="px-4.5 pt-3.5 pb-6 space-y-4 flex-1 min-h-0 overflow-y-auto">
        {/* Event Title */}
        <div className="space-y-2">
          <h2 className="text-2xl font-display font-bold text-slate-900 tracking-tight leading-tight">
            {event.title}
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="font-semibold text-brand-primary">Organisateur :</span>
            <span className="truncate">{event.organisateur}</span>
          </div>
        </div>

        {/* Following Status Block */}
        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-sm ${
          isFollowed
            ? 'bg-amber-500/5 border-amber-200/80 text-amber-950'
            : 'bg-slate-50 border-slate-200/60 text-slate-600'
        }`}>
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold flex items-center gap-1.5">
              <Star className={`w-4 h-4 shrink-0 ${isFollowed ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
              {isFollowed ? 'Ajouté aux favoris' : 'Ajouter aux favoris'}
            </h4>
            <p className="text-[10px] text-slate-500">
              {isFollowed 
                ? 'Événement enregistré dans vos favoris & rappels activés.' 
                : 'Enregistrez cet événement et recevez des alertes !'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (isFollowed) {
                unfollowEvent(event.id);
              } else {
                followEvent(event.id);
              }
            }}
            className={`py-1.5 px-3 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              isFollowed 
                ? 'bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-200' 
                : 'bg-brand-primary hover:bg-indigo-700 text-white'
            }`}
          >
            {isFollowed ? 'Retirer' : 'Favori'}
          </button>
        </div>
        {/* Quick info cards (Date, Location, Security badge) */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-white border border-slate-200/80 rounded-2xl space-y-1 shadow-sm">
            <Calendar className="w-5 h-5 text-brand-primary" />
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-mono font-bold">DATE & HEURE</p>
            <p className="text-[11px] font-bold text-slate-900 leading-tight">{event.date}</p>
            <p className="text-[11px] text-slate-500 font-mono">À {event.time}</p>
          </div>
          <div className="p-3 bg-white border border-slate-200/80 rounded-2xl space-y-1 shadow-sm">
            <MapPin className="w-5 h-5 text-brand-primary" />
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-mono font-bold">LIEU</p>
            <p className="text-[11px] font-bold text-slate-900 leading-tight truncate">{event.location.split(',')[0]}</p>
            <p className="text-[10px] text-slate-500 truncate">{event.location.split(',')[1] || 'Bujumbura'}</p>
          </div>
        </div>

        {/* Description section */}
        <div className="space-y-2.5">
          <h3 className="text-sm font-display font-bold text-slate-800 tracking-wide uppercase">Description</h3>
          <p className="text-xs text-slate-600 leading-relaxed font-normal">
            {event.description}
          </p>
        </div>

        {/* Calendar Export Block */}
        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl space-y-3.5 shadow-sm text-left">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 font-display">Exporter l'événement</h4>
              <p className="text-[10px] text-slate-500">Ajoutez cette date importante à votre agenda personnel</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <a
              href={getGoogleCalendarUrl(
                event.title,
                `Événement sur IwacuTix Burundi\nOrganisateur : ${event.organisateur}\nDescription : ${event.description}\nLieu : ${event.location}`,
                event.location,
                parseEventDate(event.date, event.time)
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 px-3 bg-red-50 hover:bg-red-100/70 border border-red-100 rounded-xl font-bold text-[11px] text-red-700 cursor-pointer active:scale-95 transition-all"
            >
              <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M21.35 11.1h-9.17v2.73h6.51c-.33 1.56-1.56 2.95-3.18 3.5v2.88h5.09c2.97-2.72 4.68-6.73 4.68-11.61 0-.6-.05-1.18-.15-1.7H21.35z" fill="#4285F4"/>
                <path d="M12.18 21.43c2.75 0 5.06-.91 6.75-2.47l-5.09-2.88c-1.41.95-3.21 1.51-5.18 1.51-3.98 0-7.36-2.69-8.56-6.32H1.05v2.98c2.14 4.25 6.55 7.18 11.13 7.18z" fill="#34A853"/>
                <path d="M3.62 11.27c-.28-.85-.44-1.76-.44-2.69 0-.93.16-1.84.44-2.69V2.91H1.05C.38 4.25 0 5.75 0 7.33s.38 3.08 1.05 4.42l2.57-2.03z" fill="#FBBC05"/>
                <path d="M12.18 3.19c1.94 0 3.51.67 4.88 1.98l3.65-3.65C18.49.52 15.62 0 12.18 0 7.6 0 3.19 2.93 1.05 7.18l2.57 2.03c1.2-3.63 4.58-6.32 8.56-6.32z" fill="#EA4335"/>
              </svg>
              <span>Google Calendar</span>
            </a>
            <button
              type="button"
              onClick={() => downloadIcal(
                event.title,
                `Événement sur IwacuTix Burundi\nOrganisateur : ${event.organisateur}\nDescription : ${event.description}\nLieu : ${event.location}`,
                event.location,
                parseEventDate(event.date, event.time),
                event.id
              )}
              className="flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl font-bold text-[11px] text-slate-700 cursor-pointer active:scale-95 transition-all"
            >
              <svg className="w-3.5 h-3.5 fill-current text-slate-800 shrink-0" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.09 2.48-1.36.03-1.8-.8-3.36-.8-1.56 0-2.04.77-3.34.82-1.33.05-2.35-1.32-3.19-2.53-1.72-2.48-3.03-7-1.26-10.07.88-1.53 2.45-2.5 4.16-2.53 1.3-.02 2.52.88 3.32.88.8 0 2.27-.1 3.81.47 1.48.55 2.64 1.7 3.25 3.13-3.1 1.86-2.6 5.86.53 7.12-.66 1.66-1.5 3.33-2.38 5zM15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.21.67-2.93 1.49-.62.69-1.16 1.84-1.01 2.96 1.12.09 2.27-.56 2.95-1.39z"/>
              </svg>
              <span>Apple / iCal</span>
            </button>
          </div>
        </div>

        {/* Social Media Sharing Block */}
        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl space-y-3.5 shadow-sm text-left">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 font-display">Partager avec des proches</h4>
              <p className="text-[10px] text-slate-500">Diffusez l'événement sur les réseaux sociaux et WhatsApp</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 pt-0.5">
            <a
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + eventShareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center gap-1.5 p-2 bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-100 rounded-xl transition-all active:scale-95 text-center cursor-pointer"
            >
              <svg className="w-5 h-5 fill-current text-[#25D366]" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.968C16.63 1.97 14.153.945 11.53.943c-5.441 0-9.866 4.372-9.87 9.802 0 1.73.473 3.41 1.37 4.904l-.994 3.633 3.733-.972zm12.33-6.213c-.312-.156-1.847-.91-2.133-1.014-.286-.105-.495-.156-.704.156-.21.312-.81.104-1.02.156-.21.052-.418.156-.73.052s-.624-.312-1.144-.73c-.415-.356-.694-.797-.775-.927s-.01-.2.072-.29c.075-.081.156-.182.234-.273s.104-.156.156-.26c.052-.104.026-.195-.013-.273-.04-.08-.364-.884-.5-1.209-.13-.313-.273-.27-.377-.27-.1 0-.21-.01-.312-.01-.1 0-.273.04-.416.195-.143.156-.546.533-.546 1.3s.56 1.507.637 1.61c.08.104 1.1 1.686 2.668 2.364.373.161.664.258.892.33.375.12.716.103.987.063.302-.045.91-.372 1.04-.73.13-.357.13-.663.09-.73s-.156-.117-.468-.273z"/>
              </svg>
              <span className="text-[9px] font-bold text-emerald-800">WhatsApp</span>
            </a>
            
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(eventShareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center gap-1.5 p-2 bg-blue-50 hover:bg-blue-100/70 border border-blue-100 rounded-xl transition-all active:scale-95 text-center cursor-pointer"
            >
              <svg className="w-5 h-5 fill-current text-[#1877F2]" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span className="text-[9px] font-bold text-blue-800">Facebook</span>
            </a>

            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(eventShareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center gap-1.5 p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all active:scale-95 text-center cursor-pointer"
            >
              <svg className="w-4.5 h-4.5 fill-current text-black" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              <span className="text-[9px] font-bold text-slate-800">Twitter / X</span>
            </a>

            <button
              onClick={copyToClipboard}
              className={`flex flex-col items-center justify-center gap-1.5 p-2 border rounded-xl transition-all active:scale-95 text-center cursor-pointer ${
                copied 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                  : 'bg-indigo-50 border-indigo-100 text-indigo-800 hover:bg-indigo-100/70'
              }`}
            >
              {copied ? (
                <Check className="w-5 h-5 text-emerald-600" />
              ) : (
                <Copy className="w-5 h-5 text-indigo-600" />
              )}
              <span className="text-[9px] font-bold">
                {copied ? 'Copié !' : 'Copier lien'}
              </span>
            </button>
          </div>
        </div>

        {/* Ticket pricing categories info */}
        <div className="space-y-3">
          <h3 className="text-sm font-display font-bold text-slate-800 tracking-wide uppercase">Tarifs disponibles</h3>
          <div className="space-y-2">
            {event.ticketCategories.map((tc, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm"
              >
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-900">{tc.name}</p>
                  {tc.description && <p className="text-[10px] text-slate-500 leading-normal">{tc.description}</p>}
                </div>
                <span className="font-mono font-bold text-sm text-brand-primary shrink-0 pl-2">
                  {formatPrice(tc.price)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Anti-fraud secure guarantee banner */}
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-start gap-3 shadow-sm">
          <ShieldCheck className="w-5 h-5 text-brand-green shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-emerald-900">Billet Digital Garanti Securisé</h4>
            <p className="text-[10px] text-slate-600 leading-relaxed">
              Ce billet dispose d'un QR code unique et horodaté. Une fois scanné à l'entrée par l'organisateur, il ne pourra plus être réutilisé. Fini les fraudes et le marché noir.
            </p>
          </div>
        </div>
      </div>

      {/* Pinned Sticky Bottom Bar with CTA to select tickets */}
      <div className="shrink-0 p-3 sm:p-3.5 bg-white/95 border-t border-slate-200/90 backdrop-blur-md flex items-center justify-between gap-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] z-20">
        <div className="flex flex-col">
          <span className="text-[9px] text-slate-500 uppercase font-mono tracking-wider font-semibold">Tarifs dès</span>
          <span className="font-mono font-bold text-base sm:text-lg text-brand-primary">
            {formatPrice(minPrice)}
          </span>
        </div>
        <button
          id="btn-event-buy-tickets"
          onClick={() => navigate(`/evenement/${event.id}/billets`)}
          className="px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-brand-primary hover:bg-brand-primary/95 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-indigo-500/20 flex items-center gap-2 cursor-pointer transition-transform active:scale-95"
        >
          <span>Choisir mes billets</span>
          <Ticket className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Share Sheet Drawer */}
      {showShareSheet && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex flex-col justify-end transition-all duration-300">
          <div className="absolute inset-0" onClick={() => setShowShareSheet(false)}></div>
          
          <div className="relative bg-white rounded-t-[32px] max-h-[80%] flex flex-col overflow-hidden shadow-2xl z-10 border-t border-slate-200 animate-slide-up">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-brand-primary" />
                <h3 className="text-sm font-display font-black text-slate-800 tracking-tight">Partager cet événement</h3>
              </div>
              <button 
                onClick={() => setShowShareSheet(false)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 bg-slate-50/70 overflow-y-auto">
              {/* Event Quick Info */}
              <div className="p-3 bg-white rounded-2xl border border-slate-100 flex gap-3">
                <img src={event.imageUrl} alt={event.title} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                <div className="min-w-0 flex-1 text-left">
                  <h4 className="text-xs font-bold text-slate-900 truncate">{event.title}</h4>
                  <p className="text-[10px] text-slate-500 truncate">{event.location}</p>
                  <p className="text-[9px] font-mono text-brand-primary font-bold mt-0.5">{event.date} • {event.time}</p>
                </div>
              </div>

              {/* Share Options List */}
              <div className="space-y-2.5">
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + eventShareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3.5 p-3.5 bg-white hover:bg-emerald-50/20 border border-slate-100 rounded-2xl transition-colors text-left"
                >
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0">
                    <svg className="w-5 h-5 fill-current text-[#25D366]" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.968C16.63 1.97 14.153.945 11.53.943c-5.441 0-9.866 4.372-9.87 9.802 0 1.73.473 3.41 1.37 4.904l-.994 3.633 3.733-.972zm12.33-6.213c-.312-.156-1.847-.91-2.133-1.014-.286-.105-.495-.156-.704.156-.21.312-.81.104-1.02.156-.21.052-.418.156-.73.052s-.624-.312-1.144-.73c-.415-.356-.694-.797-.775-.927s-.01-.2.072-.29c.075-.081.156-.182.234-.273s.104-.156.156-.26c.052-.104.026-.195-.013-.273-.04-.08-.364-.884-.5-1.209-.13-.313-.273-.27-.377-.27-.1 0-.21-.01-.312-.01-.1 0-.273.04-.416.195-.143.156-.546.533-.546 1.3s.56 1.507.637 1.61c.08.104 1.1 1.686 2.668 2.364.373.161.664.258.892.33.375.12.716.103.987.063.302-.045.91-.372 1.04-.73.13-.357.13-.663.09-.73s-.156-.117-.468-.273z"/>
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <h4 className="text-xs font-bold text-slate-800">Partager sur WhatsApp</h4>
                    <p className="text-[10px] text-slate-500">Envoyer directement à vos contacts ou dans un groupe</p>
                  </div>
                </a>

                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(eventShareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3.5 p-3.5 bg-white hover:bg-blue-50/20 border border-slate-100 rounded-2xl transition-colors text-left"
                >
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
                    <svg className="w-5 h-5 fill-current text-[#1877F2]" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <h4 className="text-xs font-bold text-slate-800">Partager sur Facebook</h4>
                    <p className="text-[10px] text-slate-500">Publier sur votre profil ou dans un groupe</p>
                  </div>
                </a>

                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(eventShareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3.5 p-3.5 bg-white hover:bg-slate-100/50 border border-slate-100 rounded-2xl transition-colors text-left"
                >
                  <div className="p-2 rounded-xl bg-slate-100 text-black border border-slate-200 shrink-0">
                    <svg className="w-4.5 h-4.5 fill-current text-black" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <h4 className="text-xs font-bold text-slate-800">Partager sur Twitter / X</h4>
                    <p className="text-[10px] text-slate-500">Rédiger un tweet avec les informations principales</p>
                  </div>
                </a>

                <button
                  onClick={copyToClipboard}
                  className="w-full flex items-center gap-3.5 p-3.5 bg-white hover:bg-indigo-50/20 border border-slate-100 rounded-2xl transition-all text-left cursor-pointer"
                >
                  <div className={`p-2 rounded-xl border shrink-0 transition-colors ${
                    copied ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                  }`}>
                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 text-left">
                    <h4 className="text-xs font-bold text-slate-800">{copied ? 'Copié !' : 'Copier le lien direct'}</h4>
                    <p className="text-[10px] text-slate-500">Enregistrer l'adresse web de l'événement dans le presse-papiers</p>
                  </div>
                </button>
              </div>
            </div>

            <div className="px-5 py-4 bg-white border-t border-slate-100 flex justify-center shrink-0">
              <button
                onClick={() => setShowShareSheet(false)}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200/80 rounded-xl font-bold text-xs text-slate-600 transition-colors cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
