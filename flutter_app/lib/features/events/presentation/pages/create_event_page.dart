import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/app_colors.dart';
import '../../domain/entities/event.dart';
import '../../domain/entities/ticket_category.dart';
import '../providers/event_provider.dart';

class CreateEventPage extends StatefulWidget {
  const CreateEventPage({super.key});

  @override
  State<CreateEventPage> createState() => _CreateEventPageState();
}

class _CreateEventPageState extends State<CreateEventPage> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  final _locationController = TextEditingController();
  final _dateController = TextEditingController(text: 'Samedi 15 Août 2026');
  final _timeController = TextEditingController(text: '16:00');
  final _organisateurController = TextEditingController(text: 'Mon Organisation');
  String _category = 'musique';

  final _catNameController = TextEditingController(text: 'VIP');
  final _catPriceController = TextEditingController(text: '20000');

  @override
  Widget build(BuildContext context) {
    final eventProvider = Provider.of<EventProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Publier un Événement'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextFormField(
                controller: _titleController,
                decoration: const InputDecoration(
                  labelText: 'Titre de l\'événement',
                  border: OutlineInputBorder(),
                ),
                validator: (val) => val == null || val.isEmpty ? 'Champ requis' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _descController,
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: 'Description complète',
                  border: OutlineInputBorder(),
                ),
                validator: (val) => val == null || val.isEmpty ? 'Champ requis' : null,
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: _category,
                decoration: const InputDecoration(
                  labelText: 'Catégorie',
                  border: OutlineInputBorder(),
                ),
                items: ['sport', 'musique', 'religion', 'corporate'].map((c) {
                  return DropdownMenuItem(value: c, child: Text(c.toUpperCase()));
                }).toList(),
                onChanged: (val) => setState(() => _category = val!),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _locationController,
                decoration: const InputDecoration(
                  labelText: 'Lieu (ex: Boulevard de l\'Uprona, Bujumbura)',
                  border: OutlineInputBorder(),
                ),
                validator: (val) => val == null || val.isEmpty ? 'Champ requis' : null,
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _dateController,
                      decoration: const InputDecoration(labelText: 'Date', border: OutlineInputBorder()),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextFormField(
                      controller: _timeController,
                      decoration: const InputDecoration(labelText: 'Heure', border: OutlineInputBorder()),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              const Text('Tarification Billet', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _catNameController,
                      decoration: const InputDecoration(labelText: 'Nom (ex: VIP)', border: OutlineInputBorder()),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextFormField(
                      controller: _catPriceController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Prix (FBu)', border: OutlineInputBorder()),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    if (_formKey.currentState!.validate()) {
                      final newEvt = EventEntity(
                        id: 'evt-${DateTime.now().millisecondsSinceEpoch}',
                        title: _titleController.text,
                        description: _descController.text,
                        category: _category,
                        imageUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=800&q=80',
                        date: _dateController.text,
                        time: _timeController.text,
                        location: _locationController.text,
                        organisateur: _organisateurController.text,
                        ticketCategories: [
                          TicketCategory(
                            name: _catNameController.text,
                            price: double.tryParse(_catPriceController.text) ?? 10000,
                            available: 200,
                          )
                        ],
                      );

                      eventProvider.addEvent(newEvt);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Événement créé avec succès !')),
                      );
                      Navigator.of(context).pop();
                    }
                  },
                  child: const Text('Publier l\'Événement'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
