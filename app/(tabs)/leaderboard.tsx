import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../src/constants';

export default function LeaderboardScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Leaderboard — Coming M3</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.cream },
  text: { fontSize: 16, color: Colors.zinc500 },
});
