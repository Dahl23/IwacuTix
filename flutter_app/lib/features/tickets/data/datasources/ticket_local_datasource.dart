import '../models/ticket_model.dart';

class TicketLocalDataSource {
  final List<TicketModel> _tickets = [
    const TicketModel(
      id: 'GTX-8921-A4',
      eventId: 'evt-1',
      eventTitle: 'FestiBuja Live Session',
      eventCategory: 'musique',
      eventDate: 'Dimanche 26 Juillet 2026',
      eventTime: '15:00',
      eventLocation: 'Boulevard de l\'Uprona, Bujumbura',
      categoryName: 'Pelouse',
      price: 10000,
      qrCodeValue: 'GOTIX-SECURE-GTX-8921-A4',
      purchaseDate: '20 Juillet 2026',
      status: 'valide',
      phoneUsed: '+257 69 12 34 56',
      paymentMethod: 'Lumicash',
    ),
    const TicketModel(
      id: 'GTX-3310-B9',
      eventId: 'evt-2',
      eventTitle: 'Derby Primus Ligue : Vital\'O FC vs Aigle Noir',
      eventCategory: 'sport',
      eventDate: 'Samedi 1er Août 2026',
      eventTime: '14:30',
      eventLocation: 'Stade Prince Louis Rwagasore, Bujumbura',
      categoryName: 'Tribune Couverte',
      price: 10000,
      qrCodeValue: 'GOTIX-SECURE-GTX-3310-B9',
      purchaseDate: '15 Juillet 2026',
      status: 'utilise',
      phoneUsed: '+257 79 98 76 54',
      paymentMethod: 'EcoCash',
    ),
  ];

  Future<List<TicketModel>> getTickets() async {
    return List.unmodifiable(_tickets);
  }

  Future<void> addTickets(List<TicketModel> newTickets) async {
    _tickets.insertAll(0, newTickets);
  }

  Future<void> scanTicket(String ticketId) async {
    final index = _tickets.indexWhere((t) => t.id == ticketId);
    if (index != -1) {
      final current = _tickets[index];
      _tickets[index] = TicketModel(
        id: current.id,
        eventId: current.eventId,
        eventTitle: current.eventTitle,
        eventCategory: current.eventCategory,
        eventDate: current.eventDate,
        eventTime: current.eventTime,
        eventLocation: current.eventLocation,
        categoryName: current.categoryName,
        price: current.price,
        qrCodeValue: current.qrCodeValue,
        purchaseDate: current.purchaseDate,
        status: 'utilise',
        phoneUsed: current.phoneUsed,
        paymentMethod: current.paymentMethod,
        isGift: current.isGift,
        recipientName: current.recipientName,
        recipientPhone: current.recipientPhone,
        recipientHasNoPhone: current.recipientHasNoPhone,
      );
    }
  }
}
