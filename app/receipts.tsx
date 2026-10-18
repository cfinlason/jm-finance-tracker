import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowDownRight, ArrowUpRight, Repeat, ScanLine, ShoppingBasket, Store, TimerOff } from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeProvider';
import { space } from '../src/theme/tokens';
import { Badge, Button, Card, IconTile, Segmented, Text } from '../src/ui/primitives';
import { EmptyState } from '../src/ui/feedback';
import { ProgressBar } from '../src/ui/charts';
import { Group, ModalScreen, Reveal, Row } from '../src/ui/layout';
import { useStore } from '../src/data/store';
import { prettyDate } from '../src/data/dates';
import { moneyAuto } from '../src/data/format';
import { computeInsights, ItemStat } from '../src/data/receiptInsights';

type Tab = 'receipts' | 'insights';

function StatRow({ s, right, sub, last }: { s: ItemStat; right: string; sub: string; last: boolean }) {
  return <Row title={s.label} subtitle={sub} right={<Text variant="money">{right}</Text>} last={last} />;
}

function Heading({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {icon}
      <Text variant="title">{title}</Text>
    </View>
  );
}

export default function Receipts() {
  const p = useTheme();
  const router = useRouter();
  const receiptsMap = useStore((s) => s.receipts);
  const currency = useStore((s) => s.settings.currency);
  const [tab, setTab] = useState<Tab>('receipts');
  const list = useMemo(() => Object.values(receiptsMap).sort((a, b) => (a.date === b.date ? (a.scannedAt < b.scannedAt ? 1 : -1) : a.date < b.date ? 1 : -1)), [receiptsMap]);
  const ins = useMemo(() => computeInsights(list), [list]);
  const withItems = list.filter((r) => r.items.length > 0).length;
  const maxCount = Math.max(1, ...ins.topByCount.map((s) => s.receipts));

  return (
    <ModalScreen back title="Receipts" footer={<Button title="Scan a receipt" onPress={() => router.push('/add')} icon={<ScanLine size={20} color={p.onAccent} />} />}>
      {list.length === 0 ? (
        <EmptyState
          icon={<ScanLine size={40} color={p.accent} />}
          title="Keep your receipts, digitally"
          body="Scan a receipt when you add a transaction. Allot reads the items, keeps the original photo, and shows what you buy most over time."
          action="Scan your first receipt"
          onAction={() => router.push('/add')}
        />
      ) : (
        <>
          <Segmented<Tab> value={tab} onChange={setTab} options={[{ value: 'receipts', label: `Receipts · ${list.length}` }, { value: 'insights', label: 'What I buy' }]} />

          {tab === 'receipts' ? (
            <Group style={{ marginHorizontal: 0 }}>
              {list.map((r, i) => (
                <Row
                  key={r.id}
                  icon={<IconTile><Store size={20} color={p.accentStrong} /></IconTile>}
                  title={r.merchant || 'Receipt'}
                  subtitle={`${prettyDate(r.date)} · ${r.items.length ? `${r.items.length} items` : 'photo only'}`}
                  right={<Text variant="money">{moneyAuto(r.total, r.currency ?? currency)}</Text>}
                  onPress={() => router.push({ pathname: '/receipt', params: { id: r.id } })}
                  last={i === list.length - 1}
                />
              ))}
            </Group>
          ) : withItems < 2 ? (
            <Card style={{ gap: space.sm }}>
              <Text variant="title">A couple more receipts</Text>
              <Text variant="body" tone="muted">Patterns show up once you’ve scanned at least two receipts with items. You have {withItems}. Scan another and come back.</Text>
            </Card>
          ) : (
            <>
              <Card level={2} style={{ flexDirection: 'row', gap: space.xl }}>
                <View><Text variant="caption" tone="muted">Receipts</Text><Text variant="moneyLg">{ins.receiptCount}</Text></View>
                <View><Text variant="caption" tone="muted">Total spent</Text><Text variant="moneyLg">{moneyAuto(ins.spendTotal)}</Text></View>
              </Card>

              <Reveal>
                <View style={{ gap: space.sm }}>
                  <Heading icon={<Repeat size={18} color={p.accent} />} title="Bought most often" />
                  <Card style={{ gap: space.md }}>
                    {ins.topByCount.map((s) => (
                      <View key={s.key} style={{ gap: 6 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>{s.label}</Text>
                          <Text variant="callout" tone="muted">{s.receipts} receipt{s.receipts === 1 ? '' : 's'} · {moneyAuto(s.spend)}</Text>
                        </View>
                        <ProgressBar value={s.receipts / maxCount} height={6} />
                      </View>
                    ))}
                  </Card>
                </View>
              </Reveal>

              <Reveal index={1}>
                <View style={{ gap: space.sm }}>
                  <Heading icon={<ShoppingBasket size={18} color={p.accent} />} title="Where the money goes" />
                  <Group style={{ marginHorizontal: 0 }}>
                    {ins.topBySpend.slice(0, 5).map((s, i, arr) => (
                      <StatRow key={s.key} s={s} right={moneyAuto(s.spend)} sub={`${s.units} bought · avg ${moneyAuto(s.avgPrice)}`} last={i === arr.length - 1} />
                    ))}
                  </Group>
                </View>
              </Reveal>

              <Reveal index={2}>
                <View style={{ gap: space.sm }}>
                  <Heading icon={<TimerOff size={18} color={p.warn} />} title="Not buying lately" />
                  {ins.droppedOff.length === 0 ? (
                    <Card><Text variant="callout" tone="muted">Nothing has dropped off your list. Items you buy regularly will show here when you stop.</Text></Card>
                  ) : (
                    <Group style={{ marginHorizontal: 0 }}>
                      {ins.droppedOff.map((s, i) => (
                        <StatRow key={s.key} s={s} right={`${s.daysSince}d`} sub={`Usually every ~${s.avgGapDays} days · last ${prettyDate(s.lastSeen)}`} last={i === ins.droppedOff.length - 1} />
                      ))}
                    </Group>
                  )}
                </View>
              </Reveal>

              {ins.priceUps.length > 0 && (
                <Reveal index={3}>
                  <View style={{ gap: space.sm }}>
                    <Text variant="title">Price changes</Text>
                    <Group style={{ marginHorizontal: 0 }}>
                      {ins.priceUps.map((s, i) => {
                        const up = (s.priceChange ?? 0) > 0;
                        return (
                          <Row
                            key={s.key}
                            title={s.label}
                            subtitle={`${s.receipts} receipts`}
                            right={
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                {up ? <ArrowUpRight size={16} color={p.expense} /> : <ArrowDownRight size={16} color={p.accent} />}
                                <Text variant="money" tone={up ? 'expense' : 'accent'}>{Math.abs(s.priceChange ?? 0)}%</Text>
                              </View>
                            }
                            last={i === ins.priceUps.length - 1}
                          />
                        );
                      })}
                    </Group>
                  </View>
                </Reveal>
              )}

              {ins.merchants.length > 0 && (
                <Reveal index={4}>
                  <View style={{ gap: space.sm }}>
                    <Text variant="title">Stores</Text>
                    <Group style={{ marginHorizontal: 0 }}>
                      {ins.merchants.map((m, i) => (
                        <Row key={m.name} title={m.name} subtitle={`${m.visits} visit${m.visits === 1 ? '' : 's'}`} right={<Text variant="money">{moneyAuto(m.spend)}</Text>} last={i === ins.merchants.length - 1} />
                      ))}
                    </Group>
                  </View>
                </Reveal>
              )}
              <Badge label="BASED ON SCANNED RECEIPTS" tone="neutral" />
            </>
          )}
        </>
      )}
    </ModalScreen>
  );
}
