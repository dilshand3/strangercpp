"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeMatchHandler = void 0;
const initializeMatchHandler = (io, redisClient) => {
    redisClient.on("ready", () => console.log("Redis Client Connected Successfully."));
    redisClient.on("error", (err) => console.error("Redis Error:", err));
    io.on("connection", (socket) => {
        socket.on("find_match", (data) => __awaiter(void 0, void 0, void 0, function* () {
            const waitingPeerId = yield redisClient.lpop('waiting_queue');
            if (waitingPeerId) {
                yield redisClient.hset('active_sessions', waitingPeerId, socket.id);
                yield redisClient.hset('active_sessions', socket.id, waitingPeerId);
                io.to([waitingPeerId, socket.id]).emit('match_found', {
                    peerId: waitingPeerId,
                    senderId: socket.id
                });
            }
            else {
                yield redisClient.rpush('waiting_queue', socket.id);
                socket.emit("waiting", {
                    message: "Searching for a stranger..."
                });
            }
        }));
        socket.on("disconnect", () => __awaiter(void 0, void 0, void 0, function* () {
            console.log(`[Socket Disconnected] User ID: ${socket.id}`);
            yield redisClient.lrem('waiting_queue', 0, socket.id);
            const partnerId = yield redisClient.hget('active_sessions', socket.id);
            if (partnerId) {
                socket.to(partnerId).emit('peer_left', {
                    message: "Partner disconnected. Searching for a new Match..."
                });
                yield redisClient.hdel('active_sessions', socket.id, partnerId);
                yield redisClient.hdel('active_sessions', partnerId, socket.id);
            }
        }));
        socket.on("offer", (data) => {
            socket.to(data.targetId).emit("offer", {
                senderId: socket.id,
                sdp: data.sdp
            });
        });
        socket.on("answer", (data) => {
            socket.to(data.targetId).emit("answer", {
                senderId: socket.id,
                sdp: data.sdp
            });
        });
        socket.on("ice-candidate", (data) => {
            socket.to(data.targetId).emit("ice-candidate", {
                senderId: socket.id,
                sdp: data.sdp
            });
        });
    });
};
exports.initializeMatchHandler = initializeMatchHandler;
