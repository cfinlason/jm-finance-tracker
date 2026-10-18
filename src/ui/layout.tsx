import React from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleProp, View, ViewStyle } from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, X } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { radius, space } from '../theme/tokens';
import { Press, Text } from './primitives';

/** Content that fades and slides in on first render. Pass an index to stagger a list. */
export function Reveal({ children, index = 0, style }: { children: React.ReactNode; index?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 10) * 55).springify().damping(18).stiffness(130)} style={style}>
      {children}
    </Animated.View>
  );
}

export const TAB_BAR_SPACE = 120;

export function Screen({
  title, subtitle, right, left, children, scroll = true, tabBar, contentStyle, onRefresh, refreshing,
}: {
  title?: string; subtitle?: string; right?: React.ReactNode; left?: React.ReactNode; children: React.ReactNode; scroll?: boolean; tabBar?: boolean; contentStyle?: StyleProp<ViewStyle>; onRefresh?: () => void; refreshing?: boolean;
}) {
  const p = useTheme();
  const insets = useSafeAreaInsets();
  const header = title ? (
    <View style={{ paddingHorizontal: space.xl, paddingTop: insets.top + space.md, paddingBottom: space.md, flexDirection: 'row', alignItems: 'flex-end', gap: space.md }}>
      {left}
      <View style={{ flex: 1 }}>
        {subtitle ? <Text variant="overline" tone="muted" style={{ marginBottom: 4 }}>{subtitle}</Text> : null}
        <Text variant="display" numberOfLines={1}>{title}</Text>
      </View>
      {right}
    </View>
  ) : (
    <View style={{ height: insets.top }} />
  );
  if (!scroll) {
    return (
      <View style={{ flex: 1, backgroundColor: p.bg }}>
        {header}
        <View style={[{ flex: 1 }, contentStyle]}>{children}</View>
      </View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={p.accent} /> : undefined}
        contentContainerStyle={[{ paddingBottom: tabBar ? TAB_BAR_SPACE : insets.bottom + space.xxl }, contentStyle]}
      >
        {header}
        {children}
      </ScrollView>
    </View>
  );
}

/** Full-height modal chrome: grabber, serif title, close button. */
export function ModalScreen({
  title, children, scroll = true, footer, onClose, back,
}: { title?: string; children: React.ReactNode; scroll?: boolean; footer?: React.ReactNode; onClose?: () => void; back?: boolean }) {
  const p = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const close = onClose ?? (() => (router.canGoBack() ? router.back() : router.replace('/')));
  const Body = scroll ? ScrollView : View;
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: p.bg }}>
      <View style={{ paddingTop: Math.max(insets.top, Platform.OS === 'web' ? 24 : 0) + (back ? space.md : space.lg), paddingHorizontal: space.xl, paddingBottom: space.md }}>
        {!back && <View style={{ alignSelf: 'center', width: 38, height: 5, borderRadius: 3, backgroundColor: p.line, marginBottom: space.md }} />}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          {back ? (
            <Press onPress={close} accessibilityLabel="Back" hitSlop={10} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: p.surface, alignItems: 'center', justifyContent: 'center' }}>
              <ChevronLeft size={22} color={p.text} />
            </Press>
          ) : null}
          <Text variant="title" style={{ flex: 1 }} numberOfLines={1}>{title}</Text>
          {!back && (
            <Press onPress={close} accessibilityLabel="Close" hitSlop={12} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: p.sunken, alignItems: 'center', justifyContent: 'center' }}>
              <X size={20} color={p.textMuted} />
            </Press>
          )}
        </View>
      </View>
      <Body {...(scroll ? { showsVerticalScrollIndicator: false, keyboardShouldPersistTaps: 'handled', contentContainerStyle: { padding: space.xl, paddingTop: space.sm, paddingBottom: space.huge, gap: space.lg } } : { style: { flex: 1, padding: space.xl, paddingTop: space.sm } })}>
        {children}
      </Body>
      {footer ? <View style={{ padding: space.xl, paddingBottom: insets.bottom + space.lg, backgroundColor: p.bg, borderTopWidth: 1, borderTopColor: p.line }}>{footer}</View> : null}
    </KeyboardAvoidingView>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.xl, marginTop: space.xl, marginBottom: space.md }}>
      <Text variant="title">{title}</Text>
      {action ? (
        <Press onPress={onAction} hitSlop={10}>
          <Text variant="callout" tone="accent">{action}</Text>
        </Press>
      ) : null}
    </View>
  );
}

export function Row({
  icon, title, subtitle, right, onPress, last, tone,
}: { icon?: React.ReactNode; title: string; subtitle?: string; right?: React.ReactNode; onPress?: () => void; last?: boolean; tone?: 'danger' }) {
  const p = useTheme();
  const inner = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, paddingHorizontal: space.lg }}>
      {icon}
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong" tone={tone === 'danger' ? 'danger' : 'text'} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text variant="caption" tone="muted" numberOfLines={2}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
  return (
    <View>
      {onPress ? <Press onPress={onPress} scaleTo={0.985} haptics="tap">{inner}</Press> : inner}
      {!last && <View style={{ height: 1, backgroundColor: p.line, marginLeft: space.lg + 52, opacity: 0.7 }} />}
    </View>
  );
}

export function Group({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const p = useTheme();
  return (
    <View style={[{ marginHorizontal: space.xl, backgroundColor: p.surface, borderRadius: radius.lg, overflow: 'hidden', borderWidth: p.mode === 'dark' ? 1 : 0, borderColor: p.line }, style]}>
      {children}
    </View>
  );
}

export function FadeWrap({ children }: { children: React.ReactNode }) {
  return <Animated.View entering={FadeIn.duration(260)} style={{ flex: 1 }}>{children}</Animated.View>;
}
