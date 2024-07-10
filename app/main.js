const net = require("net");

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

// the allowed paths in regex
const allowedPaths = ["^\\/$", "^\\/echo\\/(.*)$"];

// Uncomment this to pass the first stage
const server = net.createServer((socket) => {

    socket.on("data", (data) => {
        const request = data.toString();
        const lines = request.split("\r\n");
        const [method, path, protocol] = lines[0].split(" ");
        console.log("Path:", path);

        // check if the path is allowed
        if (!allowedPaths.some(p => new RegExp(p).test(path))) {
            socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
            socket.end();
            return;
        }
            
        // check if the path is echo
        const echoMatch = path.match(new RegExp(allowedPaths[1]));
        if (echoMatch) {

            const content = echoMatch[1];
            const contentType = "text/plain";
            const contentLength = Buffer.byteLength(content, "utf-8");
            socket.write(`HTTP/1.1 200 OK\r\nContent-Type: ${contentType}\r\nContent-Length: ${contentLength}\r\n\r\n${content}`);
            
            socket.end();
            return;
        }

        socket.write("HTTP/1.1 200 OK\r\n\r\n");
        socket.end();
        
    });

    socket.on("close", () => {
        socket.end();
    });
});

server.listen(4221, "localhost");
