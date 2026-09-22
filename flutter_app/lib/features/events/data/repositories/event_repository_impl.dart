import '../../domain/entities/event.dart';
import '../../domain/repositories/event_repository.dart';
import '../datasources/event_local_datasource.dart';
import '../models/event_model.dart';

class EventRepositoryImpl implements EventRepository {
  final EventLocalDataSource localDataSource;

  EventRepositoryImpl(this.localDataSource);

  @override
  Future<List<EventEntity>> getEvents() async {
    return await localDataSource.getEvents();
  }

  @override
  Future<EventEntity?> getEventById(String id) async {
    final events = await localDataSource.getEvents();
    try {
      return events.firstWhere((e) => e.id == id);
    } catch (_) {
      return null;
    }
  }

  @override
  Future<void> addEvent(EventEntity event) async {
    final model = EventModel(
      id: event.id,
      title: event.title,
      description: event.description,
      category: event.category,
      imageUrl: event.imageUrl,
      date: event.date,
      time: event.time,
      location: event.location,
      organisateur: event.organisateur,
      ticketCategories: event.ticketCategories,
      isFeatured: event.isFeatured,
    );
    await localDataSource.addEvent(model);
  }
}
