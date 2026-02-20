/**
 * App Navigator
 * Bottom tab navigation with 4 main screens.
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import DashboardScreen from '../screens/DashboardScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import HealthScreen from '../screens/HealthScreen';
import ReportsScreen from '../screens/ReportsScreen';

import { COLORS } from '../config/constants';

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Dashboard: 'cow',
  Analytics: 'chart-line',
  Health: 'needle',
  Reports: 'file-document-outline',
};

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name={TAB_ICONS[route.name]}
              size={size}
              color={color}
            />
          ),
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.textSecondary,
          tabBarStyle: {
            backgroundColor: COLORS.surface,
            borderTopWidth: 0,
            elevation: 10,
            height: 60,
            paddingBottom: 8,
            paddingTop: 4,
          },
          headerStyle: {
            backgroundColor: COLORS.primary,
            elevation: 0,
          },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
        })}
      >
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{ title: '🐄 Dashboard' }}
        />
        <Tab.Screen
          name="Analytics"
          component={AnalyticsScreen}
          options={{ title: '📊 Analytics' }}
        />
        <Tab.Screen
          name="Health"
          component={HealthScreen}
          options={{ title: '💉 Health' }}
        />
        <Tab.Screen
          name="Reports"
          component={ReportsScreen}
          options={{ title: '📄 Reports' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
