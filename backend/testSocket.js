import { io } from "socket.io-client";

export function testSocket() {
    const socket = io("http://localhost:3000");

    console.log("🟡 Connecting to Socket.io server...");

    socket.on("connect", () => {
        console.log("🟢 Successfully connected! Listening for live threats...\n" + "=".repeat(60));
    });

    socket.on("threat:auth", (data) => {
        console.log(`\n🚨 [AUTH CAPTURED] Protocol: ${data.protocol.toUpperCase()}`);
        console.log(`   IP: ${data.ip}:${data.port || ''}`);
        console.log(`   User: ${data.username} | Password: ${data.password || '<none>'}`);
        console.log(`   Status: ${data.status} | Timestamp: ${data.timestamp}`);
    });

    socket.on("threat:command", (data) => {
        console.log(`\n💻 [COMMAND EXECUTED] [${data.protocol.toUpperCase()}] ${data.ip} -> "${data.command}"`);
    });

    socket.on("threat:http_request", (data) => {
        console.log(`\n🌐 [HTTP SCAN] ${data.ip} -> ${data.method} ${data.url} (${data.status})`);
    });

    socket.on("threat:session", (data) => {
        console.log(`\n🔌 [SESSION CLOSED] [${data.protocol.toUpperCase()}] ${data.ip} (Total commands: ${data.totalCommands})`);
    });

    socket.on("disconnect", () => {
        console.log("🔴 Disconnected.");
    });
}