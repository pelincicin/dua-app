import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../context/ThemeContext';
import { useZikirZinciri } from '../context/ZikirZinciriContext';
import { scheduleAllNotifications } from '../utils/notificationHelper';

import AnaSayfa from '../screens/AnaSayfa';
import Dualar from '../screens/Dualar';
import NamazVakitleri from '../screens/NamazVakitleri';
import Zikirmatik from '../screens/Zikirmatik';
import ZikirZinciri from '../screens/ZikirZinciri';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();
    const { bekleyenSayisi } = useZikirZinciri();

    useEffect(() => {
        scheduleAllNotifications();
        const subscription = Notifications.addNotificationResponseReceivedListener(response => {
            const screen = response.notification.request.content.data?.screen;
            console.log('Bildirimden yönlendirme:', screen);
        });
        return () => subscription.remove();
    }, []);

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarHideOnKeyboard: true,
                tabBarActiveTintColor: theme.active,
                tabBarInactiveTintColor: theme.subText,
                tabBarStyle: {
                    backgroundColor: theme.card,
                    borderTopColor: theme.border,
                    borderTopWidth: 1,
                    elevation: 20,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -5 },
                    shadowOpacity: 0.1,
                    shadowRadius: 10,
                    height: Platform.OS === 'ios' ? 88 : (65 + Math.max(insets.bottom, 12)),
                    paddingBottom: Platform.OS === 'ios' ? insets.bottom : Math.max(insets.bottom, 12),
                    paddingTop: 10,
                },
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: '800',
                    marginBottom: Platform.OS === 'android' ? 8 : 0,
                },
                tabBarIcon: ({ focused, color }) => {
                    const icons = {
                        'Ana Sayfa': focused ? 'home-variant' : 'home-variant-outline',
                        'Vakitler': focused ? 'mosque' : 'mosque',
                        'Dualar': focused ? 'book-open-variant' : 'book-outline',
                        'Zikirmatik': 'hands-pray',
                        'Zincir': focused ? 'link-variant' : 'link-variant-outline',
                    };
                    const iconName = icons[route.name] || 'circle';

                    // Zincir sekmesinde bekleyen istek badge
                    if (route.name === 'Zincir' && bekleyenSayisi > 0) {
                        return (
                            <View>
                                <Animated.View style={focused ? styles.activeIconAnimation : null}>
                                    <MaterialCommunityIcons name={iconName} size={24} color={color} />
                                </Animated.View>
                                <View style={[styles.badge, { backgroundColor: '#DC2626' }]}>
                                </View>
                            </View>
                        );
                    }

                    return (
                        <Animated.View style={focused ? styles.activeIconAnimation : null}>
                            <MaterialCommunityIcons name={iconName} size={24} color={color} />
                        </Animated.View>
                    );
                },
            })}
        >
            <Tab.Screen name="Ana Sayfa" component={AnaSayfa} />
            <Tab.Screen name="Vakitler" component={NamazVakitleri} />
            <Tab.Screen name="Dualar" component={Dualar} />
            <Tab.Screen name="Zikirmatik" component={Zikirmatik} />
            <Tab.Screen name="Zincir" component={ZikirZinciri} />
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    activeIconAnimation: {
        transform: [{ scale: 1.15 }, { translateY: -2 }],
    },
    badge: {
        position: 'absolute',
        top: -2,
        right: -4,
        width: 9,
        height: 9,
        borderRadius: 5,
        borderWidth: 1.5,
        borderColor: '#FFF',
    },
});
