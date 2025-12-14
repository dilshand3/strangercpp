"use client";
import { useEffect, useRef, useState } from "react";
import { useSocket } from "@/context/SocketContext";
import { useWebRTC } from "@/hooks/useWebRTC";
import '@/components/home.css';

enum CallStatus {
  IDLE = "IDLE",
  SEARCHING = "SEARCHING",
  CONNECTED = "CONNECTED",
  CALL_ENDED = "CALL_ENDED",
}

export default function HomeScreen() {
  const { socket, isConnected } = useSocket();
  const [status, setStatus] = useState<CallStatus>(CallStatus.IDLE);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const { remoteStream, startCall, endCall, remotePeerId } = useWebRTC(localStream);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // 1. Camera Access
  useEffect(() => {
    const getMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing media:", err);
        alert("Camera permission is required!");
      }
    };
    getMedia();
  }, []);

  // 2. Refresh Local Video
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // 3. Set Remote Video
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);


  // 4. Socket Events
  useEffect(() => {
    if (!socket) return;

    socket.on("waiting", (data) => {
      setStatus(CallStatus.SEARCHING);
    });

    socket.on("match_found", (data) => {
      setStatus(CallStatus.CONNECTED);
      if (localStream) {
        if (data.isInitiator) {
          startCall(data.peerId);
        } else {
          console.log("⏳ [UI] You are the Receiver. Waiting for Offer...");
        }
      } else {
        console.error("❌ [UI] Cannot start call, No Local Stream!");
      }
    });

    socket.on("peer_left", () => {
      endCall();
      setStatus(CallStatus.CALL_ENDED);
    });

    return () => {
      socket.off("waiting");
      socket.off("match_found");
      socket.off("peer_left");
    };
  }, [socket, localStream, startCall, endCall]);

  // Handlers
  const handleStart = () => {
    if (!socket || !localStream) return;
    setStatus(CallStatus.SEARCHING);
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    socket.emit("find_match", { gender: "male", preference: "random" });
  };

  const handleDisconnect = () => {
    if (status === CallStatus.CONNECTED && socket && remotePeerId) {
      socket.emit("disconnect_peer", { targetId: remotePeerId });
    }
    endCall();
    setStatus(CallStatus.IDLE);
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  }

  const handleNextMatch = () => {
    endCall();
    handleStart();
  }

  return (
    <div className="main-container">

      {/* HEADER */}
      <header className="header">
        <h1 className="title">Stranger.cpp</h1>
        <div className="status-badge">
          <span className={`status-dot ${isConnected ? "online" : ""}`}></span>
          <span className="status-text">
            {isConnected ? "Server Online" : "Connecting..."}
          </span>
        </div>
      </header>

      {/* VIDEO AREA */}
      <div className="video-grid">

        {/* Local Video */}
        <div className="video-card local">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="full-video-element mirror"
          />
          <div className="video-label">YOU</div>
        </div>

        {/* Remote Video */}
        <div className="video-card remote">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
          />

          {/* Overlay: Searching / Idle */}
          {(status === CallStatus.IDLE || status === CallStatus.SEARCHING) && (
            <div className="overlay">
              <div className="icon-tv">📺</div>
              <p className="pulse-text">
                {status === CallStatus.SEARCHING ? "SEARCHING FOR STRANGER..." : "WAITING TO START"}
              </p>
            </div>
          )}

          {/* Overlay: Call Ended */}
          {status === CallStatus.CALL_ENDED && (
            <div className="overlay ended">
              <h2 className="overlay-title">Call Ended</h2>
              <div className="controls" >
                <button onClick={handleNextMatch} className="btn btn-warning">
                  Next Match 🚀
                </button>
                <button onClick={() => setStatus(CallStatus.IDLE)} className="btn btn-outline">
                  Stop
                </button>
              </div>
            </div>
          )}

          <div className="video-label right">STRANGER</div>
        </div>
      </div>

      {/* BUTTONS */}
      <div className="controls">
        {status !== CallStatus.CONNECTED ? (
          <button
            onClick={handleStart}
            disabled={status === CallStatus.SEARCHING || !isConnected}
            className="btn btn-primary"
          >
            {status === CallStatus.SEARCHING ? "Scanning..." : "Start Chat"}
          </button>
        ) : (
          <>
            <button onClick={handleNextMatch} className="btn btn-warning">
              Next ⏭️
            </button>

            <button onClick={handleDisconnect} className="btn btn-danger">
              Stop ⏹️
            </button>
          </>
        )}
      </div>

    </div>
  );
}