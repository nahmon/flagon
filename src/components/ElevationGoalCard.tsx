import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  Pressable, ScrollView,
} from 'react-native';
import { Colors, Fonts } from '../constants';
import {
  getElevationGoal, setElevationGoal, computeWeekProgress,
  GOAL_OPTIONS, type GoalOption, type WeekProgress,
} from '../services/elevationGoal';
import { type ConquestEntry } from '../services/conquests';
import { useLang } from '../contexts/LangContext';
import { t } from '../i18n/strings';

interface Props {
  conquests: ConquestEntry[];
}

function ProgressBar({ fraction }: { fraction: number }) {
  const pct = Math.min(100, Math.round(fraction * 100));
  const achieved = pct >= 100;
  return (
    <View style={styles.barTrack}>
      <View
        style={[
          styles.barFill,
          { width: `${pct}%` as any },
          achieved && styles.barFillDone,
        ]}
      />
    </View>
  );
}

function GoalPickerModal({
  visible,
  current,
  onSelect,
  onClose,
}: {
  visible: boolean;
  current: GoalOption;
  onSelect: (g: GoalOption) => void;
  onClose: () => void;
}) {
  const { lang } = useLang();
  const s = t(lang);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.picker} onPress={() => {}}>
          <Text style={styles.pickerTitle}>{s.weeklyGoalPickTitle}</Text>
          {GOAL_OPTIONS.map((g) => (
            <TouchableOpacity
              key={g}
              style={[styles.goalOption, g === current && styles.goalOptionActive]}
              onPress={() => { onSelect(g); onClose(); }}
              activeOpacity={0.75}
            >
              <Text style={[styles.goalOptionText, g === current && styles.goalOptionTextActive]}>
                {g.toLocaleString()} m
              </Text>
              {g === current && <Text style={styles.goalCheckmark}>✓</Text>}
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.75}>
            <Text style={styles.cancelText}>{lang === 'ko' ? '닫기' : lang === 'ja' ? '閉じる' : 'Close'}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function ElevationGoalCard({ conquests }: Props) {
  const { lang } = useLang();
  const s = t(lang);
  const [goal, setGoal] = useState<GoalOption>(1000);
  const [progress, setProgress] = useState<WeekProgress | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const refresh = useCallback(async () => {
    const g = await getElevationGoal();
    setGoal(g);
    setProgress(computeWeekProgress(conquests, g));
  }, [conquests]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleSelectGoal = async (g: GoalOption) => {
    await setElevationGoal(g);
    setGoal(g);
    setProgress(computeWeekProgress(conquests, g));
  };

  const achieved = progress ? progress.fraction >= 1 : false;
  const pct = progress ? Math.min(100, Math.round(progress.fraction * 100)) : 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{s.weeklyGoalTitle}</Text>
        <TouchableOpacity onPress={() => setShowPicker(true)} activeOpacity={0.75} style={styles.setBtn}>
          <Text style={styles.setBtnText}>{s.weeklyGoalSetBtn}</Text>
        </TouchableOpacity>
      </View>

      {/* Big progress display */}
      <View style={styles.progressSection}>
        <View style={styles.numberRow}>
          <Text style={[styles.currentM, achieved && styles.currentMDone]}>
            {(progress?.totalElevationM ?? 0).toLocaleString()}
            <Text style={styles.unit}>m</Text>
          </Text>
          <Text style={styles.separator}> / </Text>
          <Text style={styles.goalM}>
            {goal.toLocaleString()}
            <Text style={styles.unit}>m</Text>
          </Text>
          <View style={styles.pctBadge}>
            <Text style={[styles.pctText, achieved && styles.pctTextDone]}>{pct}%</Text>
          </View>
        </View>

        <ProgressBar fraction={progress?.fraction ?? 0} />

        {achieved && (
          <Text style={styles.achievedLabel}>{s.weeklyGoalAchieved}</Text>
        )}
        {!achieved && !progress?.totalElevationM && (
          <Text style={styles.emptyLabel}>{s.weeklyGoalEmpty}</Text>
        )}
      </View>

      {/* This week's summits */}
      {(progress?.summits?.length ?? 0) > 0 && (
        <View style={styles.summitSection}>
          <Text style={styles.summitHeader}>{s.weeklyGoalSummits}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.summitScroll}>
            {progress!.summits.map((sm: { name: string; elevationM: number; date: string }, i: number) => (
              <View key={i} style={styles.summitChip}>
                <Text style={styles.summitName} numberOfLines={1}>{sm.name}</Text>
                <Text style={styles.summitElev}>{sm.elevationM.toLocaleString()}m</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <GoalPickerModal
        visible={showPicker}
        current={goal}
        onSelect={handleSelectGoal}
        onClose={() => setShowPicker(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.zinc800 },
  setBtn: {
    backgroundColor: Colors.zinc100,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  setBtnText: { fontSize: 12, fontFamily: Fonts.semiBold, color: Colors.zinc800 },
  progressSection: { marginBottom: 4 },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  currentM: {
    fontSize: 28,
    fontFamily: Fonts.extraBold,
    color: Colors.green,
    lineHeight: 32,
  },
  currentMDone: { color: Colors.green },
  unit: { fontSize: 14, fontFamily: Fonts.semiBold },
  separator: { fontSize: 18, color: Colors.zinc500, fontFamily: Fonts.regular, marginHorizontal: 2 },
  goalM: { fontSize: 18, fontFamily: Fonts.semiBold, color: Colors.zinc500 },
  pctBadge: {
    marginLeft: 'auto',
    backgroundColor: Colors.zinc100,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pctText: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.zinc800 },
  pctTextDone: { color: Colors.green },
  barTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.zinc100,
    overflow: 'hidden',
  },
  barFill: {
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.orange,
  },
  barFillDone: { backgroundColor: Colors.green },
  achievedLabel: {
    marginTop: 8,
    fontSize: 13,
    fontFamily: Fonts.bold,
    color: Colors.green,
    textAlign: 'center',
  },
  emptyLabel: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.zinc500,
    textAlign: 'center',
  },
  summitSection: { marginTop: 12, borderTopWidth: 1, borderTopColor: Colors.zinc100, paddingTop: 10 },
  summitHeader: { fontSize: 12, fontFamily: Fonts.semiBold, color: Colors.zinc500, marginBottom: 6 },
  summitScroll: { flexDirection: 'row' },
  summitChip: {
    backgroundColor: Colors.zinc100,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    alignItems: 'center',
    maxWidth: 110,
  },
  summitName: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    color: Colors.zinc800,
  },
  summitElev: {
    fontSize: 10,
    fontFamily: Fonts.regular,
    color: Colors.zinc500,
    marginTop: 2,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  picker: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 20,
    width: 280,
  },
  pickerTitle: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: Colors.zinc800,
    textAlign: 'center',
    marginBottom: 16,
  },
  goalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: Colors.zinc100,
  },
  goalOptionActive: { backgroundColor: Colors.green },
  goalOptionText: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    color: Colors.zinc800,
    flex: 1,
  },
  goalOptionTextActive: { color: Colors.white },
  goalCheckmark: { fontSize: 16, color: Colors.white, fontFamily: Fonts.bold },
  cancelBtn: {
    marginTop: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: Colors.zinc500,
  },
});
