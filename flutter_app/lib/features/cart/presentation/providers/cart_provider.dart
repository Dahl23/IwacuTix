import 'package:flutter/foundation.dart';
import '../../domain/entities/cart_item.dart';

class CartProvider extends ChangeNotifier {
  final List<CartItemEntity> _items = [];

  List<CartItemEntity> get items => List.unmodifiable(_items);

  int get totalItemCount {
    return _items.fold(0, (sum, item) => sum + item.quantity);
  }

  double get totalPrice {
    return _items.fold(0.0, (sum, item) => sum + (item.price * item.quantity));
  }

  void addToCart({
    required String eventId,
    required String eventTitle,
    required String categoryName,
    required int quantity,
    required double price,
  }) {
    final index = _items.indexWhere(
      (item) => item.eventId == eventId && item.categoryName == categoryName,
    );

    if (index != -1) {
      _items[index] = _items[index].copyWith(
        quantity: _items[index].quantity + quantity,
      );
    } else {
      _items.add(CartItemEntity(
        eventId: eventId,
        eventTitle: eventTitle,
        categoryName: categoryName,
        quantity: quantity,
        price: price,
      ));
    }
    notifyListeners();
  }

  void updateQuantity(String eventId, String categoryName, int quantity) {
    if (quantity <= 0) {
      removeFromCart(eventId, categoryName);
      return;
    }

    final index = _items.indexWhere(
      (item) => item.eventId == eventId && item.categoryName == categoryName,
    );

    if (index != -1) {
      _items[index] = _items[index].copyWith(quantity: quantity);
      notifyListeners();
    }
  }

  void removeFromCart(String eventId, String categoryName) {
    _items.removeWhere(
      (item) => item.eventId == eventId && item.categoryName == categoryName,
    );
    notifyListeners();
  }

  void clearCart() {
    _items.clear();
    notifyListeners();
  }
}
