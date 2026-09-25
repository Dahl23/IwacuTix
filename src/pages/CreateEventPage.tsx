import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { Event, TicketCategory } from '../types';
import { api } from '../services/apiClient';
import { parseApiError } from '../utils/apiErrors';
import { 
  ChevronLeft, 
  MapPin, 
  Sparkles, 
  Plus, 
  Trash2, 
  Tag, 
  Layers, 
  CheckCircle2, 
  ShieldAlert, 
  UploadCloud, 
  AlertCircle, 
  RefreshCw,
  Image as ImageIcon
} from 'lucide-react';

export const CreateEventPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, addEvent, currentPersona, switchPersona, isUserVerified, openAuthModal } = useApp();

  const isOrganizer = 
    currentPersona === 'ORGANISATEUR' || 
    currentPersona === 'SUPERADMIN' || 
    user.role === 'ORGANISATEUR' || 
    user.role === 'SUPERADMIN';

  // Champs d'informations générales
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'sport' | 'musique' | 'religion' | 'corporate'>('musique');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('18:00');
  const [organisateur, setOrganisateur] = useState(user.name);

  // Téléversement réel de l'affiche de l'événement (fichier multipart FileField backend)
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  // Catégories de billets
  const [ticketCategories, setTicketCategories] = useState<TicketCategory[]>([
    { name: 'Standard', price: 5000, description: 'Accès standard à l\'événement', available: 500 },
    { name: 'VIP', price: 20000, description: 'Accès privilégié, places assises', available: 100 }
  ]);

  const [newCatName, setNewCatName] = useState('');
  const [newCatPrice, setNewCatPrice] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatAvailable, setNewCatAvailable] = useState('');

  // États de soumission et erreurs
  const [isCreating, setIsCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const addTicketCategory = () => {
    setFormError(null);
    if (!newCatName.trim()) {
      setFormError('Veuillez entrer le nom de la catégorie de billet (ex: Pelouse, VIP).');
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
      setFormError('Vous devez conserver au moins un niveau de places (catégorie de billet).');
      return;
    }
    setTicketCategories(ticketCategories.filter((_, idx) => idx !== index));
  };

  // Gestion de la sélection du fichier de l'affiche
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setImageFile(null);
      setImagePreview('');
      setFormError('Format non supporté. Veuillez sélectionner une image au format JPG, PNG ou WebP.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setImageFile(null);
      setImagePreview('');
      setFormError('L\'image dépasse la taille maximale autorisée de 10 Mo.');
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(String(reader.result));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview('');
  };

  const CATEGORY_TO_API: Record<string, string> = {
    sport: 'SPORT',
    musique: 'CONCERT',
    religion: 'RELIGIEUX',
    corporate: 'CORPORATE',
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!title.trim()) {
      setFormError('Veuillez entrer un titre pour votre événement.');
      return;
    }
    if (!location.trim()) {
      setFormError('Veuillez préciser le lieu de l\'événement.');
      return;
    }
    if (!date.trim()) {
      setFormError('Veuillez renseigner la date de l\'événement.');
      return;
    }
    if (ticketCategories.length === 0) {
      setFormError('Veuillez ajouter au moins une catégorie de billet avec un tarif et un stock.');
      return;
    }

    setIsCreating(true);

    try {
      // 1. Construction du FormData multipart pour l'endpoint réel POST /api/organisateurs/events/
      // Selon API_FRONTEND.md §3.B :
      // titre, description, lieu, ville, date_debut, categorie, et le fichier "affiche"
      const formData = new FormData();
      formData.append('titre', title.trim());
      formData.append('description', description.trim() || 'Aucune description disponible pour cet événement.');
      formData.append('categorie', CATEGORY_TO_API[category] || 'CONCERT');
      formData.append('lieu', location.trim());
      formData.append('ville', 'Bujumbura');
      formData.append('date_debut', new Date(`${date}T${time || '18:00'}`).toISOString());

      // L'affiche est transmise comme un VRAI objet File multipart
      if (imageFile) {
        formData.append('affiche', imageFile);
      }

      // Appel de l'endpoint POST /api/organisateurs/events/
      const created = await api.events.createEvent(formData);
      const createdId = created && (created.id || created.event_id || created.data?.id)
        ? String(created.id || created.event_id || created.data?.id)
        : '';

      if (!createdId) {
        throw new Error('Le serveur a créé l\'événement mais n\'a pas retourné d\'identifiant valide.');
      }

      // 2. Création des tiers (niveaux de places) via POST /api/organisateurs/events/{event_id}/tiers/
      for (const tier of ticketCategories) {
        try {
          await api.events.createTier(createdId, {
            nom: tier.name,
            prix_fbu: tier.price,
            stock_total: tier.available,
            moyens_paiement_acceptes: ['LIGHTNING', 'LUMICASH'],
          });
        } catch {
          // Si le profil de réception organisateur restreint les moyens actifs :
          try {
            await api.events.createTier(createdId, {
              nom: tier.name,
              prix_fbu: tier.price,
              stock_total: tier.available,
              moyens_paiement_acceptes: ['LIGHTNING'],
            });
          } catch {
            await api.events.createTier(createdId, {
              nom: tier.name,
              prix_fbu: tier.price,
              stock_total: tier.available,
              moyens_paiement_acceptes: ['LUMICASH'],
            });
          }
        }
      }

      // 3. Publication de l'événement via PATCH /api/organisateurs/events/{event_id}/
      let publicationStatus = 'PUBLIE';
      try {
        await api.events.updateEvent(createdId, { statut: 'PUBLIE' });
      } catch (pubErr) {
        console.warn('[CreateEvent] Publication immédiate non aboutie (reste en brouillon) :', pubErr);
        publicationStatus = 'BROUILLON';
      }

      // 4. Synchronisation dans le contexte local
      const formattedDate = new Date(date).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

      const newEvent: Event = {
        id: createdId,
        title: title.trim(),
        description: description.trim() || 'Aucune description disponible pour cet événement.',
        category,
        imageUrl: imagePreview || (created.affiche ? created.affiche : '/gotix-logo.jpg'),
        date: capitalizedDate,
        time: time || '18:00',
        location: location.trim(),
        organisateur: organisateur.trim() || user.organisateurProfile?.nom_structure || user.name,
        organisateur_id: user.id,
        ticketCategories,
        isFeatured: true
      };

      addEvent(newEvent);

      if (publicationStatus === 'PUBLIE') {
        setFormSuccess('Événement créé et publié avec succès sur la marketplace !');
      } else {
        setFormSuccess('Événement enregistré en brouillon avec ses catégories de billets.');
      }

      // Redirection vers le tableau de bord organisateur de l'événement
      setTimeout(() => {
        navigate(`/organisateur/dashboard/${createdId}`);
      }, 1200);

    } catch (err: any) {
      console.error('[CreateEvent] Erreur :', err);
      const parsed = parseApiError(err);
      setFormError(parsed.message || 'La création de l\'événement a échoué. Veuillez vérifier les informations et réessayer.');
    } finally {
      setIsCreating(false);
    }
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
              <li>Vendez vos billets instantanément via Lumicash & Bitcoin Lightning (Blink)</li>
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
        <div className="w-9 h-9"></div>
      </div>

      <form onSubmit={handleCreate} className="p-5 space-y-6 flex-1 overflow-y-auto pb-24 max-w-2xl mx-auto w-full">
        
        {/* Step Banner */}
        <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-indigo-900">Nouvel Événement Partenaire</h4>
            <p className="text-[10px] text-indigo-700 leading-normal">
              Publiez votre événement directement sur IwacuTix Burundi. Vos billets seront automatiquement mis en vente pour paiements Lumicash et Bitcoin Lightning (Blink).
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
              Titre de l'événement <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: FestiBuja Live Session, Championnat National..."
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-bold text-xs focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/30 transition-all shadow-sm"
            />
          </div>

          {/* Event Category & Organisateur */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
                Catégorie <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-3 text-slate-800 font-bold text-xs focus:outline-none focus:border-brand-primary transition-all shadow-sm cursor-pointer"
              >
                <option value="musique">🎵 Concert / Musique</option>
                <option value="sport">🏆 Sport</option>
                <option value="religion">⛪ Célébration / Religieux</option>
                <option value="corporate">💼 Conférence / Corporate</option>
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
                placeholder="Ex: Buja Events, Empire Avenue..."
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
              placeholder="Décrivez l'événement, les artistes ou intervenants, les consignes d'accès..."
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
                Date de l'événement <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-3 text-slate-800 font-bold text-xs focus:outline-none focus:border-brand-primary transition-all shadow-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
                Heure de début <span className="text-red-500">*</span>
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
              Lieu de l'événement <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ex: Stade Prince Louis Rwagasore, Boulevard de l'Uprona, Bujumbura"
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-bold text-xs focus:outline-none focus:border-brand-primary transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Section 3: Téléversement de l'Affiche (sans champ de lien URL) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
            <h3 className="text-xs font-display font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand-primary" />
              3. Affiche de l'événement
            </h3>
            <span className="text-[10px] font-mono font-bold text-slate-400">Fichier requis</span>
          </div>

          <p className="text-[11px] text-slate-500 leading-normal">
            Téléversez l'image officielle de votre affiche. Ce fichier sera transmis en encodage multipart réel directement au backend.
          </p>

          {/* Zone d'upload ou prévisualisation de l'affiche */}
          {imagePreview ? (
            <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-md relative group">
              <div className="aspect-[16/9] w-full overflow-hidden flex items-center justify-center bg-slate-950">
                <img 
                  src={imagePreview} 
                  alt="Aperçu affiche" 
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300" 
                />
              </div>

              {/* Overlay d'informations sur le fichier */}
              <div className="p-3 bg-white border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {imageFile?.name || 'Affiche événement'}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {imageFile ? `${(imageFile.size / 1024 / 1024).toFixed(2)} Mo • Image prête` : 'Fichier sélectionné'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer">
                    Changer
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="sr-only"
                      onChange={handleImageFileChange}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    title="Supprimer cette image"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <label className="border-2 border-dashed border-orange-300 hover:border-brand-primary rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center gap-3 bg-orange-50/40 hover:bg-orange-50/80 transition-all cursor-pointer group">
              <div className="w-14 h-14 rounded-2xl bg-white text-brand-primary shadow-sm flex items-center justify-center group-hover:scale-105 transition-transform">
                <UploadCloud className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-800">
                  Cliquez pour téléverser l'affiche de l'événement
                </p>
                <p className="text-[10px] text-slate-500">
                  Formats acceptés : JPG, PNG, WebP • Taille max 10 Mo
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-white text-slate-700 text-[10px] font-mono font-bold border border-slate-200 shadow-2xs">
                Parcourir mes fichiers
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={handleImageFileChange}
              />
            </label>
          )}
        </div>

        {/* Section 4: Catégories de tickets */}
        <div className="space-y-4">
          <h3 className="text-xs font-display font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2 border-b border-slate-200 pb-1.5">
            <Plus className="w-4 h-4 text-brand-primary" />
            4. Catégories de billets & Tarifs
          </h3>

          <div className="space-y-2">
            {ticketCategories.map((cat, idx) => (
              <div 
                key={idx} 
                className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-2xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{cat.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
                      {cat.available} places
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">{cat.description || 'Accès standard'}</p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-extrabold text-brand-primary">
                    {cat.price.toLocaleString('fr-FR')} FBu
                  </span>
                  {ticketCategories.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTicketCategory(idx)}
                      className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                      title="Supprimer ce tarif"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Formulaire d'ajout rapide de tarif */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
              Ajouter une nouvelle catégorie de billet
            </span>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Nom du tarif (ex: VVIP)"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none col-span-1"
              />
              <input
                type="number"
                placeholder="Prix en FBu (ex: 50000)"
                value={newCatPrice}
                onChange={(e) => setNewCatPrice(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none col-span-1 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Description courte (ex: Coupe-file inclus)"
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-normal text-slate-800 focus:outline-none col-span-1"
              />
              <input
                type="number"
                placeholder="Capacité totale (ex: 150)"
                value={newCatAvailable}
                min={1}
                onChange={(e) => setNewCatAvailable(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none col-span-1 font-mono"
              />
            </div>

            <button
              type="button"
              onClick={addTicketCategory}
              className="w-full py-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer active:scale-95 transition-all shadow-2xs flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ajouter ce tarif</span>
            </button>
          </div>
        </div>

        {/* Message d'erreur dynamique */}
        {formError && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-start gap-3 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold block">Impossible de créer l'événement</span>
              <p className="leading-relaxed">{formError}</p>
            </div>
          </div>
        )}

        {/* Message de succès */}
        {formSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center gap-3 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span className="font-bold">{formSuccess}</span>
          </div>
        )}

        {/* Create Event Button */}
        <button
          type="submit"
          id="btn-submit-create-event"
          disabled={isCreating}
          className="w-full py-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-lg shadow-orange-500/20 active:scale-98 flex items-center justify-center gap-2"
        >
          {isCreating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
              <span>Publication de l'événement en cours...</span>
            </>
          ) : (
            <span>Créer et Publier l'Événement</span>
          )}
        </button>

      </form>

    </div>
  );
};
