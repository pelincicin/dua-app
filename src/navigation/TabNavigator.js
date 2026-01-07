import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, Text } from 'react-native';

import AnaSayfa from '../screens/AnaSayfa';
import Dualar from '../screens/Dualar';
import Zikirmatik from '../screens/Zikirmatik';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused }) => {
                    let icon;
                    if (route.name === 'Ana Sayfa') icon = '🏠';
                    else if (route.name === 'Dualar') icon = '📖';
                    else if (route.name === 'Zikirmatik') icon = '📿';
                    return <Text style={{ fontSize: 25 }}>{icon}</Text>;
                },
                tabBarActiveTintColor: '#166534',
                tabBarInactiveTintColor: 'gray',
                tabBarStyle: {
                    height: Platform.OS === 'ios' ? 100 : 80,
                    paddingBottom: Platform.OS === 'ios' ? 30 : 15,
                    paddingTop: 10
                },
                tabBarLabelStyle: { fontSize: 14, fontWeight: 'bold' },
                headerStyle: { backgroundColor: '#f0fdf4' },
                headerTitleStyle: { fontWeight: 'bold', fontSize: 22 }
            })}
        >
            <Tab.Screen name="Ana Sayfa" component={AnaSayfa} />
            <Tab.Screen name="Dualar" component={Dualar} />
            <Tab.Screen name="Zikirmatik" component={Zikirmatik} />
        </Tab.Navigator>
    );
}