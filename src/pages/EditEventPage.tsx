import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  Save,
  Loader2,
  Image as ImageIcon,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Calendar,
  MapPin,
  DoorOpen,
  Eye,
  EyeOff,
  Wallet,
  AlertTriangle,
  XCircle,
  Home
} from 'lucide-react';
import { useApp } from '../AppContext';
import { api, API_BASE_URL } from '../services/apiClient';
import { ApiTier } from '../types';
import { toAbsoluteApiUrl } from '../services/apiMappers';
import { parseApiError } from '../utils/apiErrors';

const CATEGORY_OPTIONS = [
  { value: 'SPORT', label: 'Sport' },
  { value: 'CONCERT', label: 'Concert' },
  { value: 'CONFERENCE', label: 'Conférence' },
  { value: 'RELIGIEUX', label: 'Religieux' },
  { value: 'AUTRE', label: 'Autre' },
];

const CANAL_TO_LABEL: Record<string, string> = {
  LUMICASH: 'Lumicash',
  LIGHTNING: 'Lightning',
  ECOCASH: 'Ecocash',
  BANCOBU: 'Bancobu',
  IHELA: 'Ihela',
};

const toLocalInput = (iso?: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

interface ApiEventDetail {
  id: string;
  titre: string;
  description: string;
  affiche: string | null;
  lieu: string;
  ville: string;
  date_debut: string;
  date_fin: string | null;
  categorie: string;
  statut: string;
  visible_publiquement: boolean;
  date_publication: string | null;
  tiers: ApiTier[];
}

const formatPrice = (price: string | number) => {
  const p = Number.parseFloat(String(price)) || 0;
  if (p === 0) return 'Gratuit';
  return `${p.toLocaleString('fr-FR')} FBu`;
};

const TIER_DEFAULT_MOYENS = ['LUMICASH', 'LIGHTNING'];

export const EditEventPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { loadPublicEvents } = useApp();

  const [event, setEvent] = useState<ApiEventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Champs d'informations générales
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('CONCERT');
  const [location, setLocation] = useState('');
  const [city, setCity] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [visible, setVisible] = useState(true);
  const [afficheFile, setAfficheFile] = useState<File | null>(null);
  const [affichePreview, setAffichePreview] = useState<string>('');

  // Tiers
  const [tiers, setTiers] = useState<ApiTier[]>([]);
  const [tierEditingId, setTierEditingId] = useState<string | null>(null);
  const [tierFormNom, setTierFormNom] = useState('');
  const [tierFormPrix, setTierFormPrix] = useState('');
  const [tierFormStock, setTierFormStock] = useState('');
  const [tierFormMoyens, setTierFormMoyens] = useState<string[]>(TIER_DEFAULT_MOYENS);
  const [tierSaving, setTierSaving] = useState(false);
  const [tierError, setTierError] = useState<string | null>(null);

  const loadEvent = async (showSpinner = true) => {
    if (!id) return;
    if (showSpinner) setLoading(true);
    try {
      const raw = await api.events.getEvent(id);
      setEvent(raw);
      setTitle(raw.titre || '');
      setDescription(raw.description || '');
      setCategory(raw.categorie || 'CONCERT');
      setLocation(raw.lieu || '');
      setCity(raw.ville || '');
      setDateDebut(toLocalInput(raw.date_debut));
      setDateFin(toLocalInput(raw.date_fin));
      setVisible(raw.visible_publiquement !== false);
      try {
        const tierRes = await api.events.getTiers(id);
        setTiers(tierRes || []);
      } catch {}
    } catch (err) {
      const parsed = parseApiError(err);
      setFeedback({ type: 'error', text: parsed.message || 'Impossible de charger l\'événement.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleAfficheChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFeedback({ type: 'error', text: 'Format non supporté. Choisissez une image (JPG, PNG, WebP).' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFeedback({ type: 'error', text: 'L\'image dépasse la taille maximale de 10 Mo.' });
      return;
    }
    setAfficheFile(file);
    const reader = new FileReader();
    reader.onload = () => setAffichePreview(String(reader.result));
    reader.readAsDataURL(file);
  };

  const handleSave = async (publish: boolean) => {
    if (saving || !id) return;
    setFeedback(null);
    if (!title.trim()) {
      setFeedback({ type: 'error', text: 'Le titre de l\'événement est obligatoire.' });
      return;
    }
    if (!dateDebut) {
      setFeedback({ type: 'error', text: 'Renseignez la date de début de l\'événement.' });
      return;
    }
    setSaving(true);
    try {
      const common = {
        titre: title.trim(),
        description: description.trim() || 'Aucune description disponible pour cet événement.',
        categorie: category,
        lieu: location.trim(),
        ville: city.trim() || 'Bujumbura',
        date_debut: new Date(dateDebut).toISOString(),
        ...(dateFin ? { date_fin: new Date(dateFin).toISOString() } : { date_fin: null }),
        visible_publiquement: visible,
      };

      if (afficheFile) {
        const formData = new FormData();
        Object.entries(common).forEach(([key, value]) => {
          if (value !== null && value !== undefined) formData.append(key, String(value));
        });
        formData.append('affiche', afficheFile);
        if (publish) formData.append('statut', 'PUBLIE');
        await api.events.updateEvent(id, formData);
      } else {
        const payload: Record<string, unknown> = { ...common };
        if (publish) payload.statut = 'PUBLIE';
        await api.events.updateEvent(id, payload);
      }

      setAfficheFile(null);
      setAffichePreview('');
      await loadEvent(false);
      void loadPublicEvents();
      setFeedback({ type: 'success', text: publish ? 'Événement publié avec succès !' : 'Modifications enregistrées.' });
    } catch (err) {
      const parsed = parseApiError(err);
      setFeedback({ type: 'error', text: parsed.message || 'Enregistrement impossible.' });
    } finally {
      setSaving(false);
    }
  };

  const resetTierForm = () => {
    setTierEditingId(null);
    setTierFormNom('');
    setTierFormPrix('');
    setTierFormStock('');
    setTierFormMoyens(TIER_DEFAULT_MOYENS);
    setTierError(null);
  };

  const startEditTier = async (tierId: string) => {
    if (!id) return;
    setTierError(null);
    try {
      const t = await api.events.getTier(id, tierId);
      setTierEditingId(t.id);
      setTierFormNom(t.nom);
      setTierFormPrix(String(Number.parseFloat(t.prix_fbu) || 0));
      setTierFormStock(String(t.stock_total));
      setTierFormMoyens((t.moyens_paiement_acceptes as string[]) || []);
    } catch (err) {
      const parsed = parseApiError(err);
      setFeedback({ type: 'error', text: parsed.message || 'Impossible de charger le niveau de places.' });
    }
  };

  const toggleMoyen = (code: string) => {
    setTierFormMoyens((prev) =>
      prev.includes(code) ? prev.filter((m) => m !== code) : [...prev, code]
    );
  };

  const handleSaveTier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tierSaving || !id) return;
    setTierError(null);
    if (!tierFormNom.trim()) {
      setTierError('Le nom du niveau de places est obligatoire.');
      return;
    }
    const priceNum = Number.parseFloat(tierFormPrix) || 0;
    if (priceNum < 0) {
      setTierError('Le prix ne peut pas être négatif.');
      return;
    }
    const stockNum = Number.parseInt(tierFormStock, 10) || 0;
    if (stockNum <= 0) {
      setTierError('Le stock total doit être supérieur à 0.');
      return;
    }
    if (tierFormMoyens.length === 0) {
      setTierError('Sélectionnez au moins un moyen de paiement (Lumicash ou Lightning).');
      return;
    }
    const payload = {
      nom: tierFormNom.trim(),
      prix_fbu: priceNum,
      stock_total: stockNum,
      moyens_paiement_acceptes: tierFormMoyens,
    };
    setTierSaving(true);
    try {
      if (tierEditingId) {
        await api.events.updateTier(id, tierEditingId, payload);
        setFeedback({ type: 'success', text: 'Niveau de places mis à jour.' });
      } else {
        await api.events.createTier(id, payload);
        setFeedback({ type: 'success', text: 'Niveau de places ajouté.' });
      }
      resetTierForm();
      const tierRes = await api.events.getTiers(id);
      setTiers(tierRes || []);
      if (event) setEvent({ ...event, statut: event.statut === 'PUBLIE' ? 'PUBLIE' : event.statut });
    } catch (err) {
      const parsed = parseApiError(err);
      setTierError(parsed.message || 'Enregistrement du niveau de places impossible.');
    } finally {
      setTierSaving(false);
    }
  };

  const handleDeleteTier = async (tierId: string, tierNom: string) => {
    if (!id) return;
    if (!window.confirm(`Supprimer définitivement le niveau « ${tierNom} » ? Les billets déjà vendus pour ce niveau seront impactés.`)) return;
    try {
      await api.events.deleteTier(id, tierId);
      const tierRes = await api.events.getTiers(id);
      setTiers(tierRes || []);
      if (tierEditingId === tierId) resetTierForm();
      setFeedback({ type: 'success', text: `Niveau « ${tierNom} » supprimé.` });
    } catch (err) {
      const parsed = parseApiError(err);
      setFeedback({ type: 'error', text: parsed.message || 'Suppression impossible.' });
    }
  };

  const handleDeleteEvent = async () => {
    if (!id) return;
    if (!window.confirm('Supprimer définitivement cet événement, ses niveaux de places et ses médias ? Cette action est irréversible.')) return;
    setDeleting(true);
    try {
      await api.events.deleteEvent(id);
      void loadPublicEvents();
      navigate('/organisateur');
    } catch (err) {
      const parsed = parseApiError(err);
      setFeedback({ type: 'error', text: parsed.message || 'Suppression impossible.' });
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-[#F8FAFC] h-full">
        <Loader2 className="w-8 h-8 text-brand-primary animate-spin mb-4" />
        <h3 className="text-sm font-display font-bold text-slate-700">Chargement de l'événement...</h3>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-[#F8FAFC] h-full">
        <AlertTriangle className="w-12 h-12 text-rose-500 mb-4" />
        <h3 className="text-lg font-display font-bold text-slate-900">Événement introuvable</h3>
        <button
          onClick={() => navigate('/organisateur')}
          className="mt-6 px-6 py-2 bg-brand-primary rounded-xl text-white font-semibold shadow-sm cursor-pointer"
        >
          Retour à l'espace organisateur
        </button>
      </div>
    );
  }

  const eventImageUrl = affichePreview || (event.affiche ? toAbsoluteApiUrl(event.affiche, API_BASE_URL) : null);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F8FAFC] overflow-y-auto">
      {/* Top Header */}
      <div className="px-4 py-2.5 flex items-center justify-between sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer border border-slate-200/40"
          title="Retour"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0 text-center">
          <span className="text-xs font-display font-bold text-slate-800 block truncate">Modifier l'événement</span>
          <span className="text-[9px] font-mono text-slate-400 uppercase flex items-center justify-center gap-1">
            {event.statut === 'PUBLIE' ? (
              <><Check className="w-3 h-3 text-emerald-500" /> Publié</>
            ) : (
              <><DoorOpen className="w-3 h-3 text-amber-500" /> Brouillon</>
            )}
          </span>
        </div>
        <div className="w-7 h-7" />
      </div>

      <div className="p-4 space-y-4 max-w-2xl w-full mx-auto">
        {feedback && (
          <div className={`p-3 rounded-2xl text-xs font-bold flex items-center justify-between border shadow-sm animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}>
            <span>{feedback.text}</span>
            <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Informations générales */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900">Informations générales</span>
            <span className="text-[10px] font-mono text-slate-400 uppercase">PATCH /api/organisateurs/events/:id</span>
          </div>
          <div className="p-4 space-y-3.5">
            <div>
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600 block mb-1">
                Titre *<span className="normal-case font-sans text-[9px] text-slate-400"> — titre de l'événement</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-brand-primary focus:bg-white transition-colors"
                placeholder="Ex: Concert de la Solidarité 2026"
              />
            </div>

            <div>
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600 block mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-primary focus:bg-white transition-colors resize-y"
                placeholder="Décrivez l'événement..."
              />
            </div>

            <div>
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600 block mb-1">
                Catégorie
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-brand-primary focus:bg-white transition-colors"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600 block mb-1">
                  <MapPin className="w-3 h-3 inline-block mr-1" />Lieu *
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-brand-primary focus:bg-white transition-colors"
                  placeholder="Ex: Stade du Prince Louis Rwagasore"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600 block mb-1">
                  Ville
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-brand-primary focus:bg-white transition-colors"
                  placeholder="Bujumbura"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600 block mb-1">
                  Date de début *
                </label>
                <input
                  type="datetime-local"
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-brand-primary focus:bg-white transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600 block mb-1">
                  Date de fin (optionnel)
                </label>
                <input
                  type="datetime-local"
                  value={dateFin}
                  onChange={(e) => setDateFin(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-brand-primary focus:bg-white transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600 block mb-1">
                Affiche de l'événement
              </label>
              {eventImageUrl ? (
                <div className="relative overflow-hidden rounded-xl border border-slate-200">
                  <img
                    referrerPolicy="no-referrer"
                    src={eventImageUrl}
                    alt="Aperçu affiche"
                    className="w-full h-40 object-cover"
                  />
                  {afficheFile && (
                    <button
                      type="button"
                      onClick={() => { setAfficheFile(null); setAffichePreview(''); }}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-900/70 text-white hover:bg-rose-600 transition-colors cursor-pointer"
                      title="Retirer le nouveau fichier"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ) : (
                <label className="w-full p-4 rounded-2xl border-2 border-dashed border-orange-300 hover:border-brand-primary bg-orange-50/40 hover:bg-orange-50 transition-all flex flex-col items-center justify-center gap-2 group cursor-pointer active:scale-98">
                  <div className="p-3 rounded-full bg-white shadow-sm text-brand-primary group-hover:scale-110 transition-transform">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">Ajouter / remplacer l'affiche</p>
                  <p className="text-[10px] text-slate-500">JPG, PNG, WebP jusqu'à 10 Mo</p>
                  <input type="file" accept="image/*" onChange={handleAfficheChange} className="hidden" />
                </label>
              )}
            </div>

            <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3 border border-slate-100">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                {visible ? <Eye className="w-4 h-4 text-emerald-600" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
                {visible ? 'Visible publiquement (marketplace)' : 'Masqué de la marketplace'}
              </div>
              <button
                type="button"
                onClick={() => setVisible(!visible)}
                className={`relative w-10 h-5.5 h-[22px] rounded-full transition-colors cursor-pointer border ${
                  visible ? 'bg-emerald-500 border-emerald-600' : 'bg-slate-300 border-slate-300'
                }`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${visible ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={() => void handleSave(false)}
                disabled={saving}
                className="flex-1 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Enregistrer les modifications</span>
              </button>
              {event.statut !== 'PUBLIE' && (
                <button
                  type="button"
                  onClick={() => void handleSave(true)}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Publier</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Gestion des niveaux de places */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <DoorOpen className="w-3.5 h-3.5 text-brand-primary" />
              Niveaux de places ({tiers.length})
            </span>
            <span className="text-[10px] font-mono text-slate-400 uppercase">Tiers CRUD API</span>
          </div>

          <div className="p-4 space-y-3">
            {tiers.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-4">
                Aucun niveau de places. Ajoutez-en un ci-dessous avant la publication.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                {tiers.map((t) => (
                  <div key={t.id} className="p-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{t.nom}</p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {formatPrice(t.prix_fbu)} • {Number.parseInt(String(t.stock_disponible))} place(s) dispo. / {Number.parseInt(String(t.stock_total))}{' '}
                        • {((t.moyens_paiement_acceptes as string[]) || []).map((m) => CANAL_TO_LABEL[m] || m).join(', ') || '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => void startEditTier(t.id)}
                        className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer border border-slate-200"
                        title="Modifier ce niveau"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => void handleDeleteTier(t.id, t.nom)}
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border border-slate-200"
                        title="Supprimer ce niveau"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tierError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                <span>{tierError}</span>
              </div>
            )}

            <form onSubmit={handleSaveTier} className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                  {tierEditingId ? 'Modifier le niveau' : 'Ajouter un niveau'}
                </span>
                {tierEditingId && (
                  <button
                    type="button"
                    onClick={resetTierForm}
                    className="text-[10px] font-semibold text-slate-400 hover:text-slate-700 cursor-pointer flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Annuler l'édition
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-600 block mb-1">
                    Nom *
                  </label>
                  <input
                    type="text"
                    value={tierFormNom}
                    onChange={(e) => setTierFormNom(e.target.value)}
                    placeholder="Ex: VIP"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-brand-primary focus:bg-white transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-600 block mb-1">
                    Prix (FBu) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={tierFormPrix}
                    onChange={(e) => setTierFormPrix(e.target.value)}
                    placeholder="15000"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-brand-primary focus:bg-white transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-600 block mb-1">
                    Stock total *
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={tierFormStock}
                    onChange={(e) => setTierFormStock(e.target.value)}
                    placeholder="500"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-brand-primary focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                  Moyens de paiement acceptés *
                </label>
                <div className="flex flex-wrap gap-2">
                  {(['LUMICASH', 'LIGHTNING'] as const).map((code) => {
                    const active = tierFormMoyens.includes(code);
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => toggleMoyen(code)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                          active
                            ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/40'
                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <Wallet className="w-3.5 h-3.5" />
                        {CANAL_TO_LABEL[code]}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[9px] text-slate-400 mt-1.5">
                  Seuls LUMICASH (via BitLibera) et LIGHTNING (via Blink) sont traités par la plateforme.
                </p>
              </div>

              <button
                type="submit"
                disabled={tierSaving}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {tierSaving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement...</>
                ) : (
                  <><Plus className="w-4 h-4" /> {tierEditingId ? 'Enregistrer les modifications du niveau' : 'Ajouter ce niveau de places'}</>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Zone de danger */}
        <div className="bg-white rounded-2xl border border-rose-200/70 shadow-xs overflow-hidden">
          <div className="px-4 py-3 bg-rose-50 border-b border-rose-200 flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              Zone de danger
            </span>
          </div>
          <div className="p-4">
            <p className="text-[10px] text-rose-600 leading-relaxed">
              Supprimer définitivement l'événement « <strong>{event.titre}</strong> », ses niveaux de places, médias et journaux de scan agrégés.
            </p>
            <button
              type="button"
              onClick={() => void handleDeleteEvent()}
              disabled={deleting}
              className="mt-3 w-full py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-700 border border-rose-200 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {deleting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Suppression en cours...</>
              ) : (
                <><XCircle className="w-4 h-4" /> Supprimer l'événement</>
              )}
            </button>
          </div>
        </div>

        {/* Retour à l'espace organisateur */}
        <button
          onClick={() => navigate('/organisateur')}
          className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Home className="w-4 h-4" />
          Retour à l'espace organisateur
        </button>
      </div>
    </div>
  );
};
