class CartItemEntity {
  final String eventId;
  final String eventTitle;
  final String categoryName;
  final int quantity;
  final double price;

  const CartItemEntity({
    required this.eventId,
    required this.eventTitle,
    required this.categoryName,
    required this.quantity,
    required this.price,
  });

  CartItemEntity copyWith({int? quantity}) {
    return CartItemEntity(
      eventId: eventId,
      eventTitle: eventTitle,
      categoryName: categoryName,
      quantity: quantity ?? this.quantity,
      price: price,
    );
  }
}
