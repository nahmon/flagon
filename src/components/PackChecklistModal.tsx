import { useState, useEffect, useCallback } from 'react';
import {
  Modal, View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Colors } from '../constants';
import {
  type CheckItem,
  loadChecklist, saveChecklist, resetChecked, addCustomItem, removeItem,
} from '../services/packChecklist';
import { useLang } from '../contexts/LangContext';
import { t } from '../i18n/strings';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function PackChecklistModal({ visible, onClose }: Props) {
  const { lang } = useLang();
  const s = t(lang);
  const [items, setItems] = useState<CheckItem[]>([]);
  const [newLabel, setNewLabel] = useState('');

  const load = useCallback(async () => {
    const list = await loadChecklist();
    setItems(list);
  }, []);

  useEffect(() => { if (visible) load(); }, [visible, load]);

  const toggle = async (id: string) => {
    const updated = items.map((i: CheckItem) => i.id === id ? { ...i, checked: !i.checked } : i);
    setItems(updated);
    await saveChecklist(updated);
  };

  const handleReset = () => {
    Alert.alert(s.checklistResetTitle, s.checklistResetBody, [
      { text: s.cancel, style: 'cancel' },
      {
        text: s.checklistReset,
        style: 'destructive',
        onPress: async () => {
          const reset = await resetChecked();
          setItems(reset);
        },
      },
    ]);
  };

  const handleAdd = async () => {
    if (!newLabel.trim()) return;
    const item = await addCustomItem(newLabel);
    setItems((prev: CheckItem[]) => [...prev, item]);
    setNewLabel('');
  };

  const handleDelete = (item: CheckItem) => {
    if (!item.custom) return;
    Alert.alert(s.checklistDeleteTitle, item.label, [
      { text: s.cancel, style: 'cancel' },
      {
        text: s.delete,
        style: 'destructive',
        onPress: async () => {
          await removeItem(item.id);
          setItems((prev: CheckItem[]) => prev.filter((i: CheckItem) => i.id !== item.id));
        },
      },
    ]);
  };

  const checkedCount = items.filter((i: CheckItem) => i.checked).length;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>{s.checklistTitle}</Text>
            <Text style={styles.progress}>{checkedCount}/{items.length}</Text>
          </View>
          <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
            <Text style={styles.resetTxt}>{s.checklistReset}</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={items}
          keyExtractor={(i: CheckItem) => i.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }: { item: CheckItem }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => toggle(item.id)}
              onLongPress={() => handleDelete(item)}
              activeOpacity={0.75}
            >
              <Text style={styles.checkIcon}>{item.checked ? '✅' : '⬜️'}</Text>
              <Text style={[styles.itemLabel, item.checked && styles.itemLabelDone]}>
                {item.label}
              </Text>
              {item.custom && (
                <TouchableOpacity
                  onPress={() => handleDelete(item)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.delBtn}>✕</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          )}
        />

        <View style={styles.addRow}>
          <TextInput
            style={styles.input}
            value={newLabel}
            onChangeText={setNewLabel}
            placeholder={s.checklistAddPlaceholder}
            placeholderTextColor={Colors.zinc500}
            maxLength={60}
            returnKeyType="done"
            onSubmitEditing={handleAdd}
          />
          <TouchableOpacity
            style={[styles.addBtn, !newLabel.trim() && styles.addBtnDisabled]}
            onPress={handleAdd}
            disabled={!newLabel.trim()}
          >
            <Text style={styles.addBtnTxt}>{s.checklistAdd}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeTxt}>{s.close}</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.zinc200,
    backgroundColor: Colors.white,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.zinc950,
  },
  progress: {
    fontSize: 14,
    color: Colors.green,
    fontWeight: '600',
  },
  resetBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.zinc100,
  },
  resetTxt: {
    fontSize: 13,
    color: Colors.zinc500,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 8,
    gap: 12,
    shadowColor: Colors.zinc950,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  checkIcon: {
    fontSize: 20,
  },
  itemLabel: {
    flex: 1,
    fontSize: 15,
    color: Colors.zinc950,
    fontWeight: '500',
  },
  itemLabelDone: {
    color: Colors.zinc500,
    textDecorationLine: 'line-through',
  },
  delBtn: {
    fontSize: 14,
    color: Colors.zinc500,
    fontWeight: '700',
    paddingLeft: 4,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.zinc200,
    backgroundColor: Colors.white,
    gap: 8,
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: Colors.zinc200,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: Colors.zinc950,
    backgroundColor: Colors.cream,
  },
  addBtn: {
    backgroundColor: Colors.green,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addBtnDisabled: {
    backgroundColor: Colors.zinc200,
  },
  addBtnTxt: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  closeBtn: {
    margin: 16,
    backgroundColor: Colors.zinc100,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeTxt: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.zinc800,
  },
});
