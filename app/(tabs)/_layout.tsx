import React from 'react';
import { View } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { BookOpen, ChartPie, LayoutGrid, Plus, Receipt } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme/ThemeProvider';
import { radius, shadow, space, spring } from '../../src/theme/tokens';
import { Press, Text } from '../../src/ui/primitives';
import { haptic } from '../../src/ui/haptics';

const TABS = [
  { name: 'index', label: 'Budget', Icon: ChartPie },
  { name: 'activity', label: 'Activity', Icon: Receipt },
  null, // center add button
  { name: 'plan', label: 'Plan', Icon: LayoutGrid },
  { name: 'learn', label: 'Learn', Icon: BookOpen },
] as const;

function TabItem({ focused, label, Icon, onPress }: { focused: boolean; label: string; Icon: typeof Receipt; onPress: () => void }) {
  const p = useTheme();
  const lift = useSharedValue(focused ? 1 : 0);
  React.useEffect(() => {
    lift.value = withSpring(focused ? 1 : 0, spring.bouncy);
  }, [focused, lift]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: -3 * lift.value }, { scale: 1 + 0.08 * lift.value }] }));
  return (
    <Press onPress={onPress} haptics="select" scaleTo={0.9} accessibilityLabel={label} accessibilityState={{ selected: focused }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: 56 }}>
      <Animated.View style={[{ alignItems: 'center', gap: 3 }, a]}>
        <Icon size={22} color={focused ? p.accent : p.textFaint} strokeWidth={focused ? 2.4 : 2} />
        <Text variant="caption" style={{ fontSize: 11, color: focused ? p.accentStrong : p.textFaint }}>{label}</Text>
      </Animated.View>
    </Press>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TabBar({ state, navigation }: any) {
  const p = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const routes = state.routes as { key: string; name: string }[];
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: Math.max(insets.bottom, 10), paddingHorizontal: space.lg }}>
      <View style={[{ flexDirection: 'row', alignItems: 'center', height: 68, borderRadius: radius.xl, backgroundColor: p.raised, borderWidth: p.mode === 'dark' ? 1 : 0, borderColor: p.line, paddingHorizontal: space.sm }, shadow(p, 3)]}>
        {TABS.map((t, i) => {
          if (!t) {
            return (
              <View key="add" style={{ width: 72, alignItems: 'center' }}>
                <Press
                  accessibilityLabel="Add transaction"
                  haptics="press"
                  scaleTo={0.88}
                  onPress={() => router.push('/add')}
                  style={[{ width: 58, height: 58, borderRadius: 22, backgroundColor: p.accent, alignItems: 'center', justifyContent: 'center', marginTop: -26, borderWidth: 4, borderColor: p.bg }, shadow(p, 2), { shadowColor: p.accent }]}
                >
                  <Plus size={28} color={p.onAccent} strokeWidth={2.8} />
                </Press>
              </View>
            );
          }
          const route = routes.find((r) => r.name === t.name);
          const focused = route ? state.routes[state.index].name === t.name : false;
          return (
            <TabItem
              key={t.name}
              focused={focused}
              label={t.label}
              Icon={t.Icon}
              onPress={() => {
                if (!route) return;
                const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !e.defaultPrevented) {
                  haptic.select();
                  navigation.navigate(route.name);
                }
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const p = useTheme();
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: p.bg } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="activity" />
      <Tabs.Screen name="plan" />
      <Tabs.Screen name="learn" />
    </Tabs>
  );
}
