import { SocketProvider } from './src/Context/SocketContext';
import { Alert, StatusBar, StyleSheet, useColorScheme, View } from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import StartScreen from './src/Screens/StartScreen';
import { reqCameraAudio } from './src/Hooks/permission';
import { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import CallScreen from './src/Screens/CallScreen';
import LastScreen from './src/Screens/LastScreen';
import { MediaProvider } from './src/Context/MediaContext';

// ✅ 1. RootStackParamList Define karein (Ye bahut zaroori hai)
export type RootStackParamList = {
  StartScreen: undefined;
  CallScreen: {
    partnerId: string;
    isInitiator: boolean;
  };
  LastScreen: undefined;
};

export type StartScreenProps = NativeStackScreenProps<RootStackParamList, 'StartScreen'>;
export type CallScreenProps = NativeStackScreenProps<RootStackParamList, 'CallScreen'>;
export type LastScreenProps = NativeStackScreenProps<RootStackParamList, 'LastScreen'>;

// ✅ 2. Stack ko Type assign karein
const Stack = createNativeStackNavigator<RootStackParamList>();

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
        console.log("Permission accessed");
      } else {
        Alert.alert('Permission denied');
      }
    }
    init();
  }, [])

  return (
    <View style={[styles.container, { paddingTop: Insets.top }]}>
      <MediaProvider>
        <SocketProvider>
          <NavigationContainer>
            <Stack.Navigator
              initialRouteName="StartScreen"
              screenOptions={{
                headerShown: false,
                animation: 'fade',
              }}
            >
              <Stack.Screen name="StartScreen" component={StartScreen} />
              <Stack.Screen name="CallScreen" component={CallScreen} />
              <Stack.Screen name="LastScreen" component={LastScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </SocketProvider>
      </MediaProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;