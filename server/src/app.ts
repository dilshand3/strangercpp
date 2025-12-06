import dotenv from "dotenv";
dotenv.config({
    path: './.env'
});
import express from "express";
import cors from "cors";
const app = express();

app.use(cors({
    origin: "*",
    credentials: true
}));
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Server is running")
});

export { app };