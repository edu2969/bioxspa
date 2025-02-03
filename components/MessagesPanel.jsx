"use client";
import { useEffect, useRef, useState } from "react";

const users = [
    {
        id: 1,
        userId: 'cristian_rodriguez',
        name: 'Cristian Rodriguez Z',
        avatar: 'crodriguez.jpg'
    },
    {
        id: 2,
        userId: 'miguel_araneda',
        name: 'Miguel Araneda H',
        avatar: 'maraneda.jpg'
    },
    {
        id: 3,
        userId: 'lilian_carrillo',
        name: 'Lilian Carrillo Diaz',
        avatar: 'lcarrillo.jpg'
    },
    {
        id: 4,
        userId: 'alex_jara',
        name: 'Alex Jara',
        avatar: 'ajara.jpg'
    }
];

const fetchMessages = () => {
    const topics = [
        {
            topicId: 1,
            topicName: 'Autorización de crédito',
            userIdOwner: 1,
            userIdsInvited: [2, 3],
            messages: [
                { userId: 1, text: 'Necesitamos autorización de crédito para el cliente X.', createdAt: new Date(Date.now() - 100000000) },
                { userId: 2, text: '¿Cuál es el monto requerido?', createdAt: new Date(Date.now() - 90000000) },
                { userId: 1, text: 'El monto es de $2.128.993.', createdAt: new Date(Date.now() - 80000000) },
                { userId: 3, text: 'Voy a revisar los documentos y les aviso.', createdAt: new Date(Date.now() - 70000000) },
                { userId: 2, text: 'Gracias, Lilian.', createdAt: new Date(Date.now() - 60000000) },
                { userId: 3, text: 'Autorización concedida.', createdAt: new Date(Date.now() - 50000000) }
            ],
            createdAt: new Date(Date.now() - 100000000),
            receivedAt: new Date(Date.now() - 90000000),
            seenAt: new Date(Date.now() - 80000000),
            topicCloseAt: new Date(Date.now() - 50000000)
        },
        {
            topicId: 2,
            topicName: 'Despacho de cilindros',
            userIdOwner: 2,
            userIdsInvited: [1, 4],
            messages: [
                { userId: 2, text: 'Tenemos un pedido de despacho para mañana.', createdAt: new Date(Date.now() - 40000000) },
                { userId: 4, text: '¿Cuántos cilindros son?', createdAt: new Date(Date.now() - 35000000) },
                { userId: 2, text: 'Son 50 cilindros de gas no inflamable.', createdAt: new Date(Date.now() - 30000000) },
                { userId: 1, text: '¿Está listo el transporte?', createdAt: new Date(Date.now() - 25000000) },
                { userId: 4, text: 'Sí, el camión estará disponible a las 8 AM.', createdAt: new Date(Date.now() - 20000000) },
                { userId: 2, text: 'Perfecto, gracias.', createdAt: new Date(Date.now() - 15000000) }
            ],
            createdAt: new Date(Date.now() - 40000000),
            receivedAt: new Date(Date.now() - 35000000),
            seenAt: new Date(Date.now() - 30000000),
            topicCloseAt: new Date(Date.now() - 15000000)
        }
    ];
    return topics;
};

const getUserById = (id) => {
    return users.find(user => user.id === id);
};

export default function MessagesPanel({ visible, onClick }) {
    const [topics, setTopics] = useState([]);
    const initData = useRef(false);

    useEffect(() => {
        if (initData.current) return;
        initData.current = true;
        const t = fetchMessages();
        setTopics(t);
    }, []);

    return (
        <div
            style={{
                position: 'fixed',
                right: 0,
                top: 0,
                width: '560px',
                height: '100%',
                backgroundColor: 'white',
                boxShadow: '-2px 0 5px rgba(0,0,0,0.5)',
                transition: 'transform 0.3s ease-in-out',
                transform: visible ? 'translateX(0)' : 'translateX(100%)'
            }}
        >
            <div className="flex p-4">
                <button
                    onClick={() => onClick()}
                    className="text-4xl cursor-pointer -mt-2"
                >
                    &times;
                </button>
                <div className="font-bold text-xl ml-2">MENSAJES</div>
            </div>
            <ul className="pl-2 overflow-y-auto" style={{ height: 'calc(100% - 56px)' }}>
                {topics.map(topic => {
                    const lastMessage = topic.messages[topic.messages.length - 1];
                    const user = getUserById(lastMessage.userId);
                    return (
                        <li key={topic.topicId} className="p-2 rounded-lg shadow mb-2 flex items-start cursor-pointer hover:bg-gray-100">
                            <div className="flex-1">
                                <div className="flex justify-between">
                                    <strong>{topic.topicName} #{topic.topicId}</strong>
                                    <p className="text-xs text-gray-500 relative -left-4">{topic.createdAt.toLocaleString()}</p>
                                </div>
                                <p className="text-sm">
                                    {lastMessage.text.length > 50 ? `${lastMessage.text.substring(0, 50)}...` : lastMessage.text}
                                </p>
                            </div>                            
                            <div className="flex items-center ml-2">
                                <img src={`/profiles/${getUserById(topic.userIdOwner).avatar}`} alt={getUserById(topic.userIdOwner).name} className="w-8 h-8 rounded-full border-2 border-white -ml-4" />
                                {topic.userIdsInvited.map(userId => {
                                    const invitedUser = getUserById(userId);
                                    return (
                                        <img key={userId} src={`/profiles/${invitedUser.avatar}`} alt={invitedUser.name} className="w-8 h-8 rounded-full border-2 border-white -ml-4" />
                                    );
                                })}
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}