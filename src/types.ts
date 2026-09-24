export type UserRole = 'ACHETEUR' | 'ORGANISATEUR' | 'SUPERADMIN';
export type UserAccountStatus = 'ACTIF' | 'SUSPENDU' | 'EN_ATTENTE_VERIFICATION';
export type ApiPaymentMethod = 'LUMICASH' | 'LIGHTNING';

export interface OrganisateurProfile {
  user_id: string;
  nom_structure: string;
  numero_mobile_money_reception: string;
  adresse_lightning_reception: string; // e.g. "vital-o@blink.sv"
  statut_verification: 'EN_ATTENTE' | 'VERIFIE' | 'REJETE';
  commission_taux: number; // e.g. 5 (%)
  document_verification?: string;
}

export interface OrganisateurKyc {
  cniNom: string;
  cniNumero: string;
  cniRectoUrl: string;
  cniVersoUrl: string;
  email: string;
  emailVerifie: boolean;
  statut: 'VERIFIE' | 'EN_ATTENTE' | 'NON_SOUMIS';
  dateVerification?: string;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  avatarUrl: string;
  role: UserRole;
  statut_compte: UserAccountStatus;
  telephone_verifie: boolean;
  activeAssignmentEventId?: string; // Capacité de scan sur un événement précis
  organisateurProfile?: OrganisateurProfile;
  kycOrganisateur?: OrganisateurKyc;
}

export interface ScanneurAssignment {
  id: string;
  user_id: string;
  user_nom: string;
  user_telephone: string;
  event_id: string;
  event_titre: string;
  assigne_par: string; // ID ou nom de l'organisateur
  date_assignation: string;
  actif: boolean;
}

export interface PortefeuilleOrganisateur {
  organisateur_id: string;
  nom_structure: string;
  solde_disponible_fbu: number;
  solde_disponible_sats: number;
  solde_total_genere_fbu: number;
  solde_total_genere_sats: number;
  derniere_maj: string;
}

export interface ParametrePlateforme {
  delai_versement_jours: number; // e.g. 7 (hebdomadaire)
  jour_execution_versement: string; // e.g. "DIMANCHE"
  commission_taux_defaut: number; // e.g. 5 (%)
  modifie_par: string;
  date_modification: string;
}

export interface Versement {
  id: string;
  organisateur_id: string;
  organisateur_nom: string;
  canal: 'MOBILE_MONEY' | 'LIGHTNING';
  montant_fbu?: number;
  montant_sats?: number;
  destination: string; // n° phone ou adresse LN
  statut: 'EN_ATTENTE' | 'EN_COURS' | 'REUSSI' | 'ECHEC';
  reference_transaction: string;
  date_creation: string;
  date_execution?: string;
}

export interface ScanLog {
  id: string;
  ticket_id: string;
  event_id: string;
  event_titre: string;
  scanned_at: string;
  scanned_by_nom: string;
  scanned_by_user_id: string;
  statut_validation: 'ACCEPTE' | 'REJETE';
  raison_rejet?: string;
  tier_name?: string;
}

export interface TicketCategory {
  id?: string;
  tierId?: string;
  name: string; // e.g. "Pelouse", "Tribune d'Honneur", "VIP", "VVIP"
  price: number; // in FBu
  description?: string;
  available: number;
  stockTotal?: number;
  moyens_paiement_acceptes?: ApiPaymentMethod[];
}

export interface Event {
  id: string;
  title: string;
  description: string;
  category: 'sport' | 'musique' | 'religion' | 'corporate';
  imageUrl: string;
  date: string; // readable, e.g. "Dimanche 26 Juillet 2026"
  time: string; // e.g. "15:00"
  location: string; // e.g. "Stade Prince Louis Rwagasore, Bujumbura"
  organisateur: string;
  organisateur_id?: string;
  ticketCategories: TicketCategory[];
  isFeatured?: boolean;
  statut?: 'BROUILLON' | 'PUBLIE' | 'ANNULE' | 'TERMINE';
  visible_publiquement?: boolean;
}

export interface CartItem {
  eventId: string;
  tierId?: string;
  eventTitle: string;
  eventDate?: string;
  eventTime?: string;
  eventLocation?: string;
  categoryName: string;
  quantity: number;
  price: number;
  moyens_paiement_acceptes?: ApiPaymentMethod[];
}

export interface TicketPurchased {
  id: string; // e.g., "BTK-4921-X9"
  eventId: string;
  eventTitle: string;
  eventCategory: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  categoryName: string;
  price: number;
  qrCodeValue: string;
  qr_code_hash?: string; // HMAC/JWT signature cryptographique
  purchaseDate: string;
  status: 'valide' | 'utilise';
  phoneUsed?: string;
  paymentMethod?: string;
  isGift?: boolean;
  recipientName?: string;
  recipientPhone?: string;
  recipientHasNoPhone?: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  date: string;
  type: 'approaching' | 'update' | 'system';
  eventId?: string;
  eventTitle?: string;
  read: boolean;
}

// ---------------------------------------------------------------------------
// CONTRATS API IWACUTIX (API_FRONTEND.MD)
// ---------------------------------------------------------------------------

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface ApiAuthResponse {
  access: string;
  refresh: string;
  user: {
    id: string;
    nom_complet: string;
    email: string | null;
    telephone: string;
    role: UserRole;
    statut_compte: UserAccountStatus;
    telephone_verifie: boolean;
    date_creation: string;
  };
}

export interface ApiUser {
  id: string;
  nom_complet: string;
  email: string | null;
  telephone: string;
  role: UserRole;
  statut_compte: UserAccountStatus;
  telephone_verifie: boolean;
  date_creation: string;
  url_photo_profil?: string;
}

export interface ApiErrorResponse {
  error: string;
  code: string;
  detail?: string;
}

export interface ApiTier {
  id: string;
  nom: string;
  prix_fbu: string; // e.g. "30000.00"
  stock_disponible: number;
  stock_total: number;
  moyens_paiement_acceptes: ApiPaymentMethod[];
}

export interface ApiMedia {
  id: string;
  type_media: 'IMAGE' | 'VIDEO';
  fichier: string | null;
  url_externe: string;
  ordre: number;
  date_ajout: string;
}

export interface ApiEvenementPublic {
  id: string;
  titre: string;
  description: string;
  affiche: string;
  lieu: string;
  ville: string;
  date_debut: string;
  date_fin: string | null;
  categorie: 'SPORT' | 'CONCERT' | 'CONFERENCE' | 'RELIGIEUX' | 'AUTRE';
  organisateur: string;
  tiers?: ApiTier[];
  medias?: ApiMedia[];
}

export interface ApiDestinataireBillet {
  nom?: string;
  telephone?: string;
  sans_smartphone?: boolean;
}

export interface ApiCommandePayload {
  event_id: string;
  tier_id: string;
  quantite: number;
  moyen_paiement: ApiPaymentMethod;
  destinataires?: ApiDestinataireBillet[];
}

export interface ApiLumicashDemanderOtpPayload {
  event_id: string;
  tier_id: string;
  quantite: number;
  destinataires?: ApiDestinataireBillet[];
}

export interface ApiCommandeOrder {
  id: string;
  event_titre: string;
  tiers_lib: string;
  quantite: number;
  montant_fbu: string;
  montant_fbu_affiche?: string;
  montant_sats: number | null;
  montant_total_sats?: number | null;
  moyen_paiement: ApiPaymentMethod;
  statut: 'PENDING' | 'SUCCESS' | 'ECHEC' | 'EXPIRE';
  expires_at: string;
  date_creation: string;
  date_paiement?: string | null;
  statut_reglement_commission?: 'EN_ATTENTE' | 'REUSSI' | 'ECHEC' | 'ECHEC_DEFINITIF';
  tentatives_reglement_commission?: number;
  statut_reglement_organisateur?: 'EN_ATTENTE' | 'REUSSI' | 'ECHEC' | 'ECHEC_DEFINITIF';
  tentatives_reglement_organisateur?: number;
}

export interface ApiPaiementInstruction {
  type: 'lightning' | 'lumicash_onramp';
  provider: 'blink' | 'bitlibera' | string;
  paymentRequest?: string; // BOLT11 invoice lnbc...
  paymentHash?: string;
  satoshis?: number;
  montant_sats?: number;
  montant_fbu?: string;
  taux_fbu_vers_sats?: string;
  instruction?: string;
  expires_at?: string;
}

export interface ApiCommandeResponse {
  order: ApiCommandeOrder;
  paiement: ApiPaiementInstruction;
}

export interface ApiLumicashDemanderOtpResponse {
  order: ApiCommandeOrder;
  next: string;
  paiement: ApiPaiementInstruction;
}

export interface ApiLumicashConfirmerResponse {
  order: ApiCommandeOrder;
  message: string;
}

export interface ApiTicket {
  id: string;
  event_titre: string;
  tiers_lib: string;
  qr_code_hash: string; // <UUID>.<signature> HMAC
  statut: 'VALIDE' | 'UTILISE' | 'ANNULE';
  destinataire_nom: string | null;
  destinataire_telephone: string | null;
}

export interface ApiScanResult {
  statut: 'ACCEPTE' | 'REJETE';
  ticket?: ApiTicket;
  error?: string;
  code?: 'ticket_invalide' | 'acces_interdit' | 'ticket_deja_scanne';
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}


