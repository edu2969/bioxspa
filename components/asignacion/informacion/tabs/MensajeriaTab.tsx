import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useChatSocket } from '@/lib/hooks/useChatSocket';
import type { IComentarioCobro } from '@/types/venta';
import { IRutaDespacho } from '@/types/rutaDespacho';

interface TypingUser {
    userId: string;
    userName: string;
    isTyping: boolean;
}

export default function MensajeriaTab({ rutaDespacho }: { 
    rutaDespacho: IRutaDespacho | null
}) {
    const { data: session } = useSession();
    const [newMessage, setNewMessage] = useState<string>('');
    const [messages, setMessages] = useState<IComentarioCobro[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [sending, setSending] = useState<boolean>(false);
    const [typingUsers, setTypingUsers] = useState<string[]>([]);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const isTypingRef = useRef<boolean>(false);

    // Callbacks para socket events
    const handleMessageReceived = useCallback((mensaje: IComentarioCobro) => {
        setMessages(prevMessages => [...prevMessages, mensaje]);
    }, []);

    const handleUserTyping = useCallback((data: TypingUser) => {
        if (data.userId !== session?.user?.id) {
            setTypingUsers(prev => {
                if (data.isTyping) {
                    return prev.includes(data.userName) ? prev : [...prev, data.userName];
                } else {
                    return prev.filter(user => user !== data.userName);
                }
            });
        }
    }, [session?.user?.id]);

    const handleMessageStatusUpdate = useCallback((data: { messageId: string; status: string }) => {
        setMessages(prevMessages =>
            prevMessages.map(msg =>
                String(msg) === data.messageId
                    ? { ...msg, status: data.status }
                    : msg
            )
        );
    }, []);

    // Hook de socket chat
    const { sendSocketMessage, sendTyping, disconnect } = useChatSocket(
        rutaDespacho?._id,
        handleMessageReceived,
        handleUserTyping,
        handleMessageStatusUpdate
    );

    // Cleanup al desmontar el componente
    useEffect(() => {
        return () => {
            disconnect();
        };
    }, [disconnect]);

    const scrollToBottom = () => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const fetchComentarios = useCallback(async () => {
        if (!rutaDespacho?._id) return;

        setLoading(true);
        try {
            const response = await fetch(`/api/ventas/comentarios?ventaId=${rutaDespacho._id}`);
            const data = await response.json();

            if (data.ok) {
                const comentariosFormateados: IComentarioCobro[] = data.comentarios.map((comentario: IComentarioCobro) => ({
                    usuario: comentario.userId.name || 'Usuario',
                    email: comentario.userId.email || '',
                    mensaje: comentario.comentario,
                    fecha: new Date(comentario.fecha).toISOString().split('T')[0],
                    hora: new Date(comentario.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                    esPropio: comentario.userId._id === session?.user?.id,
                    status: 'delivered',
                    createdAt: comentario.createdAt,
                    updatedAt: comentario.updatedAt,                    
                }));
                setMessages(comentariosFormateados);
            } else {
                // eslint-disable-next-line no-console
                console.error('Error fetching comentarios:', data.error);
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error fetching comentarios:', error);
        } finally {
            setLoading(false);
        }
    }, [rutaDespacho?._id, session?.user?.id]);

    // Cargar comentarios al montar el componente
    useEffect(() => {
        if (rutaDespacho?._id) {
            fetchComentarios();
        }
    }, [rutaDespacho?._id, fetchComentarios]);

    // Scroll al fondo cuando se agregan mensajes
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !rutaDespacho?._id || sending) return;

        const messageText = newMessage.trim();

        // Crear mensaje temporal con estado "sending"
        const tempMessage: IComentarioCobro = {
            userId: session?.user?.name || 'Usuario',
            comentario: messageText,
            fecha: new Date()            
        };

        setMessages(prevMessages => [...prevMessages, tempMessage]);
        setNewMessage('');
        setSending(true);

        try {
            const response = await fetch('/api/ventas/comentarios', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ventaId: rutaDespacho._id,
                    comentario: messageText
                })
            });

            const data = await response.json();

            if (data.ok) {
                const realMessage: IComentarioCobro = {
                    userId: data.comentario.usuario?.nombre || 'Usuario',
                    comentario: data.comentario.comentario,
                    fecha: new Date(data.comentario.fecha),
                    createdAt: data.comentario.createdAt,
                    updatedAt: data.comentario.updatedAt                    
                };
                sendSocketMessage(realMessage);
            } else {
                console.error('Error sending message:', data.error);
                alert('Error al enviar el mensaje. Por favor intenta nuevamente.');
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error sending message:', error);
            alert('Error al enviar el mensaje. Por favor intenta nuevamente.');
        } finally {
            setSending(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setNewMessage(value);

        if (value.trim() && !isTypingRef.current) {
            isTypingRef.current = true;
            sendTyping(true);
        } else if (!value.trim() && isTypingRef.current) {
            isTypingRef.current = false;
            sendTyping(false);
        }
    };

    const groupMessagesByDate = (msgs: IComentarioCobro[]) => {
        const groups: Record<string, IComentarioCobro[]> = {};
        msgs.forEach(msg => {
            const dateStr = typeof msg.fecha === 'string' ? msg.fecha : new Date(msg.fecha).toISOString().split('T')[0];
            if (!groups[dateStr]) {
                groups[dateStr] = [];
            }
            groups[dateStr].push(msg);
        });
        return groups;
    };

    const formatDate = (dateString: string) => {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        if (dateString === today) return 'Hoy';
        if (dateString === yesterday) return 'Ayer';

        return new Date(dateString).toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short'
        });
    };

    const messageGroups = groupMessagesByDate(messages);

    return {
        newMessage,
        setNewMessage,
        messages,
        setMessages,
        loading,
        sending,
        typingUsers,
        chatEndRef,
        chatContainerRef,
        isTypingRef,
        handleSendMessage,
        handleKeyPress,
        handleInputChange,
        messageGroups,
        formatDate
    };
}
