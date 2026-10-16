import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { tap } from '../components/Button';
import { Icon } from '../components/Icon';
import { Group, Header, Line, ProBadge, Screen, SectionTitle } from '../components/Layout';
import { Monogram } from '../components/Monogram';
import { T } from '../components/T';
import { POPULAR_IDS, SERVICES, findService } from '../lib/catalog';
import { useStore } from '../store';
import { fonts, noWebOutline, radius, space, usePalette } from '../theme';

export default function Add() {
  const p = usePalette();
  const isPro = useStore((s) => s.isPro);
  const [query, setQuery] = useState('');

  const services = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return POPULAR_IDS.map((id) => findService(id)!).filter(Boolean);
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
        <Group>
          <Line
            icon="bolt"
            tone="accent"
            title="Знайти автоматично"
            hint="monobank, ПриватБанк та інші банки"
            right={isPro ? <Icon name="chevronRight" size={18} color={p.muted} /> : <ProBadge />}
            onPress={() => router.push('/import')}
          />
        </Group>
      )}

      <SectionTitle>{query ? 'Знайдено' : 'Популярні в Україні'}</SectionTitle>
      <View style={styles.grid}>
        <Tile label={query ? `Додати «${query.trim()}»` : 'Свій сервіс'} onPress={() => pick()}>
          <View style={[styles.customBadge, { borderColor: p.cobalt }]}>
            <Icon name="plus" size={24} color={p.cobalt} />
          </View>
        </Tile>
        {services.map((s) => (
          <Tile key={s.id} label={s.name} onPress={() => pick(s.id)}>
            <Monogram name={s.name} color={s.color} size={52} />
          </Tile>
        ))}
      </View>
    </Screen>
  );
}

function Tile({ label, onPress, children }: { label: string; onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [styles.tile, { opacity: pressed ? 0.6 : 1 }]}
    >
      {children}
      <T variant="caption" center numberOfLines={2} style={styles.tileLabel}>
        {label}
      </T>
    </Pressable>
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
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
