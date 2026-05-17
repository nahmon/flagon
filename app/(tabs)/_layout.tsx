import { useState, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/constants';
import { getUserCrewId } from '../../src/services/flags';
import CrewSetupModal from '../../src/components/CrewSetupModal';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function icon(focused: boolean, active: IconName, inactive: IconName) {
  return ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={focused ? active : inactive} size={size} color={color} />
  );
}

export default function TabLayout() {
  const [hasCrew, setHasCrew] = useState<boolean | null>(null);

  useEffect(() => {
    getUserCrewId()
      .then(id => setHasCrew(id !== null))
      .catch(() => setHasCrew(false));
  }, []);

  return (
    <>
      {hasCrew === false && (
        <CrewSetupModal onComplete={() => setHasCrew(true)} />
      )}
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.green,
        tabBarInactiveTintColor: Colors.zinc500,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: '#ECEAE5',
          borderTopWidth: 1,
          height: 84,
          paddingBottom: 28,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.1,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Map',
          tabBarIcon: ({ color, size, focused }) =>
            icon(focused, 'map', 'map-outline')({ color, size }),
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Leaderboard',
          tabBarIcon: ({ color, size, focused }) =>
            icon(focused, 'podium', 'podium-outline')({ color, size }),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'You',
          tabBarIcon: ({ color, size, focused }) =>
            icon(focused, 'person', 'person-outline')({ color, size }),
        }}
      />
    </Tabs>
    </>
  );
}
