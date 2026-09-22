import '../../domain/entities/event.dart';
import '../../domain/entities/ticket_category.dart';

class EventModel extends EventEntity {
  const EventModel({
    required super.id,
    required super.title,
    required super.description,
    required super.category,
    required super.imageUrl,
    required super.date,
    required super.time,
    required super.location,
    required super.organisateur,
    required super.ticketCategories,
    super.isFeatured,
  });

  factory EventModel.fromJson(Map<String, dynamic> json) {
    return EventModel(
      id: json['id'],
      title: json['title'],
      description: json['description'],
      category: json['category'],
      imageUrl: json['imageUrl'],
      date: json['date'],
      time: json['time'],
      location: json['location'],
      organisateur: json['organisateur'],
      ticketCategories: (json['ticketCategories'] as List)
          .map((c) => TicketCategory(
                name: c['name'],
                price: (c['price'] as num).toDouble(),
                description: c['description'],
                available: c['available'],
              ))
          .toList(),
      isFeatured: json['isFeatured'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'category': category,
      'imageUrl': imageUrl,
      'date': date,
      'time': time,
      'location': location,
      'organisateur': organisateur,
      'ticketCategories': ticketCategories
          .map((c) => {
                'name': c.name,
                'price': c.price,
                'description': c.description,
                'available': c.available,
              })
          .toList(),
      'isFeatured': isFeatured,
    };
  }
}
