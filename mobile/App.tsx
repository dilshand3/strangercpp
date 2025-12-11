import { SocketProvider } from './src/Context/SocketContext';
import { Alert, StatusBar, StyleSheet, useColorScheme, View } from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import StartScreen from './src/Screens/StartScreen';
import { reqCameraAudio } from './src/Hooks/permission';
import { useEffect } from 'react';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const Insets = useSafeAreaInsets();

  useEffect(() => {
    const init = async () => {
      const hasPermission = await reqCameraAudio();

      if (hasPermission) {
        Alert.alert("Permission accesed");
      } else {
        Alert.alert('Permission deined');
      }
    }
    init();
  }, [])

  return (
    <View style={[styles.container, {
      paddingTop: Insets.top
    }]}>
      <SocketProvider>
        <StartScreen />
      </SocketProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
