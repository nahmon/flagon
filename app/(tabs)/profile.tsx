import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../../src/constants';
import { supabase } from '../../src/services/supabase';

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Profile — Coming M3</Text>
      <TouchableOpacity style={styles.signOut} onPress={() => supabase.auth.signOut()}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.cream, gap: 16 },
  text: { fontSize: 16, color: Colors.zinc500 },
  signOut: { paddingHorizontal: 24, paddingVertical: 10, backgroundColor: Colors.zinc100, borderRadius: 10 },
  signOutText: { fontSize: 14, color: Colors.zinc800, fontWeight: '600' },
});
