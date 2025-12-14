import { useEffect, useState, useRef, useCallback } from 'react';
import { useSocket } from '@/context/SocketContext';

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

    // Sync localStream
    useEffect(() => {
        localStreamRef.current = localStream;
        if (localStream) {
            console.log("📷 [HOOK] LocalStream set:", localStream.id);
        }
    }, [localStream]);

    // Sync remotePeerId to ref
    useEffect(() => {
        remotePeerIdRef.current = remotePeerId;
    }, [remotePeerId]);

    // --- Peer Connection Creator ---
    const createPeerConnection = useCallback(() => {
        if (peerConnection.current) {
            console.log("⚠️ [PC] PeerConnection already exists, reusing.");
            return peerConnection.current;
        }

        console.log("🛠️ [PC] Creating NEW RTCPeerConnection...");
        const pc = new RTCPeerConnection(configuration);
        peerConnection.current = pc;

        // Add Local Tracks
        if (localStreamRef.current) {
            console.log("➕ [PC] Adding Local Tracks to Connection...");
            localStreamRef.current.getTracks().forEach((track) => {
                pc.addTrack(track, localStreamRef.current!);
            });
        } else {
            console.error("❌ [PC ERROR] No Local Stream found to add!");
        }

        // ✅ ICE Candidate Handler
        pc.onicecandidate = (event) => {
            if (event.candidate && socket && remotePeerIdRef.current) {
                console.log(`📤 [ICE] Sending Candidate to ${remotePeerIdRef.current}`);
                socket.emit('ice-candidate', {
                    targetId: remotePeerIdRef.current,
                    candidate: event.candidate.toJSON() // ✅ Convert to plain object
                });
            } else if (!event.candidate) {
                console.log("🏁 [ICE] All candidates sent (end-of-candidates)");
            }
        };

        // Track Handler
        pc.ontrack = (event) => {
            console.log("📺 [TRACK] Remote Stream Received!");
            if (event.streams && event.streams[0]) {
                const newStream = event.streams[0];
                console.log("✅ [TRACK] Setting Remote Stream ID:", newStream.id);
                setRemoteStream(newStream);
            }
        };

        // Connection State
        pc.onconnectionstatechange = () => {
            console.log(`📶 [STATE] Connection: ${pc.connectionState}, ICE: ${pc.iceConnectionState}`);
        };

        return pc;
    }, [socket]);

    // --- Socket Event Handlers ---
    useEffect(() => {
        if (!socket) return;
        console.log("🔌 [HOOK] Socket listeners initialized.");

        // 1. OFFER (Receiver Side)
        const handleOffer = async (data: { senderId: string; sdp: any }) => {
            console.log(`📩 [OFFER] Received from ${data.senderId}`);
            setRemotePeerId(data.senderId);

            if (!localStreamRef.current) {
                console.error("❌ [OFFER ERROR] Cannot answer - No LocalStream!");
                return;
            }

            const pc = createPeerConnection();
            if (!pc) return;

            try {
                console.log("⚙️ [OFFER] Setting Remote Description...");
                await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));

                console.log("📝 [OFFER] Creating Answer...");
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                console.log("📤 [ANSWER] Sending Answer back...");
                socket.emit('answer', {
                    targetId: data.senderId,
                    sdp: pc.localDescription
                });
            } catch (error) {
                console.error("❌ [OFFER ERROR]", error);
            }
        };

        // 2. ANSWER (Sender Side)
        const handleAnswer = async (data: { senderId: string; sdp: any }) => {
            console.log("📩 [ANSWER] Received Answer!");
            const pc = peerConnection.current;
            if (pc && pc.signalingState !== "stable") {
                try {
                    console.log("⚙️ [ANSWER] Setting Remote Description...");
                    await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
                } catch (error) {
                    console.error("❌ [ANSWER ERROR]", error);
                }
            } else {
                console.error("❌ [ANSWER ERROR] No PeerConnection or already stable!");
            }
        };

        // 3. ICE CANDIDATE - ✅ FIXED
        const handleIceCandidate = async (data: { senderId: string; candidate: any }) => {
            console.log("❄️ [ICE] Received Remote Candidate");
            const pc = peerConnection.current;
            
            if (!pc) {
                console.warn("⚠️ [ICE] No PeerConnection to add candidate!");
                return;
            }

            // ✅ CHECK: Ignore null/invalid candidates
            if (!data.candidate) {
                console.log("🏁 [ICE] Received end-of-candidates signal");
                return;
            }

            // ✅ CHECK: Validate candidate has required fields
            if (!data.candidate.candidate || (!data.candidate.sdpMid && data.candidate.sdpMLineIndex === null)) {
                console.warn("⚠️ [ICE] Invalid candidate received, skipping:", data.candidate);
                return;
            }

            try {
                await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                console.log("✅ [ICE] Added Remote Candidate");
            } catch (error) {
                console.error("❌ [ICE ERROR]", error);
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

    // --- Exposed Functions ---
    const startCall = async (partnerId: string) => {
        console.log(`🚀 [START] Starting call with ${partnerId}`);
        
        if (!localStreamRef.current) {
            console.error("❌ [START ERROR] No local stream available!");
            return;
        }

        setRemotePeerId(partnerId);
        
        const pc = createPeerConnection();
        if (!pc) return;

        try {
            console.log("📝 [START] Creating Offer...");
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            console.log("📤 [START] Sending Offer...");
            socket?.emit('offer', {
                targetId: partnerId,
                sdp: pc.localDescription
            });
        } catch (error) {
            console.error("❌ [START ERROR]", error);
        }
    };

    const endCall = () => {
        console.log("🛑 [END] Ending Call");
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