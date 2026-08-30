import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Text, View } from 'react-native';
import mobileAds, { MaxAdContentRating } from 'react-native-google-mobile-ads';

import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { UserProvider, useUser } from './src/context/UserContext';
import { ZikirProvider } from './src/context/ZikirContext';
import { ZikirZinciriProvider } from './src/context/ZikirZinciriContext';

import { scheduleAllNotifications } from './src/utils/notificationHelper';

import TabNavigator from './src/navigation/TabNavigator';
import DuaDetay from './src/screens/DuaDetay';
import GrupDetay from './src/screens/GrupDetay';
import IlkKurulum from './src/screens/IlkKurulum';
import Kible from './src/screens/Kible';
import YeniZincir from './src/screens/YeniZincir';

SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator();

function RootStack() {
    const { theme } = useTheme();
    const { displayName, isReady } = useUser();
    const [kurulumTamamlandi, setKurulumTamamlandi] = useState(false);

    // Kullanıcı ismi varsa veya kurulum tamamlandıysa ana ekrana geç
    const gosterAnaEkran = !!displayName || kurulumTamamlandi;

    if (!isReady) return null;

    // İlk kurulum (isim yok)
    if (!gosterAnaEkran) {
        return (
            <IlkKurulum onComplete={() => setKurulumTamamlandi(true)} />
        );
    }

    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: true,
                headerStyle: { backgroundColor: theme.bg },
                headerTintColor: theme.text,
                headerTitleStyle: { fontWeight: '900', fontSize: 18 },
                headerTitleAlign: 'center',
                animation: 'slide_from_right',
                contentStyle: { backgroundColor: theme.bg },
            }}
        >
            <Stack.Screen
                name="MainTabs"
                component={TabNavigator}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="DuaDetay"
                component={DuaDetay}
                options={({ route }) => ({
                    title: route.params?.prayer?.title || 'Dua Detayı',
                    headerBackTitleVisible: false,
                    headerShadowVisible: false,
                })}
            />
            <Stack.Screen
                name="Kible"
                component={Kible}
                options={{
                    title: 'Kıble Pusulası',
                    headerBackTitleVisible: false,
                    headerShadowVisible: false,
                }}
            />
            <Stack.Screen
                name="YeniZincir"
                component={YeniZincir}
                options={{
                    title: 'Yeni Zikir Zinciri',
                    headerBackTitleVisible: false,
                    headerShadowVisible: false,
                }}
            />
            <Stack.Screen
                name="GrupDetay"
                component={GrupDetay}
                options={{
                    title: 'Grup Detayı',
                    headerBackTitleVisible: false,
                    headerShadowVisible: false,
                }}
            />
        </Stack.Navigator>
    );
}

function AppContent() {
    const { isDarkMode, theme } = useTheme();
    const [appIsReady, setAppIsReady] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        async function prepare() {
            try {
                await mobileAds().initialize();
                await mobileAds().setRequestConfiguration({
                    maxAdContentRating: MaxAdContentRating.G,
                    tagForChildDirectedTreatment: false,
                    tagForUnderAgeOfConsent: false,
                });
                await scheduleAllNotifications();
            } catch (e) {
                console.warn('Başlatma hatası:', e);
            } finally {
                setAppIsReady(true);
            }
        }
        prepare();
    }, []);

    const onLayoutRootView = useCallback(async () => {
        if (appIsReady) {
            await SplashScreen.hideAsync();
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }).start();
        }
    }, [appIsReady, fadeAnim]);

    if (!appIsReady) return null;

    return (
        <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
            <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                <StatusBar style={isDarkMode ? 'light' : 'dark'} translucent />
                <RootStack />
                <View style={{
                    position: 'absolute', bottom: 10, width: '100%',
                    alignItems: 'center', pointerEvents: 'none',
                }}>
                    <Text style={{ color: theme.subText, fontSize: 9, opacity: 0.4, fontWeight: '600' }}>
                        Huzur: Zikirmatik & Dualar
                    </Text>
                </View>
            </Animated.View>
        </View>
    );
}

export default function App() {
    return (
        <ThemeProvider>
            <UserProvider>
                <ZikirProvider>
                    <ZikirZinciriProvider>
                        <NavigationContainer>
                            <AppContent />
                        </NavigationContainer>
                    </ZikirZinciriProvider>
                </ZikirProvider>
            </UserProvider>
        </ThemeProvider>
    );
}
