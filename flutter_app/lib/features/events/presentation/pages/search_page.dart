import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../providers/event_provider.dart';
import 'event_details_page.dart';

class SearchPage extends StatelessWidget {
  const SearchPage({super.key});

  @override
  Widget build(BuildContext context) {
    final eventProvider = Provider.of<EventProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: TextField(
          autofocus: false,
          decoration: const InputDecoration(
            hintText: 'Rechercher un événement, un lieu, un artiste...',
            border: InputBorder.none,
          ),
          onChanged: (val) => eventProvider.setSearchQuery(val),
        ),
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: eventProvider.filteredEvents.length,
        itemBuilder: (context, index) {
          final event = eventProvider.filteredEvents[index];
          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: ListTile(
              leading: ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Image.network(event.imageUrl, width: 56, height: 56, fit: BoxFit.cover),
              ),
              title: Text(event.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              subtitle: Text('${event.date} • ${event.location}', maxLines: 1, overflow: TextOverflow.ellipsis),
              trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 14),
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => EventDetailsPage(eventId: event.id)),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
