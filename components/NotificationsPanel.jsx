"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const users = [
    {
        id: 1,
        userId: 'cristian_rodriguez',
        name: 'Cristian Rodriguez Z',
        avatar: 'cristian.jpg'
    },
    {
        id: 2,
        userId: 'miguel_araneda',
        name: 'Miguel Araneda H',
        avatar: 'miguel.jpg'
    },
    {
        id: 3,
        userId: 'lilian_carrillo',
        name: 'Lilian Carrillo Diaz',
        avatar: 'lilian.jpg'
    },
    {
        id: 4,
        userId: 'alex_jara',
        name: 'Alex Jara',
        avatar: 'alex.jpg'
    }
];

const notificationTypes = [{
    context: 'oficina',
    severyty: 'info',
    message: 'Ha vencido un cobro de $970.998 a 30 días'
}, {
    context: 'bodega',
    severity: 'warning',
    message: 'No hay suficiente '
}, {
    context: 'oficina',
    severity: 'critical',
    message: 'Se necesita autorización de crédito por $2.128.993'
}, {
    context: 'oficina',
    severity: 'warning',
    message: 'Ha vencido un pago $1.000.000'
}, {
    context: 'bodega',
    severity: 'info',
    message: 'Han llegado los tubos orden 99883'
}, {
    context: 'bodega',
    severity: 'critical',
    message: 'Todos los tubos en tránsito y prestados'
}, {
    context: 'oficina',
    severity: 'warning',
    message: 'Debe ser asignado un chofer'
}, {
    context: 'oficina',
    severity: 'critical',
    message: 'No hay choferes disponibles'
}, {
    context: 'bodega',
    severity: 'warning',
    message: 'Se solicita autorización de despacho'
}, {
    context: 'bodega',
    severity: 'critical',
    message: 'Dos equipo han vencido'
}, {
    context: 'oficina',
    severity: 'info',
    message: 'Falta un mes para revisión técnica FH-JS33'
}]

const fetchNotifications = () => {
    const randomNotifications = [];
    for (let i = 0; i < notificationTypes.length; i++) {
        const user = users[Math.floor(Math.random() * users.length)];
        randomNotifications.push({
            id: i + 1,
            createdAt: new Date(Date.now() - Math.floor(Math.random() * 1000000000)),
            userId: user.id,
            severity: notificationTypes[i].severity,
            message: notificationTypes[i].message
        });
    }
    return randomNotifications;
};

const getUserById = (id) => {
    return users.find(user => user.id === id);
};

export default function NotificationsPanel({ visible, onClick }) {
  const [notifications, setNotifications] = useState([]);
  const initData = useRef(false);

  useEffect(() => {
    if (initData.current) return;
    initData.current = true;
    const n = fetchNotifications();    
    setNotifications(n);    
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
        <div className="flex p-4 border-b">
            <button
                onClick={() => onClick()}
                className="text-4xl cursor-pointer -mt-2"
            >
                &times;
            </button>
            <div className="font-bold text-xl ml-2">NOTIFICACIONES</div>            
        </div>
        <ul className="pl-2 overflow-y-auto" style={{ height: 'calc(100% - 56px)' }}>
            {notifications.map(notification => {
                const user = getUserById(notification.userId);
                return (
                    <li key={notification.id} className="p-2 rounded-lg shadow mb-2 flex items-start cursor-pointer hover:bg-gray-100">
                        <Image width={24} height={24} src={`/profiles/${user.avatar}`} alt={user.name} className="w-10 h-10 rounded-full mr-2"/>                        
                        <div className="flex-1">
                            <div className="flex justify-between">
                                <strong>{user.name}</strong>
                                <p className="text-xs text-gray-500">{notification.createdAt.toLocaleString()}</p>
                            </div>
                            <p className="text-sm">{notification.message}</p>
                        </div>
                    </li>
                );
            })}
        </ul>
    </div>
);
}