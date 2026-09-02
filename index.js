import express from 'express';
import * as dotenv from "dotenv";
import {requestLogger} from "./src/middlewares/httpLogger";
import {initSocket} from "./src/socket/socketHandler";
import {initDb} from "./src/db/database";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.use(requestLogger);

app.get("/", (req, res) => {
    res.send("Hello World!");
});

initSocket(io);

app.listen(PORT, async () => {
    try{
        await initDb();
        console.log(`Server started on port ${PORT}`);
    }catch (e){
        console.error("Database connection error:", e.message);
    }
});