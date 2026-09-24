import { 
  Event, 
  User
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
    description: 'Le rendez-vous incontournable des décideurs, startups et investisseurs de la tech au Burundi. Conférences inspirantes, panels de discussion sur l\'intelligence artificielle, la fintech (Mobile Money) et ateliers pratiques.',
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