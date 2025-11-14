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

        // Evento para unirse a un chat específico de una venta
        socket.on("join-chat", (data) => {
            console.log("SOCKET-IO: join-chat", data);
            const chatRoom = `chat-venta-${data.ventaId}`;
            socket.join(chatRoom);
            console.log(`SOCKET-IO: Usuario ${data.userId} se unió al chat de la venta ${data.ventaId}`);
        });

        // Evento para salir de un chat específico
        socket.on("leave-chat", (data) => {
            console.log("SOCKET-IO: leave-chat", data);
            const chatRoom = `chat-venta-${data.ventaId}`;
            socket.leave(chatRoom);
            console.log(`SOCKET-IO: Usuario ${data.userId} salió del chat de la venta ${data.ventaId}`);
        });

        // Evento para indicar que alguien está escribiendo
        socket.on("typing", (data) => {
            const chatRoom = `chat-venta-${data.ventaId}`;
            socket.to(chatRoom).emit("user-typing", {
                userId: data.userId,
                userName: data.userName,
                isTyping: data.isTyping
            });
        });

        // Evento para nuevo mensaje en chat
        socket.on("new-chat-message", (data) => {
            console.log("SOCKET-IO: new-chat-message", data);
            const chatRoom = `chat-venta-${data.ventaId}`;
            // Emitir a todos en la sala excepto al remitente
            socket.to(chatRoom).emit("message-received", data.mensaje);
        });

        // Evento para confirmar entrega de mensaje
        socket.on("message-delivered", (data) => {
            const chatRoom = `chat-venta-${data.ventaId}`;
            socket.to(chatRoom).emit("message-status-update", {
                messageId: data.messageId,
                status: "delivered"
            });
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
        console.log(`SOCKET-IO: ServeR is running on http://${hostname}:${port}`);
    })
});
