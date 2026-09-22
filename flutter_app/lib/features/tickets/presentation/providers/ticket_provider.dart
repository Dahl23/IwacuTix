import 'package:flutter/foundation.dart';
import '../../domain/entities/ticket.dart';
import '../../domain/repositories/ticket_repository.dart';
import '../../../cart/domain/entities/cart_item.dart';

class TicketProvider extends ChangeNotifier {
  final TicketRepository repository;

  List<TicketEntity> _tickets = [];

  TicketProvider({required this.repository}) {
    loadTickets();
  }

  List<TicketEntity> get tickets => _tickets;

  List<TicketEntity> get validTickets =>
      _tickets.where((t) => t.status == 'valide').toList();

  List<TicketEntity> get usedTickets =>
      _tickets.where((t) => t.status == 'utilise').toList();

  Future<void> loadTickets() async {
    _tickets = await repository.getTickets();
    notifyListeners();
  }

  Future<List<TicketEntity>> checkout({
    required List<CartItemEntity> cartItems,
    required String paymentMethod,
    required String phone,
    bool isGift = false,
    String? recipientName,
    String? recipientPhone,
    bool recipientHasNoPhone = false,
  }) async {
    final List<TicketEntity> newTickets = [];
    final now = DateTime.now();
    final dateStr = '${now.day}/${now.month}/${now.year}';

    for (final item in cartItems) {
      for (int i = 0; i < item.quantity; i++) {
        final randomNum = (1000 + (DateTime.now().microsecondsSinceEpoch % 8999));
        final ticketId = 'GTX-$randomNum-X${i + 1}';

        newTickets.add(TicketEntity(
          id: ticketId,
          eventId: item.eventId,
          eventTitle: item.eventTitle,
          eventCategory: 'sport',
          eventDate: 'Date à venir',
          eventTime: '15:00',
          eventLocation: 'Bujumbura, Burundi',
          categoryName: item.categoryName,
          price: item.price,
          qrCodeValue: 'GOTIX-SECURE-$ticketId',
          purchaseDate: dateStr,
          status: 'valide',
          phoneUsed: phone,
          paymentMethod: paymentMethod,
          isGift: isGift,
          recipientName: recipientName,
          recipientPhone: recipientPhone,
          recipientHasNoPhone: recipientHasNoPhone,
        ));
      }
    }

    await repository.addTickets(newTickets);
    await loadTickets();
    return newTickets;
  }

  Future<void> scanTicket(String ticketId) async {
    await repository.scanTicket(ticketId);
    await loadTickets();
  }
}
