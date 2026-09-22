class AppNotificationEntity {
  final String id;
  final String title;
  final String body;
  final String date;
  final String type; // 'approaching' | 'update' | 'system'
  final String? eventId;
  final String? eventTitle;
  final bool read;

  const AppNotificationEntity({
    required this.id,
    required this.title,
    required this.body,
    required this.date,
    required this.type,
    this.eventId,
    this.eventTitle,
    this.read = false,
  });

  AppNotificationEntity copyWith({bool? read}) {
    return AppNotificationEntity(
      id: id,
      title: title,
      body: body,
      date: date,
      type: type,
      eventId: eventId,
      eventTitle: eventTitle,
      read: read ?? this.read,
    );
  }
}
