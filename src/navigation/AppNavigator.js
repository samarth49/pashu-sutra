/**
 * App Navigator
 * Bottom tab navigation — Dashboard, Analytics, Health, Milk, Pregnancy, Animals, Reports
 * Settings moved to top-right header gear icon (visible on all screens).
 */

import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import DashboardScreen  from '../screens/DashboardScreen';
import AnalyticsScreen  from '../screens/AnalyticsScreen';
import HealthScreen     from '../screens/HealthScreen';
import MilkLogScreen    from '../screens/MilkLogScreen';
import PregnancyScreen  from '../screens/PregnancyScreen';
import AnimalsScreen    from '../screens/AnimalsScreen';
import ReportsScreen    from '../screens/ReportsScreen';
import SettingsScreen   from '../screens/SettingsScreen';

import { COLORS } from '../config/constants';
import { useTranslation } from '../i18n/LanguageContext';

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Dashboard: 'cow',
  Analytics:  'chart-line',
  Health:     'needle',
  Milk:       'cup',
  Pregnancy:  'baby-carriage',
  Animals:    'barn',
  Reports:    'file-document-outline',
};

export default function AppNavigator() {
  const { t } = useTranslation();

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ navigation, route }) => ({
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name={TAB_ICONS[route.name] || 'circle'} size={size} color={color} />
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
          headerStyle: { backgroundColor: COLORS.primary, elevation: 0 },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
          // ── Gear icon in top-right header on every screen ──────────
          headerRight: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('Settings')}
              style={{ marginRight: 14 }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="cog-outline" size={24} color="#fff" />
            </TouchableOpacity>
          ),
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen}  options={{ title: t('nav.dashboard') }} />
        <Tab.Screen name="Analytics"  component={AnalyticsScreen}  options={{ title: t('nav.analytics') }} />
        <Tab.Screen name="Health"     component={HealthScreen}     options={{ title: t('nav.health') }} />
        <Tab.Screen name="Milk"       component={MilkLogScreen}    options={{ title: t('nav.milk') }} />
        <Tab.Screen name="Pregnancy"  component={PregnancyScreen}  options={{ title: t('nav.pregnancy') }} />
        <Tab.Screen name="Animals"    component={AnimalsScreen}    options={{ title: t('nav.animals') }} />
        <Tab.Screen name="Reports"    component={ReportsScreen}    options={{ title: t('nav.reports') }} />

        {/* Settings: hidden from tab bar, accessible via header gear icon */}
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            title: t('nav.settings'),
            tabBarButton: () => null,       // hide from bottom bar
            tabBarItemStyle: { display: 'none' },
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
