import '../entities/event.dart';

abstract class EventRepository {
  Future<List<EventEntity>> getEvents();
  Future<EventEntity?> getEventById(String id);
  Future<void> addEvent(EventEntity event);
}
