import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ZikirProvider } from './src/context/ZikirContext';
import TabNavigator from './src/navigation/TabNavigator';
import DuaDetay from './src/screens/DuaDetay';

const Stack = createNativeStackNavigator();

export default function App() {
    return (
        <ZikirProvider>
            <NavigationContainer>
                <Stack.Navigator screenOptions={{ headerShown: true }}>
                    <Stack.Screen
                        name="MainTabs"
                        component={TabNavigator}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="DuaDetay"
                        component={DuaDetay}
                        options={{ title: 'Dua Oku' }}
                    />
                </Stack.Navigator>
            </NavigationContainer>
        </ZikirProvider>
    );
}