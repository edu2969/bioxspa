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
        console.log("SOCKET-IO: User connected:", socket.id);
        
        socket.on("join-room", (data) => {
            console.log("SOCKET-IO: join-room", data);
            socket.join(data.room); 
            console.log(`SOCKET-IO: Ha entrado en ${data.room} el chofer ${data.userId}`);
        });

        socket.on("update-pedidos", (data) => {
            console.log("SOCKET-IO: update-pedidos", data);
            socket.to("room-pedidos").emit("update-pedidos", data);
        });

        socket.on("disconnect", () => {
            console.log("SOCKET-IO: User disconnected:", socket.id);
        });
    });

    httpServer.listen(port, () => {
        console.log(`Server is running on http://${hostname}:${port}`);
    })
});
