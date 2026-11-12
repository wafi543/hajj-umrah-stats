import { I18nManager } from 'react-native';
import { registerRootComponent } from 'expo';
import App from './App';

// Arabic UI: force RTL. On the very first launch the app may need one reload to apply.
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

registerRootComponent(App);
