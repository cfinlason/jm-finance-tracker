import 'package:flutter/material.dart';

void main() {
  runApp(const _ScaffoldPlaceholderApp());
}

class _ScaffoldPlaceholderApp extends StatelessWidget {
  const _ScaffoldPlaceholderApp();

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      debugShowCheckedModeBanner: false,
      home: Scaffold(
        body: Center(child: Text('JM Finance Tracker — scaffold OK')),
      ),
    );
  }
}
