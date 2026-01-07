import { createContext, useState } from 'react';

export const ZikirContext = createContext();

export const ZikirProvider = ({ children }) => {
    const [count, setCount] = useState(0);

    const arttir = () => setCount(prev => prev + 1);
    const sifirla = () => setCount(0);

    return (
        <ZikirContext.Provider value={{ count, arttir, sifirla }}>
            {children}
        </ZikirContext.Provider>
    );
};