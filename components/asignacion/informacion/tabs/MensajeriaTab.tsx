"use client";

import React, { useState, useEffect, useRef, useCallback, ChangeEvent, KeyboardEvent } from 'react';

// Tipos para los mensajes y handlers
type MessageStatus = 'sending' | 'delivered';

export type MessageType = {
    id: string;
    usuario: string;
    email: string;
    mensaje: string;
    fecha: string; // formato ISO (yyyy-mm-dd)
    hora: string;  // formato HH:mm
    esPropio: boolean;
    avatar: string;
    status: MessageStatus;
    createdAt?: string;
    updatedAt?: string;
    isTemp?: boolean;
    _id?: string;
};

type TypingUserData = {
    userId: string;
    userName: string;
    isTyping: boolean;
};

type MessageStatusUpdate = {
    messageId: string;
    status: MessageStatus;
};
import Image from 'next/image';
import { BsCheck2All, BsCheck2 } from 'react-icons/bs';
import { MdSend } from 'react-icons/md';
import { useSession } from 'next-auth/react';
import { useChatSocket } from '@/lib/hooks/useChatSocket';
import { useQuery } from '@tanstack/react-query';

interface MensajeriaTabProps {
  ventaId: string | null;
}

export default function MensajeriaTab({ ventaId }: MensajeriaTabProps) {
    const { data: session } = useSession();
    const [newMessage, setNewMessage] = useState<string>('');
    const [messages, setMessages] = useState<MessageType[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [sending, setSending] = useState<boolean>(false);
    const [typingUsers, setTypingUsers] = useState<string[]>([]);
    const chatEndRef = useRef<HTMLDivElement | null>(null);
    const chatContainerRef = useRef<HTMLDivElement | null>(null);
    const isTypingRef = useRef<boolean>(false);

    const { data: mensajes } = useQuery({
        queryKey: ['venta-mensajes', ventaId],
        queryFn: async () => {
            const response = await fetch(`/api/ventas/mensajeria?ventaId=${ventaId}`);
            const data = await response.json();
            return data.mensajes;
        }
    })

    // Callbacks para socket events
    const handleMessageReceived = useCallback((mensaje: MessageType) => {
        setMessages(prevMessages => [...prevMessages, mensaje]);
    }, []);

    const handleUserTyping = useCallback((data: TypingUserData) => {
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

    const handleMessageStatusUpdate = useCallback((data: MessageStatusUpdate) => {
        setMessages(prevMessages => 
            prevMessages.map(msg => 
                msg.id === data.messageId 
                    ? { ...msg, status: data.status }
                    : msg
            )
        );
    }, []);

    // Hook de socket chat
    const { sendSocketMessage, sendTyping, disconnect } = useChatSocket(
        ventaId,
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

    // Scroll al fondo cuando se agregan mensajes
    useEffect(() => {
        scrollToBottom();
    }, [messages]);    

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !ventaId || sending) return;

        const tempId = Date.now().toString();
        const messageText = newMessage.trim();
        
        // Crear mensaje temporal con estado "sending"
        const tempMessage: MessageType = {
            id: tempId,
            usuario: session?.user?.name || 'Usuario',
            email: session?.user?.email || '',
            mensaje: messageText,
            fecha: new Date().toISOString().split('T')[0],
            hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            esPropio: true,
            avatar: session?.user?.email ? `${session.user.email.split('@')[0]}.jpg` : 'default.jpg',
            status: 'sending' as MessageStatus,
            isTemp: true
        };

        // Agregar mensaje temporal inmediatamente
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
                    ventaId: ventaId,
                    comentario: messageText
                })
            });

            const data = await response.json();

            if (data.ok) {
                const realMessage: MessageType = {
                    id: data.comentario._id,
                    usuario: data.comentario.usuario?.nombre || 'Usuario',
                    email: data.comentario.usuario?.email || '',
                    mensaje: data.comentario.comentario,
                    fecha: new Date(data.comentario.fecha).toISOString().split('T')[0],
                    hora: new Date(data.comentario.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                    esPropio: true,
                    avatar: data.comentario.usuario?.avatar || 'default.jpg',
                    status: 'delivered' as MessageStatus,
                    createdAt: data.comentario.createdAt,
                    updatedAt: data.comentario.updatedAt
                };

                // Reemplazar mensaje temporal con mensaje real
                setMessages(prevMessages => 
                    prevMessages.map(msg => 
                        msg.id === tempId ? realMessage : msg
                    )
                );

                // Enviar via socket para notificar a otros usuarios
                sendSocketMessage(realMessage);
                
            } else {
                // Remover mensaje temporal si hay error
                setMessages(prevMessages => 
                    prevMessages.filter(msg => msg.id !== tempId)
                );
                console.error('Error sending message:', data.error);
                alert('Error al enviar el mensaje. Por favor intenta nuevamente.');
            }
        } catch (error) {
            // Remover mensaje temporal si hay error
            setMessages(prevMessages => 
                prevMessages.filter(msg => msg.id !== tempId)
            );
            console.error('Error sending message:', error);
            alert('Error al enviar el mensaje. Por favor intenta nuevamente.');
        } finally {
            setSending(false);
        }
    };

    const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.currentTarget.value;
        setNewMessage(value);
        
        // Manejar typing indicator
        if (value.trim() && !isTypingRef.current) {
            isTypingRef.current = true;
            sendTyping(true);
        } else if (!value.trim() && isTypingRef.current) {
            isTypingRef.current = false;
            sendTyping(false);
        }
    };

    const groupMessagesByDate = (messages: MessageType[]) => {
        const groups: { [date: string]: MessageType[] } = {};
        messages.forEach(msg => {
            const date = msg.fecha;
            if (!groups[date]) {
                groups[date] = [];
            }
            groups[date].push(msg);
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

    return (
        <div className="h-72 flex flex-col">
            {/* Chat área */}
            <div 
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-2 bg-gray-50 rounded-t-lg border"
            >
                {loading ? (
                    <div className="flex justify-center items-center h-full">
                        <div className="text-sm text-gray-500">Cargando mensajes...</div>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex justify-center items-center h-full">
                        <div className="text-sm text-gray-500">No hay mensajes aún. ¡Escribe el primero!</div>
                    </div>
                ) : (
                    <>
                        {Object.entries(messageGroups).map(([date, msgs]) => (
                            <div key={date}>
                                {/* Separador de fecha */}
                                <div className="flex justify-center my-2">
                                    <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">
                                        {formatDate(date)}
                                    </span>
                                </div>
                                
                                {/* Mensajes del día */}
                                {msgs.map((msg) => (
                                    <div key={msg._id} className={`flex mb-2 ${msg.esPropio ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`flex max-w-xs ${msg.esPropio ? 'flex-row-reverse' : 'flex-row'} items-end`}>
                                            {/* Avatar */}
                                            <div className={`w-8 h-8 flex-shrink-0 rounded-full overflow-hidden ${msg.esPropio ? 'ml-2' : 'mr-2'}`}>
                                                <Image
                                                    src={`/profiles/${msg.avatar}`}
                                                    alt={`${msg.usuario} avatar`}
                                                    width={32}
                                                    height={32}
                                                    className="w-8 h-8 object-cover"
                                                    onError={(e) => {
                                                        e.currentTarget.src = '/profiles/default.jpg';
                                                    }}
                                                />
                                            </div>
                                            
                                            {/* Burbuja de mensaje */}
                                            <div className={`rounded-lg px-3 py-2 shadow-sm ${
                                                msg.esPropio 
                                                    ? 'bg-blue-500 text-white' 
                                                    : 'bg-white text-gray-800 border'
                                            }`}>
                                                {!msg.esPropio && (
                                                    <div className="text-xs font-semibold mb-1 text-blue-600">
                                                        {msg.usuario}
                                                    </div>
                                                )}
                                                <div className="text-sm break-words">{msg.mensaje}</div>
                                                <div className={`text-xs mt-1 flex items-center ${
                                                    msg.esPropio ? 'text-blue-100 justify-end' : 'text-gray-500'
                                                }`}>
                                                    <span>{msg.hora}</span>
                                                    {msg.esPropio && (
                                                        <div className="ml-1">
                                                            {msg.status === 'sending' ? (
                                                                <div className="w-3 h-3 border border-blue-200 border-t-transparent rounded-full animate-spin"></div>
                                                            ) : msg.status === 'delivered' ? (
                                                                <BsCheck2All className="text-green-300" />
                                                            ) : (
                                                                <BsCheck2 className="text-blue-200" />
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                        
                        {/* Indicador de typing */}
                        {typingUsers.length > 0 && (
                            <div className="flex mb-2 justify-start">
                                <div className="flex flex-row items-end">
                                    <div className="w-8 h-8 flex-shrink-0 rounded-full overflow-hidden mr-2 bg-gray-300 flex items-center justify-center">
                                        <span className="text-xs text-gray-600">...</span>
                                    </div>
                                    <div className="rounded-lg px-3 py-2 shadow-sm bg-gray-200">
                                        <div className="text-xs text-gray-600 mb-1">
                                            {typingUsers.join(', ')} está{typingUsers.length > 1 ? 'n' : ''} escribiendo...
                                        </div>
                                        <div className="flex space-x-1">
                                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        <div ref={chatEndRef} />
                    </>
                )}
            </div>
            
            {/* Input para nuevo mensaje */}
            <div className="flex items-center p-2 bg-white border-t border-l border-r rounded-b-lg">
                <input
                    type="text"
                    placeholder="Escribe un mensaje..."
                    value={newMessage}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    disabled={sending || !ventaId}
                    className="flex-1 px-3 py-2 text-sm border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sending || !ventaId}
                    className="ml-2 p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                    {sending ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <MdSend className="w-4 h-4" />
                    )}
                </button>
            </div>
        </div>
    );
}