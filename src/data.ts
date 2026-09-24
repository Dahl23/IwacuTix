import { 
  Event, 
  User, 
  TicketPurchased, 
  ScanneurAssignment, 
  PortefeuilleOrganisateur, 
  ParametrePlateforme, 
  Versement, 
  ScanLog 
} from './types';

export const MOCK_EVENTS: Event[] = [
  {
    id: 'evt-vital-o-vs-le-messager',
    title: 'Vital\'O FC vs Le Messager Ngozi',
    description: 'Le grand choc de la Primus Ligue burundaise ! Venez soutenir les Vert et Blanc de Vital\'O face aux redoutables joueurs de Ngozi dans une ambiance survoltée de derby national. Places limitées !',
    category: 'sport',
    imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&auto=format&fit=crop&q=80',
    date: 'Dimanche 26 Juillet 2026',
    time: '15:30',
    location: 'Stade Prince Louis Rwagasore, Bujumbura',
    organisateur: 'Vital\'O FC Management',
    organisateur_id: 'usr-org-vitalo',
    ticketCategories: [
      { name: 'Pelouse', price: 3000, description: 'Accès général autour de la pelouse, ambiance populaire', available: 1200 },
      { name: 'Tribune Latérale', price: 10000, description: 'Sièges assis en tribune non couverte', available: 450 },
      { name: 'Tribune d\'Honneur', price: 25000, description: 'Sièges confortables en tribune couverte centrale', available: 150 },
      { name: 'VIP Loge', price: 60000, description: 'Espace VIP climatisé avec boissons et collations incluses', available: 40 }
    ],
    isFeatured: true
  },
  {
    id: 'evt-festi-bujumbura-2026',
    title: 'FestiBujumbura Live : Sat-B & Friends',
    description: 'Le plus grand festival de musique urbaine de l\'année au bord du lac ! Retrouvez l\'icône de la musique burundaise Sat-B ainsi que les meilleures révélations de la scène est-africaine pour une nuit de concerts intenses sous les étoiles.',
    category: 'musique',
    imageUrl: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=600&auto=format&fit=crop&q=80',
    date: 'Samedi 1 Août 2026',
    time: '18:00',
    location: 'Plage du Club du Lac Tanganyika, Bujumbura',
    organisateur: 'Empire Avenue & Buja Events',
    organisateur_id: 'usr-org-empire',
    ticketCategories: [
      { name: 'Standard', price: 15000, description: 'Entrée simple sur la plage', available: 800 },
      { name: 'VIP', price: 40000, description: 'Accès zone avant-scène et bar dédié', available: 200 },
      { name: 'VVIP Table (4 Pers)', price: 250000, description: 'Table réservée avec bouteille offerte et service premium', available: 25 }
    ],
    isFeatured: true
  },
  {
    id: 'evt-croisade-pentecote',
    title: 'Grande Croisade : Flamme de Réveil',
    description: 'Grande rencontre de prière, d\'adoration et d\'édification spirituelle animée par les chorales nationales les plus célèbres du Burundi et des prédicateurs invités d\'Afrique de l\'Est. Un moment exceptionnel de communion.',
    category: 'religion',
    imageUrl: 'https://images.unsplash.com/photo-1444212477490-ca407925329e?w=600&auto=format&fit=crop&q=80',
    date: 'Vendredi 7 Août 2026',
    time: '14:00',
    location: 'Palais des Congrès de Kigobe, Bujumbura',
    organisateur: 'Mission Évangélique de Kigobe',
    organisateur_id: 'usr-org-croisade',
    ticketCategories: [
      { name: 'Entrée Libre (Soutien)', price: 0, description: 'Accès gratuit, billet de réservation obligatoire', available: 2000 },
      { name: 'Soutien Or', price: 10000, description: 'Place réservée à l\'avant, soutien financier à l\'organisation', available: 300 },
      { name: 'Soutien Platine', price: 50000, description: 'Accès privilégié, participation de bienfaisance active', available: 50 }
    ],
    isFeatured: false
  },
  {
    id: 'evt-burundi-tech-summit',
    title: 'Burundi Tech Summit 2026',
    description: 'Le rendez-vous incontournable des décideurs, startups et investisseurs de la tech au Burundi. Conférences inspirantes, panels de discussion sur l\'intelligence artificielle, la fintech Lumicash et ateliers pratiques.',
    category: 'corporate',
    imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=80',
    date: 'Jeudi 13 Août 2026',
    time: '08:30',
    location: 'Hotel Kiriri Garden, Bujumbura',
    organisateur: 'Buja Tech Hub & Ministère des TIC',
    ticketCategories: [
      { name: 'Pass Journalier', price: 80000, description: 'Accès complet aux conférences, ateliers et pauses café', available: 120 },
      { name: 'Pass Corporate + Déjeuner', price: 180000, description: 'Accès premium, déjeuner d\'affaires networking et présentations', available: 60 }
    ],
    isFeatured: false
  },
  {
    id: 'evt-derby-inter-stars',
    title: 'Tournoi de la Solidarité : Inter Stars vs Musongati',
    description: 'Un duel au sommet comptant pour la préparation de la Coupe de la confédération. Inter Stars accueille l\'équipe coriace de Gitega, Musongati FC, pour un affrontement tactique palpitant.',
    category: 'sport',
    imageUrl: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=600&auto=format&fit=crop&q=80',
    date: 'Samedi 15 Août 2026',
    time: '16:00',
    location: 'Stade Prince Louis Rwagasore, Bujumbura',
    organisateur: 'Comité de la Ligue A',
    ticketCategories: [
      { name: 'Virage populaire', price: 2000, description: 'Zones de virage', available: 1500 },
      { name: 'Tribune Centrale', price: 8000, description: 'Tribune abritée', available: 300 },
      { name: 'VIP', price: 30000, description: 'Accès salon VIP', available: 80 }
    ],
    isFeatured: false
  },
  {
    id: 'evt-diva-night-afrique',
    title: 'Diva Night : Chantal Ndikumana en Concert',
    description: 'La voix d\'or de la musique traditionnelle et folklorique burundaise revient sur scène après 3 ans d\'absence. Accompagnée par le groupe folklorique national, elle vous fera vibrer au rythme du Burundi authentique.',
    category: 'musique',
    imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
    date: 'Vendredi 21 Août 2026',
    time: '19:30',
    location: 'Institut Français du Burundi (IFB), Bujumbura',
    organisateur: 'Arts & Culture Burundi',
    ticketCategories: [
      { name: 'Tarif Réduit (Étudiant)', price: 5000, description: 'Sur présentation de carte d\'étudiant valide', available: 100 },
      { name: 'Standard', price: 15000, description: 'Entrée générale en salle de spectacle', available: 200 },
      { name: 'Mécène', price: 50000, description: 'Place d\'honneur + cadeau souvenir artisanal local', available: 30 }
    ],
    isFeatured: false
  }
];

export const DEFAULT_ANONYMOUS_AVATAR = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="100%" height="100%">
  <rect width="128" height="128" fill="#E2E8F0"/>
  <circle cx="64" cy="48" r="22" fill="#94A3B8"/>
  <path d="M28 112c0-19.882 16.118-36 36-36s36 16.118 36 36v4H28v-4z" fill="#94A3B8"/>
</svg>
`)}`;

export const GUEST_USER: User = {
  id: 'guest',
  name: 'Invité (Non connecté)',
  phone: '',
  email: '',
  avatarUrl: DEFAULT_ANONYMOUS_AVATAR,
  role: 'ACHETEUR',
  statut_compte: 'ACTIF',
  telephone_verifie: false
};

export const MOCK_BUYER_USER: User = {
  id: 'usr-buyer-001',
  name: 'Dahl Ndayisenga',
  phone: '+257 69 123 456',
  email: 'dahlndayisenga0@gmail.com',
  avatarUrl: DEFAULT_ANONYMOUS_AVATAR,
  role: 'ACHETEUR',
  statut_compte: 'ACTIF',
  telephone_verifie: true
};

export const MOCK_ORGANIZER_USER: User = {
  id: 'usr-org-vitalo',
  name: 'Vital\'O FC Management',
  phone: '+257 79 100 200',
  email: 'contact@vitalofc.bi',
  avatarUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=200&auto=format&fit=crop&q=80',
  role: 'ORGANISATEUR',
  statut_compte: 'ACTIF',
  telephone_verifie: true,
  organisateurProfile: {
    user_id: 'usr-org-vitalo',
    nom_structure: 'Vital\'O Football Club Burundi',
    numero_mobile_money_reception: '+257 69 999 888',
    adresse_lightning_reception: 'vitalo@blink.sv',
    statut_verification: 'VERIFIE',
    commission_taux: 5,
    document_verification: 'RC-BJM-2024-B-8912'
  }
};

export const MOCK_SCANNER_USER: User = {
  id: 'usr-scan-jeanpaul',
  name: 'Jean-Paul Ndayikeje',
  phone: '+257 79 456 789',
  email: 'jp.ndayikeje@gmail.com',
  avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  role: 'ACHETEUR', // Rôle principal ACHETEUR (Option A retenue)
  statut_compte: 'ACTIF',
  telephone_verifie: true,
  activeAssignmentEventId: 'evt-vital-o-vs-le-messager' // Capacité par assignation active
};

export const MOCK_ADMIN_USER: User = {
  id: 'usr-admin-iwacutix',
  name: 'SuperAdmin IwacuTix',
  phone: '+257 61 000 001',
  email: 'admin@iwacutix.bi',
  avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80',
  role: 'SUPERADMIN',
  statut_compte: 'ACTIF',
  telephone_verifie: true
};

export const MOCK_USER: User = MOCK_BUYER_USER;

export const MOCK_SCANNER_ASSIGNMENTS: ScanneurAssignment[] = [
  {
    id: 'asg-1',
    user_id: 'usr-scan-jeanpaul',
    user_nom: 'Jean-Paul Ndayikeje (Porte A - Pelouse)',
    user_telephone: '+257 79 456 789',
    event_id: 'evt-vital-o-vs-le-messager',
    event_titre: 'Vital\'O FC vs Le Messager Ngozi',
    assigne_par: 'Vital\'O FC Management',
    date_assignation: 'Hier à 14:30',
    actif: true
  },
  {
    id: 'asg-2',
    user_id: 'usr-scan-eric',
    user_nom: 'Éric Manirakiza (Porte B - Tribune)',
    user_telephone: '+257 68 112 233',
    event_id: 'evt-vital-o-vs-le-messager',
    event_titre: 'Vital\'O FC vs Le Messager Ngozi',
    assigne_par: 'Vital\'O FC Management',
    date_assignation: 'Hier à 15:00',
    actif: true
  },
  {
    id: 'asg-3',
    user_id: 'usr-scan-aline',
    user_nom: 'Aline Niyonzima (Accès Plage VIP)',
    user_telephone: '+257 71 889 900',
    event_id: 'evt-festi-bujumbura-2026',
    event_titre: 'FestiBujumbura Live : Sat-B & Friends',
    assigne_par: 'Empire Avenue & Buja Events',
    date_assignation: 'Il y a 3 jours',
    actif: true
  }
];

export const MOCK_ORGANISATEUR_PORTEFEUILLE: PortefeuilleOrganisateur = {
  organisateur_id: 'usr-org-vitalo',
  nom_structure: 'Vital\'O Football Club Burundi',
  solde_disponible_fbu: 2850000,
  solde_disponible_sats: 145200,
  solde_total_genere_fbu: 14500000,
  solde_total_genere_sats: 720000,
  derniere_maj: 'Aujourd\'hui à 11:42'
};

export const MOCK_PARAMETRE_PLATEFORME: ParametrePlateforme = {
  delai_versement_jours: 7,
  jour_execution_versement: 'DIMANCHE',
  commission_taux_defaut: 5,
  modifie_par: 'SuperAdmin IwacuTix',
  date_modification: '20 Juillet 2026'
};

export const MOCK_VERSEMENTS: Versement[] = [
  {
    id: 'vst-1092',
    organisateur_id: 'usr-org-vitalo',
    organisateur_nom: 'Vital\'O FC Management',
    canal: 'MOBILE_MONEY',
    montant_fbu: 4200000,
    destination: '+257 69 999 888 (Lumicash)',
    statut: 'REUSSI',
    reference_transaction: 'LUMI-TX-9841284',
    date_creation: '19 Juillet 2026',
    date_execution: '19 Juillet 2026'
  },
  {
    id: 'vst-1093',
    organisateur_id: 'usr-org-vitalo',
    organisateur_nom: 'Vital\'O FC Management',
    canal: 'LIGHTNING',
    montant_sats: 210000,
    destination: 'vitalo@blink.sv (Blink Lightning)',
    statut: 'REUSSI',
    reference_transaction: 'LN-PAY-7764129',
    date_creation: '19 Juillet 2026',
    date_execution: '19 Juillet 2026'
  },
  {
    id: 'vst-1094',
    organisateur_id: 'usr-org-vitalo',
    organisateur_nom: 'Vital\'O FC Management',
    canal: 'MOBILE_MONEY',
    montant_fbu: 2850000,
    destination: '+257 69 999 888 (Lumicash)',
    statut: 'EN_ATTENTE',
    reference_transaction: 'PENDING-CYCLE-HEBDO',
    date_creation: 'En cours (Prochain cycle Dimanche)'
  }
];

export const MOCK_SCAN_LOGS: ScanLog[] = [
  {
    id: 'slog-1',
    ticket_id: 'ITX-9812-A3',
    event_id: 'evt-vital-o-vs-le-messager',
    event_titre: 'Vital\'O FC vs Le Messager Ngozi',
    scanned_at: 'Aujourd\'hui 14:45',
    scanned_by_nom: 'Jean-Paul Ndayikeje (Porte A)',
    scanned_by_user_id: 'usr-scan-jeanpaul',
    statut_validation: 'ACCEPTE',
    tier_name: 'Pelouse'
  },
  {
    id: 'slog-2',
    ticket_id: 'ITX-3042-M8',
    event_id: 'evt-vital-o-vs-le-messager',
    event_titre: 'Vital\'O FC vs Le Messager Ngozi',
    scanned_at: 'Aujourd\'hui 14:52',
    scanned_by_nom: 'Jean-Paul Ndayikeje (Porte A)',
    scanned_by_user_id: 'usr-scan-jeanpaul',
    statut_validation: 'REJETE',
    raison_rejet: 'Billet déjà utilisé (Tentative de double passage)',
    tier_name: 'Tribune'
  }
];

export const MOCK_ORGANISATEURS_KYC = [
  {
    id: 'usr-org-vitalo',
    nom_structure: 'Vital\'O Football Club Burundi',
    responsable: 'Vital\'O FC Management',
    telephone: '+257 79 100 200',
    email: 'contact@vitalofc.bi',
    statut_verification: 'VERIFIE' as const,
    commission_taux: 5,
    moyens: ['Lumicash (+257 69 999 888)', 'Lightning (vitalo@blink.sv)']
  },
  {
    id: 'usr-org-empire',
    nom_structure: 'Empire Avenue & Buja Events',
    responsable: 'Arnaud Nizigiyimana',
    telephone: '+257 61 223 344',
    email: 'info@empireavenue.bi',
    statut_verification: 'VERIFIE' as const,
    commission_taux: 5,
    moyens: ['Lumicash (+257 69 111 222)', 'Lightning (empire@blink.sv)']
  },
  {
    id: 'usr-org-croisade',
    nom_structure: 'Mission Évangélique de Kigobe',
    responsable: 'Pasteur Élisée Bukuru',
    telephone: '+257 79 888 777',
    email: 'contact@kigobe-mission.org',
    statut_verification: 'EN_ATTENTE' as const,
    commission_taux: 5,
    moyens: ['Lumicash (+257 79 888 777)']
  }
];

export const MOCK_PURCHASED_TICKETS: TicketPurchased[] = [
  {
    id: 'ITX-9812-A3',
    eventId: 'evt-vital-o-vs-le-messager',
    eventTitle: 'Vital\'O FC vs Le Messager Ngozi',
    eventCategory: 'sport',
    eventDate: 'Dimanche 26 Juillet 2026',
    eventTime: '15:30',
    eventLocation: 'Stade Prince Louis Rwagasore, Bujumbura',
    categoryName: 'Tribune Latérale',
    price: 10000,
    qrCodeValue: 'IWACUTIX-SECURE-VITALO-9812-A3-D92',
    purchaseDate: '15 Juillet 2026',
    status: 'valide',
    phoneUsed: '+257 69 123 456',
    paymentMethod: 'Lumicash'
  },
  {
    id: 'ITX-3042-M8',
    eventId: 'evt-festi-bujumbura-old',
    eventTitle: 'Festival Buja Vibes 2025 (Édition Précédente)',
    eventCategory: 'musique',
    eventDate: 'Samedi 10 Mai 2025',
    eventTime: '20:00',
    eventLocation: 'Avenue de la Plage, Bujumbura',
    categoryName: 'Standard',
    price: 10000,
    qrCodeValue: 'IWACUTIX-USED-BUJAVIBES-3042-M8',
    purchaseDate: '8 Mai 2025',
    status: 'utilise',
    phoneUsed: '+257 69 123 456',
    paymentMethod: 'Lumicash'
  },
  {
    id: 'ITX-1149-S5',
    eventId: 'evt-football-derby-old',
    eventTitle: 'Vital\'O FC vs Bumamuru FC',
    eventCategory: 'sport',
    eventDate: 'Dimanche 18 Avril 2025',
    eventTime: '15:00',
    eventLocation: 'Stade Prince Louis Rwagasore, Bujumbura',
    categoryName: 'Pelouse',
    price: 2500,
    qrCodeValue: 'IWACUTIX-USED-VITALOBUMA-1149-S5',
    purchaseDate: '17 Avril 2025',
    status: 'utilise',
    phoneUsed: '+257 69 123 456',
    paymentMethod: 'Lumicash'
  }
];
