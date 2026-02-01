import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react'; // useRef eklendi
import { Animated, Text, View } from 'react-native';

// Context'ler
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { ZikirProvider } from './src/context/ZikirContext';

// Bildirim Servisi
import { scheduleAllNotifications } from './src/utils/notificationHelper';

// Ekranlar ve Navigasyon
import TabNavigator from './src/navigation/TabNavigator';
import DuaDetay from './src/screens/DuaDetay';
import Kible from './src/screens/Kible';

SplashScreen.preventAutoHideAsync();

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
        </Stack.Navigator>
    );
}

function AppContent() {
    const { isDarkMode, theme } = useTheme(); // theme buraya eklendi
    const [appIsReady, setAppIsReady] = useState(false);

    // ESLint uyarısını çözmek için fadeAnim'i useRef veya useState ile tutabiliriz.
    // Animasyon değerleri için useRef en stabil yöntemdir.
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        async function prepare() {
            try {
                await scheduleAllNotifications();
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (e) {
                console.warn(e);
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
    }, [appIsReady, fadeAnim]); // fadeAnim bağımlılığa eklendi, hata çözüldü.

    if (!appIsReady) {
        return null;
    }

    return (
        <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
            <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                <StatusBar style={isDarkMode ? 'light' : 'dark'} translucent={true} />
                <RootStack />

                {/* Geliştirici İsmi (En Alt Kısım) */}
                <View style={{
                    position: 'absolute',
                    bottom: 10,
                    width: '100%',
                    alignItems: 'center',
                    pointerEvents: 'none' // Tıklamaları engellemek için
                }}>
                    <Text style={{
                        color: theme.subText,
                        fontSize: 9,
                        opacity: 0.4,
                        fontWeight: '600'
                    }}>
                     
                    </Text>
                </View>
            </Animated.View>
        </View>
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