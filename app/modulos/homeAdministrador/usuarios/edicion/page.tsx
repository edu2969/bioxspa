'use client'
import { useEffect, useState } from 'react';
import UserForm from '@/components/UserForm'
import { useSearchParams } from 'next/navigation';

export default function EdicionUsuario() {
    const [user, setUser] = useState({
        _id: "",
        name: "",
        email: "",
        role: "",
        password: "",
        password2: "",
        phone: "",
        address: "",
        dni: "",
        dateOfBirth: "",
    });
    const params = useSearchParams();
    async function loadUser(id: string) {
        console.log("GETTING USER..", new Date());
        const response = await fetch(`http://localhost:3000/api/users/${id}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            }
        });
        if (response.status == 201) {
            console.log("No se pudo obtener a la persona");
        }
        const data = await response.json();
        console.log("DATA", data);
        setUser(data.user);
    }

    useEffect(() => {
        const id = params.get("_id");
        if(id && user == null) loadUser(id);
    })
    
    return (user && <main className="p-6 mt-8 h-screen overflow-y-scroll"><UserForm/></main>);
}