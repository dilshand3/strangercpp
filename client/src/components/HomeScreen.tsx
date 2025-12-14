"use client";
import { useEffect, useRef, useState } from "react";
import { useSocket } from "@/context/SocketContext";
import { useWebRTC } from "@/hooks/useWebRTC";
import '@/components/home.css';
import gsap from 'gsap';

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
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);

  const { remoteStream, startCall, endCall, remotePeerId } = useWebRTC(localStream);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localContainerRef = useRef<HTMLDivElement>(null);

  const toggleCamera = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
      }
    }
  };

  const toggleMic = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  };

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
        alert("Camera permission is required!");
      }
    };
    getMedia();
  }, []);

  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (status === CallStatus.CONNECTED && localContainerRef.current) {
      gsap.to(localContainerRef.current, {
        duration: 0.6,
        ease: "power2.out"
      });
    }
  }, [status]);

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
          console.log("[UI] You are the Receiver. Waiting for Offer...");
        }
      } else {
        console.error("[UI] Cannot start call, No Local Stream!");
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
  };

  const handleNextMatch = () => {
    endCall();
    handleStart();
  };

  return (
    <div className="main-container">
      {status !== CallStatus.CONNECTED && (
        <header className="header">
          <h1>Stranger Talk</h1>
          <div className="status-badge">
            <span className={`status-dot ${isConnected ? "online" : ""}`}></span>
            <span className="status-text">
              {isConnected ? "Server Online" : "Connecting..."}
            </span>
          </div>
        </header>
      )}

      <div className={`video-container ${status === CallStatus.CONNECTED ? 'connected' : ''}`}>
        <div 
          ref={localContainerRef}
          className={`video-card local ${status === CallStatus.CONNECTED ? 'minimized' : ''}`}
        >
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="full-video-element mirror"
          />
          {!isCameraOn && (
            <div className="camera-off-overlay">
              <span className="material-icons camera-off-icon">videocam_off</span>
              <p>Camera Off</p>
            </div>
          )}
          <div className="video-label">YOU</div>
          
          <div className="media-controls">
            {status === CallStatus.IDLE && (
              <button
                onClick={handleStart}
                disabled={!isConnected}
                className="btn btn-primary btn-large desktop-start-btn"
              >
                <span className="material-icons">video_call</span>
                Start Chat
              </button>
            )}
            
            {status === CallStatus.SEARCHING && (
              <button
                disabled
                className="btn btn-primary btn-large desktop-start-btn"
              >
                <span className="material-icons">video_call</span>
                Scanning...
              </button>
            )}
            
            <button 
              onClick={toggleCamera} 
              className={`control-btn ${!isCameraOn ? 'off' : ''}`}
              title={isCameraOn ? "Turn off camera" : "Turn on camera"}
            >
              <span className="material-icons">
                {isCameraOn ? 'videocam' : 'videocam_off'}
              </span>
            </button>
            <button 
              onClick={toggleMic} 
              className={`control-btn ${!isMicOn ? 'off' : ''}`}
              title={isMicOn ? "Mute" : "Unmute"}
            >
              <span className="material-icons">
                {isMicOn ? 'mic' : 'mic_off'}
              </span>
            </button>
          </div>
        </div>

        {status !== CallStatus.IDLE && (
          <div className="video-card remote">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="full-video-element"
            />

            {status === CallStatus.SEARCHING && (
              <div className="overlay">
                <div className="spinner"></div>
                <p className="pulse-text">SEARCHING FOR STRANGER...</p>
              </div>
            )}

            {status === CallStatus.CALL_ENDED && (
              <div className="overlay ended">
                <h2 className="overlay-title">Call Ended</h2>
                <div className="controls">
                  <button onClick={handleNextMatch} className="btn btn-warning">
                    <span className="material-icons">skip_next</span>
                    Next Match
                  </button>
                  <button onClick={() => setStatus(CallStatus.IDLE)} className="btn btn-outline">
                    <span className="material-icons">stop</span>
                    Stop
                  </button>
                </div>
              </div>
            )}

            <div className="video-label right">STRANGER</div>
          </div>
        )}
      </div>

      <div className="bottom-controls mobile-only">
        {status !== CallStatus.CONNECTED ? (
          <button
            onClick={handleStart}
            disabled={status === CallStatus.SEARCHING || !isConnected}
            className="btn btn-primary btn-large"
          >
            <span className="material-icons">video_call</span>
            {status === CallStatus.SEARCHING ? "Scanning..." : "Start Chat"}
          </button>
        ) : (
          <div className="connected-controls">
            <button onClick={handleNextMatch} className="btn btn-warning">
              <span className="material-icons">skip_next</span>
              Next
            </button>
            <button onClick={handleDisconnect} className="btn btn-danger">
              <span className="material-icons">call_end</span>
              Stop
            </button>
          </div>
        )}
      </div>

      {status === CallStatus.CONNECTED && (
        <div className="bottom-controls desktop-connected">
          <button onClick={handleNextMatch} className="btn btn-warning">
            <span className="material-icons">skip_next</span>
            Next
          </button>
          <button onClick={handleDisconnect} className="btn btn-danger">
            <span className="material-icons">call_end</span>
            Stop
          </button>
        </div>
      )}
    </div>
  );
}