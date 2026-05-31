import { useEffect, useState, useCallback } from 'react';
import {
  Modal, View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, ToastAndroid, Platform, Alert, Share,
} from 'react-native';
import { Colors } from '../constants';
import { SummitWithFlag, SummitRating, SummitRatingAggregate } from '../types';
import { fetchSummitFlagHistory, FlagHistoryEntry } from '../services/flags';
import WeatherCard from './WeatherCard';
import { isWishlisted, addToWishList, removeFromWishList } from '../services/wishlist';
import { isPersonallyFlagged, addPersonalFlag, removePersonalFlag } from '../services/personalFlags';
import { loadNote, SummitNote } from '../services/summitNotes';
import SummitNoteModal from './SummitNoteModal';
import SummitRatingModal from './SummitRatingModal';
import SummitTipsModal from './SummitTipsModal';
import SummitConditionsModal from './SummitConditionsModal';
import SummitPhotoGallery from './SummitPhotoGallery';
import { fetchSummitRatingAggregate, getUserRatingForSummit } from '../services/ratings';
import { loadTips } from '../services/summitTips';
import { loadConditions, dominantCondition, CONDITION_META } from '../services/conditions';
import { fetchSummitPhotos } from '../services/summitPhotos';
import { useLang } from '../contexts/LangContext';
import { t, summitName } from '../i18n/strings';

function relativeTime(dateStr: string): string {
  const diffH = Math.floor((Date.now() - new Date(dateStr).getTime()) / 3_600_000);
  if (diffH < 1) return '방금 전';
  if (diffH < 24) return `${diffH}시간 전`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `${diffD}일 전`;
  return `${Math.floor(diffD / 30)}개월 전`;
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

interface Props {
  summit: SummitWithFlag | null;
  onClose: () => void;
}

export default function SummitDetailSheet({ summit, onClose }: Props) {
  const { lang } = useLang();
  const s = t(lang);
  const [history, setHistory] = useState<FlagHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [personallyFlagged, setPersonallyFlagged] = useState(false);
  const [note, setNote] = useState<SummitNote | null>(null);
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [ratingAggregate, setRatingAggregate] = useState<SummitRatingAggregate | null>(null);
  const [myRating, setMyRating] = useState<SummitRating | null>(null);
  const [tipsModalVisible, setTipsModalVisible] = useState(false);
  const [tipCount, setTipCount] = useState(0);
  const [conditionsModalVisible, setConditionsModalVisible] = useState(false);
  const [conditionCount, setConditionCount] = useState(0);
  const [conditionIcon, setConditionIcon] = useState<string | null>(null);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [photoCount, setPhotoCount] = useState(0);

  const loadRatings = useCallback((id: string) => {
    fetchSummitRatingAggregate(id).then(setRatingAggregate).catch(() => {});
    getUserRatingForSummit(id).then(setMyRating).catch(() => {});
  }, []);

  const loadConditionSummary = useCallback((id: string) => {
    loadConditions(id).then(reports => {
      setConditionCount(reports.length);
      const dom = dominantCondition(reports);
      setConditionIcon(dom ? CONDITION_META[dom].icon : null);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!summit) {
      setHistory([]); setBookmarked(false); setPersonallyFlagged(false); setNote(null);
      setRatingAggregate(null); setMyRating(null); setTipCount(0);
      setConditionCount(0); setConditionIcon(null);
      setPhotoCount(0); setPhotoModalVisible(false);
      return;
    }
    setLoading(true);
    fetchSummitFlagHistory(summit.id)
      .then(setHistory)
      .catch(console.error)
      .finally(() => setLoading(false));
    isWishlisted(summit.id).then(setBookmarked).catch(() => {});
    isPersonallyFlagged(summit.id).then(setPersonallyFlagged).catch(() => {});
    loadNote(summit.id).then(setNote).catch(() => {});
    loadRatings(summit.id);
    loadTips(summit.id).then(tips => setTipCount(tips.length)).catch(() => {});
    loadConditionSummary(summit.id);
    fetchSummitPhotos(summit.id).then(p => setPhotoCount(p.length)).catch(() => {});
  }, [summit?.id, loadRatings, loadConditionSummary]);

  const handleBookmark = useCallback(async () => {
    if (!summit) return;
    const next = !bookmarked;
    setBookmarked(next);
    if (next) {
      await addToWishList({
        id: summit.id,
        name_ko: summit.name_ko,
        name_en: summit.name_en ?? null,
        name_ja: summit.name_ja ?? null,
        elevation_m: summit.elevation_m,
        mountain_group: summit.mountain_group ?? null,
      });
      if (Platform.OS === 'android') {
        ToastAndroid.show(s.bookmarkAdded, ToastAndroid.SHORT);
      } else {
        Alert.alert('', s.bookmarkAdded);
      }
    } else {
      await removeFromWishList(summit.id);
      if (Platform.OS === 'android') {
        ToastAndroid.show(s.bookmarkRemoved, ToastAndroid.SHORT);
      }
    }
  }, [summit, bookmarked, s]);

  const handleShare = useCallback(async () => {
    if (!summit) return;
    const name = summitName(summit, lang);
    const crew = summit.active_flag?.crew?.name_ko ?? null;
    const message = crew
      ? `${s.shareFlagPlanted(name)}${crew}`
      : `🏔 ${name} (${summit.elevation_m}m) — FlagOn`;
    await Share.share({ message });
  }, [summit, lang, s]);

  const handlePersonalFlag = useCallback(async () => {
    if (!summit) return;
    const next = !personallyFlagged;
    setPersonallyFlagged(next);
    if (next) {
      await addPersonalFlag({
        id: summit.id,
        name_ko: summit.name_ko,
        name_en: summit.name_en ?? null,
        name_ja: summit.name_ja ?? null,
        elevation_m: summit.elevation_m,
      });
      if (Platform.OS === 'android') {
        ToastAndroid.show(s.personalFlagPlanted, ToastAndroid.SHORT);
      } else {
        Alert.alert('', s.personalFlagPlanted);
      }
    } else {
      await removePersonalFlag(summit.id);
    }
  }, [summit, personallyFlagged, s]);

  const flag = summit?.active_flag;
  const expiryDays = flag?.expires_at ? daysUntil(flag.expires_at) : null;

  return (
    <Modal
      visible={!!summit}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <Text style={styles.summitName}>{summit?.name_ko ?? ''}</Text>
            {summit?.name_en ? <Text style={styles.summitNameEn}>{summit.name_en}</Text> : null}
            <View style={styles.metaRow}>
              <View style={styles.elevBadge}>
                <Text style={styles.elevText}>{summit?.elevation_m}m</Text>
              </View>
              {summit?.mountain_group ? (
                <Text style={styles.mountainGroup}>{summit.mountain_group}</Text>
              ) : null}
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.bookmarkBtn, tipsModalVisible && styles.noteActive]}
              onPress={() => setTipsModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.noteIcon}>💬</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bookmarkBtn, !!note && styles.noteActive]}
              onPress={() => setNoteModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.noteIcon}>{note ? '📝' : '✏️'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.bookmarkBtn}
              onPress={handleShare}
              activeOpacity={0.7}
            >
              <Text style={styles.shareIcon}>↑</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bookmarkBtn, personallyFlagged && styles.personalFlagBtnActive]}
              onPress={handlePersonalFlag}
              activeOpacity={0.7}
            >
              <Text style={styles.noteIcon}>{personallyFlagged ? '🚩' : '🏳️'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bookmarkBtn, bookmarked && styles.bookmarkBtnActive]}
              onPress={handleBookmark}
              activeOpacity={0.7}
            >
              <Text style={[styles.bookmarkIcon, bookmarked && styles.bookmarkIconActive]}>★</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        {note && (
          <TouchableOpacity style={styles.notePreview} onPress={() => setNoteModalVisible(true)} activeOpacity={0.8}>
            <Text style={styles.notePreviewLabel}>{s.myNote}</Text>
            <Text style={styles.notePreviewText} numberOfLines={2}>{note.text}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.ratingBar}>
          {ratingAggregate ? (
            <View style={styles.ratingInfo}>
              <Text style={styles.ratingText}>
                {'⭐'} {s.difficulty} {ratingAggregate.avg_difficulty.toFixed(1)}
                {'  '}
                {'🏔'} {s.views} {ratingAggregate.avg_views.toFixed(1)}
                {'  '}
                <Text style={styles.ratingCount}>{s.ratingsCount(ratingAggregate.count)}</Text>
              </Text>
            </View>
          ) : (
            <Text style={styles.noRating}>{s.noRatings}</Text>
          )}
          <TouchableOpacity
            style={[styles.rateBtn, !!myRating && styles.rateBtnDone]}
            onPress={() => setRatingModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.rateBtnTxt, !!myRating && styles.rateBtnTxtDone]}>
              {myRating ? s.editRating : s.rateBtn}
            </Text>
          </TouchableOpacity>
        </View>

        {summit ? <WeatherCard summit={summit} /> : null}

        <TouchableOpacity style={styles.tipsBar} onPress={() => setTipsModalVisible(true)} activeOpacity={0.7}>
          <Text style={styles.tipsBtnTxt}>{s.tipsBtn(tipCount)}</Text>
          <Text style={styles.tipsArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tipsBar} onPress={() => setConditionsModalVisible(true)} activeOpacity={0.7}>
          <Text style={styles.tipsBtnTxt}>
            {conditionIcon ? `${conditionIcon} ` : ''}{s.condBtn(conditionCount)}
          </Text>
          <Text style={styles.tipsArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tipsBar} onPress={() => setPhotoModalVisible(true)} activeOpacity={0.7}>
          <Text style={styles.tipsBtnTxt}>{s.photosBtn(photoCount)}</Text>
          <Text style={styles.tipsArrow}>›</Text>
        </TouchableOpacity>

        {summit && (
          <SummitPhotoGallery
            visible={photoModalVisible}
            summitId={summit.id}
            summitName={summitName(summit, lang)}
            onClose={() => setPhotoModalVisible(false)}
            onCountChange={setPhotoCount}
          />
        )}

        {summit && (
          <SummitConditionsModal
            visible={conditionsModalVisible}
            summitId={summit.id}
            summitName={summitName(summit, lang)}
            onClose={() => setConditionsModalVisible(false)}
            onCountChange={(n) => {
              setConditionCount(n);
              loadConditionSummary(summit.id);
            }}
          />
        )}

        {summit && (
          <SummitTipsModal
            visible={tipsModalVisible}
            summitId={summit.id}
            summitName={summitName(summit, lang)}
            onClose={() => setTipsModalVisible(false)}
            onCountChange={setTipCount}
          />
        )}

        {summit && (
          <SummitRatingModal
            visible={ratingModalVisible}
            summitId={summit.id}
            summitName={summitName(summit, lang)}
            existing={myRating}
            onClose={() => setRatingModalVisible(false)}
            onSaved={() => loadRatings(summit.id)}
          />
        )}

        {summit && (
          <SummitNoteModal
            visible={noteModalVisible}
            summitId={summit.id}
            summitName={summitName(summit, lang)}
            onClose={() => setNoteModalVisible(false)}
            onSaved={setNote}
          />
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>현재 깃발</Text>
          {flag?.crew ? (
            <View style={styles.flagCard}>
              <View style={[styles.crewDot, { backgroundColor: flag.crew.color_hex }]} />
              <View style={styles.flagInfo}>
                <Text style={styles.crewName}>{flag.crew.name_ko ?? flag.crew.name}</Text>
                <Text style={styles.flagMeta}>
                  {relativeTime(flag.planted_at)}
                  {expiryDays !== null ? ` · ${expiryDays}일 후 만료` : ''}
                </Text>
              </View>
              <Text style={styles.flagIcon}>🚩</Text>
            </View>
          ) : (
            <View style={styles.noFlagCard}>
              <Text style={styles.noFlagText}>무주공산 — 아직 깃발이 없습니다</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>깃발 기록</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.green} style={styles.loader} />
        ) : (
          <FlatList
            data={history}
            keyExtractor={(item: FlagHistoryEntry) => item.id}
            contentContainerStyle={styles.historyList}
            renderItem={({ item }: { item: FlagHistoryEntry }) => (
              <View style={styles.historyRow}>
                <View style={[styles.historyDot, { backgroundColor: item.crew_color_hex ?? Colors.zinc200 }]} />
                <View style={styles.historyBody}>
                  <Text style={styles.historyUser}>{item.user_display_name}</Text>
                  <Text style={styles.historyCrew}>{item.crew_name_ko ?? item.crew_name ?? '크루 없음'}</Text>
                </View>
                <View style={styles.historyRight}>
                  <Text style={styles.historyTime}>{relativeTime(item.planted_at)}</Text>
                  {item.is_active && (
                    <View style={styles.activePill}>
                      <Text style={styles.activePillText}>현재</Text>
                    </View>
                  )}
                </View>
              </View>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={<Text style={styles.emptyText}>깃발 기록이 없습니다</Text>}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  handle: { width: 36, height: 4, backgroundColor: Colors.zinc200, borderRadius: 2, alignSelf: 'center', marginVertical: 12 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16 },
  headerInfo: { flex: 1, marginRight: 12 },
  summitName: { fontSize: 24, fontWeight: '800', color: Colors.zinc950, letterSpacing: -0.5 },
  summitNameEn: { fontSize: 14, color: Colors.zinc500, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  elevBadge: { backgroundColor: Colors.green, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  elevText: { fontSize: 13, fontWeight: '700', color: Colors.white },
  mountainGroup: { fontSize: 13, color: Colors.zinc500 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bookmarkBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.zinc100, alignItems: 'center', justifyContent: 'center',
  },
  bookmarkBtnActive: { backgroundColor: Colors.orange },
  personalFlagBtnActive: { backgroundColor: Colors.green },
  bookmarkIcon: { fontSize: 18, color: Colors.zinc500 },
  shareIcon: { fontSize: 18, fontWeight: '700', color: Colors.zinc500 },
  bookmarkIconActive: { color: Colors.white },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.zinc100, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 12, color: Colors.zinc800, fontWeight: '700' },
  section: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: Colors.zinc500, letterSpacing: 0.9, textTransform: 'uppercase' },
  flagCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 14, padding: 14, marginTop: 10, gap: 12 },
  crewDot: { width: 16, height: 16, borderRadius: 8 },
  flagInfo: { flex: 1 },
  crewName: { fontSize: 15, fontWeight: '600', color: Colors.zinc950 },
  flagMeta: { fontSize: 12, color: Colors.zinc500, marginTop: 2 },
  flagIcon: { fontSize: 20 },
  noFlagCard: { backgroundColor: Colors.zinc100, borderRadius: 14, padding: 14, marginTop: 10 },
  noFlagText: { fontSize: 14, color: Colors.zinc500 },
  loader: { marginTop: 24 },
  historyList: { paddingHorizontal: 20, paddingBottom: 48 },
  historyRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
  historyDot: { width: 12, height: 12, borderRadius: 6 },
  historyBody: { flex: 1 },
  historyUser: { fontSize: 14, fontWeight: '600', color: Colors.zinc950 },
  historyCrew: { fontSize: 12, color: Colors.zinc500, marginTop: 1 },
  historyRight: { alignItems: 'flex-end', gap: 4 },
  historyTime: { fontSize: 12, color: Colors.zinc500 },
  activePill: { backgroundColor: Colors.green, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  activePillText: { fontSize: 10, fontWeight: '700', color: Colors.white },
  separator: { height: 6 },
  emptyText: { textAlign: 'center', color: Colors.zinc500, fontSize: 14, marginTop: 24 },
  ratingBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: Colors.white, marginHorizontal: 20, borderRadius: 12,
    marginBottom: 8,
  },
  ratingInfo: { flex: 1, marginRight: 12 },
  ratingText: { fontSize: 13, color: Colors.zinc800, fontWeight: '500' },
  ratingCount: { fontSize: 12, color: Colors.zinc500, fontWeight: '400' },
  noRating: { fontSize: 13, color: Colors.zinc500, flex: 1 },
  rateBtn: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: Colors.zinc100,
  },
  rateBtnDone: { backgroundColor: Colors.greenLight },
  rateBtnTxt: { fontSize: 13, fontWeight: '600', color: Colors.zinc800 },
  rateBtnTxtDone: { color: Colors.white },
  noteActive: { backgroundColor: Colors.greenLight },
  noteIcon: { fontSize: 16 },
  notePreview: {
    marginHorizontal: 20, marginTop: 4, marginBottom: 4,
    backgroundColor: '#FFFBEB', borderRadius: 12, padding: 12,
    borderLeftWidth: 3, borderLeftColor: Colors.orange,
  },
  notePreviewLabel: { fontSize: 10, fontWeight: '700', color: Colors.orange, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 4 },
  notePreviewText: { fontSize: 13, color: Colors.zinc800, lineHeight: 18 },
  tipsBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 20, marginBottom: 8, paddingHorizontal: 16, paddingVertical: 11,
    backgroundColor: Colors.white, borderRadius: 12,
  },
  tipsBtnTxt: { fontSize: 14, fontWeight: '600', color: Colors.zinc800 },
  tipsArrow: { fontSize: 18, color: Colors.zinc500, fontWeight: '300' },
});
