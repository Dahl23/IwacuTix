import '../../domain/entities/ticket.dart';

class TicketModel extends TicketEntity {
  const TicketModel({
    required super.id,
    required super.eventId,
    required super.eventTitle,
    required super.eventCategory,
    required super.eventDate,
    required super.eventTime,
    required super.eventLocation,
    required super.categoryName,
    required super.price,
    required super.qrCodeValue,
    required super.purchaseDate,
    required super.status,
    super.phoneUsed,
    super.paymentMethod,
    super.isGift,
    super.recipientName,
    super.recipientPhone,
    super.recipientHasNoPhone,
  });

  factory TicketModel.fromJson(Map<String, dynamic> json) {
    return TicketModel(
      id: json['id'],
      eventId: json['eventId'],
      eventTitle: json['eventTitle'],
      eventCategory: json['eventCategory'],
      eventDate: json['eventDate'],
      eventTime: json['eventTime'],
      eventLocation: json['eventLocation'],
      categoryName: json['categoryName'],
      price: (json['price'] as num).toDouble(),
      qrCodeValue: json['qrCodeValue'],
      purchaseDate: json['purchaseDate'],
      status: json['status'],
      phoneUsed: json['phoneUsed'],
      paymentMethod: json['paymentMethod'],
      isGift: json['isGift'] ?? false,
      recipientName: json['recipientName'],
      recipientPhone: json['recipientPhone'],
      recipientHasNoPhone: json['recipientHasNoPhone'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'eventId': eventId,
      'eventTitle': eventTitle,
      'eventCategory': eventCategory,
      'eventDate': eventDate,
      'eventTime': eventTime,
      'eventLocation': eventLocation,
      'categoryName': categoryName,
      'price': price,
      'qrCodeValue': qrCodeValue,
      'purchaseDate': purchaseDate,
      'status': status,
      'phoneUsed': phoneUsed,
      'paymentMethod': paymentMethod,
      'isGift': isGift,
      'recipientName': recipientName,
      'recipientPhone': recipientPhone,
      'recipientHasNoPhone': recipientHasNoPhone,
    };
  }
}
