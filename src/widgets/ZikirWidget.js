import { FlexWidget, TextWidget } from 'react-native-android-widget';
import React from 'react';

export default function ZikirWidget({ toplamZikir = 0, hedefZikir = 1200 }) {
    const yuzde = Math.min(Math.round((toplamZikir / hedefZikir) * 100), 100);
    const sayiStr = toplamZikir >= 1000
        ? `${(toplamZikir / 1000).toFixed(1)}k`
        : toplamZikir.toString();

    return (
        <FlexWidget
            style={{
                height: 'match_parent',
                width: 'match_parent',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#1B4332',
                borderRadius: 20,
                padding: 12,
            }}
            clickAction="OPEN_APP"
        >
            <TextWidget
                text="ZİKİR SAYACI 🤲"
                style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.65)',
                    fontWeight: 'bold',
                    fontFamily: 'sans-serif-condensed',
                }}
            />
            <TextWidget
                text={sayiStr}
                style={{
                    fontSize: 38,
                    color: '#FFFFFF',
                    fontWeight: 'bold',
                    fontFamily: 'sans-serif-black',
                    marginTop: 2,
                    marginBottom: 2,
                }}
            />
            <TextWidget
                text={`${yuzde}% · Hedef ${hedefZikir >= 1000 ? `${(hedefZikir / 1000).toFixed(1)}k` : hedefZikir}`}
                style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.7)',
                    fontFamily: 'sans-serif',
                }}
            />
        </FlexWidget>
    );
}
