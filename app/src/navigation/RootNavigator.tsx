import React from 'react';
import { View, StyleSheet, I18nManager } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../context/ThemeContext';
import { HomeScreen } from '../screens/HomeScreen';
import { FolderScreen } from '../screens/FolderScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { ReelsScreen } from '../screens/ReelsScreen';
import { FavouritesScreen } from '../screens/FavouritesScreen';
import { AccountScreen } from '../screens/AccountScreen';
import { MiniPlayer } from '../components/MiniPlayer';
import { FullPlayerModal } from '../components/FullPlayerModal';
import { typography } from '../theme/typography';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Home Stack (Home -> Folder -> Subfolder -> Search)
function HomeStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen name="FolderScreen" component={FolderScreen} />
      <Stack.Screen name="SearchScreen" component={SearchScreen} />
    </Stack.Navigator>
  );
}

export const RootNavigator: React.FC = () => {
  const { colors, isDark } = useAppTheme();

  return (
    <NavigationContainer>
      <View style={styles.container}>
        <Tab.Navigator
          initialRouteName="HomeTab"
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarActiveTintColor: colors.tabBarActive,
            tabBarInactiveTintColor: colors.tabBarInactive,
            tabBarStyle: {
              backgroundColor: colors.tabBarBackground,
              borderTopColor: colors.tabBarBorder,
              height: 60,
              paddingBottom: 8,
              paddingTop: 6,
            },
            tabBarLabelStyle: {
              fontSize: 12,
              fontFamily: typography.fontFamilyMedium,
            },
            tabBarIcon: ({ color, size, focused }) => {
              let iconName: keyof typeof Ionicons.glyphMap = 'home';
              if (route.name === 'HomeTab') {
                iconName = focused ? 'home' : 'home-outline';
              } else if (route.name === 'ReelsTab') {
                iconName = focused ? 'videocam' : 'videocam-outline';
              } else if (route.name === 'FavouritesTab') {
                iconName = focused ? 'heart' : 'heart-outline';
              } else if (route.name === 'AccountTab') {
                iconName = focused ? 'person' : 'person-outline';
              }
              return <Ionicons name={iconName} size={size} color={color} />;
            },
          })}
        >
          {/* RTL Order: الرئيسية, المقاطع, المفضلة, حسابي */}
          <Tab.Screen
            name="HomeTab"
            component={HomeStackNavigator}
            options={{ tabBarLabel: 'الرئيسية' }}
          />
          <Tab.Screen
            name="ReelsTab"
            component={ReelsScreen}
            options={{ tabBarLabel: 'المقاطع' }}
          />
          <Tab.Screen
            name="FavouritesTab"
            component={FavouritesScreen}
            options={{ tabBarLabel: 'المفضلة' }}
          />
          <Tab.Screen
            name="AccountTab"
            component={AccountScreen}
            options={{ tabBarLabel: 'حسابي' }}
          />
        </Tab.Navigator>

        {/* Persistent Mini Player above Tab Bar */}
        <MiniPlayer />

        {/* Full-Screen Player Modal */}
        <FullPlayerModal />
      </View>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
