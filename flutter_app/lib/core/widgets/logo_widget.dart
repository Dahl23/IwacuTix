import 'package:flutter/material.dart';
import '../constants/app_colors.dart';

class LogoWidget extends StatelessWidget {
  final double height;
  final bool isDark;

  const LogoWidget({
    super.key,
    this.height = 36,
    this.isDark = false,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(
            color: AppColors.primary,
            borderRadius: BorderRadius.circular(10),
          ),
          child: const Icon(
            Icons.confirmation_number_rounded,
            color: Colors.white,
            size: 20,
          ),
        ),
        const SizedBox(width: 10),
        RichText(
          text: TextSpan(
            style: TextStyle(
              fontSize: height * 0.6,
              fontWeight: FontWeight.extrabold,
              letterSpacing: -0.5,
            ),
            children: [
              TextSpan(
                text: 'Bu',
                style: TextStyle(
                  color: isDark ? Colors.white : AppColors.textDark,
                ),
              ),
              const TextSpan(
                text: 'Ticket',
                style: TextStyle(
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
