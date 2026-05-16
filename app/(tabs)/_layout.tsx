import { Tabs } from 'expo-router';
import { Colors } from '../../src/constants';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.green,
        tabBarInactiveTintColor: Colors.zinc500,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.zinc200,
          borderTopWidth: 1,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Map', tabBarIcon: () => null }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{ title: 'Leaderboard', tabBarIcon: () => null }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: () => null }}
      />
    </Tabs>
  );
}
