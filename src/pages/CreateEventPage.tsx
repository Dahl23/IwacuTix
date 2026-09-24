import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { Event, TicketCategory } from '../types';
import { ChevronLeft, Calendar as CalendarIcon, MapPin, Sparkles, Plus, Trash2, Tag, Layers, CheckCircle, ShieldAlert } from 'lucide-react';

const PRESET_IMAGES = [
  {
    name: 'Concert de Musique',
    url: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=600&auto=format&fit=crop&q=80',
    category: 'musique'
  },
  {
    name: 'Stade de Football',
    url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&auto=format&fit=crop&q=80',
    category: 'sport'
  },
  {
    name: 'Conférence & Networking',
    url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=80',
    category: 'corporate'
  },
  {
    name: 'Chant chorale & Célébration',
    url: 'https://images.unsplash.com/photo-1444212477490-ca407925329e?w=600&auto=format&fit=crop&q=80',
    category: 'religion'
  },
  {
    name: 'Soirée Acoustique / Club',
    url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
    category: 'musique'
  },
  {
    name: 'Sports d\'intérieur',
    url: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=600&auto=format&fit=crop&q=80',
    category: 'sport'
  }
];

export const CreateEventPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, addEvent, currentPersona, switchPersona, isUserVerified, openAuthModal } = useApp();

  const isOrganizer = currentPersona === 'ORGANISATEUR' || currentPersona === 'SUPERADMIN' || user.role === 'organisateur' || user.role === 'superadmin';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'sport' | 'musique' | 'religion' | 'corporate'>('musique');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('18:00');
  const [selectedImage, setSelectedImage] = useState(PRESET_IMAGES[0].url);
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [organisateur, setOrganisateur] = useState(user.name);

  // Ticket Categories list state
  const [ticketCategories, setTicketCategories] = useState<TicketCategory[]>([
    { name: 'Standard', price: 5000, description: 'Accès standard à l\'événement', available: 500 },
    { name: 'VIP', price: 20000, description: 'Accès privilégié, places assises', available: 100 }
  ]);

  const [newCatName, setNewCatName] = useState('');
  const [newCatPrice, setNewCatPrice] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatAvailable, setNewCatAvailable] = useState('');

  const addTicketCategory = () => {
    if (!newCatName.trim()) {
      alert('Veuillez entrer le nom de la catégorie (ex: VIP, Pelouse).');
      return;
    }
    const priceNum = parseFloat(newCatPrice) || 0;
    const availNum = parseInt(newCatAvailable) || 100;

    const newCat: TicketCategory = {
      name: newCatName.trim(),
      price: priceNum,
      description: newCatDesc.trim() || undefined,
      available: availNum
    };

    setTicketCategories([...ticketCategories, newCat]);
    
    // reset inputs
    setNewCatName('');
    setNewCatPrice('');
    setNewCatDesc('');
    setNewCatAvailable('');
  };

  const removeTicketCategory = (index: number) => {
    if (ticketCategories.length <= 1) {
      alert('Vous devez avoir au moins une catégorie de billet.');
      return;
    }
    setTicketCategories(ticketCategories.filter((_, idx) => idx !== index));
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert('Veuillez entrer un titre pour l\'événement.');
      return;
    }
    if (!location.trim()) {
      alert('Veuillez spécifier le lieu de l\'événement.');
      return;
    }
    if (!date.trim()) {
      alert('Veuillez entrer la date de l\'événement.');
      return;
    }

    const eventId = `evt-custom-${Date.now()}`;
    const finalImage = customImageUrl.trim() ? customImageUrl.trim() : selectedImage;

    const formattedDate = new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

    const newEvent: Event = {
      id: eventId,
      title: title.trim(),
      description: description.trim() || 'Aucune description disponible pour cet événement.',
      category,
      imageUrl: finalImage,
      date: capitalizedDate,
      time: time || '18:00',
      location: location.trim(),
      organisateur: organisateur.trim() || user.organisateurProfile?.nom_structure || user.name,
      organisateur_id: user.id,
      ticketCategories,
      isFeatured: true
    };

    addEvent(newEvent);
    alert('Félicitations ! Votre événement a été créé avec succès.');
    
    // Redirect directly to the dashboard page of this newly created event!
    navigate(`/organisateur/dashboard/${eventId}`);
  };

  if (!isOrganizer) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 max-w-lg mx-auto">
        <div className="w-full bg-white rounded-3xl p-6 sm:p-8 border border-orange-200/80 shadow-xl shadow-orange-500/5 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-300/40 flex items-center justify-center mx-auto text-amber-600 shadow-xs">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="inline-block px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-100/70 text-amber-800 border border-amber-200/60">
              Accès Réservé
            </span>
            <h2 className="text-xl sm:text-2xl font-display font-extrabold text-slate-900 tracking-tight">
              Espace Réservé aux Organisateurs
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              La création et publication d'événements sur <strong className="text-orange-950 font-bold">IwacuTix</strong> est exclusivement disponible pour les comptes organisateurs certifiés.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-orange-50/70 border border-orange-200/60 text-left space-y-2">
            <p className="text-xs font-bold text-orange-950 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-primary shrink-0" />
              Pourquoi passer au compte Organisateur ?
            </p>
            <ul className="text-[11px] text-slate-600 space-y-1.5 pl-4 list-disc marker:text-brand-primary">
              <li>Vendez vos billets instantanément via Lumicash, EcoCash & Bancobu</li>
              <li>Encaissement direct et tableau de bord financier en temps réel</li>
              <li>Scannez et validez les QR codes de vos participants le jour J</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => {
                if (!isUserVerified) {
                  openAuthModal('ORGANISATEUR');
                } else {
                  switchPersona('ORGANISATEUR');
                }
              }}
              className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold text-xs shadow-md shadow-orange-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
            >
              <span>{isUserVerified ? 'Activer mon profil Organisateur' : 'Créer mon compte Acheteur d\'abord'}</span>
            </button>
            <button
              onClick={() => navigate('/home')}
              className="py-3 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer active:scale-95"
            >
              Retour à l'accueil
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#F8FAFC]">
      
      {/* Top sticky Header */}
      <div className="px-5 pt-4 pb-2 sticky top-0 bg-white/95 backdrop-blur-md z-30 border-b border-slate-200/80 shadow-sm flex items-center justify-between">
        <button 
          onClick={() => navigate('/profil')} 
          className="p-2 -ml-2 rounded-xl text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-sm font-display font-bold text-slate-900 tracking-tight flex-1 text-center">Créer mon Événement</h2>
        <div className="w-9 h-9"></div> {/* spacing stabilizer */}
      </div>

      <form onSubmit={handleCreate} className="p-5 space-y-6 flex-1 overflow-y-auto pb-24">
        
        {/* Step Banner */}
        <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-indigo-900">Nouvel Événement Partenaire</h4>
            <p className="text-[10px] text-indigo-700 leading-normal">
              Publiez votre événement directement sur IwacuTix Burundi et gérez vos ventes de billets, vos revenus, et simulez le scan d'accès via votre tableau de bord intégré !
            </p>
          </div>
        </div>

        {/* Section 1: Informations Générales */}
        <div className="space-y-4">
          <h3 className="text-xs font-display font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2 border-b border-slate-200 pb-1.5">
            <Tag className="w-4 h-4 text-brand-primary" />
            1. Informations Générales
          </h3>

          {/* Event Title */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
              Titre de l'événement *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: FestiBuja Live Session, Championnat National"
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-bold text-xs focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/30 transition-all shadow-sm"
            />
          </div>

          {/* Event Category & Organisateur */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
                Catégorie *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-3 text-slate-800 font-bold text-xs focus:outline-none focus:border-brand-primary transition-all shadow-sm cursor-pointer"
              >
                <option value="musique">🎵 Musique</option>
                <option value="sport">🏆 Sport</option>
                <option value="religion">⛪ Religion</option>
                <option value="corporate">💼 Corporate</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
                Organisateur
              </label>
              <input
                type="text"
                value={organisateur}
                onChange={(e) => setOrganisateur(e.target.value)}
                placeholder="Ex: Empire Avenue"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-bold text-xs focus:outline-none focus:border-brand-primary transition-all shadow-sm"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
              Description de l'événement
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez l'ambiance, les artistes présents, le programme..."
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-normal text-xs focus:outline-none focus:border-brand-primary transition-all shadow-sm resize-none"
            />
          </div>
        </div>

        {/* Section 2: Date & Lieu */}
        <div className="space-y-4">
          <h3 className="text-xs font-display font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2 border-b border-slate-200 pb-1.5">
            <MapPin className="w-4 h-4 text-brand-primary" />
            2. Date & Emplacement
          </h3>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
                Date de l'événement *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-3 text-slate-800 font-bold text-xs focus:outline-none focus:border-brand-primary transition-all shadow-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
                Heure de début *
              </label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-3 text-slate-800 font-bold text-xs focus:outline-none focus:border-brand-primary transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
              Lieu de l'événement *
            </label>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ex: Boulevard de l'Uprona, Stade Prince Louis, Bujumbura"
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-bold text-xs focus:outline-none focus:border-brand-primary transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Section 3: Choix de la photo */}
        <div className="space-y-4">
          <h3 className="text-xs font-display font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2 border-b border-slate-200 pb-1.5">
            <Layers className="w-4 h-4 text-brand-primary" />
            3. Photo de l'événement
          </h3>

          <p className="text-[10px] text-slate-500 leading-normal">
            Sélectionnez une image de couverture de haute qualité parmi nos presets ou saisissez l'URL d'une image personnalisée :
          </p>

          {/* Presets Horizontal Slider */}
          <div className="flex gap-3 overflow-x-auto pb-2 snap-x scrollbar-hide">
            {PRESET_IMAGES.map((img, idx) => (
              <button
                type="button"
                key={idx}
                onClick={() => {
                  setSelectedImage(img.url);
                  setCustomImageUrl('');
                }}
                className={`snap-center shrink-0 w-28 rounded-xl overflow-hidden border-2 relative transition-all cursor-pointer ${
                  selectedImage === img.url && !customImageUrl
                    ? 'border-brand-primary scale-95 shadow-md shadow-brand-primary/10'
                    : 'border-slate-200'
                }`}
              >
                <img referrerPolicy="no-referrer" src={img.url} alt={img.name} className="w-full h-16 object-cover" />
                <div className="p-1 bg-white/95 text-[8px] font-bold text-slate-700 truncate">{img.name}</div>
              </button>
            ))}
          </div>

          {/* Custom URL Option */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
              Saisir une URL d'image personnalisée (Optionnel)
            </label>
            <input
              type="url"
              value={customImageUrl}
              onChange={(e) => {
                setCustomImageUrl(e.target.value);
              }}
              placeholder="Ex: https://images.unsplash.com/votre-photo..."
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-normal text-xs focus:outline-none focus:border-brand-primary transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Section 4: Catégories de tickets */}
        <div className="space-y-4">
          <h3 className="text-xs font-display font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2 border-b border-slate-200 pb-1.5">
            <Plus className="w-4 h-4 text-brand-primary" />
            4. Catégories de billets
          </h3>

          <div className="space-y-3">
            {ticketCategories.map((cat, idx) => (
              <div 
                key={idx} 
                className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-sm hover:border-slate-300 transition-colors"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">{cat.name}</span>
                    <span className="text-[9px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                      {cat.price === 0 ? 'Gratuit' : `${cat.price.toLocaleString('fr-FR')} FBu`}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500">{cat.available} tickets disponibles {cat.description && `• ${cat.description}`}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeTicketCategory(idx)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Form to add a new category */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <h4 className="text-[10px] font-mono font-bold text-slate-600 uppercase tracking-wider block">
              Ajouter un tarif / catégorie
            </h4>
            
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Nom: Pelouse, VIP, Premium"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
              />
              <input
                type="number"
                placeholder="Prix en FBu (ex: 15000)"
                value={newCatPrice}
                onChange={(e) => setNewCatPrice(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Description courte (ex: Zone A)"
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-normal text-slate-800 focus:outline-none col-span-1"
              />
              <input
                type="number"
                placeholder="Tickets dispos (ex: 200)"
                value={newCatAvailable}
                onChange={(e) => setNewCatAvailable(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none col-span-1 font-mono"
              />
            </div>

            <button
              type="button"
              onClick={addTicketCategory}
              className="w-full py-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer active:scale-95 transition-all shadow-sm"
            >
              + Ajouter ce tarif
            </button>
          </div>
        </div>

        {/* Create Event Button */}
        <button
          type="submit"
          id="btn-submit-create-event"
          className="w-full py-4 bg-brand-primary hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-500/15"
        >
          Créer et Activer l'Événement
        </button>

      </form>

    </div>
  );
};
