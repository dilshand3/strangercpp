"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const ioredis_1 = __importDefault(require("ioredis"));
const app_1 = require("./app");
const matchHandler_controller_1 = require("./controller/matchHandler.controller");
const port = process.env.PORT || 2093;
const REDIS_URL = 'redis://localhost:6379';
const httpServer = (0, http_1.createServer)(app_1.app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const redisClient = new ioredis_1.default(REDIS_URL);
(0, matchHandler_controller_1.initializeMatchHandler)(io, redisClient);
httpServer.listen(port, () => {
    console.log(`\n🚀 Server is running on port ${port}`);
    console.log(`📡 Socket.io is ready for WebRTC signaling`);
});
