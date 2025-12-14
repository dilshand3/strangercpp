import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RTCView } from 'react-native-webrtc';
import { useMedia } from '../Context/MediaContext';
import { LastScreenProps } from '../../App'; 

const LastScreen = ({ navigation }: LastScreenProps) => {
  const { localStream, setLocalStream } = useMedia();

  const handleNextMatch = () => {
    console.log('Finding next match...');
    // Go back to StartScreen and automatically start searching
    navigation.replace('StartScreen');
  };

  const handleStop = () => {
    console.log('Stopping and cleaning up...');
    
    // Stop all tracks
    if (localStream) {
      localStream.getTracks().forEach(track => {
        track.stop();
        console.log(`Stopped ${track.kind} track`);
      });
    }
    
    // Navigate back to start (without auto-search)
    navigation.replace('StartScreen');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Stranger.cpp</Text>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Local Video Preview (Optional) */}
        <View style={styles.videoPreview}>
          {localStream && (
            <RTCView
              streamURL={localStream.toURL()}
              style={styles.video}
              objectFit="cover"
              mirror={true}
            />
          )}
          <View style={styles.videoLabel}>
            <Text style={styles.labelText}>YOU</Text>
          </View>
        </View>

        {/* Call Ended Message */}
        <View style={styles.messageContainer}>
          <Text style={styles.emoji}>👋</Text>
          <Text style={styles.title}>Call Ended</Text>
          <Text style={styles.subtitle}>
            The stranger has disconnected.
          </Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity 
          style={styles.nextButton} 
          onPress={handleNextMatch}
        >
          <Text style={styles.buttonText}>Next Match</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.stopButton} 
          onPress={handleStop}
        >
          <Text style={styles.buttonText}>Stop</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};
export default LastScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  videoPreview: {
    width: 200,
    height: 266,
    backgroundColor: '#1f2937',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 40,
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoLabel: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  labelText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  messageContainer: {
    alignItems: 'center',
  },
  emoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
  },
  controls: {
    padding: 20,
    gap: 15,
  },
  nextButton: {
    backgroundColor: '#fbbf24',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#6b7280',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 30,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});