import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        loadTheme();
    }, []);

    const loadTheme = async () => {
        const saved = await AsyncStorage.getItem('@theme');
        if (saved) setIsDarkMode(saved === 'dark');
    };

    const toggleTheme = async () => {
        const newValue = !isDarkMode;
        setIsDarkMode(newValue);
        await AsyncStorage.setItem('@theme', newValue ? 'dark' : 'light');
    };

    const theme = {
        bg: isDarkMode ? '#121212' : '#F8F9FA',
        card: isDarkMode ? '#1E1E1E' : '#FFFFFF',
        text: isDarkMode ? '#F8F9FA' : '#1A1A1A',
        subText: isDarkMode ? '#ADB5BD' : '#6C757D',
        border: isDarkMode ? '#2C2C2C' : '#E9ECEF',
        active: '#2D6A4F',
    };

    return (
        <ThemeContext.Provider value={{ isDarkMode, toggleTheme, theme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);