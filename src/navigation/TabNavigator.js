import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as Notifications from 'expo-notifications'; // Bildirim kütüphanesi eklendi
import { useEffect } from 'react'; // useEffect eklendi
import { Animated, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../context/ThemeContext';
import { scheduleAllNotifications } from '../utils/notificationHelper'; // Helper import edildi

import AnaSayfa from '../screens/AnaSayfa';
import Dualar from '../screens/Dualar';
import Zikirmatik from '../screens/Zikirmatik';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();

    useEffect(() => {
        // 1. Uygulama açılınca bildirim takvimini oluştur (Zaten kuruluysa helper engeller)
        scheduleAllNotifications();

        // 2. Bildirime tıklanma olayını dinle
        const subscription = Notifications.addNotificationResponseReceivedListener(response => {
            const screen = response.notification.request.content.data.screen;
            if (screen) {
                // Burada navigation nesnesi TabNavigator içinde otomatik çalışır
                // Çünkü bu bileşen NavigationContainer altındadır
                console.log("Bildirimden gelen yönlendirme:", screen);
                // navigate işlemi (Ana Sayfa veya Zikirmatik)
                // Not: Eğer Tab Navigator içindeki name'ler ile eşleşirse direkt oraya gider.
            }
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
                    height: Platform.OS === 'ios' ? 88 : (65 + (insets.bottom || 0)),
                    paddingBottom: Platform.OS === 'ios' ? insets.bottom : (insets.bottom > 0 ? insets.bottom : 10),
                    paddingTop: 10,
                },
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '800',
                    marginBottom: Platform.OS === 'android' ? 5 : 0,
                },
                tabBarIcon: ({ focused, color }) => {
                    let iconName;
                    if (route.name === 'Ana Sayfa') iconName = focused ? 'home-variant' : 'home-variant-outline';
                    else if (route.name === 'Dualar') iconName = focused ? 'book-open-variant' : 'book-outline';
                    else if (route.name === 'Zikirmatik') iconName = focused ? 'hands-pray' : 'hands-pray';

                    return (
                        <Animated.View style={focused ? styles.activeIconAnimation : null}>
                            <MaterialCommunityIcons name={iconName} size={24} color={color} />
                        </Animated.View>
                    );
                },
            })}
        >
            <Tab.Screen name="Ana Sayfa" component={AnaSayfa} />
            <Tab.Screen name="Dualar" component={Dualar} />
            <Tab.Screen name="Zikirmatik" component={Zikirmatik} />
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    activeIconAnimation: {
        transform: [{ scale: 1.1 }, { translateY: -2 }],
    }
});