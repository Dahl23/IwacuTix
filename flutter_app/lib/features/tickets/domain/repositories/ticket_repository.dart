import '../entities/ticket.dart';

abstract class TicketRepository {
  Future<List<TicketEntity>> getTickets();
  Future<void> addTickets(List<TicketEntity> tickets);
  Future<void> scanTicket(String ticketId);
}
