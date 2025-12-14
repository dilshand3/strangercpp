import { useEffect, useState, useRef, useCallback } from 'react';
import { useSocket } from '../Context/SocketContext';
import {
    RTCPeerConnection,
    RTCIceCandidate,
    RTCSessionDescription,
    MediaStream,
} from 'react-native-webrtc';

interface IwebRTCHandler {
    remoteStream: MediaStream | null;
    startCall: (partnerId: string) => void;
    endCall: () => void;
    remotePeerId: string | null;
}

const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
};

export const useWebRTC = (localStream: MediaStream | null): IwebRTCHandler => {
    const { socket } = useSocket();
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [remotePeerId, setRemotePeerId] = useState<string | null>(null);

    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const remotePeerIdRef = useRef<string | null>(null);
    
    const iceCandidatesQueue = useRef<RTCIceCandidate[]>([]);
    const isRemoteDescriptionSet = useRef<boolean>(false);

    useEffect(() => {
        localStreamRef.current = localStream;
    }, [localStream]);

    useEffect(() => {
        remotePeerIdRef.current = remotePeerId;
    }, [remotePeerId]);

    const processCandidateQueue = async () => {
        if (peerConnection.current && iceCandidatesQueue.current.length > 0) {
            console.log(` [ICE] Processing ${iceCandidatesQueue.current.length} queued candidates`);
            for (const candidate of iceCandidatesQueue.current) {
                try {
                    await peerConnection.current.addIceCandidate(candidate);
                } catch (error) {
                    console.error(' [ICE QUEUE ERROR]', error);
                }
            }
            iceCandidatesQueue.current = [];
        }
    };

    const createPeerConnection = useCallback(() => {
        if (peerConnection.current) {
            return peerConnection.current;
        }

        console.log(' [PC] Creating new RTCPeerConnection...');
        const pc = new RTCPeerConnection(configuration);
        peerConnection.current = pc;

        // Reset flags
        isRemoteDescriptionSet.current = false;
        iceCandidatesQueue.current = [];

        // Add Local Tracks
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => {
                pc.addTrack(track, localStreamRef.current!);
            });
        }

        /**
         * 🛑 FIX: TYPE ERROR
         * Hum (pc as any) use kar rahe hain kyunki TypeScript definitions
         * mein addEventListener missing ho sakta hai, par Runtime par ye zaroori hai.
         */

        // ✅ 1. ICE Candidate (Using addEventListener via 'any' cast)
        (pc as any).addEventListener('icecandidate', (event: any) => {
            if (event.candidate && socket && remotePeerIdRef.current) {
                socket.emit('ice-candidate', {
                    targetId: remotePeerIdRef.current,
                    candidate: event.candidate
                });
            }
        });

        // ✅ 2. Track Handling (Using addEventListener via 'any' cast)
        (pc as any).addEventListener('track', (event: any) => {
            console.log('📺 [TRACK] Remote track event received!');

            // Case 1: Standard WebRTC behavior (Stream exists)
            if (event.streams && event.streams.length > 0) {
                console.log('✅ [TRACK] Setting remote stream from event.streams');
                setRemoteStream(event.streams[0]);
            } 
            // Case 2: Android Fallback (Stream array is empty, create manually)
            else if (event.track) {
                console.log('⚠️ [TRACK] Stream missing, creating new MediaStream from track');
                const newStream = new MediaStream(undefined);
                newStream.addTrack(event.track);
                setRemoteStream(newStream);
            }
        });
        // Connection State Logging
        (pc as any).addEventListener('connectionstatechange', () => {
            console.log(`📶 [STATE] ${pc.connectionState}`);
        });

        return pc;
    }, [socket]);

    useEffect(() => {
        if (!socket) return;

        const handleOffer = async (data: { senderId: string; sdp: any }) => {
            console.log(`📩 [OFFER] From ${data.senderId}`);
            setRemotePeerId(data.senderId);

            if (!localStreamRef.current) return;

            const pc = createPeerConnection();
            if (!pc) return;

            try {
                await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
                isRemoteDescriptionSet.current = true; // Mark set
                await processCandidateQueue(); // Process pending candidates

                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                socket.emit('answer', {
                    targetId: data.senderId,
                    sdp: pc.localDescription,
                });
            } catch (error) {
                console.error('❌ [OFFER ERROR]', error);
            }
        };

        const handleAnswer = async (data: { senderId: string; sdp: any }) => {
            console.log('📩 [ANSWER] Received');
            const pc = peerConnection.current;
            if (!pc) return;

            try {
                await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
                isRemoteDescriptionSet.current = true; // Mark set
                await processCandidateQueue(); // Process pending candidates
            } catch (error) {
                console.error('❌ [ANSWER ERROR]', error);
            }
        };

        const handleIceCandidate = async (data: { senderId: string; candidate: any }) => {
            const pc = peerConnection.current;
            if (!pc || !data.candidate) return;

            try {
                const candidate = new RTCIceCandidate(data.candidate);
                
                // ✅ CRASH FIX: Queue if remote description isn't set yet
                if (!isRemoteDescriptionSet.current) {
                    console.log('🧊 [ICE] Queuing candidate (RemoteDesc not set)');
                    iceCandidatesQueue.current.push(candidate);
                } else {
                    await pc.addIceCandidate(candidate);
                }
            } catch (error) {
                console.error('❌ [ICE ERROR]', error);
            }
        };

        socket.on('offer', handleOffer);
        socket.on('answer', handleAnswer);
        socket.on('ice-candidate', handleIceCandidate);

        return () => {
            socket.off('offer', handleOffer);
            socket.off("answer", handleAnswer);
            socket.off("ice-candidate", handleIceCandidate);
        };
    }, [socket, createPeerConnection]);

    const startCall = async (partnerId: string) => {
        if (!localStreamRef.current) return;
        setRemotePeerId(partnerId);
        
        const pc = createPeerConnection();
        if (!pc) return;

        try {
            const offer = await pc.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });
            await pc.setLocalDescription(offer);

            socket?.emit('offer', {
                targetId: partnerId,
                sdp: pc.localDescription
            });
        } catch (error) {
            console.error(error);
        }
    };

    const endCall = useCallback(() => {
        if (peerConnection.current) {
            peerConnection.current.close();
            peerConnection.current = null;
        }
        setRemoteStream(null);
        setRemotePeerId(null);
        remotePeerIdRef.current = null;
        iceCandidatesQueue.current = [];
        isRemoteDescriptionSet.current = false;
    }, []);

    return { remoteStream, startCall, endCall, remotePeerId };
};