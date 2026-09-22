import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../providers/event_provider.dart';
import '../../../cart/presentation/providers/cart_provider.dart';
import '../../../cart/presentation/pages/cart_page.dart';

class EventDetailsPage extends StatefulWidget {
  final String eventId;

  const EventDetailsPage({super.key, required this.eventId});

  @override
  State<EventDetailsPage> createState() => _EventDetailsPageState();
}

class _EventDetailsPageState extends State<EventDetailsPage> {
  final Map<String, int> _selectedQuantities = {};

  @override
  Widget build(BuildContext context) {
    final eventProvider = Provider.of<EventProvider>(context);
    final cartProvider = Provider.of<CartProvider>(context);
    final event = eventProvider.events.firstWhere((e) => e.id == widget.eventId);

    final isFollowed = eventProvider.followedEventIds.contains(event.id);

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 220,
            pinned: true,
            flexibleSpace: FlexibleSpaceBar(
              background: Image.network(
                event.imageUrl,
                fit: BoxFit.cover,
              ),
            ),
            actions: [
              IconButton(
                icon: Icon(
                  isFollowed ? Icons.notifications_active_rounded : Icons.notifications_none_rounded,
                  color: isFollowed ? AppColors.primary : Colors.white,
                ),
                onPressed: () => eventProvider.toggleFollow(event.id),
              ),
            ],
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.primaryLight,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      event.category.toUpperCase(),
                      style: const TextStyle(
                        color: AppColors.primaryDark,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    event.title,
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textDark,
                    ),
                  ),
                  const SizedBox(height: 16),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.blue.shade50,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.calendar_today_rounded, color: Colors.blue),
                    ),
                    title: Text(event.date, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    subtitle: Text('À ${event.time}', style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
                  ),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.red.shade50,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.location_on_rounded, color: Colors.red),
                    ),
                    title: Text(event.location, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    subtitle: Text('Organisé par ${event.organisateur}', style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
                  ),
                  const Divider(height: 32),
                  const Text(
                    'À Propos de l\'Événement',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textDark),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    event.description,
                    style: const TextStyle(fontSize: 14, color: AppColors.textMuted, height: 1.5),
                  ),
                  const Divider(height: 32),
                  const Text(
                    'Sélectionnez Vos Billets',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textDark),
                  ),
                  const SizedBox(height: 12),
                  ...event.ticketCategories.map((cat) {
                    final currentQty = _selectedQuantities[cat.name] ?? 0;
                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    cat.name,
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                  ),
                                  if (cat.description != null)
                                    Text(
                                      cat.description!,
                                      style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                                    ),
                                  const SizedBox(height: 4),
                                  Text(
                                    CurrencyFormatter.formatFBu(cat.price),
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.primaryDark,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Row(
                              children: [
                                IconButton(
                                  icon: const Icon(Icons.remove_circle_outline),
                                  onPressed: currentQty > 0
                                      ? () => setState(() => _selectedQuantities[cat.name] = currentQty - 1)
                                      : null,
                                ),
                                Text(
                                  '$currentQty',
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.add_circle_outline, color: AppColors.primary),
                                  onPressed: () => setState(() => _selectedQuantities[cat.name] = currentQty + 1),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  }).toList(),
                  const SizedBox(height: 100),
                ],
              ),
            ),
          ),
        ],
      ),
      bottomSheet: Container(
        padding: const EdgeInsets.all(16),
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: AppColors.border)),
        ),
        child: SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: () {
              bool added = false;
              _selectedQuantities.forEach((catName, qty) {
                if (qty > 0) {
                  final cat = event.ticketCategories.firstWhere((c) => c.name == catName);
                  cartProvider.addToCart(
                    eventId: event.id,
                    eventTitle: event.title,
                    categoryName: catName,
                    quantity: qty,
                    price: cat.price,
                  );
                  added = true;
                }
              });

              if (added) {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const CartPage()),
                );
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Veuillez choisir au moins 1 billet')),
                );
              }
            },
            child: const Text('Ajouter au Panier'),
          ),
        ),
      ),
    );
  }
}
