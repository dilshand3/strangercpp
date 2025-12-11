import { useEffect, useState, useRef, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
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
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

export const useWebRTC = (localStream: MediaStream | null): IwebRTCHandler => {
    const { socket } = useSocket();
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [remotePeerId, setRemotePeerId] = useState<string | null>(null);

    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const remotePeerIdRef = useRef<string | null>(null);

    useEffect(() => {
        localStreamRef.current = localStream;
    }, [localStream]);

    useEffect(() => {
        remotePeerIdRef.current = remotePeerId;
    }, [remotePeerId]);

    const createPeerConnection = useCallback(() => {
        if (peerConnection.current) {
            return peerConnection.current;
        }

        const pc = new RTCPeerConnection(configuration);
        peerConnection.current = pc;

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => {
                pc.addTrack(track, localStreamRef.current!);
            });
        }

        (pc as any).onicecandidate = (event: any) => {
            if (event.candidate && socket && remotePeerIdRef.current) {
                socket.emit('ice-candidate', {
                    targetId: remotePeerIdRef.current,
                    candidate: event.candidate
                });
            }
        };

        (pc as any).ontrack = (event: any) => {
            if (event.streams && event.streams[0]) {
                setRemoteStream(event.streams[0]);
            }
        };

        return pc;
    }, [socket]);

    useEffect(() => {
        if (!socket) return;

        const handleOffer = async (data: { senderId: string; sdp: any }) => {
            setRemotePeerId(data.senderId);

            if (!localStreamRef.current) return;

            const pc = createPeerConnection();
            if (!pc) return;

            try {
                await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                socket.emit('answer', {
                    targetId: data.senderId,
                    sdp: pc.localDescription
                });
            } catch (error) {
                console.log(error);
            }
        };

        const handleAnswer = async (data: { senderId: string; sdp: any }) => {
            const pc = peerConnection.current;
            if (pc && pc.signalingState !== "stable") {
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
                } catch (error) {
                    console.log(error);
                }
            }
        };

        const handleIceCandidate = async (data: { senderId: string; candidate: any }) => {
            const pc = peerConnection.current;

            if (!pc || !data.candidate) return;

            try {
                await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (error) {
                console.log(error);
            }
        };

        socket.on("offer", handleOffer);
        socket.on("answer", handleAnswer);
        socket.on("ice-candidate", handleIceCandidate);

        return () => {
            socket.off("offer", handleOffer);
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
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            socket?.emit('offer', {
                targetId: partnerId,
                sdp: pc.localDescription
            });
        } catch (error) {
            console.log(error);
        }
    };

    const endCall = () => {
        if (peerConnection.current) {
            peerConnection.current.close();
            peerConnection.current = null;
        }
        setRemoteStream(null);
        setRemotePeerId(null);
        remotePeerIdRef.current = null;
    };

    return { remoteStream, startCall, endCall, remotePeerId };
};