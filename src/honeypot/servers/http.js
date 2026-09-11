import http from 'http';
import { addHttpLog } from "../../db/database.js";
import { handleConnection } from "../connectionHandler.js";
import * as dotenv from "dotenv";

dotenv.config();

const MAX_BODY_SIZE = Number(process.env.MAX_BODY_SIZE) || 1024 * 1024;

function generateFakeResponse(url) {
    const cleanUrl = url.toLowerCase().split('?')[0];

    if (cleanUrl.includes('wp-login.php') || cleanUrl.includes('wp-admin')) {
        return {
            status: 200,
            headers: { 'Content-Type': 'text/html; charset=UTF-8', 'Server': 'Apache/2.4.41 (Ubuntu)' },
            body: '<form method="post" action="/wp-login.php"><input name="log" id="user_login"><input type="password" name="pwd" id="user_pass"></form>'
        };
    }

    if (cleanUrl.includes('.env')) {
        return {
            status: 200,
            headers: { 'Content-Type': 'text/plain', 'Server': 'nginx/1.18.0' },
            body: 'APP_ENV=production\nAPP_DEBUG=false\nDB_CONNECTION=mysql\nDB_HOST=127.0.0.1\nDB_PORT=3306\nDB_DATABASE=corporate_db\nDB_USERNAME=root\nDB_PASSWORD=SuperSecretRootPassword2026!\n'
        };
    }

    if (cleanUrl.includes('.git/config')) {
        return {
            status: 200,
            headers: { 'Content-Type': 'text/plain', 'Server': 'nginx/1.18.0' },
            body: '[core]\n\trepositoryformatversion = 0\n\tfilemode = true\n\tbare = false\n[remote "origin"]\n\turl = https://github.com/internal-corp/prod-api.git\n'
        };
    }

    if (cleanUrl.includes('phpmyadmin') || cleanUrl.includes('pma')) {
        return {
            status: 200,
            headers: { 'Content-Type': 'text/html; charset=utf-8', 'Server': 'Apache/2.4.41 (Ubuntu)' },
            body: '<title>phpMyAdmin</title><form method="post" action="index.php"><input type="text" name="pma_username"><input type="password" name="pma_password"></form>'
        };
    }

    return {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=UTF-8', 'Server': 'Apache/2.4.41 (Ubuntu)' },
        body: '<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN"><html><head><title>404 Not Found</title></head><body><h1>Not Found</h1><p>The requested URL was not found on this server.</p></body></html>'
    };
}

export function startHttpServer(io) {
    const server = http.createServer((req, res) => {
        const reqUrl = req.url;
        const reqIp = req.socket.remoteAddress;
        const reqPort = req.socket.remotePort;
        const localPort = req.socket.localPort;
        const method = req.method;
        const headersJson = JSON.stringify(req.headers);

        if (!handleConnection(io, reqIp, localPort)) {
            res.writeHead(403);
            res.end();
            return;
        }

        let totalSize = 0;
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

            const fakeResponse = generateFakeResponse(reqUrl);

            res.writeHead(fakeResponse.status, fakeResponse.headers);
            res.end(fakeResponse.body);

            addHttpLog({
                sourceIp: reqIp,
                sourcePort: reqPort,
                method,
                headers: headersJson,
                bodyPayload: typeof body === 'string' ? body : JSON.stringify(body),
                targetPort: localPort,
                url: reqUrl,
                responseStatus: fakeResponse.status
            });

            console.log(`[HTTP-HONEYPOT] ${method} ${reqUrl} - ${fakeResponse.status} from ${reqIp}`);
        });

        req.on('error', (err) => {
            console.log(`[HTTP ERROR] ${reqIp}: ${err.message}`);
        });
    });

    server.listen(8080, '0.0.0.0', () => {
        console.log('HTTP server listening on port 8080');
    });
}