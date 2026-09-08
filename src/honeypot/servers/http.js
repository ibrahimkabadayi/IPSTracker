import http from 'http';
import {addHttpLog} from "../../db/database.js";
import {handleConnection} from "../connectionHandler.js";

let totalSize = 0;
const MAX_BODY_SIZE = 1024 * 1024;

export function startHttpServer(io) {
    const server = http.createServer((req, res) => {
        const reqUrl = req.url;
        const reqIp = req.socket.remoteAddress;
        const reqPort = req.socket.remotePort;
        const localPort = req.socket.localPort;
        const method = req.method;
        const headersJson = JSON.stringify(req.headers);

        handleConnection(io, reqIp, localPort);

        const chunks = [];
        req.on('data', (chunk) => {
            totalSize += chunk.length;
            if (totalSize > MAX_BODY_SIZE) {
                req.destroy();
                return;
            }
            chunks.push(chunk);
        });

        req.on('end', () => {
            const rawBody = Buffer.concat(chunks).toString();
            let body;
            try {
                body = JSON.parse(rawBody);
            } catch {
                body = rawBody;
            }

            const responseStatus = 200;
            res.writeHead(responseStatus, { 'Content-Type': 'text/plain' });
            res.end('Connection ended.');

            addHttpLog({
                sourceIp: reqIp,
                sourcePort: reqPort,
                method,
                headers: headersJson,
                bodyPayload: typeof body === 'string' ? body : JSON.stringify(body) ,
                targetPort: localPort,
                url: reqUrl,
                responseStatus
            });
        });

        req.on('error', (err) => {
            console.log(`[HTTP ERROR] ${reqIp}: ${err.message}`);
        });
    });

    server.listen(8080);
}

startHttpServer({ emit: () => {} });