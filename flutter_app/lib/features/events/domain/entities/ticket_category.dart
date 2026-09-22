class TicketCategory {
  final String name;
  final double price;
  final String? description;
  final int available;

  const TicketCategory({
    required this.name,
    required this.price,
    this.description,
    required this.available,
  });
}
