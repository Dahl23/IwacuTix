import 'package:flutter/foundation.dart';
import '../../domain/entities/event.dart';
import '../../domain/repositories/event_repository.dart';

class EventProvider extends ChangeNotifier {
  final EventRepository repository;

  List<EventEntity> _events = [];
  String _selectedCategory = 'Tous';
  String _searchQuery = '';
  List<String> _followedEventIds = ['evt-1'];

  EventProvider({required this.repository}) {
    loadEvents();
  }

  List<EventEntity> get events => _events;
  String get selectedCategory => _selectedCategory;
  String get searchQuery => _searchQuery;
  List<String> get followedEventIds => _followedEventIds;

  List<EventEntity> get filteredEvents {
    return _events.where((event) {
      final matchesSearch = event.title.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          event.location.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          event.organisateur.toLowerCase().contains(_searchQuery.toLowerCase());

      final matchesCategory = _selectedCategory == 'Tous' ||
          event.category.toLowerCase() == _selectedCategory.toLowerCase();

      return matchesSearch && matchesCategory;
    }).toList();
  }

  Future<void> loadEvents() async {
    _events = await repository.getEvents();
    notifyListeners();
  }

  void setSelectedCategory(String category) {
    _selectedCategory = category;
    notifyListeners();
  }

  void setSearchQuery(String query) {
    _searchQuery = query;
    notifyListeners();
  }

  Future<void> addEvent(EventEntity event) async {
    await repository.addEvent(event);
    await loadEvents();
  }

  void toggleFollow(String eventId) {
    if (_followedEventIds.contains(eventId)) {
      _followedEventIds.remove(eventId);
    } else {
      _followedEventIds.add(eventId);
    }
    notifyListeners();
  }
}
