import '../../domain/entities/ticket.dart';
import '../../domain/repositories/ticket_repository.dart';
import '../datasources/ticket_local_datasource.dart';
import '../models/ticket_model.dart';

class TicketRepositoryImpl implements TicketRepository {
  final TicketLocalDataSource localDataSource;

  TicketRepositoryImpl(this.localDataSource);

  @override
  Future<List<TicketEntity>> getTickets() async {
    return await localDataSource.getTickets();
  }

  @override
  Future<void> addTickets(List<TicketEntity> tickets) async {
    final models = tickets
        .map((t) => TicketModel(
              id: t.id,
              eventId: t.eventId,
              eventTitle: t.eventTitle,
              eventCategory: t.eventCategory,
              eventDate: t.eventDate,
              eventTime: t.eventTime,
              eventLocation: t.eventLocation,
              categoryName: t.categoryName,
              price: t.price,
              qrCodeValue: t.qrCodeValue,
              purchaseDate: t.purchaseDate,
              status: t.status,
              phoneUsed: t.phoneUsed,
              paymentMethod: t.paymentMethod,
              isGift: t.isGift,
              recipientName: t.recipientName,
              recipientPhone: t.recipientPhone,
              recipientHasNoPhone: t.recipientHasNoPhone,
            ))
        .toList();
    await localDataSource.addTickets(models);
  }

  @override
  Future<void> scanTicket(String ticketId) async {
    await localDataSource.scanTicket(ticketId);
  }
}
