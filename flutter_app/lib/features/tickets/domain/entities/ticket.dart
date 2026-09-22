class TicketEntity {
  final String id;
  final String eventId;
  final String eventTitle;
  final String eventCategory;
  final String eventDate;
  final String eventTime;
  final String eventLocation;
  final String categoryName;
  final double price;
  final String qrCodeValue;
  final String purchaseDate;
  final String status; // 'valide' | 'utilise'
  final String? phoneUsed;
  final String? paymentMethod;
  final bool isGift;
  final String? recipientName;
  final String? recipientPhone;
  final bool recipientHasNoPhone;

  const TicketEntity({
    required this.id,
    required this.eventId,
    required this.eventTitle,
    required this.eventCategory,
    required this.eventDate,
    required this.eventTime,
    required this.eventLocation,
    required this.categoryName,
    required this.price,
    required this.qrCodeValue,
    required this.purchaseDate,
    required this.status,
    this.phoneUsed,
    this.paymentMethod,
    this.isGift = false,
    this.recipientName,
    this.recipientPhone,
    this.recipientHasNoPhone = false,
  });

  TicketEntity copyWith({String? status}) {
    return TicketEntity(
      id: id,
      eventId: eventId,
      eventTitle: eventTitle,
      eventCategory: eventCategory,
      eventDate: eventDate,
      eventTime: eventTime,
      eventLocation: eventLocation,
      categoryName: categoryName,
      price: price,
      qrCodeValue: qrCodeValue,
      purchaseDate: purchaseDate,
      status: status ?? this.status,
      phoneUsed: phoneUsed,
      paymentMethod: paymentMethod,
      isGift: isGift,
      recipientName: recipientName,
      recipientPhone: recipientPhone,
      recipientHasNoPhone: recipientHasNoPhone,
    );
  }
}
