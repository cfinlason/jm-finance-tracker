import 'package:flutter/material.dart';
import '../../widgets/app_screen.dart';

class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const AppScreen(child: Text('Welcome — built in Task 14'));
  }
}
