import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Check, ChevronRight, Clock } from 'lucide-react-native';
import { useTheme } from '../../src/theme/ThemeProvider';
import { radius, shadow, space } from '../../src/theme/tokens';
import { Badge, Card, Chip, IconTile, Press, Text } from '../../src/ui/primitives';
import { Icon } from '../../src/ui/Icon';
import { ProgressBar } from '../../src/ui/charts';
import { Reveal, Screen } from '../../src/ui/layout';
import { ARTICLES, CATEGORIES } from '../../src/content/learn';
import { useStore } from '../../src/data/store';

export default function Learn() {
  const p = useTheme();
  const router = useRouter();
  const read = useStore((s) => s.readArticles);
  const [cat, setCat] = useState<string>('All');
  const open = (id: string) => router.push({ pathname: '/article', params: { id } });
  const featured = ARTICLES.find((a) => !read.includes(a.id)) ?? ARTICLES[0];
  const list = ARTICLES.filter((a) => cat === 'All' || a.category === cat);

  return (
    <Screen tabBar title="Learn" subtitle="Short, practical guides">
      <Reveal style={{ paddingHorizontal: space.xl }}>
        <Press onPress={() => open(featured.id)} scaleTo={0.985} style={[{ borderRadius: radius.xl, overflow: 'hidden' }, shadow(p, 3), { shadowColor: p.accent }]}>
          <LinearGradient colors={[p.heroFrom, p.heroTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: space.xl, gap: space.md, minHeight: 190, justifyContent: 'flex-end' }}>
            <View style={{ position: 'absolute', right: -30, top: -30, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.1)' }} />
            <View style={{ position: 'absolute', right: 24, top: 24, opacity: 0.9 }}><Icon name={featured.icon} size={44} color="#FFFFFF" strokeWidth={1.6} /></View>
            <Text variant="overline" style={{ color: 'rgba(255,255,255,0.8)' }}>{read.includes(featured.id) ? 'Read again' : 'Start here'}</Text>
            <Text variant="display" style={{ color: '#FFFFFF' }}>{featured.title}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Clock size={14} color="rgba(255,255,255,0.8)" />
              <Text variant="caption" style={{ color: 'rgba(255,255,255,0.85)' }}>{featured.minutes} min read</Text>
            </View>
          </LinearGradient>
        </Press>
      </Reveal>

      <Reveal index={1} style={{ paddingHorizontal: space.xl, marginTop: space.lg }}>
        <Card style={{ gap: space.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="headline">Your progress</Text>
            <Text variant="callout" tone="muted">{read.length} of {ARTICLES.length} read</Text>
          </View>
          <ProgressBar value={read.length / ARTICLES.length} height={8} />
        </Card>
      </Reveal>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.xl, gap: space.sm, paddingVertical: space.lg }}>
        {['All', ...CATEGORIES].map((c) => <Chip key={c} label={c} selected={cat === c} onPress={() => setCat(c)} />)}
      </ScrollView>

      <View style={{ paddingHorizontal: space.xl, gap: space.md }}>
        {list.map((a, i) => (
          <Reveal key={a.id} index={i + 2}>
            <Card onPress={() => open(a.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <IconTile size={48}><Icon name={a.icon} color={p.accentStrong} size={22} /></IconTile>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                  <Text variant="bodyStrong" numberOfLines={2} style={{ flexShrink: 1 }}>{a.title}</Text>
                </View>
                <Text variant="caption" tone="muted" numberOfLines={2}>{a.summary}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <Text variant="caption" tone="faint">{a.category} · {a.minutes} min</Text>
                  {a.premium ? <Badge label="PLUS TOOL" tone="info" /> : null}
                </View>
              </View>
              {read.includes(a.id) ? <Check size={20} color={p.accent} /> : <ChevronRight size={18} color={p.textFaint} />}
            </Card>
          </Reveal>
        ))}
      </View>
    </Screen>
  );
}
