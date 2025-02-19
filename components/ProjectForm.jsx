'use client'
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { FaPlus, FaRegSave } from 'react-icons/fa';
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AiFillHome } from 'react-icons/ai';
import { ConfirmModal } from './modals/ConfirmModal';
//import { PROJECT_STATUS } from '@/app/utils/constants';

dayjs.extend(utc);
dayjs.extend(timezone);

export default function ProjectForm() {
    const [clients, setClients] = useState([]);
    const [selectedClient, setSelectedClient] = useState(null);
    const [contracts, setContracts] = useState([]);
    const [project, setProject] = useState();
    const [showModal, setShowModal] = useState(false);
    const [previousStatus, setPreviousStatus] = useState(null);
    const [selectedStatus, setSelectedStatus] = useState(null);

    const params = useSearchParams();
    const router = useRouter();

    const {
        setValue,
        register,
        formState: {
            errors
        },
        handleSubmit,
    } = useForm();

    async function loadProject(id) {
        console.log("GETTING PROJECTS", id);
        if (id === "") return true;
        const response = await fetch(`/api/projects/${id}`, {
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
        Object.keys(data.project).forEach(key => {
            if (key === "clientId") {
                setSelectedClient(data.project[key]);
                setValue(key, data.project[key]);
            } else if (data.project[key] != null && (key === "kickOff" || key === "end")) {
                const formattedDate = dayjs(data.project[key]).tz('America/Santiago').format("YYYY-MM-DD");
                setValue(key, formattedDate);
            } else {
                setValue(key, data.project[key]);
            }
        });
        setProject(data.project);
    }

    const onSubmit = async (data) => {
        const id = params.get("_id");
        data.kickOff = dayjs(data.kickOff).add(8, 'hour').utc().format();
        data.end = dayjs(data.end).utc().format();
        console.log("SUBMITING...", id, data);
        try {
            await fetch(`/api/projects${id != null ? ('/' + id) : ''}`, {
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
        setClients(data.clients);
    }

    async function loadContracts() {
        console.log("GETTING CONTRACT..", new Date());
        const response = await fetch(`/api/contracts`, {
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
        setContracts(data.contracts);
    }

    useEffect(() => {
        console.log("PARAMS", params);
        async function loadData() {
            await Promise.all([loadClientes(), loadContracts()]);
            const id = params.get("_id");
            loadProject(id ?? "");
        }
        loadData();
    }, []);

    return (<main className="w-full h-screen">
        <div className="py-14 w-full h-screen overflow-y-scroll">
            <div className="flex items-center justify-between flex-column flex-wrap md:flex-row space-y-4 md:space-y-0 pb-4 pt-4 mx-10 bg-white dark:bg-gray-900">
                <div className="flex items-center space-x-4 text-ship-cove-800">
                    <Link href="/modulos">
                        <AiFillHome size="1.4rem" className="text-gray-700 dark:text-gray-300 ml-2" />
                    </Link>
                    <IoIosArrowForward size="1.5rem" className="text-gray-700 dark:text-gray-300" />
                    <span className="text-sm font-semibold leading-6 text-gray-700 dark:text-gray-300">PROYECTOS</span>
                    <IoIosArrowForward size="1.5rem" className="text-gray-700 dark:text-gray-300" />
                    <span className="text-sm font-semibold leading-6 text-gray-700 dark:text-gray-300">EDICIÓN</span>
                </div>
            </div>
            <div className="max-w-lg m-auto">
                <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6 flex flex-wrap">
                    <div className="w-full">
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700">Título</label>
                        <input type="text" id="title" {...register("title")} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ship-cove-600 sm:text-sm" />
                    </div>
                    <div className="w-1/3 pr-2">
                        <label htmlFor="clientId" className="block text-sm font-medium text-gray-700">Cliente</label>
                        <select id="clientId" {...register("clientId")} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ship-cove-600 sm:text-sm uppercase"
                            onChange={(e) => setSelectedClient(e.target.value)}>
                            <option>Seleccione uno</option>
                            {clients && clients.map(client => <option key={client._id} value={client._id}>{client.name}</option>)}
                        </select>
                    </div>
                    <div className="w-2/3 pr-2">
                        <label htmlFor="contractId" className="block text-sm font-medium text-gray-700">Contrato</label>
                        <select id="contractId" {...register("contractId")} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ship-cove-600 sm:text-sm uppercase">
                            <option>Seleccione uno</option>
                            {selectedClient && contracts && contracts.map(contract => <option key={contract._id} value={contract._id}>{contract.title}</option>)}
                        </select>
                    </div>
                    <div className="w-1/2 pr-2">
                        <label htmlFor="projectType" className="block text-sm font-medium text-gray-700">Tipo de proyecto</label>
                        <select id="projectType" {...register("projectType", { valueAsNumber: true })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ship-cove-600 sm:text-sm">
                            <option value={1}>DESARROLLO</option>
                            <option value={2}>MANTENCION</option>
                            <option value={3}>WEB</option>
                            <option value={4}>TERRENO</option>
                        </select>
                    </div>
                    <div className="w-1/2 pl-2">
                        <label htmlFor="status" className="block text-sm font-medium text-gray-700">Estatus</label>
                        <select id="status" {...register("status", { valueAsNumber: true })}
                            onChange={(e) => {
                                setSelectedStatus(parseInt(e.target.value, 10));
                                setShowModal(true);
                            }}
                            onFocus={(e) => setPreviousStatus(parseInt(e.target.value, 10))}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ship-cove-600 sm:text-sm uppercase">
                            <option value={0}>Definicion</option>
                            <option value={1}>Activo</option>
                            <option value={2}>Inactivo</option>
                            <option value={3}>Cerrado</option>
                            <option value={4}>Extendido</option>
                        </select>
                    </div>
                    <div className="w-1/2 pr-2">
                        <label htmlFor="kickOff" className="block text-sm font-medium text-gray-700">Kick-off</label>
                        <input
                            type="date"
                            id="kickOff"
                            {...register("kickOff", { valueAsDate: true })}
                            onChange={(e) => {
                                const kickOff = dayjs(e.target.value).add(8, 'hour').utc();
                                let endDate = kickOff;
                                let totalHours = project?.tasks?.reduce((acc, task) => {
                                    return acc + (task.todos?.reduce((todoAcc, todo) => todoAcc + todo.hours, 0) ?? 0);
                                }, 0) ?? 0;
                                let hoursRemaining = totalHours;

                                while (hoursRemaining > 0) {
                                    if (endDate.day() === 0 || endDate.day() === 6) { // Skip weekends
                                        endDate = endDate.add(1, 'day').hour(8).startOf("hour");
                                        continue;
                                    }
                                    if (endDate.hour() >= 8 && endDate.hour() < 13) { // Morning hours
                                        const availableHours = Math.min(13 - endDate.hour(), hoursRemaining);
                                        endDate = endDate.add(availableHours, 'hour');
                                        hoursRemaining -= availableHours;
                                    } else if (endDate.hour() >= 14 && endDate.hour() < 17) { // Afternoon hours
                                        const availableHours = Math.min(17 - endDate.hour(), hoursRemaining);
                                        endDate = endDate.add(availableHours, 'hour');
                                        hoursRemaining -= availableHours;
                                    } else { // Outside working hours
                                        if (endDate.hour() >= 13 && endDate.hour() < 14) {
                                            endDate = endDate.hour(14).startOf("hour");
                                        } else {
                                            endDate = endDate.add(1, 'day').hour(8).startOf("hour");
                                        }
                                    }
                                }
                                setProject({ ...project, end: endDate.toDate() });
                            }}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                        />
                    </div>
                    <div className="w-4/12 pl-2">
                        <label htmlFor="end" className="block text-sm font-medium text-gray-700">Fecha término</label>
                        <p className="uppercase text-sm mt-3">{project?.end != null ? dayjs(project.end).format("DD/MMM/YY") : 'INCIERTO'}</p>
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
        <ConfirmModal title="Cambio de estado"
            confirmationQuestion={`${selectedStatus === 0 //PROJECT_STATUS.defining 
                ? 'El proyecto volverá a modo definición. Los datos actuales quedarán como reales y se cargarán los estimados. ¿Desea proceder?' 
                : 'El proyecto terminará su fase de definición. Las tareas y sprints manejarán datos reales y los actuales, se guardarán como estimados. ¿Desea proceder?'}`}
            show={showModal}
            onClose={() => {
                setValue("status", previousStatus);
                setShowModal(false);
            }}
            confirmationLabel="Confirmar"
            onConfirm={handleSubmit(onSubmit)}
        />
    </main>)
}