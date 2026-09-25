# API IwacuTix — Guide développeur frontend/web

> **Dernière mise à jour : généré depuis le code au 25/09/2026** — commit `0b4fe06`.
> Si la version que vous consultez ne porte pas ce hash (ou est plus ancienne), re-synchronisez-la : ce document décrit **exactement** le comportement de l'API au hash indiqué.

Documentation générée depuis l'implémentation réelle (Phases 1 à 7).
Toute route inconnue renvoie `404`. Toute route protégée sans token valide renvoie `401`.

- **URL de base — développement** : `http://127.0.0.1:8000`
- **URL de base — production** : à définir (ex. `https://api.iwacutix.bi`) — remplacer le préfixe ci-dessous selon l'environnement.
- **Préfixe API** : tout passe par `/api/`. Ex. `GET /api/public/evenements/`.
- **Racine** : `GET /` redirige vers la marketplace (`/api/public/evenements/`).

Conventions globales :

- **Format des données** : JSON (UTF-8). Les montants `Decimal` (FBu) sont des **chaînes** (`"30000.00"`) ; les sats sont des **entiers** (`100000`).
- **Dates** : ISO 8601 UTC (`"2026-12-01T18:00:00Z"`).
- **Identifiants** : UUID (`{id}`). Tous les UUID sont au format canonique `8-4-4-4-12`.
- **Pagination** (toutes les listes) : `GET ...?page=N` → `{ "count", "next", "previous", "results" }` ; taille de page par défaut **20**.
- **Fichiers** : les champs `affiche`, `document_verification`, `fichier` (média) se postent en **multipart/form-data** avec le champ fichier. Ils sont renvoyés en URL **relative** (`/media/...`) → préfixer par l'origine de l'API.

### Rôles & permissions — panorama (à lire avant d'implémenter)

Chaque endpoint de ce document précise son rôle requis via un champ **Auth**.
Tableau de synthèse :

| Accès | Endpoints | En cas de rôle insuffisant |
|---|---|---|
| **Publique** (aucun token) | `auth/register`, `auth/login`, `auth/token/refresh`, `auth/password-reset/*`, marketplace `public/**` | — |
| **JWT — tout utilisateur authentifié** (rôle `ACHETEUR`, `ORGANISATEUR` ou `SUPERADMIN`) | `auth/me`, `auth/me/photo-profil`, `auth/me/verifier-email/*`, `auth/me/desactiver`, `auth/me/reactiver`, `organisateurs/mon-profil` (+`/stats`), `organisateurs/verifier-email/*`, `organisateurs/demandes` (+`/mes`), tout `tickets/*` | sans token (ou token invalide/expiré) → `401` `{ "error": "Given token not valid for any token type", "code": "token_not_valid" }` |
| **JWT — organisateur titulaire d'un profil organisateur**, ou **SuperAdmin** | création/liste/détail/update/suppression événements, tiers, médias (`organisateurs/events/*`) | autre rôle → `403` `{ "error": "Réservé aux organisateurs.", "code": "permission_denied" }` |
| **JWT — organisateur PROPRIÉTAIRE du tenant** (ou SuperAdmin) | scanneurs, logs de scan d'un de ses événements (`events/{event_id}/logs-scan/`), modification d'un événement d'un autre tenant | autre tenant → **`404`** sur le détail (le back-end ne révèle pas l'existence des données d'autrui) ; action directe → **`403`** |
| **JWT — SuperAdmin uniquement** | `admin/**` (paramètres, stats, historique, demandes) | `403` `{ "error": "..." , "code": "permission_denied" }` |
| **JWT + assignation scanneur active** (ou SuperAdmin) | `tickets/valider` | scanneur non assigné → `403` `{ "error": "...", "code": "acces_interdit" }` |

> Format des erreurs : toute erreur DRF (401/403/404/405/…) est normalisée en
> `{ "error": "<message affichable>", "code": "<code_machine>" }` (détails en fin de document,
> section « Format des erreurs »). Seules les **erreurs de validation par champ** renvoient
> `{ "champ": ["message"] }` sans normalisation.

---

## Authentification JWT

Depuis la refonte auth (commit `14efd90`), **un seul mode de connexion** existe pour tous les rôles :
- Création de compte : `POST /api/auth/register/` (au moins **un** identifiant email/username/téléphone + mot de passe) — retourne directement les tokens JWT.
- Connexion : `POST /api/auth/login/` (`identifiant` = **email, username ou téléphone** + mot de passe).
- **L'OTP SMS d'authentification a été supprimé** : plus de `demander-otp` / `verifier-otp` côté `/api/auth/`.

### Obtenir un token

```
POST /api/auth/register/    (création de compte → tokens immédiats)
POST /api/auth/login/       (tout compte ACTIF avec mot de passe)
```

Réponse commune (**201** pour register, **200** pour login) :

```json
{
  "access": "eyJhbGciOiJIUzI1NiIs...",
  "refresh": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "9f1a...",
    "nom_complet": "Jean Ntakirutimana",
    "email": "jean@iwacu.bi",
    "username": "jean",
    "telephone": "+25779123456",
    "role": "ACHETEUR",
    "statut_compte": "ACTIF",
    "telephone_verifie": false,
    "url_photo_profil": "/static/img/avatar-defaut.svg",
    "date_creation": "2026-09-01T10:00:00Z"
  }
}
```

### Utilisation

- Header obligatoire : `Authorization: Bearer <access>`.
- **Access token : 60 minutes.** **Refresh token : 7 jours.**
- **Rafraîchissement** (`POST /api/auth/token/refresh/`) :

```
POST /api/auth/token/refresh/
Body : { "refresh": "<refresh_token>" }
Réponse 200 : { "access": "...", "refresh": "..." }
```

> ⚠️ Le mode `ROTATE_REFRESH_TOKENS` est actif : chaque appel de refresh **invalide l'ancien refresh token** renvoyé dans la réponse et émet une **nouvelle paire** (access + refresh). Le frontend doit donc toujours stocker le **dernier** `refresh` reçu et l'utiliser pour le prochain rafraîchissement ; un vieux refresh réutilisé échouera avec `token_not_valid`. Côté client : implémenter le refresh en « single-flight » (un seul appel à la fois) en interceptant les 401.

---

## Parcours d'achat complets (bout en bout)

Deux façons d'acheter, au choix de l'utilisateur selon le tier :
- **Parcours LIGHTNING** (payé en sats directement dans un wallet) — section 5.1.
- **Parcours LUMICASH** (payé en FBu via Lumicash, on-ramp BitLibera) — section 5.2.

Le détail de chaque appel (params, erreurs) est décrit en sections 1 et 5.

### Parcours A — Achat en Lightning ⚡ (wallet Blink)

1. **Créer/authentifier le compte acheteur** (si pas encore connecté) :
   ```
   POST /api/auth/register/   { "email": "jean@iwacu.bi", "password": "motdepasse", "telephone": "+25779123456" }
   POST /api/auth/login/      { "identifiant": "jean@iwacu.bi", "password": "motdepasse" }
   ```
   → récupérer `access` (Bearer).
2. **Trouver l'événement** (publique, aucun token) :
   ```
   GET /api/public/evenements/?ville=Bujumbura
   GET /api/public/evenements/{event_id}/
   ```
   → choisir un `tier` dont `moyens_paiement_acceptes` contient `"LIGHTNING"` (vérifier aussi `stock_disponible`).
3. **Créer la commande** (JWT acheteur requis) :
   ```
   POST /api/tickets/commandes/
   { "event_id": "<uuid>", "tier_id": "<uuid>", "quantite": 1,
     "moyen_paiement": "LIGHTNING", "destinataires": [] }
   ```
   - **Réponse 200** — commande `PENDING` + invoice Blink :
     ```json
     {
       "order": {
         "id": "<uuid>", "event_titre": "Concert de la Paix", "tiers_lib": "Tribune",
         "quantite": 1, "montant_fbu": "30000.00", "montant_fbu_affiche": "30000.00",
         "montant_sats": 132450, "montant_total_sats": 132450,
         "moyen_paiement": "LIGHTNING", "statut": "PENDING",
         "expires_at": "2026-09-23T18:10:00Z", "date_creation": "2026-09-23T18:00:00Z",
         "date_paiement": null,
         "statut_reglement_commission": "EN_ATTENTE", "tentatives_reglement_commission": 0,
         "statut_reglement_organisateur": "EN_ATTENTE", "tentatives_reglement_organisateur": 0
       },
       "paiement": {
         "type": "lightning", "provider": "blink",
         "paymentRequest": "lnbc132450n1p...", "paymentHash": "8942a1c3b8...",
         "satoshis": 132450, "montant_sats": 132450,
         "taux_fbu_vers_sats": "0.0044150", "expires_at": "2026-09-23T18:10:00Z"
       }
     }
     ```
4. **Afficher la facture** : QR code contenant `lightning:<paymentRequest>` (ou bouton « Copier l'adresse » + montant `paiement.satoshis` en sats). Compter à rebours sur `order.expires_at`.
5. **Le client paie** dans son wallet ; le **serveur reçoit le webhook Blink** (aucune action frontend — les webhooks sont 100 % backend, cf. section 6). En échange, la commande passe `SUCCESS` puis le **règlement immédiat** démarre (commission puis organisateur).
6. **Attendre la confirmation** (polling recommandé, toutes les 3-4 s) :
   ```
   GET /api/tickets/commandes/mes/     → order.statut passe "SUCCESS"
   GET /api/tickets/mes-billets/       → billets prêts
   ```
7. **Afficher les billets** : chaque `qr_code_hash` est le **contenu brut du QR** (format `UUID.signature`), à afficher tel quel — c'est ce qu'attendra le scanneur (section 7).

> ⚠️ Réservation **10 min** (`order.expires_at`) pour les deux parcours : passé ce délai, statut `EXPIRE`, stock libéré. Prévenir l'utilisateur du compte à rebours.

### Parcours B — Achat en FBu via Lumicash 📱 (on-ramp BitLibera)

1. **Créer/authentifier le compte acheteur** (idem Parcours A, étape 1).
2. **Trouver l'événement** (idem Parcours A, étape 2) — choisir un tier dont `moyens_paiement_acceptes` contient `"LUMICASH"`.
3. **Étape 1/2 — demander l'OTP Lumicash** (JWT acheteur ; le stock est réservé immédiatement, 10 min) :
   ```
   POST /api/tickets/commandes/lumicash/demander-otp/
   { "event_id": "<uuid>", "tier_id": "<uuid>", "quantite": 1, "destinataires": [] }
   ```
   **Réponse 200** :
   ```json
   {
     "order": { "id": "<uuid>", "montant_fbu": "30000.00", "moyen_paiement": "LUMICASH", "statut": "PENDING", "expires_at": "..." },
     "next": "/api/tickets/commandes/lumicash/confirmer/",
     "paiement": {
       "type": "lumicash_onramp", "provider": "bitlibera", "montant_fbu": "30000.00",
       "instruction": "Un OTP Lumicash vient d'être envoyé par SMS. Confirmez avec l'OTP."
     }
   }
   ```
   Afficher l'instruction à l'utilisateur (OTP reçu par SMS).
4. **Étape 2/2 — confirmer avec l'OTP** :
   ```
   POST /api/tickets/commandes/lumicash/confirmer/
   { "order_id": "<uuid>", "otp": "123456" }
   ```
   **Réponse 200** :
   ```json
   { "order": { "...": "statut SUCCESS ..." }, "message": "Paiement confirmé et billets émis." }
   ```
   La confirmation génère les billets et déclenche le **règlement immédiat** (commission puis organisateur) — en mode dev, l'OTP est simulé (n'importe quel code… cf. section 5.2).
5. **Attendre / vérifier** : `GET /api/tickets/commandes/mes/` puis `GET /api/tickets/mes-billets/` (idem Parcours A, étape 6-7).

> OTP refusé par BitLibera → `402` (`code: paiement_echoue`) : la commande est annulée et le stock libéré — relancer un parcours.

---

## 1. Authentification

### 1.1 `POST /api/auth/register/` — inscription

- **Auth** : publique.
- **Body** :
  ```json
  {
    "email": "jean@iwacu.bi",
    "username": "jean",
    "telephone": "+25779123456",
    "password": "motdepasse",
    "nom_complet": "Jean Ntakirutimana"
  }
  ```
- **Contraintes** :
  - Au moins **un identifiant** parmi `email` / `username` / `telephone` (tous optionnels et uniques).
  - `email` : email valide (stocké en minuscules). `username` : 3–50 caractères (`a-z0-9._-`,
    normalisé en minuscules). `telephone` : `+?[0-9]{8,15}` (normalisé : espaces/tirets retirés).
  - `password` : obligatoire (write-only), soumis aux validateurs Django (longueur, non trivial).
- **Réponse 201** : `{ "access", "refresh", "user" }` — le compte est créé **immédiatement ACTIF**
  (`role: "ACHETEUR"`, `statut_compte: "ACTIF"`, `email_verifie: false`) et les tokens JWT sont
  remis directement. **Aucune vérification n'est requise** à l'inscription.
- **Erreurs** :
  - `400` `{ "email": ["..."] }` / `{ "username": [...] }` / `{ "telephone": [...] }` si l'identifiant est déjà utilisé ou invalide.
  - `400` `{ "non_field_errors": ["Fournissez au moins un identifiant : email, username ou téléphone."] }`.

### 1.2 Vérification d'email du compte — token 1 h par email

> Le pipeline d'authentification repose sur des **tokens 1 h envoyés par email** (hash HMAC-SHA256
> stocké, jamais en clair, usage unique, **5 tentatives max**). **Il n'y a plus de code SMS OTP**
> pour l'authentification — les paiements Lumicash (on-ramp BitLibera, cf. 5.2) et la vérification
> d'email organisateur (cf. 2.6) gardent leurs propres flux de code.

- `POST /api/auth/me/verifier-email/` — **demander** (JWT requise). **Aucun body** : l'email est celui
  du compte connecté. → `200`
  `{ "message": "Lien de vérification envoyé par email (valable 1h).", "code": "verif_envoi" }`.
- `POST /api/auth/me/verifier-email/confirmer/` — **confirmer** (JWT requise) :
  `{ "code": "<token reçu par email>" }` → `200` `{ "user": {...} }`. Marque `email_verifie=True`.
- **Erreurs** (format `{error, code}`) :
  - `400` `{ "error": "Code expiré.", "code": "token_expire" }`
  - `400` `{ "error": "Code incorrect.", "code": "token_invalide" }`

### 1.3 `POST /api/auth/password-reset/request/` — demander un reset

- **Auth** : publique (anti-énumération : réponse identique que l'email existe ou non).
- **Body** : `{ "identifiant": "<email du compte>" }` → `200`
  `{ "message": "Si un compte correspond à cet identifiant, un lien de réinitialisation vient d'être envoyé par email (valable 1h).", "code": "reset_lien_envoye" }`.

### 1.4 `POST /api/auth/password-reset/confirm/` — confirmer le reset

- **Auth** : publique.
- **Body** : `{ "identifiant": "<email>", "code": "<token reçu par email>", "nouveau_mdp": "<nouveau mot de passe>" }`.
- **Réponse 200** : `{ "user": {...} }` — le mot de passe est remplacé (`set_password`).
- **Erreurs** :
  - `400` `{ "error": "Code expiré. Demandez un nouveau code.", "code": "token_expire" }`
  - `400` `{ "error": "Code incorrect.", "code": "token_invalide" }`
  - `429` `{ "error": "Trop de tentatives. Demandez un nouveau code.", "code": "tentatives_epuisees" }`
- **Contraintes** : token **1 heure** (usage unique), **5 tentatives max** → au-delà, nouveau token
  obligatoire (429) ; un nouveau token **invalide les précédents** du même email.

### 1.5 `POST /api/auth/login/` — email, username OU téléphone + mot de passe

- **Auth** : publique.
- **Body** :
  ```json
  { "identifiant": "contact@iwacu.bi", "password": "motdepasse" }
  ```
  `identifiant` = **email** (contient `@`, insensible à la casse) **sinon username** (normalisé)
  **sinon téléphone** (normalisé) — résolution dans cet ordre.
- **Réponse 200** : `{ "access", "refresh", "user" }`. Met à jour `derniere_connexion`.
- **Erreurs** :
  - `400` `{ "identifiant": ["Identifiant ou mot de passe incorrect."] }` — message unique quel que
    soit la cause (identifiant inconnu, mauvais mot de passe, compte désactivé) : **anti-énumération**.
- **Contraintes** : tout compte **ACTIF disposant d'un mot de passe utilisable** peut se connecter,
  quel que soit son rôle (acheteur, organisateur, superadmin). Un compte **sans mot de passe** ou
  **non ACTIF / désactivé** est refusé.

### 1.6 `POST /api/auth/token/refresh/` — rafraîchir les tokens

- **Auth** : publique.
- **Body** : `{ "refresh": "<refresh_token>" }`
- **Réponse 200** : `{ "access": "...", "refresh": "..." }`
- **Erreurs** : `401` `{ "error": "Token is invalid or expired", "code": "token_not_valid" }` (y compris un ancien refresh déjà consommé par rotation).

### 1.7 `GET /api/auth/me/` — profil de l'utilisateur connecté

- **Auth** : JWT (n'importe quel rôle).
- **Réponse 200** : objet `user` : `id`, `nom_complet`, `email`, `username`, `telephone`, `role`,
  `statut_compte`, `telephone_verifie`, `url_photo_profil` (chemin relatif `/media/...` ou
  `/static/img/avatar-defaut.svg` si aucune photo), `date_creation`.

### 1.8 Désactivation & réactivation du compte

- `POST /api/auth/me/desactiver/` (JWT) — **suppression douce** : le compte passe à
  `statut_compte: "DESACTIVE"` (jamais supprimé physiquement). Connexion et achats bloqués.
  → `200` `{ "user": {...} }`.
- `POST /api/auth/me/reactiver/` (JWT) — retour à `statut_compte: "ACTIF"`. → `200` `{ "user": {...} }`.

### 1.9 Photo de profil — `PATCH/DELETE /api/auth/me/photo-profil/`

- **Auth** : JWT.
- **PATCH** (multipart) : `{ "photo_profil": <fichier image> }` → **200**. L'image est
  **redimensionnée à 400×400 max** et **ré-enregistrée en JPEG** (`url_photo_profil` se termine
  alors par `.jpg`). Fichier non-image → `400`.
- **DELETE** → **200** : la photo est supprimée et `url_photo_profil` repointe vers
  `/static/img/avatar-defaut.svg`.
- Non authentifié → `401`.

---

## 2. Organisateurs

Le rôle exact dépend de l'endpoint (détaillé au fil de la section) :
- `mon-profil`, `mon-profil/stats`, `demandes*` : **JWT — tout utilisateur authentifié** ; le
  profil s'auto-crée à la première lecture si nécessaire.
- scanneurs : **JWT — organisateur propriétaire du tenant ou SuperAdmin**.

### 2.1 `GET /api/organisateurs/mon-profil/` — profil en lecture

- **Auth** : JWT (tout rôle). Le profil est créé automatiquement s'il n'existe pas encore
  (`get_or_create_for_user`).

**Réponse 200** :
```json
{
  "id": "<uuid>",
  "telephone": "+25770000000",
  "email": "contact@iwacu.bi",
  "email_verifie": false,
  "nom_entreprise": "Iwacu Events",
  "canal_reception": "LIGHTNING",
  "destination_reception": "org@geyser.finance",
  "numero_mobile_money_reception": "+25771122334",
  "adresse_lightning_reception": "ibea_wallet_H2x...",
  "document_verification": null,
  "statut_verification": "EN_ATTENTE",
  "commission_taux": "0.0200"
}
```
> `telephone`, `email`, `email_verifie`, `statut_verification` et `commission_taux` sont **lecture seule**.
> `canal_reception` (`LIGHTNING | LUMICASH`) désigne le **canal unique de règlement** des ventes
> (les montants partent toujours en sats et sont convertis à la réception si canal `LUMICASH`).
> `destination_reception` = adresse Lightning OU numéro Lumicash selon le canal.
> `statut_verification` (`EN_ATTENTE | VERIFIE | REJETE`) et `commission_taux` sont **lecture seule**.
> Les champs hérités `numero_mobile_money_reception` / `adresse_lightning_reception` restent
> présents dans la réponse pour compatibilité mais **ne pilotent aucun règlement** : le juge de
> paix est `canal_reception` + `destination_reception`.

### 2.2 `PUT /api/organisateurs/mon-profil/` — mise à jour

- **Body** (multipart si document fourni) :
  ```json
  {
    "nom_entreprise": "Iwacu Events SA",
    "canal_reception": "LUMICASH",
    "destination_reception": "+25771122334",
    "document_verification": "<fichier>"
  }
  ```
- **Réponse 200** : profil à jour (même shape que GET).
- **Contraintes** :
  - `destination_reception` est requise pour vendre (la validation de publication le vérifie).
  - Un organisme acceptant `LIGHTNING` sur un tier doit avoir `canal_reception = LIGHTNING` +
    destination valide ; pour `LUMICASH` : `canal_reception = LUMICASH` + numéro Lumicash.

### 2.3 `GET /api/organisateurs/mon-profil/stats/` — statistiques de ventes

- **Auth** : JWT (tout rôle ; le profil est auto-créé si absent). Un `ACHETEUR` verra des stats
  vides — c'est en pratique l'écran de l'organisateur.
- **Réponse 200** (uniquement les ventes `SUCCESS` de **mes** événements) :
  ```json
  {
    "nb_evenements": 3,
    "nb_billets_vendus": 87,
    "nb_ventes": 50,
    "total_fbu_affiche": 1500000.0,
    "total_sats": 66225,
    "total_net_organisateur_sats": 64900,
    "total_commission_sats": 1325,
    "par_evenement": [ { "event__titre": "Concert de la Paix", "nb_ventes": 40, "total_sats": 53000 } ],
    "par_tier":    [ { "event__titre": "...", "tier__nom": "Tribune", "nb_ventes": 30, "total_sats": 40000 } ],
    "par_mois":    [ { "mois": "2026-09-01T00:00:00Z", "nb_ventes": 50, "total_sats": 66225 } ]
  }
  ```
  → Les sommes des ventes `SUCCESS` sont **réglées immédiatement par vente** (commission puis
  organisateur) : il n'existe ni solde accumulé, ni endpoint « verser » — ces indicateurs y
  figurent uniquement pour le suivi.

### 2.4 Gestion des scanneurs (JWT organisateur PROPRIÉTAIRE ou SuperAdmin)

- **Auth** : JWT obligatoire. L'utilisateur doit être l'organisateur propriétaire du tenant **ou**
  un SuperAdmin (`_get_organisateur_context`).
- Action sur le tenant d'un autre organisateur → `403`
  `{ "error": "Vous ne gérez pas cet organisateur.", "code": "permission_denied" }` ; tenant
  **inexistant** → `404` `{ "error": "Organisateur introuvable.", "code": "not_found" }`.

**Liste** : `GET /api/organisateurs/{organisateur_id}/scanneurs/?event_id={uuid}`

**Réponse 200** (pagifié) :
```json
{ "count": 1, "results": [ {
  "id": "<uuid>",
  "user_id": "<uuid>",
  "nom_scanneur": "Alice Niyonzima",
  "telephone_scanneur": "+25779222222",
  "event_id": "<uuid>",
  "event_titre": "Concert de la Paix",
  "date_assignation": "2026-09-20T09:00:00Z",
  "actif": true
} ] }
```

**Assigner** : `POST /api/organisateurs/{organisateur_id}/scanneurs/assigner/`
```json
{ "telephone_ou_user_id": "+25779222222", "event_id": "<uuid>" }
```
**Réponse 201** : objet scanneur (idem ci-dessus). `telephone_ou_user_id` accepte un **téléphone** OU un **uuid** d'utilisateur.

**Retirer** : `DELETE /api/organisateurs/{organisateur_id}/scanneurs/{assignment_id}/` → **204**.

- **Contraintes** :
  - L'organisateur ne peut agir que sur **ses propres** événements (sinon `403` ou `404` — le backend ne révèle pas l'existence des données d'un autre tenant).
  - L'assignation `actif=true` est **prérequis** pour que le scanneur puisse valider des billets.
  - SuperAdmin peut gérer les scanneurs de tous les organisateurs.

### 2.5 Demande d'adhésion organisateur (JWT, tout rôle)

- **Auth** : JWT — toute personne authentifiée (acheteur inclus) peut candidater. Sans token → `401`.

#### `POST /api/organisateurs/demandes/` — soumettre une demande

- **Body** (multipart) : `{ "nom_entreprise": "...", "document_verification": <fichier>, "nom_structure": "...", "justification": "..." }`
  (`nom_structure`/`justification` optionnels ; `nom_entreprise` et le document de vérification sont **requis**).
- Un **contrôle automatique** est exécuté immédiatement (compte actif + téléphone vérifié, pas de
  profil vérifié / demande en cours, dossier rempli) : si tous les critères passent → la demande
  part chez le **SuperAdmin** (`EN_ATTENTE_SUPERADMIN`) ; sinon elle est **rejetée**
  (`REJETE_AUTO` + `motif_rejet` résumant les critères en échec). Le détail structuré des critères
  (`controles_auto_resultat`) reste **en base, non exposé par l'API**.
- **Réponse 201** : objet `demande` (shape ci-dessous), `statut` et éventuellement `motif_rejet`.

#### `GET /api/organisateurs/demandes/mes/` — mes demandes

**Réponse 200** (liste) : les demandes de l'utilisateur connecté.
```json
{
  "id": "<uuid>", "telephone": "+25779123456", "nom_soumis": "Jean Ntakirutimana",
  "nom_entreprise": "Iwacu Events", "nom_structure": "SARL Iwacu",
  "document_verification": "/media/verification_organisateurs/demandes/x.pdf",
  "justification": null, "statut": "EN_ATTENTE_SUPERADMIN",
  "motif_rejet": null, "date_soumission": "2026-09-23T09:00:00Z"
}
```
- `statut` : `EN_ATTENTE_CONTROLE_AUTO | REJETE_AUTO | EN_ATTENTE_SUPERADMIN | APPROUVE | REJETE`.
- Une fois `APPROUVE`, le profil organisateur est **vérifié** : l'utilisateur peut créer des événements.

### 2.6 Vérification de l'email organisateur — code 6 chiffres par email (JWT, tout rôle)

> À distinguer de la vérification d'email du **compte** (1.2, token URL-safe) : c'est ici l'email
> **du profil organisateur** qui est validé (`OrganisateurProfile.email_verifie`), prérequis pour
> l'approbation de la demande d'adhésion par le SuperAdmin. Le code est un **OTP 6 chiffres** envoyé
> par email, valable `AUTH_OTP_LIFETIME_MINUTES` (10 min).

- `POST /api/organisateurs/verifier-email/demander/` — **envoyer le code** (JWT) :
  → `200` `{ "message": "Code de vérification envoyé par email.", "canal": "email" }`.
  - Erreur si le compte connecté n'a **aucun email** : `400`
    `{ "error": "Ajoutez d'abord une adresse email à votre compte.", "code": "email_absent" }`.
- `POST /api/organisateurs/verifier-email/confirmer/` — **confirmer** (JWT) :
  `{ "code": "123456" }` → `200` `{ "message": "Adresse email vérifiée.", "profil": {...} }`.
  Marque `profil.email_verifie = True`.
- **Erreurs** (format `{error, code}`) :
  - `400` `{ "error": "Code expiré. Demandez un nouveau code.", "code": "code_expire" }`
  - `400` `{ "error": "Code incorrect.", "code": "code_invalide" }`
  - `429` `{ "error": "Trop de tentatives. Demandez un nouveau code.", "code": "tentatives_epuisees" }`

---

## 3. Événements

### 3.A Marketplace publique (aucune authentification)

#### `GET /api/public/evenements/` — liste

Filtres en query string (combinables) :

| Paramètre | Effet |
|---|---|
| `categorie` | `SPORT | CONCERT | CONFERENCE | RELIGIEUX | AUTRE` |
| `ville` | filtre sur `ville` **ou** `lieu` (insensible à la casse) |
| `date_min` / `date_max` | bornes sur `date_debut` (ISO UTC) |
| `q` | recherche dans `titre` / `description` |

Seuls les événements **publiés**, **visibles** et **non passés** sont listés.

**Réponse 200** (pagifié) :
```json
{ "count": 1, "results": [ {
  "id": "<uuid>",
  "titre": "Concert de la Paix",
  "description": "...",
  "affiche": "/media/evenements/affiches/x.jpg",
  "lieu": "Stade du Prince Louis Rwagasore",
  "ville": "Bujumbura",
  "date_debut": "2026-12-01T18:00:00Z",
  "date_fin": null,
  "categorie": "CONCERT",
  "organisateur": "Iwacu Events"
} ] }
```
> La page publique est **mise en cache côté serveur ~60 s** : ne pas s'étonner d'un léger délai entre une publication et son apparition.

#### `GET /api/public/evenements/{id}/` — détail

**Réponse 200** : objet de la liste **+** `tiers` et `medias` (ordonnés par `ordre` puis date) :
```json
{
  "id": "<uuid>", "...": "...",
  "tiers": [ {
    "id": "<uuid>",
    "nom": "Tribune",
    "prix_fbu": "30000.00",
    "stock_disponible": 87,
    "stock_total": 100,
    "moyens_paiement_acceptes": ["LUMICASH", "LIGHTNING"]
  } ],
  "medias": [ {
    "id": "<uuid>",
    "type_media": "VIDEO",
    "fichier": null,
    "url_externe": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "ordre": 0,
    "date_ajout": "2026-09-20T09:00:00Z"
  } ]
}
```

**Erreurs** : `404` `{ "error": "Événement non trouvé.", "code": "not_found" }`.

#### `GET /api/public/evenements/{id}/tiers/` — niveaux de places en temps réel

**Réponse 200** (pagifié) : liste de tiers (shape ci-dessus, triée par prix croissant). Idéal pour rafraîchir le stock pendant un achat.

### 3.B Dashboard organisateur (`api/organisateurs/events/`)

- **Auth** : JWT + **profil organisateur existant** (rôle `ORGANISATEUR` ayant un profil), **ou**
  **SuperAdmin**. Un autre rôle (ex. simple `ACHETEUR`) → `403`
  `{ "error": "Réservé aux organisateurs.", "code": "permission_denied" }` ; sans token → `401`.
- **Isolation de tenant** : chaque organisateur ne voit que **ses** événements. Détail d'un
  événement d'un autre tenant → `404` (volontairement confondu avec l'inexistence) ; tentative de
  modification → `403`.

Préfixe : `api/organisateurs/events/`

#### `GET /api/organisateurs/events/` — ses événements

**Réponse 200** (pagifié) — objet complet, ex :
```json
{ "id": "<uuid>", "organisateur": "<uuid>", "titre": "...", "description": "...",
  "affiche": "/media/...", "lieu": "...", "ville": "...", "date_debut": "...",
  "date_fin": null, "categorie": "CONCERT", "statut": "BROUILLON",
  "visible_publiquement": true, "date_publication": null,
  "tiers": [ ... ], "nb_tiers": 2 }
```

#### `POST /api/organisateurs/events/` — créer (multipart si affiche)

**Body minimal** :
```json
{
  "titre": "Concert de la Paix",
  "description": "...",
  "lieu": "Stade du Prince",
  "ville": "Bujumbura",
  "date_debut": "2026-12-01T18:00:00Z",
  "date_fin": "2026-12-01T23:00:00Z",
  "categorie": "CONCERT"
}
```
**Réponse 201** : objet complet. **L'événement est créé en `statut: "BROUILLON"`** (le champ `statut` du body est ignoré). La **publication** se fait via l'update ci-dessous.

#### `GET /api/organisateurs/events/{id}/` — détail

**Réponse 200** : objet complet (shape du POST).

#### `PATCH /api/organisateurs/events/{id}/` — modifier / **publier**

- Body partiel. Pour **publier** : `{ "statut": "PUBLIE" }`.
- **Réponse 200** : objet complet, `statut: "PUBLIE"`, `date_publication` remplie.
- **Erreurs** :
  - `400` si **aucun tiers** n'existe (`"Impossible de publier un événement sans niveau de places."`).
  - `400` si un tier accepte un moyen de paiement dont la réception organisateur n'est pas renseignée.
- **Contraintes** : seul l'organisateur **propriétaire** (ou SuperAdmin) peut modifier/supprimer → sinon `403`. Un organisateur A ne voit jamais les événements de B (`404` sur le détail d'un événement d'un autre tenant).

#### `DELETE /api/organisateurs/events/{id}/` → **204**.

#### Tiers (niveaux de places)
- **Liste/création** : `GET /api/organisateurs/events/{event_id}/tiers/`
  **POST** :
  ```json
  { "nom": "Tribune", "prix_fbu": 30000.00, "stock_total": 100, "moyens_paiement_acceptes": ["LUMICASH", "LIGHTNING"] }
  ```
  **Réponse 201** : objet tier avec `stock_disponible` calculé.
  - Erreurs `400` : `stock_total` ≤ 0 ; aucun moyen de paiement ; réception manquante (le canal
    `canal_reception` / `destination_reception` de l'organisateur doit couvrir les moyens actifs
    acceptés). Les moyens dépréciés (`ECOCASH`, `BANCOBU`, `IHELA`) sont **refusés** — seuls
    `LIGHTNING` et `LUMICASH` sont traités.
- **Détail / màj / suppression** : `GET|PATCH|DELETE /api/organisateurs/events/{event_id}/tiers/{tier_id}/`. Le `PATCH` peut remplacer `moyens_paiement_acceptes` (liste complète).

### 3.C Médias (galerie)

Voir section 4.

### 3.D Logs de scan — `GET /api/organisateurs/events/{event_id}/logs-scan/`

- **Auth** : JWT organisateur **propriétaire** du tenant ou SuperAdmin (idem 3.B). Événement
  inconnu ou appartenant à un autre tenant → **`404`** `{ "error": "Événement introuvable.", "code": "not_found" }`.
- Journal de **chaque scan** du billet sur l'événement (accepté **et** rejeté). Pagifié +
  résumé agrégé ; filtre `?statut_validation=ACCEPTE|REJETE`.

**Réponse 200** :
```json
{
  "count": 2,
  "results": [
    {
      "id": "<uuid>",
      "scanned_at": "2026-09-20T09:05:00Z",
      "statut_validation": "REJETE",
      "raison_rejet": "deja_scanne",
      "billet_event_titre": "Concert de la Paix",
      "billet_tiers_lib": "Tribune",
      "billet_qr_code_hash": "9f1a2b3c-...",
      "billet_statut": "UTILISE",
      "scanneur_nom": "Alice Niyonzima",
      "scanneur_telephone": "+25779222222"
    }
  ],
  "stats": { "total": 2, "acceptes": 1, "rejetes": 1 }
}
```

---

## 4. Médias d'événement (galerie)

JWT organisateur propriétaire ou SuperAdmin. Préfixe : `api/organisateurs/events/{event_id}/medias/`

- **Auth** : idem section 3.B (profil organisateur ou SuperAdmin ; isolation de tenant — autres
  tenants → `404`/`403`).

### 4.1 `GET .../medias/` — liste
**Réponse 200** (pagifié), éléments triés par `ordre` : `{ id, type_media, fichier, url_externe, ordre, date_ajout }`.

### 4.2 `POST .../medias/` — ajouter

Un média est **soit** un fichier uploadé **soit** une URL externe — **jamais les deux, jamais aucun**.

- Fichier (multipart) :
  ```
  POST /events/{id}/medias/   (multipart)
  { "type_media": "IMAGE", "fichier": <fichier> }
  ```
- URL (JSON) :
  ```json
  { "type_media": "VIDEO", "url_externe": "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }
  ```

**Réponse 201** : `{ "id", "type_media", "fichier": "/media/evenements/medias/x.mp4", "url_externe": "", "ordre", "date_ajout" }`

**Contraintes fortes** :

| Contrainte | Valeur |
|---|---|
| Maximum par événement | **10 médias** (`MAX_MEDIA_PAR_EVENT`) |
| Vidéo uploadée | **MP4 uniquement**, taille ≤ **50 Mo** |
| Vidéo par URL | **YouTube ou Vimeo uniquement** (URLs `youtube.com/watch|embed|shorts`, `youtu.be/`, `vimeo.com/…`) |
| Exclusivité | fournir `fichier` **ou** `url_externe`, pas autre |

**Erreurs** `400` (exemples) :
```json
{ "url_externe": ["Seuls les liens YouTube et Vimeo sont acceptés."] }
{ "detail": "Nombre maximum de médias par événement atteint (10)." }
```

### 4.3 `DELETE .../medias/{media_id}/` → **204** (la référence est retirée de la galerie ; le fichier physique n'est pas systématiquement purgé du disque).

### 4.4 `PATCH .../medias/reordonner/` — ordre de la galerie

**Body** :
```json
{ "media_ids": ["<uuid-ordre-1>", "<uuid-ordre-2>", "..."] }
```
**Réponse 200** : `{ "detail": "Ordre mis à jour." }`
> La liste doit contenir **exactement** les IDs de tous les médias de l'événement, sinon `400`.

---

## 5. Commandes & billets

- **Auth** (toutes les routes de ce chapitre) : **JWT — tout utilisateur authentifié** (rôle
  `ACHETEUR` typiquement ; `ORGANISATEUR`/`SUPERADMIN` acceptés). L'acheteur payeur est toujours
  `request.user`. Sans token valide → `401`.
- Événement **non disponible / expiré / non publié** au moment de l'achat : traité comme
  `410 reservation_expiree` (voir tableau d'erreurs).

### 5.1 `POST /api/tickets/commandes/` — acheter en Lightning (paiement sats via Blink)

**Body** :
```json
{
  "event_id": "<uuid>",
  "tier_id": "<uuid>",
  "quantite": 2,
  "moyen_paiement": "LIGHTNING",
  "telephone": "+25779222222",
  "destinataires": [
    { "nom": "Alice", "telephone": "+25779222222", "sans_smartphone": false },
    { "nom": "Bob", "telephone": "+25779333333" }
  ]
}
```

- `quantite` : **1 à 20**.
- `telephone` : **optionnel** — uniquement pour l'achat **anonyme** : il devient le
  `telephone_paiement` (compte minimal ACHETEUR créé si besoin). JWT connecté : le champ est
  ignoré (le `telephone` du compte fait foi). Note d'implémentation : l'achat anonyme
  déclenche actuellement une `NameError` serveur (fonction `acheteur_pour_achat` supprimée,
  non remplacée) → **500** ; le flux **JWT fonctionne** (cf. « Non encore implémenté » § 10.…).
- `moyen_paiement` : **`LIGHTNING` uniquement ici**. Le choix `LUMICASH` est **refusé** sur cet
  endpoint (le message renvoie vers l'**on-ramp BitLibera**, cf. 5.2). Les moyens dépréciés
  (`ECOCASH`, `BANCOBU`, `IHELA`) ne sont pas acceptés — seuls `LIGHTNING` et `LUMICASH` existent.
- `destinataires` (optionnel) : si fourni, **doit contenir exactement `quantite` entrées** (billets-cadeaux). Champs optionnels : `nom`, `telephone`, `sans_smartphone` (bool).
- Le moyen choisi **doit être accepté par le tier** (sinon `400`).

**Réponse 200** — commande `PENDING` + invoice Blink :
```json
{
  "order": {
    "id": "<uuid>", "event_titre": "Concert de la Paix", "tiers_lib": "Tribune", "quantite": 2,
    "montant_fbu": "60000.00", "montant_fbu_affiche": "60000.00",
    "montant_sats": 265000, "montant_total_sats": 265000,
    "moyen_paiement": "LIGHTNING", "statut": "PENDING",
    "expires_at": "2026-09-23T18:10:00Z", "date_creation": "2026-09-23T18:00:00Z",
    "date_paiement": null,
    "statut_reglement_commission": "EN_ATTENTE", "tentatives_reglement_commission": 0,
    "statut_reglement_organisateur": "EN_ATTENTE", "tentatives_reglement_organisateur": 0
  },
  "paiement": {
    "type": "lightning", "provider": "blink",
    "paymentRequest": "lnbc265000n1p...", "paymentHash": "8942a1c3b8...",
    "satoshis": 265000, "montant_sats": 265000,
    "taux_fbu_vers_sats": "0.0044150", "expires_at": "2026-09-23T18:10:00Z"
  }
}
```
- `statut` : `PENDING | SUCCESS | ECHEC | EXPIRE`.
- **10 minutes** de réservation (`expires_at`). À expiration : statut `EXPIRE`, stock libéré.
- À afficher : QR `lightning:<paymentRequest>` + montant en sats (`paiement.satoshis`).
- La confirmation est **serveur → serveur** (webhook Blink, section 6) ; le frontend ne fait que
  **poller** `GET /api/tickets/commandes/mes/` (5.3) pour détecter `SUCCESS`. Une fois `SUCCESS`,
  le **règlement immédiat** démarre (commission SuperAdmin puis net organisateur — cf. section 8 ;
  l'état de ces règlements est visible dans les champs `statut_reglement_*` de l'`order`).
- En dev (sans clé Blink), le `paymentRequest` est **fictif**, aucun appel réseau émis.

**Erreurs** (format `{error, code}`) :

| Code HTTP | `code` | Signification |
|---|---|---|
| 400 | *(champs)* | `event_id`/`tier_id` introuvables, `telephone` requis absent, `destinataires` ≠ quantité, `quantite` hors 1–20 |
| 400 | *(champ `moyen_paiement`)* | moyen non accepté par le tier **ou** `LUMICASH` passé sur cet endpoint → erreur **champ** (pas un `code` métier) : `"Le règlement Lumicash passe par l'on-ramp BitLibera : ..."`. Utiliser le parcours on-ramp (5.2) |
| 409 | `stock_insuffisant` | plus de place disponible |
| 410 | `reservation_expiree` | événement plus en vente / terminé |
| 500 | `erreur_interne` | **achat anonyme** : `NameError: name 'acheteur_pour_achat' is not defined` (fonction retirée lors de la refonte OTP). C'est le **seul** cas où sans JWT la commande ne part pas. **Ne pas brancher le parcours anonyme tant que ce n'est pas corrigé** |
| 502 | *(non standardisé)* | Échec d'initiation du paiement : `{ "error": "Impossible d'initier le paiement.", "detail": "..." }` |

### 5.2 On-ramp Lumicash (BitLibera) — achat en FBu via OTP SMS

Deux appels successifs (flux 2 temps). Le canal `LUMICASH` **ne passe pas** par `commandes/` :
c'est ce parcours qu'il faut utiliser (cf. Parcours B en tête de document).

#### `POST /api/tickets/commandes/lumicash/demander-otp/`

```json
{ "event_id": "<uuid>", "tier_id": "<uuid>", "quantite": 1, "destinataires": [] }
```
**Réponse 200** :
```json
{
  "order": { "id": "<uuid>", "montant_fbu": "30000.00", "moyen_paiement": "LUMICASH", "statut": "PENDING", "expires_at": "..." },
  "next": "/api/tickets/commandes/lumicash/confirmer/",
  "paiement": {
    "type": "lumicash_onramp", "provider": "bitlibera", "montant_fbu": "30000.00",
    "instruction": "Un OTP Lumicash vient d'être envoyé par SMS. Confirmez avec l'OTP."
  }
}
```
- Le stock est **réservé** immédiatement (10 min, même règle que Lightning).
- Erreurs identiques au tableau de 5.1 (sauf `paiement_lumicash_via_onramp`) ; le tier doit
  accepter `LUMICASH` (`400` champs `moyen_paiement` sinon).

#### `POST /api/tickets/commandes/lumicash/confirmer/`

```json
{ "order_id": "<uuid>", "otp": "123456" }
```
**Réponse 200** : `{ "order": {...statut SUCCESS...}, "message": "Paiement confirmé et billets émis." }`

- OTP refusé par BitLibera → **`402`** `{ "error": "...", "code": "paiement_echoue" }` : la commande
  passe `ECHEC` et le stock est libéré (message détaillé dynamique).
- La commande doit **appartenir à l'utilisateur connecté** : commande inconnue ou d'autrui →
  **`404`** `{ "error": "Commande introuvable ou ne vous appartenant pas.", "code": "not_found" }`.
- Déjà `SUCCESS` → **`200` idempotent** (la commande est renvoyée, aucun nouveau billet émis ;
  `409 paiement_deja_confirme` reste réservé au rejeu réseau du webhook Blink).
- Réservation expirée (10 min) → **`410`** `{ "error": "...", "code": "reservation_expiree" }` (le
  stock est libéré ; rejouer un parcours complet).
- La confirmation génère les billets **et** déclenche le **règlement immédiat** (commission puis
  organisateur). En dev/sans clé BitLibera, l'OTP est **simulé** (mock) : tout code accepté par le
  flot de test valide (le vrai rejet OTP n'existe qu'avec une clé réelle).

### 5.3 `GET /api/tickets/commandes/mes/` — mes commandes (pagifié)

Objet complet `order` (shape de 5.1) + `tiers_lib`, `event_titre`. **Le frontend peut poller cet
endpoint** (ex. toutes les 3-4 s pendant l'attente de confirmation) pour détecter `SUCCESS`.

### 5.4 `GET /api/tickets/commandes/{id}/` — détail d'une commande

Même shape que 5.3, filtrée sur **une commande de l'utilisateur connecté** (commande d'un autre → `404`).

### 5.5 `GET /api/tickets/mes-billets/` — mes billets (pagifié)

**Réponse 200** :
```json
{ "results": [ {
  "id": "<uuid>",
  "event_titre": "Concert de la Paix",
  "tiers_lib": "Tribune",
  "qr_code_hash": "9f1a2b3c-....Mlj1Vw8QQ2hPvA",   ← <UUID>.<signature>
  "statut": "VALIDE",
  "destinataire_nom": "Alice",
  "destinataire_telephone": "+25779222222"
} ] }
```
- `statut` : `VALIDE | UTILISE | ANNULE`.
- `qr_code_hash` = **contenu brut du QR** (`UUID.signature` HMAC). Émettre un QR de ce texte exact ; aucun préfixe.

### 5.6 Notifications transactionnelles (acheteur)

À la confirmation d'une commande, le back-end notifie l'acheteur (tâche
`ticketing.tasks.envoyer_notification_achat`), **de façon découplée** : un échec de
notification ne fait jamais échouer le paiement/règlement. L'exécution suit le mode des
tâches Celery — en dev local et sous worker, via Celery avec relance exponentielle en cas
d'échec ; sur Render plan free (mode eager, sans worker), en synchrone dans la requête, sans
relance. Le frontend n'a **rien à implémenter** (les notifications partent du serveur).

- **WhatsApp — réel (Meta Cloud API)** : actif dès que `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_ID`
  sont posés et `WHATSAPP_MOCK=False`. Sinon mode **mock** (message loggé en console, jamais
  d'appel réseau). Numéros normalisés en E.164 (`+257…` par défaut).
- **SMS** : mode **mock** tant qu'aucun fournisseur n'est branché (`SMS_PROVIDER_API_KEY` vide).
  Point d'extension prévu (provider HTTP générique) mais non câblé à ce jour.
- **Email** (si l'acheteur a un email) : via le backend Django configuré (`console` en dev).

### 5.7 `POST /api/tickets/mes-billets/consulter/` - consulter les billets li�s � un t�l�phone (anonyme)

**{telephone, code}** - acc�s (OTP email) � tous les billets li�s au t�l�phone : commandes
(payeur) **et** billets re�us en cadeau (destinataire). **AllowAny**. R�ponse 200 :
```json
{ "billets": [ { ...shape 5.5... } ], "telephone": "+25779222222" }
```

- **Cas d'usage** : un acheteur anonyme a pay� en Lightning avec un `telephone_paiement`,
  puis veut retrouver ses QR sans �tre identifi�. Le code six chiffres est v�rifi� par le
  m�me endpoint OTP **email** (1 h) que la connexion - pas par SMS.
- > ?? **En l'�tat, cet endpoint est cass�** : la vue `ConsulterBilletsView` appelle la fonction
  > `verifier_otp_service` (et les erreurs `OTPExpireError`/`OTPInvalideError`/
  > `OTPTentativesEpulseesError`) **retir�e lors de la refonte OTP**  un `NameError` serveur
  > (500). **Ne pas brancher le parcours anonyme de consulter-billets tant que ce n'est pas
  > corrig�** (rejouer l'endpoint OTP email puis filtrer via `mes-billets/` JWT).
- Erreurs : OTP expir�/invalide/tentatives �puis�es (codes `otp_expire`, `otp_invalide`,
  `otp_tentatives_epuisees`) - identiques au tableau de 5.2-mes-billets. Les codes exacts
  affich�s d�pendent de la correction serveur.

---

## 6. Paiements & webhooks

> ⚠️ **Ce chapitre décrit le fonctionnement interne du backend. Aucun endpoint de webhook ne doit
> jamais être appelé par le frontend web — ni en production ni en dev — et les secrets de
> signature évoqués ici (Svix, HMAC) sont des secrets serveur que le frontend ne doit ni
> connaître, ni stocker, ni transmettre. Le frontend n'observe la confirmation que par le
> **polling** de `GET /api/tickets/commandes/mes/` (section 5.3).**

### 6.1 Principes

- La **confirmation** d'un paiement provient des **webhooks fournisseurs** (serveur → serveur,
  HTTP POST entrant sur le back-end). Le frontend ne fait que **scanner/attendre** via le polling
  de `GET /api/tickets/commandes/mes/`.
- Ces endpoints sont **publics** (`csrf_exempt`) mais **signés** : signature manquante/invalide →
  `401`. Les signatures (Svix pour Blink, HMAC pour BitLibera) sont vérifiées **côté serveur
  uniquement**.
- **Idempotence** : un webhook rejoué est accepté silencieusement (`200`).

### 6.2 Webhook BitLibera (on-ramp Lumicash) — réservé backend

`POST /api/paiements/webhooks/bitlibera/`

- **En-tête de signature** : `X-BitLibera-Signature: <hex>` (ou `X-IwacuTix-Signature`).
- **Secret** : `BITLIBERA_WEBHOOK_SECRET` — la signature n'est vérifiée **que si ce secret est
  configuré**. Absent/vide → la signature n'est pas exigée : un avertissement
  `payments.webhook` est loggé et le traitement s'appuie sur l'idempotence
  (`reference_paiement_externe`). Le schéma réel de signature BitLibera étant à confirmer
  (cf. `docs/BITLIBERA_NOTES.md` § 6/7), c'est une **limitation connue** à lever en posant le
  secret dès que le mécanisme est connu.
- **Calcul** : `hex( HMAC-SHA256( secret, corps_brut_utf8 ) )`.
- **Body** : `{ "order_id": "<uuid>", "status": "COMPLETED" }` (statuts de confirmation :
  `COMPLETED | SUCCESS | PAID | APPROVED`). Commande déjà `SUCCESS` → 200 idempotent ;
  commande inconnue / sans `order_id` → 200 ignoré.

Pour le frontend, tout ce qui suit est **sans objet** : ce webhook est déclenché par le serveur de
BitLibera (ou, en dev, par un script backend/test). Sa documentation détaillée et la simulation de
dev sont dans `docs/BITLIBERA_NOTES.md` (§ 6). Fonctionnellement, il est **équivalent** à
`confirmer/` (OTP) : les deux chemins confirment la commande et déclenchent billets + règlement
immédiat.

### 6.3 Webhook Blink (Lightning) — réservé backend

`POST /api/paiements/webhooks/blink/`

- Serveur → serveur, signature **Svix** (`X-Svix-Signature`) vérifiée avec la lib officielle
  `svix` — le frontend n'a **jamais** à l'implémenter ni à connaître le secret Svix.
- Le frontend n'utilise que le champ `paiement.paymentRequest` (invoice BOLT11) renvoyé par la
  création de commande (5.1) pour afficher le QR « `lightning:<paymentRequest>` ».

**Réponses webhook** (information) : `200` OK (y compris idempotent), `401` signature invalide, `500` erreur serveur, `405` si pas POST.

---

## 7. Scan de billets (contrôle d'accès)

### `POST /api/tickets/valider/`

- **Auth** : JWT — l'utilisateur doit avoir une **`ScanneurAssignment` active** sur l'événement du
  billet (assigné en section 2.4 ; n'importe quel utilisateur peut être assigné scanneur).
  **SuperAdmin** peut tout scanner. Sans token → `401`. Scanneur non assigné → `403`
  `{ "error": "...", "code": "acces_interdit" }` (voir tableau ci-dessous).
- **Body** :
  ```json
  { "qr_code": "9f1a2b3c-....Mlj1Vw8QQ2hPvA" }
  ```
  → passer le **contenu brut du QR** (`qr_code_hash`), la chaîne `UUID.signature` (attention au `+`/`/`/`-` de la signature base64url : ne pas les URI-encoder).

**Réponse 200 (billet accepté)** :
```json
{ "statut": "ACCEPTE", "ticket": { "id": "<uuid>", "event_titre": "...", "tiers_lib": "...", "qr_code_hash": "...", "statut": "UTILISE", "destinataire_nom": null, "destinataire_telephone": null } }
```

**Erreurs** (format `{error, code}`) :

| Code HTTP | `code` | Sens (affichage suggéré) |
|---|---|---|
| 400 | `ticket_invalide` | QR mal formé / signature invalide / billet inconnu → « Billet invalide » |
| 403 | `acces_interdit` | le scanneur n'est **pas assigné** à cet événement |
| 409 | `ticket_deja_scanne` | billet déjà utilisé → « Déjà scanné » |

Chaque scan (accepté **et** rejeté) est journalisé (`ScanLog`) côté serveur.

---

## 8. SuperAdmin — plateforme (gouvernance, réglages, stats)

JWT **SUPERADMIN uniquement** (préfixe `api/admin/`).

- Autre rôle connecté → `403` `{ "error": "Réservé au SuperAdmin.", "code": "permission_denied" }` ;
  sans token → `401`.

### `GET/PUT /api/admin/parametres-plateforme/`

```json
{
  "id": "11111111-1111-1111-1111-111111111111",
  "commission_taux_defaut": "0.0200",
  "canal_commission": "LIGHTNING",
  "destination_commission": "superadmin@geyser.finance",
  "date_modification": "2026-09-23T12:00:00Z"
}
```
- `commission_taux_defaut` (0.02 = 2 %) ; `canal_commission` : `LIGHTNING | LUMICASH` ;
  `destination_commission` : adresse Lightning OU numéro Lumicash selon le canal.
- PUT **full replace** (retourne l'état à jour). En l'absence de destination, les ordres restent
  `SUCCESS` mais le règlement de la commission est en `ECHEC_DEFINITIF` (visibles dans `historique`).

### `GET /api/admin/stats/` — indicateurs globaux

```json
{
  "nb_evenements": 12, "nb_organisateurs_verifies": 3, "nb_billets_vendus": 420,
  "nb_ventes": 250, "total_fbu_affiche": 7500000.0, "total_sats": 331200,
  "total_commission_sats": 6625, "total_net_organisateur_sats": 324575,
  "par_moyen_paiement": [ { "moyen_paiement": "LIGHTNING", "nb_ventes": 250, "total_sats": 331200 } ],
  "reglements": {
    "commission_reussis": 240, "organisateur_reussis": 238,
    "organisateur_echecs_definitifs": 2
  }
}
```
(uniquement les ventes `SUCCESS`.)

### `GET /api/admin/historique/` — journal d'audit des transactions (pagifié)

Chaque confirmation de paiement écrit des traces `TransactionAuditLog` : paiement initial,
chacune des tentatives de règlement (commission et organisateur, succès **et** échecs). Filtres :
`?order=`, `?type_evenement=` (ex. `paiement_initial`, `reglement_commission_*`,
`reglement_organisateur_*`), `?canal=` (`BITLIBERA | BLINK | MANUEL`), `?reference_externe=`.

### Demande d'adhésion organisateur côté SuperAdmin

#### `GET /api/admin/organisateurs/demandes/` — liste

Filtres : `?statut=`, `?user=`. (toutes les demandes, par `-date_soumission`).

#### `POST /api/admin/organisateurs/demandes/{id}/decider/` — décision finale humaine

```json
{ "statut": "APPROUVE" }
```
ou
```json
{ "statut": "REJETE", "motif_rejet": "Document illisible." }
```
- `APPROUVE` → **crée/active le profil organisateur vérifié** de l'utilisateur :
  ```json
  { "detail": "Demande approuvée, profil organisateur créé.", "organisateur_id": "<uuid>", "demande": {...} }
  ```
- `REJETE` → réponse `detail: "Demande rejetée."` + `demande`.
- Une demande **`REJETE_AUTO`** ne peut pas être approuvée (`400`,
  `code: demande_rejetee_auto`).

---

## Format des erreurs (récapitulatif)

- **Toute erreur DRF dont la réponse contient `detail`** (401 token, 404 introuvable, 403 non autorisé, 405, 400 métier explicite) → normalisée par le handler global en :
  ```json
  { "error": "<message affichable>", "code": "<code_machine>" }
  ```
  Codes observés : `token_not_valid`, `not_found`, `permission_denied`, `otp_expire`, `otp_invalide`, `otp_tentatives_epuisees`, `moyen_paiement_non_accepte`, `paiement_lumicash_via_onramp`, `stock_insuffisant`, `reservation_expiree`, `paiement_echoue`, `paiement_deja_confirme`, `ticket_invalide`, `ticket_deja_scanne`, `acces_interdit`, `demande_rejetee_auto`.
- **Erreurs de validation de serializer** (validation par champ) → **non normalisées** :
  ```json
  { "nom_champ": ["message"] }
  ```
- **401 JWT** : `{ "error": "Given token not valid for any token type", "code": "token_not_valid" }` (token absent/expiré/invalide).

**Codes HTTP utiles pour le frontend** : `200/201/204` succès · `400` validation/métier · `401` token · `402` paiement refusé (OTP on-ramp) · `403` non autorisé · `404` introuvable (y compris tenant illégitime, volontairement confondu) · `409` conflit (stock, billet déjà scanné) · `410` réservation expirée · `429` throttling (OTP) · `502` échec init paiement.

---

## Non encore implémenté (état au 23/09/2026)

Ce qui est prévu mais **pas encore codé** — le frontend peut l'anticiper mais **ne pas** s'y brancher :

1. **Clés de production BitLibera** : en l'absence de `BITLIBERA_API_KEY` réelle, l'**on-ramp et
   l'off-ramp BitLibera restent simulés** (mode mock : OTP / invoice fictifs, aucun appel réseau).
   Le paiement Lightning, lui, est branché sur le wallet Blink réel dès que les clés sont posées.
   Cf. `docs/BITLIBERA_NOTES.md` (zones d'ombre à lever avec BitLibera avant la mise en prod).
2. **SMS réel** : `SMS_PROVIDER_API_KEY` vide (et `SMS_MOCK=True`) → OTP et SMS consignés en log ;
   point d'extension prévu mais aucun opérateur SMS réel câblé.
3. **Email de notification d'achat (production)** : envoyé via le backend Django configuré
   (`console` en dev) ; aucun serveur SMTP réel configuré.
4. **Rendu serveur des QR des billets** (image PNG/PDF) : seul le **contenu texte**
   (`qr_code_hash`) est fourni — la génération d'image reste côté frontend.
5. **Billet PDF / transfert de billet** : aucun endpoint de téléchargement ou de transfert de
   possession d'un billet.
6. **Annulation de commande par l'acheteur** (remboursement) : non exposé.
7. **Notifications joueur** (alerte stock, push) : non exposé.
8. **Gestion complète des organisateurs par le SuperAdmin** (liste des profils, suspension,
   modification de la commission par organisateur) : seule la **décision sur les demandes
   d'adhésion** est exposée (`POST /api/admin/organisateurs/demandes/{id}/decider/`).
9. **Renouvellement/extension d'une réservation expirée** : une commande `EXPIRE` (10 min) doit
   être rejouée depuis zéro.

> En cas d'écart entre cette doc et le comportement réel, **le code fait foi** (`urls.py` /
> `views.py` / `serializers.py`).