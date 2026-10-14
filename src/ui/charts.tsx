import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { SharedValue, useAnimatedProps, useSharedValue, withSpring, withTiming, Easing } from 'react-native-reanimated';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';
import { spring } from '../theme/tokens';
import { Text } from './primitives';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Thin progress ring with rounded caps; the arc springs to its value on first render. */
export function Ring({
  progress, size = 120, stroke = 12, color, track, children,
}: { progress: number; size?: number; stroke?: number; color?: string; track?: string; children?: React.ReactNode }) {
  const p = useTheme();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = useSharedValue(0);
  const clamped = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  useEffect(() => {
    v.value = withSpring(clamped, spring.soft);
  }, [clamped, v]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - v.value) }));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <G>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={track ?? p.sunken} strokeWidth={stroke} fill="none" />
          <AnimatedCircle cx={size / 2} cy={size / 2} r={r} stroke={color ?? p.accent} strokeWidth={stroke} strokeLinecap="round" fill="none" strokeDasharray={`${c} ${c}`} animatedProps={props} />
        </G>
      </Svg>
      {children}
    </View>
  );
}

export function ProgressBar({ value, height = 8, color, warnAt = 1.0 }: { value: number; height?: number; color?: string; warnAt?: number }) {
  const p = useTheme();
  const w = useSharedValue(0);
  const v = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  useEffect(() => {
    w.value = withTiming(v, { duration: 650, easing: Easing.out(Easing.cubic) });
  }, [v, w]);
  const [width, setWidth] = React.useState(0);
  const style = useAnimatedProps(() => ({ width: width * w.value }));
  const fill = color ?? (value > warnAt ? p.danger : value > 0.9 ? p.warn : p.accent);
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height, borderRadius: height, backgroundColor: p.sunken, overflow: 'hidden' }}>
      <Animated.View style={[{ height, borderRadius: height, backgroundColor: fill }, style as never]} />
    </View>
  );
}

export type Slice = { id: string; label: string; value: number };

export function Donut({ slices, size = 188, stroke = 26, centerTop, centerBottom, activeId }: { slices: Slice[]; size?: number; stroke?: number; centerTop?: string; centerBottom?: string; activeId?: string | null }) {
  const p = useTheme();
  const total = slices.reduce((a, s) => a + s.value, 0);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const reveal = useSharedValue(0);
  useEffect(() => {
    reveal.value = 0;
    reveal.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
  }, [total, slices.length, reveal]);
  const gap = slices.length > 1 ? 3 : 0;
  let acc = 0;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <G>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={p.sunken} strokeWidth={stroke} fill="none" />
          {total > 0 &&
            slices.map((s, i) => {
              const len = (s.value / total) * c;
              const seg = Math.max(0, len - gap);
              const el = (
                <DonutArc key={s.id} cx={size / 2} cy={size / 2} r={r} stroke={p.chart[i % p.chart.length]} sw={activeId && activeId !== s.id ? stroke - 6 : stroke} dash={seg} circ={c} offset={-acc} reveal={reveal} dim={!!activeId && activeId !== s.id} />
              );
              acc += len;
              return el;
            })}
        </G>
      </Svg>
      <View style={{ alignItems: 'center', maxWidth: size - stroke * 2 - 8 }}>
        {centerTop ? <Text variant="moneyLg" numberOfLines={1} adjustsFontSizeToFit>{centerTop}</Text> : null}
        {centerBottom ? <Text variant="caption" tone="muted" numberOfLines={1}>{centerBottom}</Text> : null}
      </View>
    </View>
  );
}

function DonutArc({ cx, cy, r, stroke, sw, dash, circ, offset, reveal, dim }: { cx: number; cy: number; r: number; stroke: string; sw: number; dash: number; circ: number; offset: number; reveal: SharedValue<number>; dim: boolean }) {
  const props = useAnimatedProps(() => ({ strokeDasharray: `${dash * reveal.value} ${circ}` }));
  return <AnimatedCircle cx={cx} cy={cy} r={r} stroke={stroke} strokeWidth={sw} strokeOpacity={dim ? 0.35 : 1} fill="none" strokeDashoffset={offset} strokeLinecap="butt" animatedProps={props} />;
}

export type BarDatum = { label: string; a: number; b?: number };

/** Paired bars (income vs spent) with a soft baseline. */
export function Bars({ data, height = 150, aColor, bColor }: { data: BarDatum[]; height?: number; aColor?: string; bColor?: string }) {
  const p = useTheme();
  const [w, setW] = React.useState(0);
  const max = Math.max(1, ...data.flatMap((d) => [d.a, d.b ?? 0]));
  const colW = data.length ? w / data.length : 0;
  const bw = Math.max(6, Math.min(18, colW * 0.28));
  const plot = height - 24;
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height }}>
      {w > 0 && (
        <Svg width={w} height={height}>
          <Rect x={0} y={plot} width={w} height={1} fill={p.line} />
          {data.map((d, i) => {
            const cx = colW * i + colW / 2;
            const ah = Math.max(d.a > 0 ? 3 : 0, (d.a / max) * (plot - 6));
            const bh = Math.max((d.b ?? 0) > 0 ? 3 : 0, ((d.b ?? 0) / max) * (plot - 6));
            return (
              <G key={d.label + i}>
                <Rect x={cx - bw - 1.5} y={plot - ah} width={bw} height={ah} rx={bw / 2.6} fill={aColor ?? p.accent} />
                {d.b !== undefined && <Rect x={cx + 1.5} y={plot - bh} width={bw} height={bh} rx={bw / 2.6} fill={bColor ?? p.expense} />}
              </G>
            );
          })}
        </Svg>
      )}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row' }}>
        {data.map((d, i) => (
          <View key={d.label + i} style={{ flex: 1, alignItems: 'center' }}>
            <Text variant="caption" tone="faint">{d.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function Sparkline({ values, height = 64, color }: { values: number[]; height?: number; color?: string }) {
  const p = useTheme();
  const [w, setW] = React.useState(0);
  const col = color ?? p.accent;
  const pts = values.length > 1 ? values : [values[0] ?? 0, values[0] ?? 0];
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const span = max - min || 1;
  const coords = pts.map((v, i) => [(i / (pts.length - 1)) * w, height - 8 - ((v - min) / span) * (height - 16)] as const);
  const line = coords.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${w},${height} L0,${height} Z`;
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height }}>
      {w > 0 && (
        <Svg width={w} height={height}>
          <Defs>
            <LinearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={col} stopOpacity={0.28} />
              <Stop offset="1" stopColor={col} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={area} fill="url(#sg)" />
          <Path d={line} stroke={col} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <Circle cx={coords[coords.length - 1][0] - 3} cy={coords[coords.length - 1][1]} r={4.5} fill={col} />
        </Svg>
      )}
    </View>
  );
}
