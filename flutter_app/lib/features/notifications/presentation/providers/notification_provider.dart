import 'package:flutter/foundation.dart';
import '../../domain/entities/app_notification.dart';

class NotificationProvider extends ChangeNotifier {
  List<AppNotificationEntity> _notifications = [
    const AppNotificationEntity(
      id: 'notif-1',
      title: 'FestiBuja Live Session approche ! ⏰',
      body: 'L\'événement FestiBuja Live Session commence dans 2 jours au Boulevard de l\'Uprona. Préparez vos billets !',
      date: 'Il y a 30 min',
      type: 'approaching',
      eventId: 'evt-1',
      eventTitle: 'FestiBuja Live Session',
      read: false,
    ),
    const AppNotificationEntity(
      id: 'notif-2',
      title: 'Bienvenue sur GoTix ! 🎫',
      body: 'Merci d\'utiliser GoTix Burundi, la première plateforme de billetterie 100% digitale à Bujumbura.',
      date: 'Hier',
      type: 'system',
      read: true,
    )
  ];

  List<AppNotificationEntity> get notifications => _notifications;

  int get unreadCount => _notifications.where((n) => !n.read).length;

  void markAllAsRead() {
    _notifications = _notifications.map((n) => n.copyWith(read: true)).toList();
    notifyListeners();
  }

  void addNotification({
    required String title,
    required String body,
    required String type,
    String? eventId,
    String? eventTitle,
  }) {
    _notifications.insert(
      0,
      AppNotificationEntity(
        id: 'notif-${DateTime.now().millisecondsSinceEpoch}',
        title: title,
        body: body,
        date: 'À l\'instant',
        type: type,
        eventId: eventId,
        eventTitle: eventTitle,
        read: false,
      ),
    );
    notifyListeners();
  }
}
