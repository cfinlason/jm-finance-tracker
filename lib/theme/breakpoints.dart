import 'package:flutter/widgets.dart';

enum WindowSize { compact, expanded }

const double kExpandedBreakpoint = 840;

WindowSize windowSizeForWidth(double width) {
  return width >= kExpandedBreakpoint ? WindowSize.expanded : WindowSize.compact;
}

WindowSize windowSizeOf(BuildContext context) {
  return windowSizeForWidth(MediaQuery.sizeOf(context).width);
}

bool isExpanded(BuildContext context) => windowSizeOf(context) == WindowSize.expanded;
