'use client'
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AiOutlineUser } from 'react-icons/ai';
import { useForm, SubmitHandler } from 'react-hook-form';

export default function EdicionCliente() {
    const [client, setClient] = useState<ClientFormType>({
        id: undefined,
        name: "",
        completeName: "",
        identificationId: "",
        identificationType: "",
        email: "",
        address: "",
        imgLogo: "",
    });
    const params = useSearchParams();
    const router = useRouter();

    const {
        setValue,
        register,
        formState: {
            errors
        },
        handleSubmit,
    } = useForm<ClientFormType>();
    const [error, setError] = useState("");

    const updateFormValues = (data: { client: ClientFormType }) => {
        console.log("DATA", data);
        (Object.keys(data.client) as (keyof ClientFormType)[]).forEach(key => {
            setValue(key, data.client[key]);
        });
        setClient(data.client);
    };

    async function loadClient(id: string) {
        console.log("GETTING CLIENTE..", id, new Date());
        if (id == null) return;
        const response = await fetch(`http://localhost:3000/api/clients/${id}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            }
        });
        if (response.status == 201) {
            console.log("No se pudo obtener a el trabajador");
        }
        const data = await response.json();
        console.log("DATA", data);
        updateFormValues(data);
    }

    const onSubmit: SubmitHandler<ClientFormType> = async (data) => {
        const id = params.get("_id");
        console.log("SUBMITING...", id, data);
        try {
            await fetch(`/api/clients${id != null ? ('/' + id) : ''}`, {
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
        if (id) loadClient(id);
    }, [])

    return (<main className="w-full h-screen">
        <div className="py-14 w-full h-screen overflow-y-scroll">
            <div className="max-w-lg m-auto">
                <form onSubmit={handleSubmit(onSubmit)} className="mt-6 flex flex-wrap space-y-6">
                    <div>
                        {client.imgLogo == "" ? <div className="block h-40 w-40 m-auto mb-6">
                            <div className="h-40 w-40 bg-slate-400 rounded-full text-white p-4 m-auto">
                                <AiOutlineUser size="8rem" />
                            </div>
                        </div>
                            : <img className="m-auto w-40 h-40 rounded-full" src={client.imgLogo} alt={client.name} />
                        }
                    </div>
                    <div className="ml-4">
                        <label htmlFor="avatar" className="block text-sm font-medium leading-6 text-gray-900">Avatar URL</label>
                        <div className="mt-2">
                            <input {...register('imgLogo')} id="imgLogo" name="imgLogo" type="text" autoComplete="imgLogo"
                                className="block w-full rounded-md border-0 px-2 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-green-600 sm:text-sm sm:leading-6" />
                        </div>
                    </div>
                    <div className="w-full">
                        <label htmlFor="name" className="block text-sm font-medium leading-6 text-gray-900">Nombre</label>
                        <div className="mt-2">
                            <input {...register('name')} id="name" name="name" type="text" autoComplete="nombre" required
                                className="block w-full rounded-md border-0 px-2 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-green-600 sm:text-sm sm:leading-6" />
                        </div>
                    </div>
                    <div className="w-full">
                        <label htmlFor="completeName" className="block text-sm font-medium leading-6 text-gray-900">Razón social</label>
                        <div className="mt-2">
                            <input {...register('completeName')} id="completeName" name="completeName" type="text" autoComplete="completeName"
                                className="block w-full rounded-md border-0 px-2 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-green-600 sm:text-sm sm:leading-6" />
                        </div>
                    </div>
                    <div className="w-1/2">
                        <label htmlFor="identificationId" className="block text-sm font-medium leading-6 text-gray-900">RUT</label>
                        <div className="mt-2">
                            <input {...register('identificationId')} id="identificatioId" name="identificatioId" type="text" autoComplete="identificatioId"
                                className="block w-full rounded-md border-0 px-2 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-green-600 sm:text-sm sm:leading-6" />
                        </div>
                    </div>
                    <div className="w-1/2 pl-4">
                        <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-900">e-mail</label>
                        <div className="mt-2">
                            <input {...register('email')} id="email" name="email" type="email" autoComplete="email"
                                className="block w-full rounded-md border-0 px-2 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-green-600 sm:text-sm sm:leading-6" />
                        </div>
                    </div>
                    <div className="w-full">
                        <label htmlFor="address" className="block text-sm font-medium leading-6 text-gray-900">Dirección</label>
                        <div className="mt-2">
                            <input {...register('address')} id="address" name="address" type="text" autoComplete="address"
                                className="block w-full rounded-md border-0 px-2 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-green-600 sm:text-sm sm:leading-6" />
                        </div>
                    </div>
                    <div className="w-full flex">
                        <button className="flex w-full justify-center rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 mr-2"
                            onClick={(e) => {
                                e.preventDefault();
                                router.back()
                            }}>&lt;&lt; Volver</button>
                        <button className="flex w-full justify-center rounded-md bg-green-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
                            type="submit">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    </main>)
}