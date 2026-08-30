import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { registerRootComponent } from 'expo';
import App from './App';
import widgetTaskHandler from './src/widgets/WidgetTaskHandler';

registerWidgetTaskHandler(() => widgetTaskHandler);

registerRootComponent(App);
