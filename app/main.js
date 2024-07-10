const net = require("net");
const fs = require("fs");
const path = require("path");

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

// the allowed paths in regex
const routeHandlers = {
    "^\\/$": (socket) => {
        socket.write("HTTP/1.1 200 OK\r\n\r\n");
        socket.end();
    },
    "^\\/echo\\/(.*)$": (socket, content) => {
        const contentType = "text/plain";
        const contentLength = Buffer.byteLength(content, "utf-8");
        socket.write(`HTTP/1.1 200 OK\r\nContent-Type: ${contentType}\r\nContent-Length: ${contentLength}\r\n\r\n${content}`);
        socket.end();
    },
    "^\\/user-agent$": (socket, headers) => {
        const userAgent = headers["User-Agent"];
        const contentType = "text/plain";
        const contentLength = Buffer.byteLength(userAgent, "utf-8");
        socket.write(`HTTP/1.1 200 OK\r\nContent-Type: ${contentType}\r\nContent-Length: ${contentLength}\r\n\r\n${userAgent}`);
        socket.end();
    },
    "^\\/files\\/(.*)$": (socket, filename) => {
    
        const directory = process.argv[3];
        const filePath = path.join(directory, filename);
        console.log("File Path:", filePath);
        if (fs.existsSync(filePath)) {
            const contentType = "application/octet-stream";
            const content = fs.readFileSync(filePath);
            const contentLength = Buffer.byteLength(content, "utf-8");
            socket.write(`HTTP/1.1 200 OK\r\nContent-Type: ${contentType}\r\nContent-Length: ${contentLength}\r\n\r\n${content}`);
        } else {
            socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
        }
        socket.end();

    },
};

// Uncomment this to pass the first stage
const server = net.createServer((socket) => {

    socket.on("data", (data) => {
        const request = data.toString();
        const lines = request.split("\r\n");
        const [method, path, protocol] = lines[0].split(" ");

        const headers = {};
        for (let i = 1; i < lines.length - 2; i++) {
            const [key, value] = lines[i].split(": ");
            headers[key] = value;
        }
        
        console.log("Path:", path);
        console.log("Headers:", headers);

        // execute the proper handler
        let handlerFound = false;
        for (const [pattern, handler] of Object.entries(routeHandlers)) {
            const match = path.match(new RegExp(pattern));
            if (match) {
            handler(socket, ...match.slice(1), headers);
            handlerFound = true;
            break;
            }
        }
        
        // if no handler found, return 404
        if (!handlerFound) {
            socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
            socket.end();
        }
    });

    socket.on("close", () => {
        socket.end();
    });
});

server.listen(4221, "localhost");
