/**
 * Lecture normalisée des erreurs API IwacuTix (spec §9).
 *
 * Le client HTTP (apiClient) lève le corps brut de la réponse sans le transformer.
 * Ici on centralise la lecture côté UI :
 *  - erreur métier normalisée    → { error, code }  → message affichable + code machine
 *  - validation de serializer    → { champ: [...] } → premier message par champ
 *  - exception login (compte inactif) → { detail }   → message brut du serveur
 *
 * Le contrat de l'intercepteur n'est PAS modifié : cette fonction ne fait que lire.
 */

export interface ApiErrorMessage {
  message: string;
  code?: string;
}

const DEPRECATED_TICKET_CODES: Record<string, string> = {
  token_not_valid: 'Session expirée. Reconnectez-vous.',
  not_found: 'Ressource introuvable.',
  permission_denied: 'Vous n’avez pas les droits nécessaires.',
  otp_expire: 'Code expiré. Demandez un nouveau code.',
  otp_invalide: 'Code incorrect.',
  otp_tentatives_epuisees: 'Trop de tentatives. Demandez un nouveau code.',
  moyen_paiement_non_accepte: 'Ce moyen de paiement n’est pas accepté pour ce billet.',
  paiement_lumicash_via_onramp: 'Le paiement Lumicash se fait via l’on-ramp, pas ici.',
  stock_insuffisant: 'Stock insuffisant pour cette réservation.',
  reservation_expiree: 'Réservation expirée. Relancez la commande.',
  paiement_echoue: 'Le paiement a échoué.',
  paiement_deja_confirme: 'Ce paiement a déjà été confirmé.',
  ticket_invalide: 'Billet invalide.',
  ticket_deja_scanne: 'Ce billet a déjà été scanné.',
  acces_interdit: 'Vous n’êtes pas autorisé à scanner cet événement.',
  demande_rejetee_auto: 'Cette demande a été automatiquement rejetée et ne peut plus être approuvée.',
  backend_indisponible: 'Backend momentanément indisponible. Réessayez dans quelques secondes.',
};

const KNOWN_CODES = new Set<string>(Object.keys(DEPRECATED_TICKET_CODES));

/**
 * Extrait un message affichable depuis une erreur levée par le client API.
 * Retourne { message, code } ou une erreur générique si le format est inconnu.
 */
export const parseApiError = (err: unknown): ApiErrorMessage => {
  if (!err || typeof err !== 'object') {
    return { message: 'Une erreur inattendue est survenue.' };
  }

  const e = err as Record<string, any>;

  // 1) Erreur normalisée du backend : { error, code }
  if (typeof e.error === 'string') {
    const code = typeof e.code === 'string' ? e.code : undefined;
    return { message: e.error, code };
  }

  // 2) Exception login documentée : { detail } (compte inactif/suspendu)
  if (typeof e.detail === 'string') {
    return { message: e.detail, code: 'detail' };
  }

  // 3) Validation de serializer : { champ: [message] } — passe telle quelle
  if (e && typeof e === 'object' && !Array.isArray(e)) {
    const firstKey = Object.keys(e)[0];
    const val = firstKey ? e[firstKey] : undefined;
    if (val) {
      const msg = Array.isArray(val) ? val[0] : val;
      if (typeof msg === 'string') {
        return { message: msg };
      }
    }
  }

  // 4) Erreur réseau synchrone simple (ex. TypeError)
  if (e instanceof Error && e.message) {
    return { message: e.message };
  }

  return { message: 'Une erreur inattendue est survenue.' };
};

/**
 * Message générique par code machine connu → libellé affichable prêt à l'emploi.
 * Ne remplace pas le message serveur, mais sert de repli cosmétique.
 */
export const getCodeMessage = (code?: string): string | null => {
  if (!code || !KNOWN_CODES.has(code)) return null;
  return DEPRECATED_TICKET_CODES[code];
};