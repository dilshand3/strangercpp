import { Server, Socket } from "socket.io";
import Redis from "ioredis";

export const initializeMatchHandler = (io: Server, redisClient: Redis) => {
    redisClient.on("ready", () => console.log(" Redis Client Connected Successfully."));
    redisClient.on("error", (err) => console.error(" Redis Error:", err));

    io.on("connection", (socket: Socket) => {
        console.log(`🔌 [CONNECT] User connected: ${socket.id}`);

        socket.on("find_match", async (data: any) => {
            console.log(`🔍 [MATCH] ${socket.id} searching for match...`);
            
            const waitingPeerId = await redisClient.lpop('waiting_queue');
            
            if (waitingPeerId) {
                // Match found!
                console.log(` [MATCH] Paired: ${socket.id}  ${waitingPeerId}`);
                
                await redisClient.hset('active_sessions', waitingPeerId, socket.id);
                await redisClient.hset('active_sessions', socket.id, waitingPeerId);
                
                // Send to waiting peer (they become receiver)
                io.to(waitingPeerId).emit('match_found', {
                    peerId: socket.id,
                    isInitiator: false
                });

                // Send to current socket (they become initiator)
                io.to(socket.id).emit('match_found', {
                    peerId: waitingPeerId,
                    isInitiator: true
                });

            } else {
                // No match, add to queue
                await redisClient.rpush('waiting_queue', socket.id);
                console.log(`[QUEUE] ${socket.id} added to waiting queue`);
                socket.emit("waiting", {
                    message: "Searching for a stranger..."
                });
            }
        });

        socket.on("disconnect", async () => {
            console.log(`[DISCONNECT] ${socket.id}`);
            
            // Remove from waiting queue
            await redisClient.lrem('waiting_queue', 0, socket.id);
            
            // Check if they were in an active session
            const partnerId = await redisClient.hget('active_sessions', socket.id);

            if (partnerId) {
                console.log(`[DISCONNECT] Notifying partner ${partnerId}`);
                socket.to(partnerId).emit('peer_left', {
                    message: "Partner disconnected"
                });
                
                // Clean up session
                await redisClient.hdel('active_sessions', socket.id);
                await redisClient.hdel('active_sessions', partnerId);
            }
        });

        // WebRTC Signaling
        socket.on("offer", (data: { targetId: string; sdp: any }) => {
            console.log(`[OFFER] ${socket.id} ${data.targetId}`);
            socket.to(data.targetId).emit("offer", {
                senderId: socket.id,
                sdp: data.sdp
            });
        });

        socket.on("answer", (data: { targetId: string; sdp: any }) => {
            console.log(`[ANSWER] ${socket.id} → ${data.targetId}`);
            socket.to(data.targetId).emit("answer", {
                senderId: socket.id,
                sdp: data.sdp
            });
        });

        socket.on("ice-candidate", (data: { targetId: string; candidate: any }) => {
            const hasCandidate = data.candidate && data.candidate.candidate;
            console.log(`❄️ [ICE] ${socket.id} → ${data.targetId} ${hasCandidate ? '✅' : 'NULL'}`);
            
            // Forward the candidate exactly as received
            socket.to(data.targetId).emit("ice-candidate", {
                senderId: socket.id,
                candidate: data.candidate  
            });
        });

        socket.on("disconnect_peer", async (data: { targetId: string }) => {
            console.log(`[DISCONNECT_PEER] ${socket.id} disconnecting from ${data.targetId}`);
            
            const partnerId = await redisClient.hget('active_sessions', socket.id);
            
            if (partnerId === data.targetId) {
                socket.to(data.targetId).emit('peer_left', {
                    message: "Partner disconnected"
                });
                
                await redisClient.hdel('active_sessions', socket.id);
                await redisClient.hdel('active_sessions', data.targetId);
            }
        });
    });
};