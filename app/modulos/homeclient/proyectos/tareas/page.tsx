'use client'
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import Link from "next/link";
//import { PROJECT_STATUS, TASK_STATUS } from "@/app/utils/constants";
import { RiPencilFill } from "react-icons/ri";
import Loader from "@/app/components/loader/loader";
import { GiNightSleep } from "react-icons/gi";
import dayjs from "dayjs";
import 'dayjs/locale/es';
import { TbSubtask } from "react-icons/tb";
import { CircularProgressbar } from "react-circular-progressbar";
import 'react-circular-progressbar/dist/styles.css';
import { MdAddTask } from "react-icons/md";
import { AiFillHome } from "react-icons/ai";
import { IoIosArrowForward } from "react-icons/io";
import { FaTrash } from "react-icons/fa";
import { ConfirmModal } from "@/components/modals/ConfirmModal";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

dayjs.locale('es');

export default function Tasks() {
    const [tasks, setTasks] = useState<TaskItemListType[]>([]);
    const [loadingList, setLoadingList] = useState(true);
    const initData = useRef(false);
    const [showModal, setShowModal] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState("");
    const [project, setProject] = useState<ProjectFormType>();
    const params = useSearchParams();

    async function getProjectById() {
        const res = await fetch(`/api/projects/${params.get("projectId")}`);
        const data = await res.json();
        console.log("Project Data", data);
        setProject(data.project);
    }

    async function getTasks() {
        const res = await fetch(`/api/tasks?projectId=${params.get("projectId")}`)
        res.json().then((data: TaskItemListType[] | any) => {
            console.log("DATA", data);
            setTasks(data.tasks);
            setLoadingList(false);
        });
    }

    const nombreEstado = (valor: number) => {
        return 0;
        //return Object.keys(TASK_STATUS).find(key => TASK_STATUS[key as keyof typeof TASK_STATUS] === valor)?.toUpperCase();
    }

    const statusColors = ["bg-yellow-300", "bg-green-500", "bg-gray-400", "bg-blue-400"];

    const handleDelete = async () => {
        setShowModal(false);
        const res = await fetch(`/api/tasks/${taskToDelete}`, {
            method: 'DELETE',
        });
        if (res.ok) {
            getTasks();
            toast.success('Tarea eliminada exitosamente', {
                position: "top-right",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                icon: undefined,
            });
        } else {
            toast.error('Error al eliminar la tarea', {
                position: "top-right",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
            });
        }
    }

    useEffect(() => {
        setLoadingList(true);
        if (!initData.current) {
            initData.current = true;
            
                getTasks();
            
        }
    }, [])

    return (
        <main className="p-6 mt-8 h-screen overflow-y-scroll">
            <div className="w-full p-6">
                <div className="relative overflow-x-auto shadow-md sm:rounded-lg p-2">
                    <div className="flex items-center justify-between flex-column flex-wrap md:flex-row space-y-4 md:space-y-0 pb-4 bg-white dark:bg-gray-900">
                        <div className="flex items-center justify-between flex-column flex-wrap md:flex-row space-y-4 md:space-y-0 pb-4 bg-white dark:bg-gray-900">
                            <div className="flex items-start space-x-4 text-ship-cove-800 pt-4">
                                <Link href="/modulos">
                                    <AiFillHome size="1.4rem" className="text-gray-700 dark:text-gray-300 ml-2" />
                                </Link>
                                <IoIosArrowForward size="1.5rem" className="text-gray-700 dark:text-gray-300" />
                                <Link href={`/modulos/homeneo/proyectos${params.get("contractId") != null ? '?contractId=' + params.get('contractId') : ''}`}>
                                    <span className="text-sm font-semibold leading-6 text-gray-700 dark:text-gray-300">PROYECTOS</span>
                                </Link>                                
                                <IoIosArrowForward size="1.5rem" className="text-gray-700 dark:text-gray-300" />
                                <span className="text-sm font-semibold leading-6 text-gray-700 dark:text-gray-300">TAREAS</span>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div>
                                <label htmlFor="table-search" className="sr-only">Search</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 rtl:inset-r-0 start-0 flex items-center ps-3 pointer-events-none">
                                        <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
                                        </svg>
                                    </div>
                                    <input type="text" id="table-search-users" className="block p-2 ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg w-80 bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="Codigo/Nombre" />
                                </div>
                            </div>
                            <Link href={`/modulos/homeneo/proyectos/sprints?projectId=${params.get("projectId")}`}>
                                <button className="flex w-full justify-center rounded-md bg-ship-cove-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-ship-cove-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
                                    disabled={tasks.length === 0}
                                    type="submit">
                                    <TbSubtask size="1rem" className="mt-1" /><span className="mt-0">&nbsp;VISTA SPRINTS</span>
                                </button>
                            </Link>
                            <Link href={`/modulos/homeneo/proyectos/tareas/edicion?projectId=${params.get("projectId")}`}>
                                <button className="flex w-full justify-center rounded-md bg-ship-cove-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-ship-cove-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
                                    type="submit">
                                    <MdAddTask size="1rem" className="mt-1" /><span className="mt-0">&nbsp;NUEVA TAREA</span>
                                </button>
                            </Link>
                        </div>
                    </div>
                    {tasks.length > 0 && <div className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                        <div className="w-full text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <div className="flex">
                                <div className="w-8/12 py-2 pl-3">
                                    TITLO / ESTADO
                                </div>
                                <div className="w-1/12 py-2 text-center">PROGRESO</div>
                                <div className="w-1/12 py-2 text-center">PESO</div>
                                <div className="w-2/12 py-2 text-center">ACCIONES</div>
                            </div>
                        </div>
                    </div>}
                    <div>
                        {tasks && tasks.map(task => (
                            <div key={task.id} className="flex bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-600">
                                <div className="w-8/12 px-2 flex items-center">
                                    <div className="mx-4">
                                        <img className="w-12 h-12 rounded-full" src={task.asignedToImg} alt="asignedImg" />
                                    </div>
                                    <div>
                                        <p className="uppercase font-extrabold text-xl">{task.title}</p>
                                        <div className="flex items-center text-xs">
                                            <p className={`${task.startDate == null ? 'text-orange-700' : ''}`}>INI: {task.startDate ? dayjs(task.startDate).format("dd DD MMM'YY HH:mm") : 'INCIERTO'}</p>
                                            {task.endDate && <p className="ml-2"> - FIN: {dayjs(task.endDate).format("dd DD MMM'YY HH:mm")}</p>}
                                        </div>
                                        <div className="flex items-center text-xs">
                                            <div className={`h-2.5 w-2.5 rounded-full me-2 ${statusColors[task.status]}`}></div>
                                            {nombreEstado(task.status)}
                                        </div>
                                    </div>
                                </div>
                                <div className="w-1/12 pt-4">
                                    <CircularProgressbar className="h-14" strokeWidth={16} value={task.progress} text={`${Math.round(task.progress)}%`} />
                                </div>
                                <div className="w-1/12 pt-4 text-center">
                                    <p className="orbiton text-xl mt-4"><b>{task.weight}</b><small> HH</small></p>
                                </div>
                                <div className="w-2/12 px-2 py-7 flex text-center justify-center">
                                    <Link href={{
                                        pathname: "/modulos/homeneo/proyectos/tareas/edicion",
                                        query: { _id: task.id, projectId: params.get("projectId") }
                                    }} className="hover:text-blue-400 shadow-xl rounded-md w-20 h-14 mr-2 pt-2">
                                        <RiPencilFill size="1.2rem" className="mx-auto" /><span className="text-xs">EDITAR</span>
                                    </Link>
                                    <button
                                        onClick={() => {
                                            setTaskToDelete(task.id);
                                            setShowModal(true);
                                        }}
                                        className="hover:text-orange-700 shadow-xl rounded-md w-20 h-14 mr-2 pt-2 bg-persian-red-50"
                                    >
                                        <FaTrash size="1.2rem" className="mx-auto" /><span className="text-xs">ELIMINAR</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                        {tasks.length === 0 && !loadingList && (<div className="flex justify-center py-10">
                            <GiNightSleep size="3rem" />
                            <p className="text-xl mt-2 ml-4 uppercase">Sin tareas</p></div>)}
                        {loadingList && <div className="py-4"><Loader /></div>}
                    </div>
                    <ConfirmModal
                        title="Eliminar tarea"
                        confirmationQuestion="¿Estás seguro de que deseas eliminar esta tarea?"
                        show={showModal}
                        onClose={() => setShowModal(false)}
                        onConfirm={handleDelete}
                        confirmationLabel="Eliminar"
                    />
                </div>
            </div>
            <ToastContainer />
        </main>
    )
}