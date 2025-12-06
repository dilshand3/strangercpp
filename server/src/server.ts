import { createServer } from "http";
import { Server } from "socket.io";
import Redis from "ioredis";
import { app } from "./app";
import { initializeMatchHandler } from "./controller/matchHandler.controller";

const port = process.env.PORT || 2093;
const REDIS_URL = 'redis://localhost:6379';

const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const redisClient = new Redis(REDIS_URL);

initializeMatchHandler(io, redisClient);

httpServer.listen(port, () => {
    console.log(`\n🚀 Server is running on port ${port}`);
    console.log(`📡 Socket.io is ready for WebRTC signaling`);
});