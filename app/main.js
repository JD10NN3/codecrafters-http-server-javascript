const net = require("net");
const fs = require("fs");
const path = require("path");

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

const statusMessages = {
    200: "OK",
    201: "Created",
    404: "Not Found"
};

// the allowed paths in regex
const routeHandlers = {
    "^\\/$": () => {
        return {
            statusCode: 200,
            headers: {},
            body: ""
        };
    },
    "^\\/echo\\/(.*)$": (content) => {
        const contentType = "text/plain";
        const contentLength = Buffer.byteLength(content, "utf-8");
        return {
            statusCode: 200,
            headers: {
            "Content-Type": contentType,
            "Content-Length": contentLength
            },
            body: content
        };
    },
    "^\\/user-agent$": (headers) => {
        const userAgent = headers["User-Agent"];
        const contentType = "text/plain";
        const contentLength = Buffer.byteLength(userAgent, "utf-8");
        return {
            statusCode: 200,
            headers: {
                "Content-Type": contentType,
                "Content-Length": contentLength
            },
            body: userAgent
        };
    },
    "^\\/files\\/(.*)$": (filename, headers, requestBody, method) => {
        const response = {
            statusCode: 200,
            headers: {},
            body: ""
        };

        const directory = process.argv[3];
        const filePath = path.join(directory, filename);

        // if method is POST, write the content to the file
        if (method === "POST") {
            fs.writeFileSync(filePath, requestBody);
            response.statusCode = 201;
        } else {
            if (fs.existsSync(filePath)) {
                const contentType = "application/octet-stream";
                const content = fs.readFileSync(filePath);
                const contentLength = Buffer.byteLength(content, "utf-8");
                response.headers = {
                    "Content-Type": contentType,
                    "Content-Length": contentLength
                };
                response.body = content;
            } else {
                response.statusCode = 404;
            }
        }
        
        return response;
    },
};

const executeHandler = (path, headers, requestBody = "", method) => {
    let handlerFound = false;
    let response = null;
    for (const [pattern, handler] of Object.entries(routeHandlers)) {
        const match = path.match(new RegExp(pattern));
        if (match) {
            response = handler(...match.slice(1), headers, requestBody, method);
            handlerFound = true;
            break;
        }
    }

    // if no handler found, return 404
    if (!handlerFound) {
        response = {
            statusCode: 404,
            headers: {},
            body: ""
        };
    }

    return response;
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

        let requestBody = ""
        if (method === "POST") {
            requestBody = lines[lines.length - 1];
        }

        // execute the handler for the path
        const response = executeHandler(path, headers, requestBody, method);
        socket.write(`HTTP/1.1 ${response.statusCode} ${statusMessages[response.statusCode]}\r\n`);
        
        // check if the client accepts a specific encoding and add the headers
        if (headers["Accept-Encoding"] === "gzip") {
            response.headers["Content-Encoding"] = "gzip";
        }
        
        // compose the headers
        for (const [key, value] of Object.entries(response.headers)) {
            socket.write(`${key}: ${value}\r\n`);
        }

        // write the body and close the connection
        socket.write("\r\n");
        socket.write(response.body);
        socket.end();

    });

    socket.on("close", () => {
        socket.end();
    });
});

server.listen(4221, "localhost");
