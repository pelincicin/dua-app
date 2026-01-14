import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

// Context'ler
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { ZikirProvider } from './src/context/ZikirContext';

// Bildirim Servisi
import { scheduleDuaReminder, scheduleZikirSummary, setupNotifications } from './src/services/NotificationService';

// Ekranlar ve Navigasyon
import TabNavigator from './src/navigation/TabNavigator';
import DuaDetay from './src/screens/DuaDetay';
import Kible from './src/screens/Kible';

const Stack = createNativeStackNavigator();

function RootStack() {
    const { theme } = useTheme();

    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: true,
                headerStyle: { backgroundColor: theme.bg },
                headerTintColor: theme.text,
                headerTitleStyle: { fontWeight: '900', fontSize: 18 },
                headerTitleAlign: 'center',
                animation: 'slide_from_right',
                contentStyle: { backgroundColor: theme.bg }
            }}
        >
            {/* Alt Menü (AnaSayfa ve Zikirmatik) */}
            <Stack.Screen
                name="MainTabs"
                component={TabNavigator}
                options={{ headerShown: false }}
            />

            {/* Dua Detay */}
            <Stack.Screen
                name="DuaDetay"
                component={DuaDetay}
                options={({ route }) => ({
                    title: route.params?.prayer?.title || 'Dua Detayı',
                    headerBackTitleVisible: false,
                    headerShadowVisible: false,
                })}
            />

            {/* Kıble Ekranı */}
            <Stack.Screen
                name="Kible"
                component={Kible}
                options={{
                    title: 'Kıble Pusulası',
                    headerBackTitleVisible: false,
                    headerShadowVisible: false,
                }}
            />
        </Stack.Navigator>
    );
}

function AppContent() {
    const { isDarkMode } = useTheme();

    useEffect(() => {
        // Bildirimleri Başlat
        async function initializeNotifications() {
            const hasPermission = await setupNotifications();
            if (hasPermission) {
                // Her gün 09:00'da Dua Hatırlatıcısı
                await scheduleDuaReminder();
                // Her akşam 21:00'da dün ne yapıldığına dair Zikir Özeti
                // (Not: Gerçek veri için bu kısım zikirmatik içinden de tetiklenebilir)
                await scheduleZikirSummary(0);
            }
        }
        initializeNotifications();
    }, []);

    return (
        <>
            <StatusBar style={isDarkMode ? 'light' : 'dark'} translucent={true} />
            <RootStack />
        </>
    );
}

export default function App() {
    return (
        <ThemeProvider>
            <ZikirProvider>
                <NavigationContainer>
                    <AppContent />
                </NavigationContainer>
            </ZikirProvider>
        </ThemeProvider>
    );
}