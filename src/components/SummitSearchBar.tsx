import { useRef, useState, useCallback } from 'react';
import {
  Animated,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '../constants';
import { SummitWithFlag } from '../types';

interface Props {
  summits: SummitWithFlag[];
  onSelect: (summit: SummitWithFlag) => void;
}

export default function SummitSearchBar({ summits, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const listHeight = useRef(new Animated.Value(0)).current;

  const results = query.length > 0
    ? summits
        .filter((s) =>
          s.name_ko.includes(query) ||
          (s.name_en ?? '').toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 6)
    : [];

  const showList = results.length > 0;

  const animateList = useCallback((show: boolean) => {
    Animated.timing(listHeight, {
      toValue: show ? Math.min(results.length * 52, 260) : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [listHeight, results.length]);

  const handleChange = useCallback((text: string) => {
    setQuery(text);
    const next = text.length > 0
      ? summits.filter((s) =>
          s.name_ko.includes(text) ||
          (s.name_en ?? '').toLowerCase().includes(text.toLowerCase())
        )
      : [];
    animateList(next.length > 0);
  }, [summits, animateList]);

  const handleSelect = useCallback((summit: SummitWithFlag) => {
    setQuery('');
    animateList(false);
    onSelect(summit);
  }, [onSelect, animateList]);

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={styles.inputRow}>
        <Text style={styles.icon}>🔍</Text>
        <TextInput
          style={styles.input}
          placeholder="정상 검색..."
          placeholderTextColor={Colors.zinc500}
          value={query}
          onChangeText={handleChange}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {showList && (
        <Animated.View style={[styles.resultsList, { maxHeight: listHeight }]}>
          <FlatList
            data={results}
            keyExtractor={(item: SummitWithFlag) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }: { item: SummitWithFlag }) => (
              <TouchableOpacity
                style={styles.resultItem}
                onPress={() => handleSelect(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.resultName}>{item.name_ko}</Text>
                <Text style={styles.resultSub}>{item.elevation_m}m</Text>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 56,
    left: 12,
    right: 12,
    zIndex: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  icon: {
    fontSize: 16,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.zinc950,
  },
  resultsList: {
    marginTop: 6,
    backgroundColor: Colors.white,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  resultName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.zinc950,
  },
  resultSub: {
    fontSize: 13,
    color: Colors.zinc500,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.zinc100,
    marginHorizontal: 12,
  },
});
