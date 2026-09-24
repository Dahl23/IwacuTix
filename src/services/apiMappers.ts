import {
  ApiEvenementPublic,
  ApiPaymentMethod,
  ApiTicket,
  ApiUser,
  Event,
  TicketCategory,
  TicketPurchased,
  User,
} from '../types';

export const toAbsoluteApiUrl = (value: string | null | undefined, apiBaseUrl: string): string => {
  if (!value) return '';
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  return `${apiBaseUrl}${value.startsWith('/') ? value : `/${value}`}`;
};

const categoryFromApi = (category: ApiEvenementPublic['categorie']): Event['category'] => {
  if (category === 'SPORT') return 'sport';
  if (category === 'CONCERT') return 'musique';
  if (category === 'RELIGIEUX') return 'religion';
  return 'corporate';
};

const formatDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const formatTime = (isoDate: string): string => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const apiEventToEvent = (apiEvent: ApiEvenementPublic, apiBaseUrl: string): Event => {
  const ticketCategories: TicketCategory[] = (apiEvent.tiers || []).map((tier) => ({
    id: tier.id,
    tierId: tier.id,
    name: tier.nom,
    price: Number.parseFloat(tier.prix_fbu || '0') || 0,
    available: tier.stock_disponible,
    stockTotal: tier.stock_total,
    moyens_paiement_acceptes: tier.moyens_paiement_acceptes,
  }));

  const location = [apiEvent.lieu, apiEvent.ville].filter(Boolean).join(', ');

  return {
    id: apiEvent.id,
    title: apiEvent.titre,
    description: apiEvent.description,
    category: categoryFromApi(apiEvent.categorie),
    imageUrl: toAbsoluteApiUrl(apiEvent.affiche, apiBaseUrl) || '/gotix-logo.jpg',
    date: formatDate(apiEvent.date_debut),
    time: formatTime(apiEvent.date_debut),
    location,
    organisateur: apiEvent.organisateur,
    ticketCategories,
    statut: 'PUBLIE',
    visible_publiquement: true,
  };
};

export const apiUserToUser = (apiUser: ApiUser, currentUser?: User, apiBaseUrl?: string): User => ({
  id: apiUser.id,
  name: apiUser.nom_complet || currentUser?.name || 'Utilisateur IwacuTix',
  phone: apiUser.telephone || currentUser?.phone || '',
  email: apiUser.email || currentUser?.email || '',
  avatarUrl: toAbsoluteApiUrl(apiUser.url_photo_profil, apiBaseUrl || '') || currentUser?.avatarUrl || '',
  role: apiUser.role,
  statut_compte: apiUser.statut_compte,
  telephone_verifie: apiUser.telephone_verifie,
  activeAssignmentEventId: currentUser?.activeAssignmentEventId,
  organisateurProfile: currentUser?.organisateurProfile,
  kycOrganisateur: currentUser?.kycOrganisateur,
});

export const apiTicketToPurchased = (
  apiTicket: ApiTicket,
  events: Event[],
  paymentMethod: ApiPaymentMethod | string = 'IwacuTix'
): TicketPurchased => {
  const matchingEvent = events.find((event) => event.title === apiTicket.event_titre);
  const matchingCategory = matchingEvent?.ticketCategories.find((category) => category.name === apiTicket.tiers_lib);

  return {
    id: apiTicket.id,
    eventId: matchingEvent?.id || '',
    eventTitle: apiTicket.event_titre,
    eventCategory: matchingEvent?.category || 'sport',
    eventDate: matchingEvent?.date || 'Date de l evenement',
    eventTime: matchingEvent?.time || '',
    eventLocation: matchingEvent?.location || 'Lieu a confirmer',
    categoryName: apiTicket.tiers_lib,
    price: matchingCategory?.price || 0,
    qrCodeValue: apiTicket.qr_code_hash,
    qr_code_hash: apiTicket.qr_code_hash,
    purchaseDate: new Date().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    status: apiTicket.statut === 'UTILISE' ? 'utilise' : 'valide',
    paymentMethod,
    isGift: Boolean(apiTicket.destinataire_nom || apiTicket.destinataire_telephone),
    recipientName: apiTicket.destinataire_nom || '',
    recipientPhone: apiTicket.destinataire_telephone || '',
    recipientHasNoPhone: false,
  };
};
