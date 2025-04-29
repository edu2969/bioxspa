"use client";
import { AiFillHome, AiOutlineUser } from 'react-icons/ai'
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { USER_ROLE } from '@/app/utils/constants';
import Link from 'next/link';
import { IoIosArrowForward } from 'react-icons/io';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';

export default function UserForm() {
    const router = useRouter();
    const [clientes, setClientes] = useState([]);
    const [avatarImg, setAvatarImg] = useState();

    const {
        register,
        handleSubmit,
        setValue
    } = useForm();

    const roles = Object.keys(USER_ROLE).map(k => {
        return {
            label: k.toUpperCase().replace("_", " "),
            value: USER_ROLE[k],
        }
    })

    const params = useSearchParams();

    async function loadClientes() {
        console.log("GETTING CLIENTES..", new Date());
        const response = await fetch(`/api/clients`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            }
        });
        if (response.status == 201) {
            console.log("No se pudo obtener a los clientes");
        }
        const data = await response.json();
        console.log("DATA", data);
        setClientes(data.clients);
    }

    const loadUser = useCallbak(async (id) =>{
        const resp = await fetch(`/api/users/${id}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            }
        });
        if (resp.status == 201) {
            console.log("No se pudo obtener al usuario");
        }
        const data = await resp.json();
        console.log("DATA", data);
        updateFormValues(data.user);
        if(data.user.avatarImg != null) {
            setAvatarImg(data.user.avatarImg);
        }
    }, [updateFormValues, setAvatarImg]);

    const updateFormValues = (user) => {
        console.log("user", user);
        (Object.keys(user)).forEach(key => {
            if(key == "avatarImg" && user[key] != "") {
                setAvatarImg(user[key]);
            } 
            setValue(key, user[key]);
        });
    };

    const onSubmit = async (data) => {
        console.log("SUBMITING...", data);
        if(data._id == null && (data.repassword.length && data.password != data.repassword)) {
            alert("Las contraseñas no coinciden");
            return;
        }
        const userId = params.get("_id") ?? "";
        try {
            await fetch(`/api/users/${userId}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data)
            });
            router.back();
        } catch (error) {
            console.log("ERROR", error);
        }
    }

    useEffect(() => {
        const id = params.get("_id");
        async function loadData() {            
            await Promise.all([loadClientes()]);
            if(id != null) loadUser(id);
        }
        loadData();
    }, [loadUser, params]);

    return (<div className="my-6 w-full h-screen">
        <div className="flex items-center space-x-4 text-ship-cove-800">
            <Link href="/modulos">
                <AiFillHome size="1.25rem" className="text-gray-700 dark:text-gray-300 ml-2" />
            </Link>
            <IoIosArrowForward size="1.25rem" className="text-gray-700 dark:text-gray-300" />
            <span className="text-sm font-semibold leading-6 text-gray-700 dark:text-gray-300">ACCESOS</span>
            <IoIosArrowForward size="1.25rem" className="text-gray-700 dark:text-gray-300" />
            <span className="text-sm font-semibold leading-6 text-gray-700 dark:text-gray-300">EDICIÓN</span>
        </div>
        <div className="max-w-lg m-auto">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-lg m-auto">
                <div>
                    {avatarImg == null ? <div className="block h-40 w-40 m-auto mb-6">
                        <div className="h-40 w-40 bg-slate-400 rounded-full text-white p-4 m-auto">
                            <AiOutlineUser size="8rem" />
                        </div>
                    </div>
                        : <Image width={100} height={100} className="m-auto w-40 h-40 rounded-full" src={avatarImg} alt="Avatar"/>
                    }
                </div>
                <div>
                    <label htmlFor="avatarImg" className="block text-sm font-medium leading-6 text-gray-900">Avatar URL</label>
                    <div className="mt-2">
                        <input {...register('avatarImg')} id="avatarImg" name="avatarImg" type="text" autoComplete="avatarImg"
                            className="block w-full rounded-md border-0 px-2 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
                    </div>
                </div>
                <div>
                    <label htmlFor="name" className="block text-sm font-medium leading-6 text-gray-900">Nombre</label>
                    <div className="mt-2">
                        <input {...register('name')} id="name" name="name" type="text" autoComplete="nombre" required
                            className="block w-full rounded-md border-0 px-2 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
                    </div>
                </div>
                <div className="w-full flex">
                    <div className="w-1/2 mr-1">
                        <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-900">E-mail</label>
                        <div className="mt-2">
                            <input {...register('email')} id="email" name="email" type="email" autoComplete="email" required
                                className="block w-full rounded-md border-0 px-2 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
                        </div>
                    </div>
                    <div className="w-1/2 ml-1">
                        <label htmlFor="birthDate" className="block text-sm font-medium leading-6 text-gray-900">Fecha Nacimiento</label>
                        <div className="mt-2">
                        <input
                            type="date"
                            id="birthDate"
                            {...register("birthDate", { valueAsDate: true })}                            
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                        />
                        </div>
                    </div>

                </div>
                <div className="flex">
                    <div className="w-1/2 mr-1">
                        <label htmlFor="role" className="block text-sm font-medium leading-6 text-gray-900">Rol</label>
                        <div className="mt-2">
                            <select {...register('role', { valueAsNumber: true })} id="role"
                                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">
                                <option>Sin rol</option>
                                {roles.map(r => (<option key={r.value} value={r.value}>{r.label}</option>))}
                            </select>
                        </div>
                    </div>
                    <div className="w-1/2 ml-1">
                        <label htmlFor="clientId" className="block text-sm font-medium leading-6 text-gray-900">Empresa</label>
                        <div className="mt-2">
                            <select {...register('clientId')} id="clientId"
                                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">
                                <option>Seleccione empresa</option>
                                {clientes && clientes.map(cliente => <option key={cliente.id} value={cliente.id}>{cliente.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
                <div className="flex">
                    <div>
                        <label htmlFor="rut" className="block text-sm font-medium leading-6 text-gray-900">Rut</label>
                        <div className="mt-2">
                            <input {...register('rut')} id="rut" name="rut" type="text" autoComplete="rut"
                                className="block w-full rounded-md px-2 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
                        </div>
                    </div>
                    <div className="w-full ml-4">
                        <label htmlFor="genero" className="block text-sm font-medium leading-6 text-gray-900">Genero</label>
                        <div className="mt-2">
                            <select {...register('gender')} id="genero"
                                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">
                                <option value={null}>Seleccione uno</option>
                                <option value="M">Masculino</option>
                                <option value="F">Femenino</option>
                            </select>
                        </div>
                    </div>
                </div><div className="flex">
                    <div className="w-1/2 mr-1">
                        <label htmlFor="password" type="password" className="block text-sm font-medium leading-6 text-gray-900">Password</label>
                        <div className="mt-2">
                            <input {...register('password')} id="password" name="password" type="password" autoComplete="password"
                                className="block w-full rounded-md px-2 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
                        </div>
                    </div>
                    <div className="w-1/2 ml-1">
                        <label htmlFor="repassword" className="block text-sm font-medium leading-6 text-gray-900">Re-Password</label>
                        <div className="mt-2">
                            <input {...register('repassword')} id="repassword" name="repassword" type="password"
                                className="block w-full rounded-md px-2 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
                        </div>
                    </div>
                </div>
                <div className="flex pb-10">
                    <button className="flex w-full justify-center rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 mr-2"
                        onClick={(e) => {
                            e.preventDefault();
                            router.back()
                        }}>&lt;&lt; Volver</button>
                    <button className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                        type="submit">Guardar</button>
                </div>
            </form>
        </div>
    </div>);
}