import { StyleSheet, Text, View } from 'react-native';
import React, { FC, useState, useEffect } from 'react';
import { mediaDevices,RTCView, MediaStream} from 'react-native-webrtc';
import { SafeAreaView } from 'react-native-safe-area-context';

const StartScreen: FC = () => {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);

    const startCamera = async () => {
    try {
      console.log(' Starting Camera...');
      
      const stream = await mediaDevices.getUserMedia({
        audio: true, 
        video: {
          width: 640,
          height: 480,
          frameRate: 30,
          facingMode: 'user', // 'user' = Front Camera, 'environment' = Back Camera
        },
      });

      console.log('✅ Camera Started:', stream.id);
      setLocalStream(stream);

    } catch (error) {
      console.error('❌ Failed to start camera:', error);
    }
  };

  useEffect(() => {
    // Component load hote hi camera start karo
    startCamera();

    // Cleanup: Jab screen band ho, camera bhi band ho jaye
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        console.log('🛑 Camera Stopped');
      }
    };
  }, []);
    return (
        <SafeAreaView style={styles.container}>
      <View style={styles.videoContainer}>
        {localStream ? (
          // 🎥 YEH HAI MAIN COMPONENT
          <RTCView
            // React Native WebRTC mein stream ko URL string mein convert karna padta hai
            streamURL={localStream.toURL()} 
            style={styles.video}
            objectFit="cover" // 'contain' ya 'cover'
            mirror={true} // Front camera ke liye mirror effect
            zOrder={1} // Agar multiple videos hon toh upar niche karne ke liye
          />
        ) : (
          // Jab tak camera load ho raha hai
          <View style={styles.placeholder}>
            <Text style={styles.text}>Opening Camera...</Text>
          </View>
        )}
      </View>
      
      <View style={styles.controls}>
          <Text style={{color: 'white'}}>Your Face ID Camera</Text>
      </View>
    </SafeAreaView>
    )
}

export default StartScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    flex: 1, // Poori screen lega
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 20,
    borderRadius: 20,
    overflow: 'hidden', // Corners round rakhne ke liye
  },
  video: {
    width: '100%',
    height: '100%', // ⚠️ RTCView ko fix height/width dena bahut zaroori hai
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: 'white',
    fontSize: 18,
  },
  controls: {
      padding: 20,
      alignItems: 'center'
  }
});