import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants';
import { MapStyleKey, MAP_STYLE_ICON, MAP_STYLE_ORDER } from '../services/mapStyle';

interface Props {
  current: MapStyleKey;
  onToggle: (next: MapStyleKey) => void;
  topOffset?: number;
}

export default function MapStyleToggle({ current, onToggle, topOffset = 166 }: Props) {
  const handlePress = () => {
    const idx = MAP_STYLE_ORDER.indexOf(current);
    const next = MAP_STYLE_ORDER[(idx + 1) % MAP_STYLE_ORDER.length];
    onToggle(next);
  };

  return (
    <TouchableOpacity
      style={[styles.btn, { top: topOffset }]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <Text style={styles.icon}>{MAP_STYLE_ICON[current]}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    position: 'absolute',
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 10,
  },
  icon: {
    fontSize: 22,
  },
});
