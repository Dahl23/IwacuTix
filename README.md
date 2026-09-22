# IwacuTix 🎫

**IwacuTix** est la plateforme et application mobile PWA de billetterie digitale au Burundi. Elle permet aux acheteurs d'acheter leurs billets d'événements et de payer en toute sécurité via **Mobile Money** (Lumicash, EcoCash, Bancobu) et **Bitcoin Lightning (Blink)**.

---

## 🚀 Fonctionnalités Clés

- **Progressive Web App (PWA)** :
  - Installation en 1 clic sur Android, iOS (Safari) et ordinateurs.
  - Consultation des billets 100 % hors-ligne grâce aux Service Workers.
  - Rendu haute fidélité des QR Codes sécurisés (`<UUID>.<signature_HMAC>`).
- **Gestion des Rôles & Espaces** :
  - **Acheteur** : Authentification par SMS OTP, historique des commandes, export PDF et image.
  - **Organisateur** : Espace pro, KYC, gestion des événements, assignation des scanneurs et suivi des versements hebdomadaires.
  - **SuperAdmin** : Console de modération, gestion des taux de commission, validation KYC et pilotage des versements.
  - **Scanneur** : Poste de contrôle d'accès avec caméra en direct, mode hors-ligne et validation atomique.
- **Paiements Hybrides** :
  - **Mobile Money** : Instructions USSD dynamiques et validation par Webhook HMAC-SHA256.
  - **Bitcoin Lightning** : Factures BOLT11, QR code URI standard `lightning:`, compte à rebours de réservation de stock (10 min).

---

## 🛠️ Stack Technique

- **Frontend & PWA** : React 19, TypeScript, Vite, Tailwind CSS, Vite PWA (Workbox).
- **Icônes & UI** : Lucide React, Motion.
- **Utilitaires** : QRCode, jsPDF, html2canvas.
- **Backend API cible** : Django REST Framework (spécification `API_FRONTEND.md`).

---

## 💻 Démarrage Local

### Prérequis
- Node.js (version 20 ou supérieure recommandée)
- npm ou bun

### Installation & Lancement

```bash
# 1. Cloner le dépôt
git clone <url-du-depot>
cd iwacutix

# 2. Installer les dépendances
npm install

# 3. Configurer l'environnement
cp .env.example .env

# 4. Lancer le serveur de développement (port 3000)
npm run dev
```

L'application sera accessible sur `http://localhost:3000`.

---

## 🧪 Scripts Disponibles

- `npm run dev` : Démarre le serveur local de développement.
- `npm run build` : Compile le projet et génère le bundle de production PWA dans `dist/`.
- `npm run lint` ou `npm run typecheck` : Vérifie la validité des types TypeScript.
- `npm test` : Exécute les vérifications d'intégrité du code.
- `npm run preview` : Prévisualise le build de production localement.

---

## 🔄 Intégration Continue (CI)

Le pipeline d'intégration continue est configuré via **GitHub Actions** (`.github/workflows/ci.yml`) :

- **Lint & TypeCheck** : Contrôle automatique strict des types TypeScript.
- **Build PWA** : Compilation et validation de l'arborescence `dist/` sur les branches `main`, `master`, et `develop`.
- **Artefacts** : Sauvegarde des livrables de production pour le déploiement.

---

## 📄 Licence

Propriété exclusive de **IwacuTix Burundi**. Tous droits réservés.
