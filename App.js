import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

// Context'leri içeri alıyoruz
import { ThemeProvider, useTheme } from './src/context/ThemeContext'; // ThemeContext'i oluşturduğunu varsayıyorum
import { ZikirProvider } from './src/context/ZikirContext';

import TabNavigator from './src/navigation/TabNavigator';
import DuaDetay from './src/screens/DuaDetay';

const Stack = createNativeStackNavigator();

// İçerik sarmalayıcı: Temayı dinleyerek Header renklerini günceller
function RootStack() {
    const { isDarkMode, theme } = useTheme();

    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: true,
                headerStyle: {
                    backgroundColor: theme.bg,
                },
                headerTintColor: theme.text,
                headerTitleStyle: {
                    fontWeight: '900',
                },
                // Sayfa geçiş animasyonu (Slide etkisi)
                animation: 'slide_from_right'
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
                options={{
                    title: 'Dua Detayı',
                    headerBackTitleVisible: false
                }}
            />
        </Stack.Navigator>
    );
}

export default function App() {
    return (
        <ThemeProvider>
            <ZikirProvider>
                <NavigationContainer>
                    {/* StatusBar'ın rengini temaya göre otomatik ayarlar */}
                    <AppContent />
                </NavigationContainer>
            </ZikirProvider>
        </ThemeProvider>
    );
}

// StatusBar'ı tema değişimine göre kontrol etmek için ayrı bir component
function AppContent() {
    const { isDarkMode } = useTheme();

    return (
        <>
            <StatusBar style={isDarkMode ? 'light' : 'dark'} />
            <RootStack />
        </>
    );
}