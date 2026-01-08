import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Animated, Platform, StyleSheet } from 'react-native';

// Tema context'ini çekiyoruz
import { useTheme } from '../context/ThemeContext';

import AnaSayfa from '../screens/AnaSayfa';
import Dualar from '../screens/Dualar';
import Zikirmatik from '../screens/Zikirmatik';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
    // Global temayı kullanıyoruz
    const { theme, isDarkMode } = useTheme();

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: true,
                // Başlık alanını temaya göre boyuyoruz
                headerStyle: {
                    backgroundColor: theme.bg,
                    elevation: 0,
                    shadowOpacity: 0,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border,
                },
                headerTitleStyle: {
                    fontWeight: '900',
                    fontSize: 20,
                    color: theme.text,
                },

                // Menü renklerini temaya göre boyuyoruz
                tabBarActiveTintColor: theme.active, // #2D6A4F
                tabBarInactiveTintColor: theme.subText,
                tabBarStyle: [
                    styles.tabBar,
                    {
                        backgroundColor: theme.card,
                        borderTopColor: theme.border
                    }
                ],
                tabBarLabelStyle: styles.tabBarLabel,

                // Sayfa geçiş animasyonu
                animation: 'fade',

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
            <Tab.Screen
                name="Ana Sayfa"
                component={AnaSayfa}
                options={{
                    headerShown: false,
                    title: 'Ana Sayfa',
                }}
            />
            <Tab.Screen
                name="Dualar"
                component={Dualar}
                options={{
                    headerShown: false,
                    title: 'Dualar',
                }}
            />
            <Tab.Screen
                name="Zikirmatik"
                component={Zikirmatik}
                options={{
                    headerShown: false,
                    title: 'Zikirmatik'
                }}
            />
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        height: Platform.OS === 'ios' ? 90 : 70,
        paddingBottom: Platform.OS === 'ios' ? 30 : 12,
        paddingTop: 10,
        borderTopWidth: 1,
        elevation: 0,
    },
    tabBarLabel: {
        fontSize: 12,
        fontWeight: '700',
        marginTop: 2,
    },
    activeIconAnimation: {
        transform: [{ scale: 1.1 }, { translateY: -2 }],
    }
});