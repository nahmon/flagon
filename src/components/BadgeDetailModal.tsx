import { Modal, View, Text, TouchableOpacity, StyleSheet, Share } from 'react-native';
import { Colors } from '../constants';
import { Badge } from '../services/achievements';
import { useLang } from '../contexts/LangContext';
import { t } from '../i18n/strings';

interface Props {
  badge: Badge | null;
  onClose: () => void;
}

export default function BadgeDetailModal({ badge, onClose }: Props) {
  const { lang } = useLang();
  const s = t(lang);

  if (!badge) return null;

  const ratio = badge.max > 0 ? badge.progress / badge.max : 0;
  const pct = Math.min(Math.round(ratio * 100), 100);

  const handleShare = async () => {
    try {
      await Share.share({ message: s.badgeShareMsg(badge.icon, badge.label) });
    } catch {}
  };

  return (
    <Modal visible={!!badge} animationType="fade" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.card} activeOpacity={1} onPress={() => {}}>
          <View style={[styles.iconWrap, badge.earned ? styles.iconWrapEarned : styles.iconWrapLocked]}>
            <Text style={[styles.icon, !badge.earned && styles.iconDim]}>{badge.icon}</Text>
          </View>

          <Text style={styles.label}>{badge.label}</Text>
          <Text style={styles.desc}>{badge.desc}</Text>

          <View style={styles.statusRow}>
            <Text style={[styles.statusText, badge.earned ? styles.statusEarned : styles.statusLocked]}>
              {badge.earned ? s.badgeEarned : s.badgeLocked}
            </Text>
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>{s.badgeProgressLabel}</Text>
              <Text style={styles.progressCount}>{s.badgeProgressOf(badge.progress, badge.max)}</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${pct}%` as `${number}%`, backgroundColor: badge.earned ? Colors.green : Colors.greenLight }]} />
            </View>
          </View>

          {badge.earned && (
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.8}>
              <Text style={styles.shareBtnText}>{s.badgeShare}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.closeBtnText}>{s.cancel}</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  iconWrapEarned: {
    backgroundColor: Colors.cream,
  },
  iconWrapLocked: {
    backgroundColor: Colors.zinc100,
  },
  icon: {
    fontSize: 44,
  },
  iconDim: {
    opacity: 0.35,
  },
  label: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.zinc950,
    textAlign: 'center',
  },
  desc: {
    fontSize: 14,
    color: Colors.zinc500,
    textAlign: 'center',
    lineHeight: 20,
  },
  statusRow: {
    marginTop: 2,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  statusEarned: {
    color: Colors.green,
  },
  statusLocked: {
    color: Colors.zinc500,
  },
  progressSection: {
    width: '100%',
    gap: 6,
    marginTop: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.zinc500,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  progressCount: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.zinc950,
  },
  track: {
    height: 8,
    backgroundColor: Colors.zinc200,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  shareBtn: {
    marginTop: 8,
    width: '100%',
    backgroundColor: Colors.green,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  shareBtnText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  closeBtn: {
    width: '100%',
    backgroundColor: Colors.zinc100,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  closeBtnText: {
    color: Colors.zinc500,
    fontSize: 15,
    fontWeight: '600',
  },
});
