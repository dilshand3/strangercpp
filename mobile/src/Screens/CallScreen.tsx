import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RTCView } from 'react-native-webrtc';
import { useSocket } from '../Context/SocketContext';
import { useMedia } from '../Context/MediaContext';
import { useWebRTC } from '../Hooks/useWebRTC';
import { CallScreenProps } from '../../App';

const CallScreen = ({ navigation, route }: CallScreenProps) => {
  const { partnerId, isInitiator } = route.params;
  const { socket } = useSocket();
  const { localStream } = useMedia();
  const { remoteStream, startCall, endCall, remotePeerId } = useWebRTC(localStream);
  const [isConnected, setIsConnected] = useState(false);

  // Use ref to track if call was started
  const callStartedRef = useRef(false);

  // Start call ONCE when component mounts
  useEffect(() => {
    console.log('🎬 [CallScreen] Mounted');
    console.log('📊 [CallScreen] Params:', { partnerId, isInitiator });
    console.log('📊 [CallScreen] LocalStream exists:', !!localStream);

    if (!localStream) {
      console.error('❌ [CallScreen] No local stream in context!');
      return;
    }

    // Only start if initiator AND haven't started yet
    if (isInitiator && partnerId && !callStartedRef.current) {
      callStartedRef.current = true;
      console.log('🚀 [CallScreen] Starting call as INITIATOR...');

      // Small delay to ensure everything is ready
      setTimeout(() => {
        startCall(partnerId);
      }, 500);
    } else if (!isInitiator) {
      console.log('⏳ [CallScreen] Waiting for offer as RECEIVER...');
    }

    // Cleanup on unmount
    return () => {
      console.log('👋 [CallScreen] Unmounting');
    };
  }, []); // Empty dependency array - run ONCE

  // Monitor remote stream
  useEffect(() => {
    if (remoteStream) {
      console.log('📺 [CallScreen] Remote stream connected!');
      setIsConnected(true);
    }
  }, [remoteStream]);

  // Listen for peer left
  useEffect(() => {
    if (!socket) return;

    const handlePeerLeft = () => {
      console.log('👋 [CallScreen] Peer left');
      endCall();
      navigation.replace('LastScreen');
    };

    socket.on('peer_left', handlePeerLeft);

    return () => {
      socket.off('peer_left', handlePeerLeft);
    };
  }, [socket, navigation, endCall]);

  const handleNext = () => {
    console.log('⏭️ [CallScreen] Moving to next...');
    if (socket && remotePeerId) {
      socket.emit('disconnect_peer', { targetId: remotePeerId });
    }
    endCall();
    navigation.replace('StartScreen');
  };

  const handleStop = () => {
    console.log('🛑 [CallScreen] Stopping...');
    if (socket && remotePeerId) {
      socket.emit('disconnect_peer', { targetId: remotePeerId });
    }
    endCall();
    navigation.replace('LastScreen');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Stranger.cpp</Text>
        <View style={styles.statusBadge}>
          <View style={[styles.statusDot, isConnected && styles.connected]} />
          <Text style={styles.statusText}>
            {isConnected ? 'Connected' : 'Connecting...'}
          </Text>
        </View>
      </View>

      {/* Video Grid */}
      <View style={styles.videoGrid}>
        {/* Remote Video (Large - Background) */}
        <View style={styles.remoteVideoContainer}>
          {remoteStream ? (
            <RTCView
              // 🔥 MAGIC FIX: key prop add karein. 
              // Jab URL change hoga, ye component puri tarah recreate hoga (Crash fix)
              key={remoteStream.toURL()}

              streamURL={remoteStream.toURL()}
              style={styles.remoteVideo}
              objectFit="cover"
              mirror={false} // Remote user mirror nahi hona chahiye
            />
          ) : (
            <View style={styles.placeholder}>
              <ActivityIndicator size="large" color="#fbbf24" />
              <Text style={styles.placeholderText}>
                CONNECTING...
              </Text>
            </View>
          )}
        </View>

        {/* Local Video (Small - PiP) */}
        <View style={styles.localVideoContainer}>
          {localStream ? (
            <RTCView
              streamURL={localStream.toURL()}
              style={styles.localVideo}
              objectFit="cover"
              mirror={true}
              zOrder={2}
            />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.labelText}>Loading...</Text>
            </View>
          )}
          <View style={styles.videoLabel}>
            <Text style={styles.labelText}>YOU</Text>
          </View>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.buttonText}>Next ⏭️</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.stopButton} onPress={handleStop}>
          <Text style={styles.buttonText}>Stop ⏹️</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default CallScreen;

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
    backgroundColor: '#fbbf24',
    marginRight: 8,
  },
  connected: {
    backgroundColor: '#10b981',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
  },
  videoGrid: {
    flex: 1,
    position: 'relative',
  },
  remoteVideoContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1f2937',
  },
  remoteVideo: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1f2937',
  },
  placeholderText: {
    color: '#fbbf24',
    fontSize: 16,
    marginTop: 10,
    fontWeight: 'bold',
  },
  localVideoContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 120,
    height: 160,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#3b82f6',
    zIndex: 10,
  },
  localVideo: {
    width: '100%',
    height: '100%',
  },
  videoLabel: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  remoteLabelPosition: {
    bottom: 20,
    right: 20,
    left: 'auto',
  },
  labelText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  controls: {
    flexDirection: 'row',
    padding: 20,
    justifyContent: 'center',
    gap: 20,
  },
  nextButton: {
    backgroundColor: '#fbbf24',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 25,
    minWidth: 120,
  },
  stopButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 25,
    minWidth: 120,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});