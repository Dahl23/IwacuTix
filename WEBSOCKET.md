# WebSockets IwacuTix — Guide développeur (temps réel)

Ce document est **indépendant** de `API_FRONTEND.md` et décrit exclusivement le
canal temps réel WebSocket. Il s'adresse aux développeurs frontend/web qui
doivent afficher des événements **poussés par le serveur** (statut de commande,
scan de billet, règlement) sans polling.

## 1. Aperçu

| Sujet | Valeur |
|---|---|
| Protocole | WebSocket (wss en production, ws en local) |
| Transport serveur | Django Channels + daphne (même serveur que l'API REST) |
| Authentification | JWT access — transmis en **query parameter** `?token=` (les navigateurs ne permettent pas de poser un header `Authorization` sur un WebSocket) |
| Format des messages | JSON texte (UTF-8), `push` unidirectionnel serveur → client |
| Serveurs multi-instance | nécessite `REDIS_URL` (le layer Redis synchronise les groupes) |
| Plan Render gratuit | sans `REDIS_URL` le layer est en mémoire : OK mono-instance |

## 2. Connexion

```
wss://VOTRE-HOTE/ws/evenements/?token=<ACCESS_JWT>
wss://VOTRE-HOTE/ws/commandes/<order_id>/?token=<ACCESS_JWT>
wss://VOTRE-HOTE/ws/evenement/<event_id>/?token=<ACCESS_JWT>
wss://VOTRE-HOTE/ws/organisateur/?token=<ACCESS_JWT>
```

- `<ACCESS_JWT>` doit être un **access token** SimpleJWT frais (pas un refresh),
  obtenu via `POST /api/auth/login/` ou `/api/auth/register/`.
- En développement local : `ws://localhost:8000/ws/evenements/?token=…` (daphne
  est actif dès que `channels` est dans `INSTALLED_APPS`, `runserver` gère le WS).

### 2.1 Codes de fermeture

| Code | Signification |
|---|---|
| `4401` | Token JWT absent, invalide ou utilisateur inactif |
| `4403` | Token valide mais ressource non autorisée (ex. commande d'un autre acheteur, événement hors périmètre) |

## 3. Endpoints (canaux) et droits

| Chemin | Groupe cible | Qui est autorisé | Événements reçus |
|---|---|---|---|
| `/ws/evenements/` | `user_{id}` | tout utilisateur connecté | commandes (création, statut), règlements le concernant |
| `/ws/commandes/{order_id}/` | `order_{id}` | acheteur de la commande **ou** organisateur de l'événement | uniquement cette commande |
| `/ws/evenement/{event_id}/` | `event_{id}` | organisateur de l'événement **ou** scanneur assigné (actif) | scans de billets de cet événement |
| `/ws/organisateur/` | `organisateur_{id}` | utilisateur de rôle `ORGANISATEUR` | toutes les commandes et règlements de ses propres événements |

Un client peut ouvrir autant de connexions qu'il veut (une par canal), mais
généralement **une seule connexion `/ws/evenements/` suffit** pour un acheteur,
et `/ws/organisateur/` pour un organisateur.

## 4. Protocole

### 4.1 Après connexion

Le serveur envoie une première trame `ready` confirmant l'abonnement :

```json
{ "type": "ready", "user_id": "uuid", "groupes": ["user_uuid"] }
```

### 4.2 Pendant la connexion

Chaque événement est une trame JSON de la forme :

```json
{
  "type": "<nom de l'événement>",
  "donnees": { "...": "..." }
}
```

Le canal est **push-only** : tout message envoyé par le client est ignoré.

### 4.3 Déconnexion de l'utilisateur

Si le token JWT expire pendant la connexion, le serveur ne coupe pas
immédiatement (aucun recheck périodique) : **c'est au client de se
réconnecter**. Recommandation : survivre à l'expiration en renouvelant la
connexion au moment où `/api/auth/token/refresh/` retourne un nouveau token.

## 5. Événements émis

### 5.1 `commande.cree`

Émis à la création d'une commande (réservation de stock).

```json
{
  "type": "commande.cree",
  "donnees": {
    "order_id": "uuid",
    "statut": "PENDING",
    "event_id": "uuid",
    "tier_id": "uuid",
    "quantite": 2,
    "montant_fbu": "40000.00",
    "montant_sats": 100000,
    "moyen_paiement": "LUMICASH",
    "date_creation": "2026-09-25T10:00:00+02:00",
    "statut_initial": "PENDING"
  }
}
```

### 5.2 `commande.statut`

Émis à chaque **changement de statut** d'une commande. Valeurs possibles de
`donnees.statut` : `PENDING`, `SUCCESS`, `ECHEC`, `EXPIRE`.

```json
{
  "type": "commande.statut",
  "donnees": {
    "order_id": "uuid",
    "statut": "SUCCESS",
    "event_id": "uuid",
    "tier_id": "uuid",
    "quantite": 2,
    "montant_fbu": "40000.00",
    "montant_sats": 100000,
    "moyen_paiement": "LUMICASH",
    "date_creation": "2026-09-25T10:00:00+02:00",
    "statut_avant": "PENDING",
    "raison": "annulée"
  }
}
```

- `statut_avant` est toujours renseigné (valeur précédente).
- `raison` n'est présent que lors d'une annulation (`abort_order`).

### 5.3 `reglement.commission` / `reglement.organisateur`

Émis à chaque tentative de **règlement** en sats vers la commission plateforme
ou l'organisateur.

```json
{
  "type": "reglement.organisateur",
  "donnees": {
    "order_id": "uuid",
    "role": "ORGANISATEUR",
    "statut": "REUSSI",
    "montant_sats": 98000,
    "tentatives": 2
  }
}
```

Valeurs de `statut` : `EN_ATTENTE`, `REUSSI`, `ECHEC_RETRY`, `ECHEC_DEFINITIF`.
`erreur` (chaîne) est présent en cas d'échec ; `note` peut être présent
(`"montant_nul"`).

### 5.4 `billet.scan`

Émis lors d'un **scan de billet** (validation par un scanneur assigné). Reçu sur
`/ws/evenement/{id}/` et `/ws/organisateur/`.

```json
{
  "type": "billet.scan",
  "donnees": {
    "ticket_id": "uuid",
    "order_id": "uuid",
    "event_id": "uuid",
    "statut": "UTILISE",
    "statut_validation": "ACCEPTE",
    "scanneur_id": "uuid",
    "scanned_at": null,
    "raison_rejet": null
  }
}
```

- `statut_validation` : `ACCEPTE` (billet valide, passé à `UTILISE`) ou `REJETE`
  (`raison_rejet` : `deja_scanne` ou `annule`).
- `scanned_at` est volontairement `null` pour l'instant (l'horodatage est
  disponible via `ScanLog` côté API) ; il reste dans le contrat pour compat.

## 6. Exemple JavaScript (navigateur natif)

```js
const connecter = (url) => {
  const accessToken = localStorage.getItem("access"); // à gérer par vos soins
  const ws = new WebSocket(`${url}?token=${accessToken}`);

  ws.addEventListener("open", () => console.log("[ws] connecté"));
  ws.addEventListener("message", (evt) => {
    const msg = JSON.parse(evt.data);
    if (msg.type === "ready") return; // confirmation d'abonnement
    handleEvenement(msg); // → votre logique d'état (store, notification, etc.)
  });
  ws.addEventListener("close", (evt) => {
    // 4401/4403 = problème d'auth : ne pas spammer, réauthentifier puis retenter.
    const reEssayer = evt.code === 1000 || evt.code === 1006;
    if (reEssayer) setTimeout(() => connecter(url), 3000);
  });
  return ws;
};

// Acheteur : tous ses événements
const wsUser = connecter(`wss://VOTRE-HOTE/ws/evenements/`);
// Organisateur : dashboard temps réel
const wsOrg  = connecter(`wss://VOTRE-HOTE/ws/organisateur/`);
// Scanneur à l'entrée d'un événement
const wsScan = connecter(`wss://VOTRE-HOTE/ws/evenement/${eventId}`);
```

## 7. Exemple React

```tsx
import { useEffect, useRef, useState } from "react";

type Evenement = { type: string; donnees: Record<string, unknown> };

export function useWebSocket<T = Evenement>(url: string, eventTypes: string[]) {
  const [messages, setMessages] = useState<T[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access");
    const ws = new WebSocket(`${url}?token=${token}`);
    wsRef.current = ws;

    ws.onmessage = (evt) => {
      const msg = JSON.parse(evt.data) as Evenement;
      if (eventTypes.includes(msg.type)) setMessages((prev) => [...prev, msg as T]);
    };
    ws.onclose = (evt) => {
      if (evt.code === 1000 || evt.code === 1006)
        setTimeout(() => document.location.reload(), 3000); // reprise simple
    };
    return () => ws.close();
  }, [url]);

  return { messages };
}
```

## 8. Liste d'événements (récap pour intégration)

| `type` | Canaux | Déclenché quand |
|---|---|---|
| `commande.cree` | user, order, event, organisateur | création d'une commande |
| `commande.statut` | user, order, event, organisateur | paiement confirmé / annulé / expiré |
| `reglement.commission` | user, order, organisateur | tentative règlement commission |
| `reglement.organisateur` | user, order, organisateur | tentative règlement organisateur |
| `billet.scan` | event, organisateur | scan d'un billet (accepté ou rejeté) |

Toutes les valeurs de `donnees` sont **primitives** (string/number/boolean/null) :
aucun objet imbriqué ni date non sérialisable — prêt à brancher sur un état
Redux/Zustand sans transformation.

## 9. Async / fiabilité

- **Reconnexion** : le client doit se reconnecter après une fermeture non
  volontaire (`1006`) ; prévoir un backoff court (2-3 s).
- **Anti-rejeu** : le serveur est idempotent (une confirmation de paiement
  reçue deux fois n'émet qu'un seul changement), mais plusieurs connexions
  simultanées du même client reçoivent chacune l'événement — côté UI, faites de
  vos réducteurs d'état des opérations idempotentes (basées sur `order_id` +
  `statut`).
- **Ordre** : le layer Redis garantit l'ordre global par groupe tant que la
  connexion est établie ; en cas de reconnexion, **toujours** resynchroniser via
  l'API REST (`GET /api/tickets/commandes/mes/` pour acheteur, liste des
  commandes d'un événement pour l'organisateur).
