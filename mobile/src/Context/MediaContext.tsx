import React, { createContext, useContext, useState, ReactNode } from 'react';
import { MediaStream } from 'react-native-webrtc';

interface MediaContextType {
  localStream: MediaStream | null;
  setLocalStream: (stream: MediaStream | null) => void;
}

const MediaContext = createContext<MediaContextType | null>(null);

export const useMedia = () => {
  const context = useContext(MediaContext);
  if (!context) {
    throw new Error('useMedia must be used within MediaProvider');
  }
  return context;
};

export const MediaProvider = ({ children }: { children: ReactNode }) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  return (
    <MediaContext.Provider value={{ localStream, setLocalStream }}>
      {children}
    </MediaContext.Provider>
  );
};