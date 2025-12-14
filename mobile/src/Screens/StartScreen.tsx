import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { mediaDevices, RTCView } from 'react-native-webrtc';
import { useSocket } from '../Context/SocketContext';
import { useMedia } from '../Context/MediaContext';
import { reqCameraAudio } from '../Hooks/permission';
import { StartScreenProps } from '../../App';

const StartScreen = ({ navigation }: StartScreenProps) => {
  const { socket, isConnected } = useSocket();
  const { localStream, setLocalStream } = useMedia();
  const [isSearching, setIsSearching] = useState(false);

  const startCamera = async () => {
    try {
      // First request permissions
      const hasPermission = await reqCameraAudio();
      if (!hasPermission) {
        console.log('Camera/Audio permission denied');
        return;
      }

      console.log('Starting Camera...');
      
      const stream = await mediaDevices.getUserMedia({
        audio: true, 
        video: {
          width: 640,
          height: 480,
          frameRate: 30,
          facingMode: 'user',
        },
      });

      console.log('Camera Started:', stream.id);
      setLocalStream(stream);

    } catch (error) {
      console.error('Failed to start camera:', error);
    }
  };

  useEffect(() => {
    startCamera();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        console.log('Camera Stopped');
      }
    };
  }, []);

  // Socket listener for match found
  useEffect(() => {
    if (!socket) return;

    socket.on('waiting', () => {
      setIsSearching(true);
      console.log('Waiting for match...');
    });

    socket.on('match_found', (data: { peerId: string; isInitiator: boolean }) => {
      console.log('Match found!', data);
      setIsSearching(false);
      
      // Navigate to CallScreen with data
      navigation.navigate('CallScreen', {
        partnerId: data.peerId,
        isInitiator: data.isInitiator,
      });
    });

    return () => {
      socket.off('waiting');
      socket.off('match_found');
    };
  }, [socket, localStream, navigation]);

  const handleStartChat = () => {
    if (!socket || !localStream) {
      console.log('Socket or LocalStream not ready');
      return;
    }

    console.log('Finding match...');
    socket.emit('find_match', { gender: 'male', preference: 'random' });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Stranger.cpp</Text>
        <View style={styles.statusBadge}>
          <View style={[styles.statusDot, isConnected && styles.online]} />
          <Text style={styles.statusText}>
            {isConnected ? 'Server Online' : 'Connecting...'}
          </Text>
        </View>
      </View>

      {/* Video Container */}
      <View style={styles.videoContainer}>
        {localStream ? (
          <RTCView
            streamURL={localStream.toURL()} 
            style={styles.video}
            objectFit="cover"
            mirror={true}
            zOrder={1}
          />
        ) : (
          <View style={styles.placeholder}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.text}>Opening Camera...</Text>
          </View>
        )}
        
        {/* Video Label */}
        <View style={styles.videoLabel}>
          <Text style={styles.labelText}>YOU</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {isSearching ? (
          <View style={styles.searchingContainer}>
            <ActivityIndicator size="large" color="#fbbf24" />
            <Text style={styles.searchingText}>SEARCHING FOR STRANGER...</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.startButton, !isConnected && styles.disabledButton]}
            onPress={handleStartChat}
            disabled={!isConnected || !localStream}
          >
            <Text style={styles.buttonText}>
              {!isConnected ? 'Connecting...' : 'Start Chat'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

export default StartScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    marginRight: 8,
  },
  online: {
    backgroundColor: '#10b981',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
  },
  videoContainer: {
    flex: 1,
    margin: 20,
    backgroundColor: '#1f2937',
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: 'white',
    fontSize: 16,
    marginTop: 10,
  },
  videoLabel: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  labelText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  controls: {
    padding: 20,
    alignItems: 'center',
  },
  searchingContainer: {
    alignItems: 'center',
  },
  searchingText: {
    color: '#fbbf24',
    fontSize: 16,
    marginTop: 10,
    fontWeight: 'bold',
  },
  startButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    paddingHorizontal: 60,
    borderRadius: 30,
    minWidth: 200,
  },
  disabledButton: {
    backgroundColor: '#6b7280',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});