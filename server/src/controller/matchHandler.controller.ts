import { Request, Response } from "express";
import { Ires } from "../utils/Api.interface";
import { Server, Socket } from "socket.io";
import Redis from "ioredis";

export const initializeMatchHandler = (io: Server, redisClient: Redis) => {
    redisClient.on("ready", () => console.log("Redis Client Connected Successfully."));
    redisClient.on("error", (err) => console.error("Redis Error:", err));
    
    io.on("connection", (socket: Socket) => {
        socket.on("find_match", async (data: any) => {
            const waitingPeerId = await redisClient.lpop('waiting_queue');
            if (waitingPeerId) {
                await redisClient.hset('active_sessions', waitingPeerId, socket.id);
                await redisClient.hset('active_sessions', socket.id, waitingPeerId);
                io.to([waitingPeerId, socket.id]).emit('match_found', {
                    peerId: waitingPeerId,
                    senderId: socket.id
                });
            } else {
                await redisClient.rpush('waiting_queue', socket.id);
                socket.emit("waiting", {
                    message: "Searching for a stranger..."
                });
            }
        });

        socket.on("disconnect", async () => {
            console.log(`[Socket Disconnected] User ID: ${socket.id}`);
            await redisClient.lrem('waiting_queue', 0, socket.id);
            const partnerId = await redisClient.hget('active_sessions', socket.id);

            if (partnerId) {
                socket.to(partnerId).emit('peer_left', {
                    message: "Partner disconnected. Searching for a new Match..."
                });
                await redisClient.hdel('active_sessions', socket.id, partnerId);
                await redisClient.hdel('active_sessions', partnerId, socket.id);
            }
        });

        socket.on("offer", (data: { targetId: string; sdp: any }) => {
            socket.to(data.targetId).emit("offer", {
                senderId: socket.id,
                sdp: data.sdp
            });
        });

        socket.on("answer", (data: { targetId: string; sdp: any }) => {
            socket.to(data.targetId).emit("answer", {
                senderId: socket.id,
                sdp: data.sdp
            });
        });

        socket.on("ice-candidate", (data: { targetId: string; sdp: any }) => {
            socket.to(data.targetId).emit("ice-candidate", {
                senderId: socket.id,
                sdp: data.sdp
            });
        });
    });
}

