import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useSession } from 'next-auth/react';

export const useChatSocket = (ventaId, onMessageReceived, onUserTyping, onMessageStatusUpdate) => {
    const { data: session } = useSession();
    const socketRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    // Inicializar conexión socket
    useEffect(() => {
        if (!ventaId || !session?.user?.id) return;

        // Crear conexión socket si no existe
        if (!socketRef.current) {
            socketRef.current = io({
                path: '/socket.io',
                transports: ['websocket']
            });
        }

        const socket = socketRef.current;

        // Eventos del socket
        socket.on('connect', () => {
            console.log('Socket connected for chat:', socket.id);
            // Unirse al chat específico de esta venta
            socket.emit('join-chat', {
                ventaId: ventaId,
                userId: session.user.id,
                userName: session.user.name
            });
        });

        socket.on('message-received', onMessageReceived);
        socket.on('user-typing', onUserTyping);
        socket.on('message-status-update', onMessageStatusUpdate);

        socket.on('disconnect', () => {
            console.log('Socket disconnected');
        });

        return () => {
            if (socket) {
                // Salir del chat al desmontar
                socket.emit('leave-chat', {
                    ventaId: ventaId,
                    userId: session.user.id
                });
            }
        };
    }, [ventaId, session?.user?.id, session?.user?.name, onMessageReceived, onUserTyping, onMessageStatusUpdate]);

    // Función para enviar mensaje via socket
    const sendSocketMessage = useCallback((mensaje) => {
        if (socketRef.current && ventaId && session?.user?.id) {
            socketRef.current.emit('new-chat-message', {
                ventaId: ventaId,
                userId: session.user.id,
                userName: session.user.name,
                mensaje: mensaje
            });
        }
    }, [ventaId, session?.user?.id, session?.user?.name]);

    // Función para indicar que se está escribiendo
    const sendTyping = useCallback((isTyping) => {
        if (socketRef.current && ventaId && session?.user?.id) {
            socketRef.current.emit('typing', {
                ventaId: ventaId,
                userId: session.user.id,
                userName: session.user.name,
                isTyping: isTyping
            });

            // Si está escribiendo, establecer timeout para dejar de escribir
            if (isTyping) {
                if (typingTimeoutRef.current) {
                    clearTimeout(typingTimeoutRef.current);
                }
                typingTimeoutRef.current = setTimeout(() => {
                    socketRef.current?.emit('typing', {
                        ventaId: ventaId,
                        userId: session.user.id,
                        userName: session.user.name,
                        isTyping: false
                    });
                }, 2000);
            }
        }
    }, [ventaId, session?.user?.id, session?.user?.name]);

    // Función para confirmar entrega de mensaje
    const confirmMessageDelivery = useCallback((messageId) => {
        if (socketRef.current && ventaId) {
            socketRef.current.emit('message-delivered', {
                ventaId: ventaId,
                messageId: messageId
            });
        }
    }, [ventaId]);

    // Función para desconectar socket
    const disconnect = useCallback(() => {
        if (socketRef.current) {
            if (ventaId && session?.user?.id) {
                socketRef.current.emit('leave-chat', {
                    ventaId: ventaId,
                    userId: session.user.id
                });
            }
            socketRef.current.disconnect();
            socketRef.current = null;
        }
        
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }
    }, [ventaId, session?.user?.id]);

    return {
        sendSocketMessage,
        sendTyping,
        confirmMessageDelivery,
        disconnect,
        isConnected: socketRef.current?.connected || false
    };
};