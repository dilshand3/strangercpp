"use client";
import { useEffect } from "react";
import { useSocket } from "@/context/SocketContext";
import { useWebRTC } from "@/hooks/useWebRTC";

interface ICallManagerProps {
    localStream: MediaStream;
    status: string;
    setStatus: (status: any) => void;
    remoteVideoRef: React.RefObject<HTMLVideoElement>;
}

enum CallStatus {
    IDLE = "IDLE",
    SEARCHING = "SEARCHING",
    CONNECTED = "CONNECTED",
    CALL_ENDED = "CALL_ENDED",
  }

export const CallManager = ({ localStream, status, setStatus, remoteVideoRef }: ICallManagerProps) => {
    const { socket } = useSocket();
    const { remoteStream, startCall, endCall, remotePeerId } = useWebRTC(localStream);

    useEffect(() => {
        if (remoteStream && remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream, remoteVideoRef]);

    useEffect(() => {
        if (!socket) return;

        const handleMatchFound = (data: { isInitiator: boolean; peerId: string }) => {
            console.log("[UI] Match found!", data);
            setStatus(CallStatus.CONNECTED);
            if (data.isInitiator) {
                console.log("[UI] You are the Initiator. Starting call...");
                startCall(data.peerId);
            } else {
                console.log("[UI] You are the Receiver. Waiting for Offer...");
            }
        };

        const handlePeerLeft = () => {
            console.log("[UI] Peer has left the call.");
            endCall();
            setStatus(CallStatus.CALL_ENDED);
        };
        
        socket.on("match_found", handleMatchFound);
        socket.on("peer_left", handlePeerLeft);

        return () => {
            socket.off("match_found", handleMatchFound);
            socket.off("peer_left", handlePeerLeft);
        };
    }, [socket, startCall, endCall, setStatus]);

    return null;
};
