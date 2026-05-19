import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../constants';
import { useLang } from '../contexts/LangContext';
import { t } from '../i18n/strings';

export interface SummitFilters {
  flagStatus: 'all' | 'unclaimed' | 'own' | 'other';
  elevation: 'all' | 'low' | 'mid' | 'high';
}

export const DEFAULT_FILTERS: SummitFilters = { flagStatus: 'all', elevation: 'all' };

export function countActiveFilters(f: SummitFilters): number {
  return (f.flagStatus !== 'all' ? 1 : 0) + (f.elevation !== 'all' ? 1 : 0);
}

interface Props {
  visible: boolean;
  filters: SummitFilters;
  onFiltersChange: (f: SummitFilters) => void;
  onClose: () => void;
}

type ChipOption<T extends string> = { value: T; label: string };

function ChipRow<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: ChipOption<T>[];
  selected: T;
  onSelect: (v: T) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[styles.chip, selected === opt.value && styles.chipActive]}
          onPress={() => onSelect(opt.value)}
          activeOpacity={0.7}
        >
          <Text style={[styles.chipText, selected === opt.value && styles.chipTextActive]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function SummitFilterSheet({ visible, filters, onFiltersChange, onClose }: Props) {
  const { lang } = useLang();
  const s = t(lang);

  const flagOptions: ChipOption<SummitFilters['flagStatus']>[] = [
    { value: 'all', label: s.filterAll },
    { value: 'unclaimed', label: s.filterUnclaimed },
    { value: 'own', label: s.filterMyCrew },
    { value: 'other', label: s.filterOtherCrew },
  ];

  const elevOptions: ChipOption<SummitFilters['elevation']>[] = [
    { value: 'all', label: s.filterAll },
    { value: 'low', label: s.filterLow },
    { value: 'mid', label: s.filterMid },
    { value: 'high', label: s.filterHigh },
  ];

  const handleReset = () => onFiltersChange(DEFAULT_FILTERS);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>{s.filterTitle}</Text>
          <TouchableOpacity onPress={handleReset} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.resetText}>{s.filterReset}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>{s.filterFlagStatus}</Text>
        <ChipRow
          options={flagOptions}
          selected={filters.flagStatus}
          onSelect={(v) => onFiltersChange({ ...filters, flagStatus: v })}
        />

        <Text style={styles.sectionLabel}>{s.filterElevation}</Text>
        <ChipRow
          options={elevOptions}
          selected={filters.elevation}
          onSelect={(v) => onFiltersChange({ ...filters, elevation: v })}
        />

        <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
          <Text style={styles.doneBtnText}>{s.confirm}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.zinc200,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.zinc950,
  },
  resetText: {
    fontSize: 14,
    color: Colors.orange,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.zinc500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.zinc100,
    borderWidth: 1.5,
    borderColor: Colors.zinc200,
  },
  chipActive: {
    backgroundColor: Colors.green,
    borderColor: Colors.green,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.zinc500,
  },
  chipTextActive: {
    color: Colors.white,
  },
  doneBtn: {
    height: 50,
    backgroundColor: Colors.green,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },
});
