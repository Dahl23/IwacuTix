import 'package:intl/intl.dart';

class CurrencyFormatter {
  static String formatFBu(num amount) {
    final formatter = NumberFormat('#,##0', 'fr_FR');
    return '${formatter.format(amount).replaceAll(',', ' ')} FBu';
  }
}
