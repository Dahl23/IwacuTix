import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../cart/presentation/providers/cart_provider.dart';
import '../../../tickets/presentation/providers/ticket_provider.dart';
import 'success_page.dart';

class PaymentPage extends StatefulWidget {
  const PaymentPage({super.key});

  @override
  State<PaymentPage> createState() => _PaymentPageState();
}

class _PaymentPageState extends State<PaymentPage> {
  String _selectedMethod = 'Lumicash';
  final TextEditingController _phoneController = TextEditingController(text: '+257 69 12 34 56');

  // Gift ticket option state
  bool _isGift = false;
  final TextEditingController _recipientNameController = TextEditingController();
  final TextEditingController _recipientPhoneController = TextEditingController();
  bool _recipientHasNoPhone = false;

  final List<Map<String, dynamic>> _methods = [
    {
      'id': 'Lumicash',
      'title': 'Lumicash',
      'subtitle': 'Portefeuille Mobile Lumitel',
      'color': AppColors.lumicash,
      'icon': Icons.phone_android_rounded,
    },
    {
      'id': 'EcoCash',
      'title': 'EcoCash',
      'subtitle': 'Portefeuille Mobile Econet Leo',
      'color': AppColors.ecocash,
      'icon': Icons.account_balance_wallet_rounded,
    },
    {
      'id': 'BCB',
      'title': 'Bancobu Mobile',
      'subtitle': 'Banque Commerciale du Burundi',
      'color': AppColors.bancobu,
      'icon': Icons.account_balance_rounded,
    },
    {
      'id': 'BurundiPay',
      'title': 'BurundiPay / iHela',
      'subtitle': 'Passerelle multi-paiement locale',
      'color': AppColors.burundiPay,
      'icon': Icons.payment_rounded,
    },
  ];

  @override
  Widget build(BuildContext context) {
    final cartProvider = Provider.of<CartProvider>(context);
    final ticketProvider = Provider.of<TicketProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mode de Paiement'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.primaryLight,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Montant à régler :', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                  Text(
                    CurrencyFormatter.formatFBu(cartProvider.totalPrice),
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppColors.primaryDark),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'Choisir le moyen de paiement',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textDark),
            ),
            const SizedBox(height: 12),
            ..._methods.map((method) {
              final isSelected = _selectedMethod == method['id'];
              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: BorderSide(
                    color: isSelected ? AppColors.primary : AppColors.border,
                    width: isSelected ? 2 : 1,
                  ),
                ),
                child: ListTile(
                  onTap: () => setState(() => _selectedMethod = method['id']),
                  leading: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: (method['color'] as Color).withOpacity(0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(method['icon'] as IconData, color: method['color'] as Color),
                  ),
                  title: Text(method['title'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                  subtitle: Text(method['subtitle'], style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                  trailing: isSelected
                      ? const Icon(Icons.check_circle_rounded, color: AppColors.primary)
                      : const Icon(Icons.circle_outlined, color: AppColors.border),
                ),
              );
            }).toList(),

            const SizedBox(height: 20),
            const Text(
              'Numéro de Téléphone pour Débit',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textDark),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(
                prefixIcon: Icon(Icons.phone_rounded),
                border: OutlineInputBorder(),
                hintText: '+257 6X XX XX XX',
              ),
            ),

            const SizedBox(height: 24),
            // Gift option switch
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('Offrir ces billets en cadeau 🎁', style: TextStyle(fontWeight: FontWeight.bold)),
                      subtitle: const Text('Achetez pour un ami ou un membre de votre famille'),
                      value: _isGift,
                      onChanged: (val) => setState(() => _isGift = val),
                    ),
                    if (_isGift) ...[
                      const Divider(),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _recipientNameController,
                        decoration: const InputDecoration(
                          labelText: 'Nom du destinataire',
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 12),
                      CheckboxListTile(
                        contentPadding: EdgeInsets.zero,
                        title: const Text('Le destinataire n\'a pas de smartphone'),
                        subtitle: const Text('Vous recevrez le billet SMS/PDF pour lui transmettre'),
                        value: _recipientHasNoPhone,
                        onChanged: (val) => setState(() => _recipientHasNoPhone = val ?? false),
                      ),
                      if (!_recipientHasNoPhone) ...[
                        const SizedBox(height: 8),
                        TextField(
                          controller: _recipientPhoneController,
                          keyboardType: TextInputType.phone,
                          decoration: const InputDecoration(
                            labelText: 'Téléphone du destinataire (+257)',
                            border: OutlineInputBorder(),
                          ),
                        ),
                      ],
                    ],
                  ],
                ),
              ),
            ),

            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () async {
                  showDialog(
                    context: context,
                    barrierDismissible: false,
                    builder: (_) => const AlertDialog(
                      content: Row(
                        children: [
                          CircularProgressIndicator(),
                          SizedBox(width: 20),
                          Expanded(child: Text('Traitement du paiement sécurisé en cours...')),
                        ],
                      ),
                    ),
                  );

                  await Future.delayed(const Duration(seconds: 2));

                  final newTickets = await ticketProvider.checkout(
                    cartItems: cartProvider.items,
                    paymentMethod: _selectedMethod,
                    phone: _phoneController.text,
                    isGift: _isGift,
                    recipientName: _recipientNameController.text,
                    recipientPhone: _recipientPhoneController.text,
                    recipientHasNoPhone: _recipientHasNoPhone,
                  );

                  cartProvider.clearCart();

                  if (mounted) {
                    Navigator.of(context).pop(); // close dialog
                    Navigator.of(context).pushReplacement(
                      MaterialPageRoute(
                        builder: (_) => SuccessPage(tickets: newTickets),
                      ),
                    );
                  }
                },
                child: const Text('Valider & Payer Maintenant'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
