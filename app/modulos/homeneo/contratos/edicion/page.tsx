'use client'
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form';
import Link from 'next/link';
import { AiFillHome } from 'react-icons/ai';
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';
import { FaRegSave } from 'react-icons/fa';

export default function EdicionContrato() {
    const [clientes, setClientes] = useState<ClientItemListType[]>([]);
    const [vendedores, setVendedores] = useState<ClientItemListType[]>([]);
    const [contrato, setContrato] = useState<ContractFormType>({
        id: undefined,
        title: "",
        clientId: null,
        vendorId: null,
        status: "borrador",
        currency: null,
        netAmount: 0,
        termsOfPayment: null,
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
    } = useForm<ContractFormType>();
    const [error, setError] = useState("");

    const updateFormValues = (data: { contract: ContractFormType }) => {
        console.log("DATA", data);
        (Object.keys(data.contract) as (keyof ContractFormType)[]).forEach(key => {
            setValue(key, data.contract[key]);
        });
        setContrato(data.contract);
    };

    async function loadContrato(id: string) {
        console.log("GETTING CONTRATO..", id, new Date());
        if (id == null) return;
        const response = await fetch(`/api/contracts/${id}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            }
        });
        if (response.status == 201) {
            console.log("No se pudo obtener el contrato");
        }
        const data = await response.json();
        console.log("DATA", data);
        updateFormValues(data);
    }

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

    async function loadVendedores() {
        console.log("GETTING VENDEDORES..", new Date());
        const response = await fetch(`/api/users`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            }
        });
        if (response.status == 201) {
            console.log("No se pudo obtener a los vendedores");
        }
        const data = await response.json();
        console.log("DATA", data);
        setVendedores(data.users);
    }

    const onSubmit: SubmitHandler<ContractFormType> = async (data) => {
        const id = params.get("_id");
        console.log("SUBMITING...", id, data);
        data.netAmount = Number(data.netAmount.toString().replace(/\D/g, ''));
        try {
            await fetch(`/api/contracts${id != null ? ('/' + id) : ''}`, {
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
        async function loadData() {
            await Promise.all([loadClientes(), loadVendedores()]);
            const id = params.get("_id") ?? "0";
            loadContrato(id);
        }
        loadData();
    }, [])

    return (<main className="w-full h-screen">        
        <div className="py-14 w-full h-screen overflow-y-scroll">            
        <div className="flex items-center justify-between flex-column flex-wrap md:flex-row space-y-4 md:space-y-0 pt-4 mx-10 bg-white dark:bg-gray-900">
            <div className="flex items-center space-x-4 text-ship-cove-800">
                <Link href="/modulos">
                    <AiFillHome size="1.25rem" className="text-gray-700 dark:text-gray-300 ml-2" />
                </Link>
                <IoIosArrowForward size="1.25rem" className="text-gray-700 dark:text-gray-300" />
                <Link href="/modulos/homeneo/contratos">
                    <span className="text-sm font-semibold leading-6 text-gray-700 dark:text-gray-300">CONTRATOS</span>
                </Link>
                <IoIosArrowForward size="1.25rem" className="text-gray-700 dark:text-gray-300" />
                <span className="text-sm font-semibold leading-6 text-gray-700 dark:text-gray-300">EDICIÓN</span>
            </div>
        </div>
            <div className="max-w-lg m-auto">
                <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6 flex flex-wrap">
                    <div className="w-full flex">
                        <div className="w-1/2 pr-2">
                            <label htmlFor="clientId" className="block text-sm font-medium text-gray-700">Cliente</label>
                            <select id="clientId" {...register("clientId")} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm">
                                <option>Seleccione uno</option>
                                {clientes && clientes.map(cliente => <option key={cliente.id} value={cliente.id}>{cliente.name}</option>)}
                            </select>
                        </div>
                        <div className="w-1/2 pl-2 mt-0">
                            <label htmlFor="vendorId" className="block text-sm font-medium text-gray-700">Vendedor</label>
                            <select id="vendorId" {...register("vendorId")} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm">
                                <option>Seleccione uno</option>
                                {vendedores && vendedores.map(vendedor => <option key={vendedor.id} value={vendedor.id}>{vendedor.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="w-full">
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">Título</label>
                    <input type="text" id="title" {...register("title")} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm" />
                    </div>
                    <div className="w-3/8 pr-4">
                        <label htmlFor="status" className="block text-sm font-medium text-gray-700">Estatus</label>
                        <select id="status" {...register("status")} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm">
                            <option value={0}>Borrador</option>
                            <option value={1}>Activo</option>
                            <option value={2}>Inactivo</option>
                            <option value={3}>Cerrado</option>
                        </select>
                    </div>
                    <div className="w-1/8 pr-2">
                        <label htmlFor="currency" className="block text-sm font-medium text-gray-700">Moneda</label>
                        <select id="currency" {...register("currency")} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm">
                            <option value="CLP">CLP</option>
                            <option value="USD">USD</option>
                        </select>
                    </div>
                    <div className="w-4/8 pl-2">
                        <label htmlFor="netAmount" className="block text-sm font-medium text-gray-700">Monto neto</label>
                        <div className="mt-1 flex rounded-md shadow-sm">
                            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                                CLP $
                            </span>
                            <input
                                type="text"
                                id="netAmount"
                                {...register("netAmount")}
                                className="flex-1 block w-full px-3 py-2 border border-gray-300 rounded-none rounded-r-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                                onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, '');
                                    const formattedValue = new Intl.NumberFormat('es-CL').format(Number(value));
                                    setValue('netAmount', Number(formattedValue));
                                }}
                            />
                        </div>
                    </div>
                    <div className="w-full">
                        <label htmlFor="termsOfPayment" className="block text-sm font-medium text-gray-700">Plazo de pago</label>
                        <input type="text" id="termsOfPayment" {...register("termsOfPayment")} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm" />
                    </div>                    
                    <div className="w-full flex">
                        <button className="flex w-full justify-center rounded-md bg-orange-500 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-orange-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 mr-1"
                            onClick={(e) => {
                                e.preventDefault();
                                router.back()
                            }}><IoIosArrowBack size="1.15rem" className="mt-0.5 mr-3" />VOLVER</button>
                        <button className="flex w-full justify-center rounded-md bg-ship-cove-500 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-ship-cove-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ship-cove-600 ml-1"
                            type="submit"><FaRegSave size="1.15rem" className="mt-0.5 mr-3" />GUARDAR</button>
                    </div>
                </form>
            </div>
        </div>
    </main>)
}