import 'ticket_category.dart';

class EventEntity {
  final String id;
  final String title;
  final String description;
  final String category; // 'sport', 'musique', 'religion', 'corporate'
  final String imageUrl;
  final String date;
  final String time;
  final String location;
  final String organisateur;
  final List<TicketCategory> ticketCategories;
  final bool isFeatured;

  const EventEntity({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    required this.imageUrl,
    required this.date,
    required this.time,
    required this.location,
    required this.organisateur,
    required this.ticketCategories,
    this.isFeatured = false,
  });
}
