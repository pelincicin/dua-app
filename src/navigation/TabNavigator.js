import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Animated, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // Sistemsel boşluk için

// Tema context'ini çekiyoruz
import { useTheme } from '../context/ThemeContext';

import AnaSayfa from '../screens/AnaSayfa';
import Dualar from '../screens/Dualar';
import Zikirmatik from '../screens/Zikirmatik';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
    const { theme } = useTheme();
    const insets = useSafeAreaInsets(); // Telefonun altındaki boşluğu milimetrik hesaplar

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
                    // Alt boşluğu telefonun kendi sistem boşluğuna göre ayarlar
                    // Eğer sistem boşluğu yoksa (eski tel), manuel 20px verir
                    height: Platform.OS === 'ios' ? 85 : 65 + (insets.bottom > 0 ? insets.bottom : 15),
                    paddingBottom: Platform.OS === 'ios' ? insets.bottom : (insets.bottom > 0 ? insets.bottom : 15),
                    paddingTop: 10,
                },

                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '800',
                    // Yazıyı Android navigasyon çubuğundan uzak tutmak için
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