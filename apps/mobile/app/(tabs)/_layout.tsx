import { Tabs } from 'expo-router';
import { Text } from 'react-native';

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{icon}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#00B090',
        tabBarInactiveTintColor: '#9CA3AF',
        headerStyle: { backgroundColor: '#FFF' },
        headerTitleStyle: { color: '#1F2937', fontWeight: '700' },
        tabBarStyle: { paddingBottom: 4, height: 56 },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon icon="🏠" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="signals"
        options={{
          title: 'Signals',
          tabBarLabel: 'Signals',
          tabBarIcon: ({ focused }) => <TabIcon icon="📡" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarLabel: 'History',
          tabBarIcon: ({ focused }) => <TabIcon icon="📊" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="payment"
        options={{
          title: 'Subscribe',
          tabBarLabel: 'Subscribe',
          tabBarIcon: ({ focused }) => <TabIcon icon="💎" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="reviews"
        options={{
          title: 'Reviews',
          tabBarLabel: 'Reviews',
          tabBarIcon: ({ focused }) => <TabIcon icon="⭐" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon icon="👤" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
