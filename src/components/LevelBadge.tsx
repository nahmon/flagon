import { View, Text, StyleSheet } from 'react-native';
import { LevelInfo, levelName } from '../services/xp';
import type { Lang } from '../i18n/strings';

interface Props {
  info: LevelInfo;
  lang: Lang;
  /** 'compact' = icon + number only; 'full' = icon + number + name */
  variant?: 'compact' | 'full';
  size?: 'sm' | 'md';
}

export default function LevelBadge({ info, lang, variant = 'compact', size = 'sm' }: Props) {
  const isMd = size === 'md';
  const containerStyle = [
    styles.badge,
    { backgroundColor: info.color + '22', borderColor: info.color + '55' },
    isMd && styles.badgeMd,
  ];
  return (
    <View style={containerStyle}>
      <Text style={[styles.icon, isMd && styles.iconMd]}>{info.icon}</Text>
      <Text style={[styles.level, { color: info.color }, isMd && styles.levelMd]}>
        {`Lv.${info.level}`}
      </Text>
      {variant === 'full' && (
        <Text style={[styles.name, { color: info.color }, isMd && styles.nameMd]}>
          {levelName(info, lang)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeMd: { paddingHorizontal: 10, paddingVertical: 5, gap: 5 },
  icon: { fontSize: 11 },
  iconMd: { fontSize: 16 },
  level: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
  levelMd: { fontSize: 14 },
  name: { fontSize: 11, fontWeight: '600' },
  nameMd: { fontSize: 13 },
});
