"use client";
import { useEffect } from "react";
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';
import { AiFillHome } from 'react-icons/ai';
import { FaRegSave } from 'react-icons/fa';
import Link from "next/link";

export const ContractForm = ({ contract, setContract }) => {
    const [contractData, setContractData] = useState({
        identifier: contract?.identifier || "",
        vendorId: contract?.vendorId || "",
        title: contract?.title || "",
        status: contract?.status || "",
        currency: contract?.currency || "",
        netAmount: contract?.netAmount || "",
        termsOfPayment: contract?.termsOfPayment || "",
        creatorId: contract?.creatorId || "",
        createdAt: contract?.createdAt || "",
    });
    
    const handleSubmit = (e) => {
        e.preventDefault();
        setContract(contractData);
    };
    
    useEffect(() => {
        if (contract) {
            setContractData({
                identifier: contract.identifier,
                vendorId: contract.vendorId,
                title: contract.title,
                status: contract.status,
                currency: contract.currency,
                netAmount: contract.netAmount,
                termsOfPayment: contract.termsOfPayment,
                creatorId: contract.creatorId,
                createdAt: contract.createdAt,
            });
        }
    }, [contract]);
    
    return (<main className="w-full h-screen">
        <div className="py-14 w-full h-screen overflow-y-scroll">        
            <div className="flex items-center space-x-4 text-ship-cove-800">
                <Link href="/modulos">
                    <AiFillHome size="1.25rem" className="text-gray-700 dark:text-gray-300 ml-2" />
                </Link>
                <IoIosArrowForward size="1.25rem" className="text-gray-700 dark:text-gray-300" />
                <span className="text-sm font-semibold leading-6 text-gray-700 dark:text-gray-300">TAREAS</span>
                <IoIosArrowForward size="1.25rem" className="text-gray-700 dark:text-gray-300" />
                <span className="text-sm font-semibold leading-6 text-gray-700 dark:text-gray-300">EDICIÓN</span>
            </div>
            <div className="max-w-lg m-auto">
                <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6 flex flex-wrap">
                    <div className="w-full flex">
                        <div className="w-1/2 pr-2">
                            <label htmlFor="clientId" className="block text-sm font-medium text-gray-700">Cliente</label>
                            <select id="clientId" {...register("clientId")} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm">
                                <option>Seleccione uno</option>
                                {clientes && clientes.map(cliente => <option key={`${cliente._id}`} value={cliente._id}>{cliente.name}</option>)}
                            </select>
                        </div>
                        <div className="w-1/2 pl-2 mt-0">
                            <label htmlFor="vendorId" className="block text-sm font-medium text-gray-700">Vendedor</label>
                            <select id="vendorId" {...register("vendorId")} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm">
                                <option>Seleccione uno</option>
                                {vendedores && vendedores.map(vendedor => <option key={`${vendedor._id}`} value={vendedor._id}>{vendedor.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="w-full">
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">Título</label>
                    <input type="text" id="title" {...register("title")} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm" />
                    </div>
                    <div className="w-1/4 pr-2">
                        <label htmlFor="status" className="block text-sm font-medium text-gray-700">Estatus</label>
                        <select id="status" {...register("status")} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm">
                            <option value={0}>Borrador</option>
                            <option value={1}>Activo</option>
                            <option value={2}>Inactivo</option>
                            <option value={3}>Cerrado</option>
                        </select>
                    </div>
                    <div className="w-1/4 pr-2">
                        <label htmlFor="currency" className="block text-sm font-medium text-gray-700">Moneda</label>
                        <select id="currency" {...register("currency")} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm">
                            <option value="CLP">CLP</option>
                            <option value="USD">USD</option>
                        </select>
                    </div>
                    <div className="w-1/2 pl-2">
                        <label htmlFor="netAmount" className="block text-sm font-medium text-gray-700">Monto neto</label>
                        <input type="number" id="netAmount" {...register("netAmount")} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm" />
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
    </main>);
};