import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.SOCKET_HOSTNAME || "localhost";
const port = parseInt(process.env.SOCKET_PORT || "3000", 10);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    const httpServer = createServer(handle);
    const io = new Server(httpServer);
    io.on("connection", (socket) => {
        console.log("User connected:", socket.id);
        
        socket.on("chofer_connected", (data) => {
            socket.join(data.choferId); 
            console.log("Chofer connected:", data);
            socket.emit("chofer_connected", `${data.choferId} connected`);
        })

        socket.on("disconnect", () => {
            console.log("User disconnected:", socket.id);
        });
    });

    io.on("chofer_notification", (data) => {

    });

    httpServer.listen(port, () => {
        console.log(`Server is running on http://${hostname}:${port}`);
    })
});
