import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../tickets/domain/entities/ticket.dart';
import '../../../tickets/presentation/pages/ticket_detail_page.dart';
import '../../../events/presentation/pages/home_page.dart';

class SuccessPage extends StatelessWidget {
  final List<TicketEntity> tickets;

  const SuccessPage({super.key, required this.tickets});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppColors.primaryLight,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.check_circle_rounded,
                  color: AppColors.primaryDark,
                  size: 72,
                ),
              ),
              const SizedBox(height: 24),
              const Text(
                'Paiement Réussi ! 🎉',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textDark,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'Vos ${tickets.length} billet(s) ont été générés et enregistrés dans votre compte. Un SMS de confirmation a été envoyé.',
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 14, color: AppColors.textMuted, height: 1.5),
              ),
              const SizedBox(height: 32),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    children: tickets.map((ticket) {
                      return ListTile(
                        contentPadding: EdgeInsets.zero,
                        leading: const Icon(Icons.confirmation_number_rounded, color: AppColors.primary),
                        title: Text(ticket.eventTitle, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                        subtitle: Text('${ticket.categoryName} • ID: ${ticket.id}', style: const TextStyle(fontSize: 12)),
                        trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 14),
                        onTap: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => TicketDetailPage(ticket: ticket),
                            ),
                          );
                        },
                      );
                    }).toList(),
                  ),
                ),
              ),
              const Spacer(),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.of(context).pushAndRemoveUntil(
                      MaterialPageRoute(builder: (_) => const MainNavigationShell()),
                      (route) => false,
                    );
                  },
                  child: const Text('Retour à l\'Accueil'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
