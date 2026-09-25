export type UserRole = 'ACHETEUR' | 'ORGANISATEUR' | 'SUPERADMIN';
export type UserAccountStatus = 'ACTIF' | 'SUSPENDU' | 'DESACTIVE';

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
  username?: string;
  avatarUrl: string;
  role: UserRole;
  statut_compte: UserAccountStatus;
  telephone_verifie: boolean;
  email_verifie?: boolean;
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
  id: string;
  commission_taux_defaut: string; // "0.0200" (fraction décimale, ex. 2%)
  canal_commission: 'LIGHTNING' | 'LUMICASH' | 'MANUEL';
  destination_commission: string;
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
  stockTotal?: number;
  name: string; // e.g. "Pelouse", "Tribune d'Honneur", "VIP", "VVIP"
  price: number; // in FBu
  description?: string;
  available: number;
  moyens_paiement_acceptes?: ('LUMICASH' | 'ECOCASH' | 'BANCOBU' | 'IHELA' | 'LIGHTNING')[];
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
  eventTitle: string;
  categoryName: string;
  quantity: number;
  price: number;
  tierId?: string;
}

export interface TicketPurchased {
  id: string; // uuid du billet (partie "uuid" du QR "uuid.signature")
  eventId: string;
  eventTitle: string;
  eventCategory: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  categoryName: string;
  price: number;
  qrCodeValue: string;
  qr_code_hash?: string; // contenu brut du QR : "uuid.signature" (base64url)
  purchaseDate: string;
  status: 'valide' | 'utilise' | 'annule';
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
    username?: string | null;
    role: UserRole;
    statut_compte: UserAccountStatus;
    telephone_verifie: boolean;
    email_verifie?: boolean;
    date_creation: string;
    url_photo_profil?: string | null;
  };
}

export type ApiPaymentMethod = 'LUMICASH' | 'ECOCASH' | 'BANCOBU' | 'IHELA' | 'LIGHTNING';
export type ApiUser = ApiAuthResponse['user'];

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
  moyens_paiement_acceptes: ('LUMICASH' | 'ECOCASH' | 'BANCOBU' | 'IHELA' | 'LIGHTNING')[];
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
  moyen_paiement: 'LUMICASH' | 'ECOCASH' | 'BANCOBU' | 'IHELA' | 'LIGHTNING';
  destinataires?: ApiDestinataireBillet[];
}

export interface ApiCommandeOrder {
  id: string;
  event_titre: string;
  tiers_lib: string;
  quantite: number;
  montant_fbu: string;
  montant_sats: number | null;
  moyen_paiement: 'LUMICASH' | 'ECOCASH' | 'BANCOBU' | 'IHELA' | 'LIGHTNING';
  statut: 'PENDING' | 'SUCCESS' | 'ECHEC' | 'EXPIRE';
  expires_at: string;
  date_creation: string;
}

export interface ApiPaiementInstruction {
  type: 'mobile_money' | 'lightning';
  provider: string; // 'blink' | 'LUMICASH' | 'ECOCASH' | ...
  reference?: string;
  paymentRequest?: string; // BOLT11 invoice lnbc...
  paymentHash?: string;
  satoshis?: number;
  montant_sats?: number;
  montant_fbu?: string;
  taux_fbu_vers_sats?: string;
  telephone_client?: string;
  instruction?: string;
  expires_at: string;
}

export interface ApiCommandeResponse {
  order: ApiCommandeOrder;
  paiement: ApiPaiementInstruction;
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

export interface OrganisateurProfilApi {
  id: string;
  telephone: string;
  email: string;
  email_verifie: boolean;
  nom_entreprise: string;
  canal_reception: 'LIGHTNING' | 'LUMICASH';
  destination_reception: string;
  numero_mobile_money_reception?: string;
  adresse_lightning_reception?: string;
  document_verification: string | null;
  statut_verification: 'EN_ATTENTE' | 'VERIFIE' | 'REJETE';
  commission_taux: string;
}

export interface OrganisateurStats {
  nb_evenements: number;
  nb_billets_vendus: number;
  nb_ventes: number;
  total_fbu_affiche: number;
  total_sats: number;
  total_net_organisateur_sats: number;
  total_commission_sats: number;
  par_evenement: { event__titre: string; nb_ventes: number; total_sats: number }[];
  par_tier: { event__titre: string; tier__nom: string; nb_ventes: number; total_sats: number }[];
  par_mois: { mois: string; nb_ventes: number; total_sats: number }[];
}

export interface DemandeOrganisateur {
  id: string;
  telephone: string;
  nom_soumis: string;
  nom_entreprise: string;
  nom_structure?: string | null;
  document_verification: string;
  justification?: string | null;
  statut: 'EN_ATTENTE_CONTROLE_AUTO' | 'REJETE_AUTO' | 'EN_ATTENTE_SUPERADMIN' | 'APPROUVE' | 'REJETE';
  motif_rejet?: string | null;
  date_soumission: string;
}

export interface ScanLogEntry {
  id: string;
  scanned_at: string;
  statut_validation: 'ACCEPTE' | 'REJETE';
  raison_rejet?: string;
  billet_event_titre: string;
  billet_tiers_lib: string;
  billet_qr_code_hash: string;
  billet_statut: 'VALIDE' | 'UTILISE' | 'ANNULE';
  scanneur_nom?: string;
  scanneur_telephone?: string;
}

export interface ScanLogResponse {
  count: number;
  results: ScanLogEntry[];
  stats: {
    total: number;
    acceptes: number;
    rejetes: number;
  };
}

export interface LumicashDemanderOtpResponse {
  order: ApiCommandeOrder;
  next: string;
  paiement: {
    type: 'lumicash_onramp';
    provider: 'bitlibera';
    montant_fbu: string;
    instruction: string;
  };
}

export interface LumicashConfirmerResponse {
  order: ApiCommandeOrder;
  message: string;
}

export interface AdminStats {
  nb_evenements: number;
  nb_organisateurs_verifies: number;
  nb_billets_vendus: number;
  nb_ventes: number;
  total_fbu_affiche: number;
  total_sats: number;
  total_commission_sats: number;
  total_net_organisateur_sats: number;
  par_moyen_paiement: { moyen_paiement: string; nb_ventes: number; total_sats: number }[];
  reglements: {
    commission_reussis: number;
    organisateur_reussis: number;
    organisateur_echecs_definitifs: number;
  };
}

export interface TransactionAuditLog {
  id: string;
  order_id?: string;
  type_evenement: string;
  canal: 'BITLIBERA' | 'BLINK' | 'MANUEL';
  montant_sats?: number;
  montant_fbu?: string;
  statut: string;
  reference_externe?: string;
  date_creation: string;
  details?: Record<string, any>;
}


