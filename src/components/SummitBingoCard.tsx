import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Colors } from '../constants';
import { fetchSummitBingo, detectCompletedLines, type SummitBingo, type BingoCell } from '../services/summitBingo';
import { useLang } from '../contexts/LangContext';
import { t, summitName } from '../i18n/strings';

const BINGO_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function isCellInAnyCompletedLine(pos: number, done: boolean[]): boolean {
  return BINGO_LINES.some((line) => line.includes(pos) && line.every((p) => done[p]));
}

function BingoGrid({ cells, allDone }: { cells: BingoCell[]; allDone: boolean }) {
  const { lang } = useLang();
  const done = cells.map((c) => c.completed);

  return (
    <View style={grid.container}>
      {[0, 1, 2].map((row) => (
        <View key={row} style={grid.row}>
          {[0, 1, 2].map((col) => {
            const idx = row * 3 + col;
            const cell = cells[idx];
            if (!cell) return <View key={col} style={grid.cell} />;
            const completed = cell.completed;
            const highlighted = isCellInAnyCompletedLine(idx, done);
            return (
              <View
                key={col}
                style={[
                  grid.cell,
                  highlighted && grid.cellHighlighted,
                  allDone && grid.cellAllDone,
                ]}
              >
                <Text style={[grid.cellCheck, !completed && grid.cellCheckEmpty]}>
                  {completed ? '✅' : '⬜'}
                </Text>
                <Text style={[grid.cellName, completed && grid.cellNameDone]} numberOfLines={2}>
                  {summitName(cell.summit, lang)}
                </Text>
                <Text style={grid.cellElev}>{cell.summit.elevation_m}m</Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

export default function SummitBingoCard({ userId }: { userId: string }) {
  const { lang } = useLang();
  const s = t(lang);
  const [bingo, setBingo] = useState<SummitBingo | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetchSummitBingo(userId)
      .then(setBingo)
      .catch(() => setBingo(null))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const collapseLabel = bingo
    ? bingo.allDone ? s.bingoAllDone : s.bingoLines(bingo.completedLines)
    : s.bingo;

  if (!expanded) {
    return (
      <TouchableOpacity style={styles.collapsed} onPress={() => setExpanded(true)} activeOpacity={0.8}>
        <Text style={styles.collapsedEmoji}>🎯</Text>
        <Text style={styles.collapsedTitle}>{s.bingo}</Text>
        <Text style={styles.collapsedStatus}>{collapseLabel}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.card, bingo?.allDone && styles.cardDone]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.emoji}>🎯</Text>
          <Text style={styles.title}>{s.bingo}</Text>
        </View>
        <View style={styles.headerRight}>
          {bingo && (
            <View style={styles.daysBadge}>
              <Text style={styles.daysText}>{s.bingoDaysLeft(bingo.daysLeft)}</Text>
            </View>
          )}
          <TouchableOpacity onPress={() => setExpanded(false)} hitSlop={8} style={styles.collapseBtn}>
            <Text style={styles.collapseIcon}>▴</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={Colors.white} size="small" />
        </View>
      ) : bingo ? (
        <>
          <BingoGrid cells={bingo.cells} allDone={bingo.allDone} />
          <View style={styles.footer}>
            <View style={styles.footerLeft}>
              {bingo.allDone ? (
                <Text style={styles.allDoneText}>{s.bingoAllDone}</Text>
              ) : (
                <>
                  <Text style={styles.linesText}>{s.bingoLines(bingo.completedLines)}</Text>
                  <Text style={styles.bonusText}>{s.bingoLineBonus(bingo.lineBonus)}</Text>
                </>
              )}
            </View>
            {bingo.totalXp > 0 && (
              <View style={styles.xpBadge}>
                <Text style={styles.xpText}>{s.bingoTotalXp(bingo.totalXp)}</Text>
              </View>
            )}
          </View>
          <Text style={styles.hint}>{s.bingoHint}</Text>
        </>
      ) : (
        <Text style={styles.unavailable}>{s.bingoUnavailable}</Text>
      )}
    </View>
  );
}

const CARD_BG = '#1B2F4A';
const HIGHLIGHT_BG = 'rgba(74,222,128,0.18)';
const ALL_DONE_BG = '#14532D';

const grid = StyleSheet.create({
  container: { gap: 4, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 4 },
  cell: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 6,
    alignItems: 'center',
    minHeight: 76,
    justifyContent: 'center',
    gap: 2,
  },
  cellHighlighted: { backgroundColor: HIGHLIGHT_BG, borderWidth: 1, borderColor: '#4ADE80' },
  cellAllDone: { backgroundColor: 'rgba(74,222,128,0.25)', borderWidth: 1, borderColor: '#4ADE80' },
  cellCheck: { fontSize: 16 },
  cellCheckEmpty: { opacity: 0.4 },
  cellName: { fontSize: 11, fontWeight: '700', color: Colors.white, textAlign: 'center', lineHeight: 14 },
  cellNameDone: { color: 'rgba(255,255,255,0.5)', textDecorationLine: 'line-through' },
  cellElev: { fontSize: 10, color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
});

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: CARD_BG,
    borderRadius: 18,
    padding: 16,
    shadowColor: Colors.zinc950,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  cardDone: { backgroundColor: ALL_DONE_BG },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  emoji: { fontSize: 20 },
  title: { fontSize: 13, fontWeight: '700', color: Colors.white, letterSpacing: 0.8, textTransform: 'uppercase' },
  daysBadge: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  daysText: { fontSize: 12, fontWeight: '700', color: Colors.white },
  collapseBtn: { padding: 4 },
  collapseIcon: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  footerLeft: { gap: 2 },
  linesText: { fontSize: 14, fontWeight: '700', color: Colors.white },
  bonusText: { fontSize: 12, fontWeight: '600', color: Colors.orange },
  allDoneText: { fontSize: 14, fontWeight: '700', color: '#4ADE80' },
  xpBadge: { backgroundColor: Colors.orange, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  xpText: { fontSize: 12, fontWeight: '700', color: Colors.white },
  hint: { fontSize: 11, color: 'rgba(255,255,255,0.45)', textAlign: 'center', letterSpacing: 0.3 },
  loader: { paddingVertical: 20, alignItems: 'center' },
  unavailable: { fontSize: 13, color: 'rgba(255,255,255,0.6)', paddingVertical: 8 },
  collapsed: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: CARD_BG,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  collapsedEmoji: { fontSize: 16 },
  collapsedTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: Colors.white },
  collapsedStatus: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },
});
