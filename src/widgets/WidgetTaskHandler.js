import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import ZikirWidget from './ZikirWidget';

async function getWidgetData() {
    try {
        const [zikirStr, hedefStr] = await Promise.all([
            AsyncStorage.getItem('@toplam_zikir'),
            AsyncStorage.getItem('@hedef_zikir'),
        ]);
        return {
            toplamZikir: zikirStr ? parseInt(zikirStr, 10) : 0,
            hedefZikir: hedefStr ? parseInt(hedefStr, 10) : 1200,
        };
    } catch {
        return { toplamZikir: 0, hedefZikir: 1200 };
    }
}

async function widgetTaskHandler(props) {
    switch (props.widgetAction) {
        case 'WIDGET_ADDED':
        case 'WIDGET_UPDATE':
        case 'WIDGET_RESIZED': {
            const data = await getWidgetData();
            props.renderWidget(
                <ZikirWidget toplamZikir={data.toplamZikir} hedefZikir={data.hedefZikir} />
            );
            break;
        }
        default:
            break;
    }
}

export default widgetTaskHandler;
