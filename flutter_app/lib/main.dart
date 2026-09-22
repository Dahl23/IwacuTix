import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'core/theme/app_theme.dart';
import 'features/events/data/datasources/event_local_datasource.dart';
import 'features/events/data/repositories/event_repository_impl.dart';
import 'features/events/presentation/providers/event_provider.dart';

import 'features/tickets/data/datasources/ticket_local_datasource.dart';
import 'features/tickets/data/repositories/ticket_repository_impl.dart';
import 'features/tickets/presentation/providers/ticket_provider.dart';

import 'features/cart/presentation/providers/cart_provider.dart';
import 'features/notifications/presentation/providers/notification_provider.dart';
import 'features/splash_onboarding/presentation/pages/splash_page.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  // Clean Architecture Dependency Injection Setup
  final eventLocalDataSource = EventLocalDataSource();
  final eventRepository = EventRepositoryImpl(eventLocalDataSource);

  final ticketLocalDataSource = TicketLocalDataSource();
  final ticketRepository = TicketRepositoryImpl(ticketLocalDataSource);

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(
          create: (_) => EventProvider(repository: eventRepository),
        ),
        ChangeNotifierProvider(
          create: (_) => TicketProvider(repository: ticketRepository),
        ),
        ChangeNotifierProvider(
          create: (_) => CartProvider(),
        ),
        ChangeNotifierProvider(
          create: (_) => NotificationProvider(),
        ),
      ],
      child: const GoTixApp(),
    ),
  );
}

class GoTixApp extends StatelessWidget {
  const GoTixApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'GoTix Burundi',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: const SplashPage(),
    );
  }
}
