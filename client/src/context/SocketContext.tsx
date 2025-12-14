'use client'
import React, { useState, useEffect, createContext, useContext } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL =  'https://strangercpp-1.onrender.com'//'http://localhost:4000';

interface ISocketContextType {
    socket: Socket | null;
    isConnected: boolean;
}

const SocketContext = createContext<ISocketContextType | null>(null);

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used in socketProvider');
    }
    return context;
}

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setisConnected] = useState<boolean>(false);

    useEffect(() => {
        const socketInstance = io(SOCKET_URL, {
            transports: ['websocket']
        });

        socketInstance.on('connect', () => {
            console.log('Connected to Server', socketInstance.id);
            setisConnected(true);
        });

        socketInstance.on('disconnect', () => {
            console.log('Disconnected from server');
            setisConnected(false);
        });

        setSocket(socketInstance);

        return () => {
            socketInstance.disconnect();
        }
    }, []);

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    )
}