import '../models/event_model.dart';
import '../../domain/entities/ticket_category.dart';

class EventLocalDataSource {
  final List<EventModel> _events = [
    const EventModel(
      id: 'evt-1',
      title: 'FestiBuja Live Session',
      description: 'Le plus grand festival de musique urbaine de Bujumbura réunissant les meilleurs artistes burundais et de la région des Grands Lacs.',
      category: 'musique',
      imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80',
      date: 'Dimanche 26 Juillet 2026',
      time: '15:00',
      location: 'Boulevard de l\'Uprona, Bujumbura',
      organisateur: 'Buja Events & Culture',
      isFeatured: true,
      ticketCategories: [
        TicketCategory(name: 'Pelouse', price: 10000, available: 450, description: 'Accès général debout'),
        TicketCategory(name: 'VIP Standard', price: 30000, available: 120, description: 'Espace assis + rafraîchissement offert'),
        TicketCategory(name: 'VVIP Carré d\'Or', price: 100000, available: 25, description: 'Cocktail de bienvenue + rencontre artistes + parking dédié'),
      ],
    ),
    const EventModel(
      id: 'evt-2',
      title: 'Derby Primus Ligue : Vital\'O FC vs Aigle Noir',
      description: 'Choc au sommet du championnat de football du Burundi ! Un match décisif pour le titre dans une ambiance surchauffée.',
      category: 'sport',
      imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80',
      date: 'Samedi 1er Août 2026',
      time: '14:30',
      location: 'Stade Prince Louis Rwagasore, Bujumbura',
      organisateur: 'Fédération de Football du Burundi (FFB)',
      isFeatured: true,
      ticketCategories: [
        TicketCategory(name: 'Gradins Populaires', price: 3000, available: 1200, description: 'Accès gradins est et ouest'),
        TicketCategory(name: 'Tribune Couverte', price: 10000, available: 300, description: 'Place assise à l\'ombre'),
        TicketCategory(name: 'Tribune d\'Honneur', price: 50000, available: 40, description: 'Accès salon officiel + collation'),
      ],
    ),
    const EventModel(
      id: 'evt-3',
      title: 'Nuit du Gospel Burundi : Louange & Action de Grâce',
      description: 'Grand rassemblement œcuménique de prière et de concerts de gospel avec les chorales les plus renommées de Bujumbura et Gitega.',
      category: 'religion',
      imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
      date: 'Vendredi 7 Août 2026',
      time: '18:00',
      location: 'Palais des Arts et de la Culture, Bujumbura',
      organisateur: 'Burundi Gospel Network',
      isFeatured: false,
      ticketCategories: [
        TicketCategory(name: 'Entrée Standard', price: 5000, available: 800, description: 'Placement libre'),
        TicketCategory(name: 'Soutien Spécial', price: 25000, available: 150, description: 'Place réservée premier rang'),
      ],
    ),
    const EventModel(
      id: 'evt-4',
      title: 'Forum Tech & Entrepreneurship Bujumbura 2026',
      description: 'Le rendez-vous incontournable des startups, investisseurs et acteurs du numérique en Afrique de l\'Est.',
      category: 'corporate',
      imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80',
      date: 'Jeudi 13 Août 2026',
      time: '08:30',
      location: 'Hôtel Club du Lac Tanganyika, Bujumbura',
      organisateur: 'Burundi Innovation Hub',
      isFeatured: false,
      ticketCategories: [
        TicketCategory(name: 'Pass 1 Jour', price: 25000, available: 200, description: 'Accès aux conférences et ateliers'),
        TicketCategory(name: 'Pass Executive & B2B', price: 75000, available: 60, description: 'Accès lounge VIP + dîner de gala network'),
      ],
    ),
  ];

  Future<List<EventModel>> getEvents() async {
    return List.unmodifiable(_events);
  }

  Future<void> addEvent(EventModel event) async {
    _events.insert(0, event);
  }
}
