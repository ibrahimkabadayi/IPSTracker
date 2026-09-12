import http from 'http';
import { addHttpLog } from "../../db/database.js";
import { handleConnection } from "../connectionHandler.js";
import * as dotenv from "dotenv";
import {getApacheDefaultPage, getWordPressLoginPage} from "../fakeTemplates.js";
import { HONEY_TOKENS } from "../honeyTokens.js";

dotenv.config();

const MAX_BODY_SIZE = Number(process.env.MAX_BODY_SIZE) || 1024 * 1024;

function extractCredentials(rawBody, headers) {
    let username = null;
    let password = null;

    const contentType = headers['content-type'] || '';

    if (contentType.includes('application/x-www-form-urlencoded')) {
        const params = new URLSearchParams(rawBody);
        username = params.get('log') || params.get('username') || params.get('user') || params.get('email');
        password = params.get('pwd') || params.get('password') || params.get('pass');
    }
    else if (contentType.includes('application/json')) {
        try {
            const parsed = JSON.parse(rawBody);
            username = parsed.username || parsed.user || parsed.email;
            password = parsed.password || parsed.pass;
        } catch {
        }
    }

    return { username, password };
}

function generateFakeResponse(method, url, credentials) {
    const cleanUrl = url.toLowerCase().split('?')[0];
    const { username } = credentials;

    const defaultHeaders = {
        'Content-Type': 'text/html; charset=UTF-8',
        'Server': 'Apache/2.4.52 (Ubuntu)'
    };

    if (method === 'POST') {
        return {
            status: 200,
            headers: defaultHeaders,
            body: getWordPressLoginPage(`<strong>Error</strong>: The password you entered for the username <strong>${username || 'user'}</strong> is incorrect.`)
        };
    }

    if (cleanUrl === '/wp-login.php' || cleanUrl === '/wp-admin') {
        return {
            status: 200,
            headers: defaultHeaders,
            body: getWordPressLoginPage()
        };
    }

    if (cleanUrl.includes('.env')) {
        return {
            status: 200,
            headers: { 'Content-Type': 'text/plain', 'Server': 'Apache/2.4.52 (Ubuntu)' },
            body: `APP_NAME=UbuntuProductionPortal\nAPP_ENV=production\nDB_CONNECTION=mysql\nDB_HOST=127.0.0.1\nDB_DATABASE=prod_db\nDB_USERNAME=${HONEY_TOKENS.BAIT_USER}\nDB_PASSWORD=${HONEY_TOKENS.BAIT_PASSWORD}\n`
        };
    }

    if (cleanUrl === '/' || cleanUrl === '/index.html') {
        return {
            status: 200,
            headers: defaultHeaders,
            body: getApacheDefaultPage()
        };
    }

    return {
        status: 404,
        headers: defaultHeaders,
        body: '<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN"><html><head><title>404 Not Found</title></head><body><h1>Not Found</h1><p>The requested URL was not found on this server.</p><hr><address>Apache/2.4.52 (Ubuntu) Server at 127.0.0.1 Port 8080</address></body></html>'
    };
}

export function startHttpServer(io) {
    const server = http.createServer((req, res) => {
        const reqUrl = req.url;
        const reqIp = req.socket.remoteAddress;
        const reqPort = req.socket.remotePort;
        const localPort = req.socket.localPort;
        const method = req.method.toUpperCase();

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
            const credentials = extractCredentials(rawBody, req.headers);
            const { username, password } = credentials;

            if (method === 'POST' && (username || password)) {
                console.log(`[HTTP-AUTH] IP: ${reqIp} | Form Login -> User: "${credentials.username}" | Pass: "${credentials.password}"`);
                io.emit('threat:auth', {
                    protocol: 'http',
                    ip: reqIp,
                    port: reqPort,
                    username,
                    password,
                    url: reqUrl,
                    status: 'harvested',
                    timestamp: new Date().toISOString()
                });
            }

            const fakeResponse = generateFakeResponse(method, reqUrl, credentials);

            io.emit('threat:http_request', {
                ip: reqIp,
                method,
                url: reqUrl,
                status: fakeResponse.status,
                timestamp: new Date().toISOString()
            });

            res.writeHead(fakeResponse.status, fakeResponse.headers);
            res.end(fakeResponse.body);

            addHttpLog({
                sourceIp: reqIp,
                sourcePort: reqPort,
                method,
                headers: JSON.stringify(req.headers),
                bodyPayload: rawBody || null,
                targetPort: localPort,
                url: reqUrl,
                responseStatus: fakeResponse.status
            });
        });

        req.on('error', (err) => {
            console.log(`[HTTP ERROR] ${reqIp}: ${err.message}`);
        });
    });

    server.listen(8080, '0.0.0.0', () => {
        console.log('HTTP server listening on port 8080');
    });
}