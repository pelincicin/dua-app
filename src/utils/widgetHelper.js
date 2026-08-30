import { Platform } from 'react-native';
import React from 'react';

export async function updateZikirWidget(toplamZikir, hedefZikir) {
    if (Platform.OS !== 'android') return;
    try {
        const { requestWidgetUpdate } = require('react-native-android-widget');
        const ZikirWidget = require('../widgets/ZikirWidget').default;
        requestWidgetUpdate({
            widgetName: 'ZikirWidget',
            renderWidget: () => (
                <ZikirWidget toplamZikir={toplamZikir} hedefZikir={hedefZikir} />
            ),
            widgetNotFound: () => {},
        });
    } catch (e) {
        // Widget kurulu değil veya native modül yüklenemedi
    }
}
