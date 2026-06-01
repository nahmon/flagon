import { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Modal, FlatList, TextInput, ScrollView, KeyboardAvoidingView, Platform, Share, Clipboard } from 'react-native';
import { Colors } from '../../src/constants';
import { supabase } from '../../src/services/supabase';
import { fetchUserProfile, fetchCrew, fetchCrews, joinCrew, joinCrewByCode, leaveCrew, createCrew, UserProfile } from '../../src/services/crews';
import { Crew } from '../../src/types';
import RecentHikesList from '../../src/components/RecentHikesList';
import AchievementGrid from '../../src/components/AchievementGrid';
import StatsCard from '../../src/components/StatsCard';
import StreakCard from '../../src/components/StreakCard';
import WishListModal from '../../src/components/WishListModal';
import MountainGroupProgress from '../../src/components/MountainGroupProgress';
import ConquestTimeline from '../../src/components/ConquestTimeline';
import CrewTerritoryModal from '../../src/components/CrewTerritoryModal';
import MyFlagsModal from '../../src/components/MyFlagsModal';
import RivalsModal from '../../src/components/RivalsModal';
import MountainGroupDetailModal from '../../src/components/MountainGroupDetailModal';
import LevelBadge from '../../src/components/LevelBadge';
import PersonalRecordsCard from '../../src/components/PersonalRecordsCard';
import WeeklyChallengeCard from '../../src/components/WeeklyChallengeCard';
import SummitBingoCard from '../../src/components/SummitBingoCard';
import ElevationMilestonesCard from '../../src/components/ElevationMilestonesCard';
import FollowingListModal from '../../src/components/FollowingListModal';
import PackChecklistModal from '../../src/components/PackChecklistModal';
import HikeAnalyticsCard from '../../src/components/HikeAnalyticsCard';
import YearReviewModal from '../../src/components/YearReviewModal';
import { fetchUserConquests, type ConquestEntry } from '../../src/services/conquests';
import { buildAnalytics, type AnalyticsSummary } from '../../src/services/analytics';
import { fetchStreak } from '../../src/services/streaks';
import { xpForFlag, xpProgress, type XpProgress } from '../../src/services/xp';
import { fetchFollowCounts, type FollowCounts } from '../../src/services/follows';
import { getPersonalFlags } from '../../src/services/personalFlags';
import { useLang } from '../../src/contexts/LangContext';
import { t } from '../../src/i18n/strings';

const CREW_COLORS = [
  { hex: '#4A7C59' }, { hex: '#C0704A' }, { hex: '#5B7FA6' },
  { hex: '#8B6BA8' }, { hex: '#C0A44A' },
];

function CrewPickerModal({ visible, onClose, onJoined }: {
  visible: boolean; onClose: () => void; onJoined: () => void;
}) {
  const { lang } = useLang();
  const s = t(lang);
  const [tab, setTab] = useState<'join' | 'create' | 'code'>('join');
  const [crews, setCrews] = useState<Crew[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newNameKo, setNewNameKo] = useState('');
  const [selectedColor, setSelectedColor] = useState(CREW_COLORS[0].hex);
  const [busy, setBusy] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [codeError, setCodeError] = useState('');

  useEffect(() => {
    if (visible) {
      setLoading(true);
      fetchCrews().then(setCrews).finally(() => setLoading(false));
    }
  }, [visible]);

  const handleJoin = async (crewId: string) => {
    setBusy(true);
    try { await joinCrew(crewId); onJoined(); onClose(); }
    catch (e: any) { Alert.alert(s.error, e.message ?? s.errorJoiningCrew); }
    finally { setBusy(false); }
  };

  const handleCreate = async () => {
    if (!newName.trim()) { Alert.alert(s.enterName); return; }
    setBusy(true);
    try { await createCrew(newName.trim(), newNameKo.trim() || newName.trim(), selectedColor, 'SA'); onJoined(); onClose(); }
    catch (e: any) { Alert.alert(s.error, e.message ?? s.errorCreatingCrew); }
    finally { setBusy(false); }
  };

  const handleJoinByCode = async () => {
    const code = inviteCode.trim();
    if (!code) { setCodeError(s.enterCrewCode); return; }
    setBusy(true);
    setCodeError('');
    try {
      await joinCrewByCode(code);
      onJoined();
      onClose();
    } catch (e: any) {
      setCodeError(e.message === 'invalid_code' ? s.invalidCode : (e.message ?? s.errorJoiningCrew));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={modal.container}>
        <View style={modal.handle} />
        <Text style={modal.title}>{s.crewSelect}</Text>
        <View style={modal.tabs}>
          {(['join', 'create', 'code'] as const).map((tabKey) => (
            <TouchableOpacity key={tabKey} style={[modal.tab, tab === tabKey && modal.tabActive]} onPress={() => setTab(tabKey)}>
              <Text style={[modal.tabText, tab === tabKey && modal.tabTextActive]}>
                {tabKey === 'join' ? s.crewFind : tabKey === 'create' ? s.createCrewTab : s.codeTab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'join' ? (
          loading ? <ActivityIndicator style={{ marginTop: 40 }} color={Colors.green} /> : (
            <FlatList
              data={crews}
              keyExtractor={(c: Crew) => c.id}
              renderItem={({ item }: { item: Crew }) => (
                <TouchableOpacity style={modal.crewRow} onPress={() => handleJoin(item.id)} disabled={busy}>
                  <View style={[modal.crewDot, { backgroundColor: item.color_hex }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={modal.crewName}>{item.name_ko ?? item.name}</Text>
                    <Text style={modal.crewSub}>{item.name ?? ''}</Text>
                  </View>
                  <Text style={modal.joinBtn}>{s.joinArrow}</Text>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: Colors.zinc100 }} />}
              ListEmptyComponent={<Text style={modal.empty}>{s.noCrews}</Text>}
            />
          )
        ) : tab === 'create' ? (
          <View style={modal.createForm}>
            <Text style={modal.label}>{s.crewNameKo}</Text>
            <TextInput style={modal.input} value={newNameKo} onChangeText={setNewNameKo} placeholder="예) 북한산 크루" placeholderTextColor={Colors.zinc500} />
            <Text style={modal.label}>{s.crewNameEn}</Text>
            <TextInput style={modal.input} value={newName} onChangeText={setNewName} placeholder="e.g. BukhanCrew" placeholderTextColor={Colors.zinc500} />
            <Text style={modal.label}>{s.crewColor}</Text>
            <View style={modal.colorRow}>
              {CREW_COLORS.map((c) => (
                <TouchableOpacity key={c.hex} style={[modal.colorDot, { backgroundColor: c.hex }, selectedColor === c.hex && modal.colorSelected]} onPress={() => setSelectedColor(c.hex)} />
              ))}
            </View>
            <TouchableOpacity style={[modal.createBtn, busy && { opacity: 0.6 }]} onPress={handleCreate} disabled={busy}>
              <Text style={modal.createBtnText}>{busy ? s.creating : s.createCrew}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={modal.createForm}>
            <Text style={modal.label}>{s.inviteCode}</Text>
            <TextInput
              style={modal.input}
              value={inviteCode}
              onChangeText={(v: string) => { setInviteCode(v); setCodeError(''); }}
              placeholder={s.enterInviteCode}
              placeholderTextColor={Colors.zinc500}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {codeError ? <Text style={modal.codeError}>{codeError}</Text> : null}
            <TouchableOpacity style={[modal.createBtn, busy && { opacity: 0.6 }]} onPress={handleJoinByCode} disabled={busy}>
              <Text style={modal.createBtnText}>{busy ? s.joining : s.joinByCode}</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={modal.closeBtn} onPress={onClose}>
          <Text style={modal.closeBtnText}>{s.close}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

export default function ProfileScreen() {
  const { lang } = useLang();
  const s = t(lang);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [crewInviteCode, setCrewInviteCode] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCrewPicker, setShowCrewPicker] = useState(false);
  const [showWishList, setShowWishList] = useState(false);
  const [showConquests, setShowConquests] = useState(false);
  const [showTerritory, setShowTerritory] = useState(false);
  const [showMyFlags, setShowMyFlags] = useState(false);
  const [showRivals, setShowRivals] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [showYearReview, setShowYearReview] = useState(false);
  const [followCounts, setFollowCounts] = useState<FollowCounts>({ followers: 0, following: 0 });
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [xpData, setXpData] = useState<XpProgress | null>(null);
  const [highestSummit, setHighestSummit] = useState<ConquestEntry | null>(null);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [personalFlagCount, setPersonalFlagCount] = useState(0);
  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummary | null>(null);

  const loadProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    try {
      const p = await fetchUserProfile(user.id);
      setProfile(p);
      setNameInput(p?.display_name ?? '');
      if (p?.crew_id) {
        const crew = await fetchCrew(p.crew_id);
        setCrewInviteCode(crew?.invite_code ?? null);
      } else {
        setCrewInviteCode(null);
      }
      const conquests: ConquestEntry[] = await fetchUserConquests(user.id);
      const totalXp = conquests.reduce((acc, c) => acc + xpForFlag(c.elevation_m), 0);
      setXpData(xpProgress(totalXp));
      const best = conquests.reduce<ConquestEntry | null>(
        (max, c) => (!max || c.elevation_m > max.elevation_m ? c : max), null,
      );
      setHighestSummit(best);
      setAnalyticsSummary(buildAnalytics(conquests, lang));
      const streakInfo = await fetchStreak(user.id);
      setCurrentStreak(streakInfo.current);
      const counts = await fetchFollowCounts(user.id);
      setFollowCounts(counts);
      const pf = await getPersonalFlags();
      setPersonalFlagCount(pf.length);
    } catch (e) {
      console.error('[profile]', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSaveName = async () => {
    if (!userId || !nameInput.trim()) return;
    setSavingName(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ display_name: nameInput.trim() })
        .eq('id', userId);
      if (error) throw error;
      setProfile((p: UserProfile | null) => p ? { ...p, display_name: nameInput.trim() } : p);
      setEditingName(false);
    } catch (e: any) {
      Alert.alert(s.saveFailed, e.message);
    } finally {
      setSavingName(false);
    }
  };

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handleInvite = async () => {
    if (!crewInviteCode) return;
    await Share.share({ message: s.inviteMessage(crewInviteCode) });
  };

  const handleCopyCode = () => {
    if (!crewInviteCode) return;
    Clipboard.setString(crewInviteCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleLeave = () => {
    if (!profile?.crew_id) return;
    Alert.alert(s.leaveCrew, s.leaveConfirm, [
      { text: s.cancel, style: 'cancel' },
      { text: s.leave, style: 'destructive', onPress: async () => { await leaveCrew(profile.crew_id!); loadProfile(); } },
    ]);
  };

  const handleShareProfile = async () => {
    if (!profile) return;
    const name = profile.display_name ?? 'User';
    const flags = profile.flag_count ?? 0;
    const crew = profile.crew_name ?? profile.crew_name_ko ?? null;
    const levelText = xpData
      ? `${xpData.current.icon} ${xpData.current.name[lang]} (Lv.${xpData.current.level})`
      : null;
    const peakName = highestSummit
      ? ((lang === 'en' ? highestSummit.summit_name_en : lang === 'ja' ? highestSummit.summit_name_ja : null) ?? highestSummit.summit_name_ko)
      : null;
    const elev = highestSummit?.elevation_m ?? null;

    const rows: string[] = [];
    if (lang === 'ko') {
      rows.push('🏔️ FlagOn 산악 기록');
      rows.push('─────────────────');
      rows.push(`산악인: ${name}`);
      if (levelText) rows.push(`레벨: ${levelText}`);
      rows.push(`깃발 수: 🚩 ${flags}개`);
      if (currentStreak > 0) rows.push(`연속: 🔥 ${currentStreak}주`);
      if (peakName && elev) rows.push(`최고봉: ${peakName} (${elev}m)`);
      if (crew) rows.push(`크루: ${crew}`);
      rows.push('─────────────────');
      rows.push('#FlagOn #등산 #정복');
    } else if (lang === 'ja') {
      rows.push('🏔️ FlagOn 登山記録');
      rows.push('─────────────────');
      rows.push(`登山家: ${name}`);
      if (levelText) rows.push(`レベル: ${levelText}`);
      rows.push(`旗の数: 🚩 ${flags}本`);
      if (currentStreak > 0) rows.push(`連続: 🔥 ${currentStreak}週間`);
      if (peakName && elev) rows.push(`最高峰: ${peakName} (${elev}m)`);
      if (crew) rows.push(`クルー: ${crew}`);
      rows.push('─────────────────');
      rows.push('#FlagOn #登山 #制覇');
    } else {
      rows.push('🏔️ My FlagOn Hiking Card');
      rows.push('─────────────────');
      rows.push(`Hiker: ${name}`);
      if (levelText) rows.push(`Level: ${levelText}`);
      rows.push(`Flags Planted: 🚩 ${flags}`);
      if (currentStreak > 0) rows.push(`Streak: 🔥 ${currentStreak} weeks`);
      if (peakName && elev) rows.push(`Highest Peak: ${peakName} (${elev}m)`);
      if (crew) rows.push(`Crew: ${crew}`);
      rows.push('─────────────────');
      rows.push('#FlagOn #Hiking #Summit');
    }
    await Share.share({ message: rows.join('\n'), title: '🏔️ FlagOn' });
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={Colors.green} /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: profile?.crew_color_hex ?? 'rgba(255,255,255,0.22)' }]}>
          <Text style={styles.avatarText}>{(profile?.display_name ?? 'U').charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.headerMeta}>
          {editingName ? (
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <View style={styles.nameEditRow}>
                <TextInput
                  style={styles.nameInput}
                  value={nameInput}
                  onChangeText={setNameInput}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleSaveName}
                  maxLength={30}
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  placeholder={s.nicknameInput}
                />
                <TouchableOpacity onPress={handleSaveName} disabled={savingName} style={styles.nameSaveBtn}>
                  <Text style={styles.nameSaveText}>{savingName ? s.saving : s.save}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setEditingName(false)} style={styles.nameCancelBtn}>
                  <Text style={styles.nameCancelText}>{s.cancel}</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          ) : (
            <TouchableOpacity onPress={() => { setNameInput(profile?.display_name ?? ''); setEditingName(true); }} activeOpacity={0.7}>
              <Text style={styles.displayName}>{profile?.display_name ?? 'User'} <Text style={styles.editHint}>✏</Text></Text>
            </TouchableOpacity>
          )}
          <View style={styles.headerStatsRow}>
            <View style={styles.statChip}>
              <Text style={styles.statChipText}>{s.flagCount(profile?.flag_count ?? 0)}</Text>
            </View>
            {personalFlagCount > 0 && (
              <View style={styles.statChip}>
                <Text style={styles.statChipText}>{s.personalFlagCount(personalFlagCount)}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.followChip} onPress={() => setShowFollowing(true)} activeOpacity={0.7}>
              <Text style={styles.followChipText}>{s.followingCount(followCounts.following)}</Text>
              <Text style={styles.followChipSep}>·</Text>
              <Text style={styles.followChipText}>{s.followersCount(followCounts.followers)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareChip} onPress={handleShareProfile} activeOpacity={0.7}>
              <Text style={styles.shareChipText}>↑ {s.shareProfileBtn}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{s.myCrew}</Text>
          {profile?.crew_id ? (
            <>
              <View style={styles.crewCard}>
                <View style={[styles.crewDot, { backgroundColor: profile.crew_color_hex ?? Colors.green }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.crewName}>{profile.crew_name ?? profile.crew_name_ko}</Text>
                  <Text style={styles.crewSub}>{profile.crew_name_ko ?? profile.crew_name}</Text>
                </View>
                <TouchableOpacity onPress={handleLeave}>
                  <Text style={styles.leaveText}>{s.leave}</Text>
                </TouchableOpacity>
              </View>
              {crewInviteCode ? (
                <View style={styles.inviteCard}>
                  <Text style={styles.inviteCardLabel}>{s.yourInviteCode}</Text>
                  <Text style={styles.inviteCodeText}>{crewInviteCode}</Text>
                  <View style={styles.inviteActions}>
                    <TouchableOpacity style={styles.inviteActionBtn} onPress={handleCopyCode}>
                      <Text style={styles.inviteActionText}>{codeCopied ? s.codeCopied : s.copyCode}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.inviteActionBtn, styles.inviteShareBtn]} onPress={handleInvite}>
                      <Text style={[styles.inviteActionText, { color: Colors.white }]}>{s.invite}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}
            </>
          ) : (
            <TouchableOpacity style={styles.joinBanner} onPress={() => setShowCrewPicker(true)}>
              <Text style={styles.joinBannerText}>{s.joinOrCreate}</Text>
              <Text style={styles.joinArrow}>→</Text>
            </TouchableOpacity>
          )}
        </View>

        {userId && <StatsCard userId={userId} />}
        {xpData && (
          <View style={styles.xpCard}>
            <Text style={styles.xpSectionTitle}>{s.xpSection}</Text>
            <View style={styles.xpRow}>
              <LevelBadge info={xpData.current} lang={lang} variant="full" size="md" />
              <Text style={styles.xpPoints}>{s.xpPoints(xpData.xp)}</Text>
            </View>
            <View style={styles.xpBarBg}>
              <View style={[styles.xpBarFill, { width: `${Math.round(xpData.fraction * 100)}%` as `${number}%`, backgroundColor: xpData.current.color }]} />
            </View>
            <Text style={styles.xpSub}>
              {xpData.next ? s.xpToNext(xpData.xpNeeded) : s.xpMaxLevel}
            </Text>
          </View>
        )}
        {userId && <StreakCard userId={userId} />}
        {userId && <WeeklyChallengeCard userId={userId} />}
        {userId && <SummitBingoCard userId={userId} />}
        {userId && <PersonalRecordsCard userId={userId} />}
        {userId && <ElevationMilestonesCard userId={userId} />}
        {analyticsSummary && analyticsSummary.totalFlags > 0 && (
          <HikeAnalyticsCard summary={analyticsSummary} />
        )}
        {userId && <MountainGroupProgress userId={userId} onGroupPress={setSelectedGroup} />}
        {userId && <AchievementGrid userId={userId} />}
        {userId && <RecentHikesList userId={userId} />}

        <TouchableOpacity style={styles.wishListBtn} onPress={() => setShowMyFlags(true)} activeOpacity={0.8}>
          <Text style={styles.wishListIcon}>🚩</Text>
          <Text style={styles.wishListLabel}>{s.myFlags}</Text>
          <Text style={styles.wishListArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.wishListBtn} onPress={() => setShowRivals(true)} activeOpacity={0.8}>
          <Text style={styles.wishListIcon}>⚔️</Text>
          <Text style={styles.wishListLabel}>{s.rivals}</Text>
          <Text style={styles.wishListArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.wishListBtn} onPress={() => setShowFollowing(true)} activeOpacity={0.8}>
          <Text style={styles.wishListIcon}>👥</Text>
          <Text style={styles.wishListLabel}>{s.followSection}</Text>
          <Text style={styles.wishListArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.wishListBtn} onPress={() => setShowConquests(true)} activeOpacity={0.8}>
          <Text style={styles.wishListIcon}>🏆</Text>
          <Text style={styles.wishListLabel}>{s.conquestTimelineBtn}</Text>
          <Text style={styles.wishListArrow}>→</Text>
        </TouchableOpacity>

        {profile?.crew_id && (
          <TouchableOpacity style={styles.wishListBtn} onPress={() => setShowTerritory(true)} activeOpacity={0.8}>
            <Text style={styles.wishListIcon}>🗺</Text>
            <Text style={styles.wishListLabel}>{s.territory}</Text>
            <Text style={styles.wishListArrow}>→</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.wishListBtn} onPress={() => setShowWishList(true)} activeOpacity={0.8}>
          <Text style={styles.wishListIcon}>★</Text>
          <Text style={styles.wishListLabel}>{s.bucketList}</Text>
          <Text style={styles.wishListArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.wishListBtn} onPress={() => setShowChecklist(true)} activeOpacity={0.8}>
          <Text style={styles.wishListIcon}>🎒</Text>
          <Text style={styles.wishListLabel}>{s.checklistBtn}</Text>
          <Text style={styles.wishListArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.wishListBtn} onPress={() => setShowYearReview(true)} activeOpacity={0.8}>
          <Text style={styles.wishListIcon}>🎊</Text>
          <Text style={styles.wishListLabel}>{s.yearReviewBtn}</Text>
          <Text style={styles.wishListArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.signOutBtn} onPress={() => supabase.auth.signOut()}>
          <Text style={styles.signOutText}>{s.logout}</Text>
        </TouchableOpacity>
      </ScrollView>

      <CrewPickerModal visible={showCrewPicker} onClose={() => setShowCrewPicker(false)} onJoined={loadProfile} />
      <WishListModal visible={showWishList} onClose={() => setShowWishList(false)} />
      {userId && (
        <MountainGroupDetailModal
          group={selectedGroup}
          userId={userId}
          onClose={() => setSelectedGroup(null)}
        />
      )}
      <MyFlagsModal visible={showMyFlags} onClose={() => setShowMyFlags(false)} />
      <RivalsModal visible={showRivals} onClose={() => setShowRivals(false)} />
      {userId && (
        <ConquestTimeline visible={showConquests} userId={userId} onClose={() => setShowConquests(false)} />
      )}
      {profile?.crew_id && (
        <CrewTerritoryModal
          visible={showTerritory}
          crewId={profile.crew_id}
          crewName={profile.crew_name_ko ?? profile.crew_name ?? ''}
          onClose={() => setShowTerritory(false)}
        />
      )}
      {userId && (
        <FollowingListModal
          visible={showFollowing}
          userId={userId}
          onClose={() => setShowFollowing(false)}
        />
      )}
      <PackChecklistModal visible={showChecklist} onClose={() => setShowChecklist(false)} />
      {userId && (
        <YearReviewModal
          visible={showYearReview}
          userId={userId}
          onClose={() => setShowYearReview(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingBottom: 32 },
  header: {
    backgroundColor: Colors.green,
    paddingTop: 64,
    paddingBottom: 24,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 24, fontWeight: '800', color: Colors.white },
  headerMeta: { flex: 1 },
  displayName: { fontSize: 22, fontWeight: '800', color: Colors.white, letterSpacing: -0.5 },
  editHint: { fontSize: 14, opacity: 0.6 },
  nameEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nameInput: { flex: 1, fontSize: 18, fontWeight: '700', color: Colors.white, borderBottomWidth: 1.5, borderBottomColor: 'rgba(255,255,255,0.6)', paddingVertical: 2, minWidth: 120 },
  nameSaveBtn: { backgroundColor: Colors.white, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  nameSaveText: { fontSize: 13, fontWeight: '700', color: Colors.green },
  nameCancelBtn: { paddingHorizontal: 4, paddingVertical: 5 },
  nameCancelText: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  headerStatsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  statChip: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statChipText: { fontSize: 13, color: Colors.white, fontWeight: '600' },
  followChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  followChipText: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  followChipSep: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  shareChip: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.30)',
  },
  shareChipText: { fontSize: 12, color: Colors.white, fontWeight: '700' },
  section: { backgroundColor: Colors.white, marginTop: 16, paddingHorizontal: 20, paddingVertical: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: Colors.zinc500, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  crewCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  crewDot: { width: 14, height: 14, borderRadius: 7 },
  crewName: { fontSize: 16, fontWeight: '600', color: Colors.zinc950 },
  crewSub: { fontSize: 12, color: Colors.zinc500, marginTop: 1 },
  leaveText: { fontSize: 14, color: Colors.orange },
  inviteCard: { backgroundColor: Colors.white, borderRadius: 14, padding: 16, marginTop: 10, borderWidth: 1, borderColor: Colors.zinc100 },
  inviteCardLabel: { fontSize: 11, fontWeight: '700', color: Colors.zinc500, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
  inviteCodeText: { fontSize: 32, fontWeight: '900', color: Colors.green, letterSpacing: 4, marginBottom: 14 },
  inviteActions: { flexDirection: 'row', gap: 8 },
  inviteActionBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.zinc100, alignItems: 'center' },
  inviteShareBtn: { backgroundColor: Colors.green },
  inviteActionText: { fontSize: 14, fontWeight: '700', color: Colors.zinc800 },
  joinBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.zinc100, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14 },
  joinBannerText: { flex: 1, fontSize: 15, color: Colors.zinc800, fontWeight: '500' },
  joinArrow: { fontSize: 18, color: Colors.zinc500 },
  wishListBtn: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 20, marginTop: 16,
    backgroundColor: Colors.white, borderRadius: 14,
    paddingHorizontal: 18, paddingVertical: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    gap: 12,
  },
  wishListIcon: { fontSize: 20, color: Colors.orange },
  wishListLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.zinc950 },
  wishListArrow: { fontSize: 16, color: Colors.zinc500 },
  signOutBtn: { marginHorizontal: 20, marginTop: 24, paddingVertical: 14, backgroundColor: Colors.zinc100, borderRadius: 12, alignItems: 'center' },
  signOutText: { fontSize: 15, color: Colors.zinc800, fontWeight: '600' },

  // XP / Level card
  xpCard: { backgroundColor: Colors.white, marginTop: 16, paddingHorizontal: 20, paddingVertical: 16 },
  xpSectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.zinc500, marginBottom: 12, letterSpacing: 0.3 },
  xpRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  xpPoints: { fontSize: 18, fontWeight: '800', color: Colors.zinc950 },
  xpBarBg: { height: 8, backgroundColor: Colors.zinc100, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  xpBarFill: { height: 8, borderRadius: 4 },
  xpSub: { fontSize: 12, color: Colors.zinc500, fontWeight: '500' },
});

const modal = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream, paddingTop: 12 },
  handle: { width: 36, height: 4, backgroundColor: Colors.zinc200, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: '700', color: Colors.zinc950, paddingHorizontal: 20, marginBottom: 16 },
  tabs: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 16, backgroundColor: Colors.zinc100, borderRadius: 10, padding: 3 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: Colors.white },
  tabText: { fontSize: 14, color: Colors.zinc500, fontWeight: '500' },
  tabTextActive: { color: Colors.zinc950, fontWeight: '600' },
  crewRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: Colors.white, gap: 12 },
  crewDot: { width: 12, height: 12, borderRadius: 6 },
  crewName: { fontSize: 15, fontWeight: '600', color: Colors.zinc950 },
  crewSub: { fontSize: 12, color: Colors.zinc500 },
  joinBtn: { fontSize: 14, fontWeight: '600', color: Colors.green },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 15, color: Colors.zinc500 },
  createForm: { paddingHorizontal: 20 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.zinc500, marginBottom: 6, marginTop: 16 },
  input: { backgroundColor: Colors.white, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.zinc950, borderWidth: 1, borderColor: Colors.zinc200 },
  colorRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorSelected: { borderWidth: 3, borderColor: Colors.zinc950 },
  createBtn: { marginTop: 24, backgroundColor: Colors.green, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  createBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },
  closeBtn: { marginHorizontal: 20, marginTop: 12, marginBottom: 40, paddingVertical: 14, backgroundColor: Colors.zinc100, borderRadius: 12, alignItems: 'center' },
  closeBtnText: { fontSize: 15, color: Colors.zinc500 },
  codeError: { fontSize: 13, color: Colors.orange, marginTop: 6 },
});
