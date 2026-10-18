import React, { useEffect } from 'react';
import { goBack } from '../src/ui/nav';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Clock, Lightbulb } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../src/theme/ThemeProvider';
import { radius, space } from '../src/theme/tokens';
import { Button, Card, IconTile, Text } from '../src/ui/primitives';
import { Icon } from '../src/ui/Icon';
import { EmptyState } from '../src/ui/feedback';
import { ModalScreen, Reveal } from '../src/ui/layout';
import { ARTICLES } from '../src/content/learn';
import { useIsPremium, useStore } from '../src/data/store';

export default function ArticleScreen() {
  const p = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const markRead = useStore((s) => s.markRead);
  const isPremium = useIsPremium();
  const a = ARTICLES.find((x) => x.id === id);
  useEffect(() => {
    if (a) markRead(a.id);
  }, [a, markRead]);

  if (!a) {
    return (
      <ModalScreen back title="Article">
        <EmptyState icon={<Lightbulb size={36} color={p.accent} />} title="Article not found" body="That guide isn’t available. Head back to the Learn tab to pick another." action="Back to Learn" onAction={() => goBack(router)} />
      </ModalScreen>
    );
  }
  const cta = a.id === 'snowball-vs-avalanche' ? { label: 'Open the debt roadmap', to: isPremium ? '/debt' : '/paywall' } : a.id === 'net-worth' ? { label: 'Open net worth', to: isPremium ? '/networth' : '/paywall' } : a.id === 'funds-explained' ? { label: 'Open funds', to: '/funds' } : a.id === 'bills-never-missed' ? { label: 'Open bills calendar', to: '/bills' } : null;

  return (
    <ModalScreen back title="">
      <Reveal>
        <LinearGradient colors={[p.heroFrom, p.heroTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.xl, padding: space.xl, gap: space.md }}>
          <Icon name={a.icon} size={34} color="#FFFFFF" strokeWidth={1.6} />
          <Text variant="overline" style={{ color: 'rgba(255,255,255,0.8)' }}>{a.category}</Text>
          <Text variant="display" style={{ color: '#FFFFFF' }}>{a.title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Clock size={14} color="rgba(255,255,255,0.8)" />
            <Text variant="caption" style={{ color: 'rgba(255,255,255,0.85)' }}>{a.minutes} min read</Text>
          </View>
        </LinearGradient>
      </Reveal>
      {a.blocks.map((b, i) => (
        <Reveal key={i} index={i + 1}>
          {b.t === 'p' && <Text variant="body" style={{ lineHeight: 26 }}>{b.text}</Text>}
          {b.t === 'h' && <Text variant="title" style={{ marginTop: space.sm }}>{b.text}</Text>}
          {b.t === 'quote' && <Text variant="title" tone="accent" style={{ fontFamily: 'Fraunces_500Medium_Italic' }}>“{b.text}”</Text>}
          {b.t === 'tip' && (
            <Card style={{ flexDirection: 'row', gap: space.md, backgroundColor: p.accentSoft, alignItems: 'flex-start' }} level={1}>
              <IconTile tone="neutral" size={36}><Lightbulb size={18} color={p.accent} /></IconTile>
              <Text variant="callout" style={{ flex: 1, lineHeight: 21 }}>{b.text}</Text>
            </Card>
          )}
          {b.t === 'list' && (
            <View style={{ gap: space.sm }}>
              {b.items.map((it) => (
                <View key={it} style={{ flexDirection: 'row', gap: space.md }}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: p.accent, marginTop: 9 }} />
                  <Text variant="body" style={{ flex: 1, lineHeight: 25 }}>{it}</Text>
                </View>
              ))}
            </View>
          )}
          {b.t === 'steps' && (
            <View style={{ gap: space.md }}>
              {b.items.map((it, n) => (
                <View key={it} style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: p.accent, alignItems: 'center', justifyContent: 'center' }}>
                    <Text variant="callout" style={{ color: p.onAccent, fontFamily: 'Inter_700Bold' }}>{n + 1}</Text>
                  </View>
                  <Text variant="body" style={{ flex: 1, lineHeight: 25 }}>{it}</Text>
                </View>
              ))}
            </View>
          )}
        </Reveal>
      ))}
      {cta ? <Button title={cta.label} onPress={() => router.push(cta.to as never)} /> : null}
    </ModalScreen>
  );
}
