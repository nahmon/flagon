import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/constants';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function icon(focused: boolean, active: IconName, inactive: IconName) {
  return ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={focused ? active : inactive} size={size} color={color} />
  );
}

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
        options={{
          title: '지도',
          tabBarIcon: ({ color, size, focused }) =>
            icon(focused, 'map', 'map-outline')({ color, size }),
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: '피드',
          tabBarIcon: ({ color, size, focused }) =>
            icon(focused, 'flash', 'flash-outline')({ color, size }),
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: '랭킹',
          tabBarIcon: ({ color, size, focused }) =>
            icon(focused, 'trophy', 'trophy-outline')({ color, size }),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '내 정보',
          tabBarIcon: ({ color, size, focused }) =>
            icon(focused, 'person', 'person-outline')({ color, size }),
        }}
      />
    </Tabs>
  );
}
