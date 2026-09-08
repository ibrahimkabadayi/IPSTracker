import express from 'express';
import * as dotenv from "dotenv";
import {requestLogger} from "./src/middlewares/httpLogger.js";
import {initSocket} from "./src/socket/socketHandler.js";
import {initDb} from "./src/db/database.js";
import * as http from "node:http";
import {Server} from "socket.io";
import {startHoneypots} from "./src/honeypot/index.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

app.use(express.json());
app.use(requestLogger);

app.get("/", (req, res) => {
    res.send("Hello World!");
});

try {
    initSocket(io);
}catch (err){
    console.error(err);
}


server.listen(PORT, async () => {
    try{
        await initDb();
        startHoneypots(io);
        console.log(`Server started on port ${PORT}`);
    }catch (e){
        console.error("Database connection error:", e.message);
    }
});