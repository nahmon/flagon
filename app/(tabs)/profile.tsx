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
              keyExtractor={(c) => c.id}
              renderItem={({ item }) => (
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
              onChangeText={(v) => { setInviteCode(v); setCodeError(''); }}
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
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);

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
      setProfile((p) => p ? { ...p, display_name: nameInput.trim() } : p);
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
          <View style={styles.statChip}>
            <Text style={styles.statChipText}>{s.flagCount(profile?.flag_count ?? 0)}</Text>
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
        {userId && <StreakCard userId={userId} />}
        {userId && <MountainGroupProgress userId={userId} />}
        {userId && <AchievementGrid userId={userId} />}
        {userId && <RecentHikesList userId={userId} />}

        <TouchableOpacity style={styles.wishListBtn} onPress={() => setShowConquests(true)} activeOpacity={0.8}>
          <Text style={styles.wishListIcon}>🏆</Text>
          <Text style={styles.wishListLabel}>{s.conquestTimelineBtn}</Text>
          <Text style={styles.wishListArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.wishListBtn} onPress={() => setShowWishList(true)} activeOpacity={0.8}>
          <Text style={styles.wishListIcon}>★</Text>
          <Text style={styles.wishListLabel}>{s.bucketList}</Text>
          <Text style={styles.wishListArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.signOutBtn} onPress={() => supabase.auth.signOut()}>
          <Text style={styles.signOutText}>{s.logout}</Text>
        </TouchableOpacity>
      </ScrollView>

      <CrewPickerModal visible={showCrewPicker} onClose={() => setShowCrewPicker(false)} onJoined={loadProfile} />
      <WishListModal visible={showWishList} onClose={() => setShowWishList(false)} />
      {userId && (
        <ConquestTimeline visible={showConquests} userId={userId} onClose={() => setShowConquests(false)} />
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
  statChip: {
    marginTop: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  statChipText: { fontSize: 13, color: Colors.white, fontWeight: '600' },
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
