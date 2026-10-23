import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { tap } from '../components/Button';
import { Icon } from '../components/Icon';
import { Group, Header, Line, ProBadge, Screen, SectionTitle } from '../components/Layout';
import { Monogram } from '../components/Monogram';
import { FadeIn, PressableScale } from '../components/Motion';
import { T } from '../components/T';
import { POPULAR_IDS, SERVICES, findService } from '../lib/catalog';
import { STORE } from '../lib/links';
import { useStore } from '../store';
import { fonts, noWebOutline, radius, space, usePalette } from '../theme';

export default function Add() {
  const p = usePalette();
  const isPro = useStore((s) => s.isPro);
  const [query, setQuery] = useState('');

  const services = useMemo(() => {
    const q = query.trim().toLowerCase();
    // an iPhone has no use for a Google Play tile up front; search still finds it
    if (!q) return POPULAR_IDS.filter((id) => !(STORE === 'ios' && id === 'googleplay')).map((id) => findService(id)!).filter(Boolean);
    return SERVICES.filter((s) => s.name.toLowerCase().includes(q));
  }, [query]);

  const pick = (service?: string) =>
    router.push({ pathname: '/edit', params: service ? { service } : { name: query.trim() } });

  return (
    <Screen header={<Header title="Нова підписка" onBack={() => router.back()} backIcon="close" />}>
      <View style={[styles.search, { backgroundColor: p.sheet }]}>
        <Icon name="search" size={20} color={p.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Netflix, MEGOGO, iCloud…"
          placeholderTextColor={p.muted}
          style={[styles.searchInput, noWebOutline, { color: p.ink }]}
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Пошук сервісу"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} accessibilityLabel="Очистити" hitSlop={10}>
            <Icon name="close" size={18} color={p.muted} />
          </Pressable>
        )}
      </View>

      {!query && (
        <FadeIn>
          <Group>
            <Line
              icon="bolt"
              tint="violet"
              title="Знайти у виписці банку"
              hint="monobank, ПриватБанк та інші"
              right={isPro ? <Icon name="chevronRight" size={18} color={p.muted} /> : <ProBadge />}
              onPress={() => router.push('/import')}
            />
          </Group>
        </FadeIn>
      )}

      <SectionTitle>{query ? (services.length ? 'Знайдено' : 'Не знайдено') : 'Популярні в Україні'}</SectionTitle>
      <View style={styles.grid}>
        <Tile label={query ? `Додати «${query.trim()}»` : 'Свій сервіс'} onPress={() => pick()}>
          <View style={[styles.customBadge, { borderColor: p.cobalt }]}>
            <Icon name="plus" size={24} color={p.cobalt} />
          </View>
        </Tile>
        {services.map((s) => (
          <Tile key={s.id} label={s.name} onPress={() => pick(s.id)}>
            <Monogram name={s.name} color={s.color} size={54} />
          </Tile>
        ))}
      </View>
    </Screen>
  );
}

function Tile({ label, onPress, children }: { label: string; onPress: () => void; children: React.ReactNode }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      to={0.9}
      onPress={() => {
        tap();
        onPress();
      }}
      style={styles.tile}
    >
      {children}
      <T variant="caption" center numberOfLines={2} style={styles.tileLabel}>
        {label}
      </T>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2),
    borderRadius: radius.pill,
    paddingHorizontal: space(4),
    height: 50,
  },
  searchInput: { flex: 1, minWidth: 0, fontFamily: fonts.regular, fontSize: 16, height: '100%' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -space(1) },
  tile: { width: '25%', alignItems: 'center', paddingVertical: space(2), paddingHorizontal: space(1), gap: space(2) },
  tileLabel: { minHeight: 36 },
  customBadge: {
    width: 54,
    height: 54,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
