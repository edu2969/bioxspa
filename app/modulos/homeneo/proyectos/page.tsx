'use client'
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import Link from "next/link";
import { FaPlus, FaUserCircle } from "react-icons/fa";
import { buildStyles, CircularProgressbar } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
//import { PROJECT_STATUS, PROJECT_TYPE } from "@/app/utils/constants";
import { RiPencilFill } from "react-icons/ri";
import { MdTask } from "react-icons/md";
import { TbSubtask } from "react-icons/tb";
import { IoIosArrowForward } from "react-icons/io";
import { AiFillHome } from "react-icons/ai";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { GiNightSleep } from "react-icons/gi";
dayjs.locale("es");

export default function Projects() {
    const [projects, setProjects] = useState<ProjectItemListType[]>([]);
    const [projectsFiltered, setProjectsFiltered] = useState<ProjectItemListType[]>([])
    const [loadingList, setLoadingList] = useState(true);
    const initData = useRef(false);
    const router = useRouter();
    const params = useSearchParams();

    async function getProjects() {
        const res = await fetch(`/api/projects${params.get("contractId") != null ? ('?contractId=' + params.get("contractId")) : ''}`);
        res.json().then((data: ProjectItemListType[] | any) => {
            console.log("DATA", data);
            setProjects(data.projects);
            setLoadingList(false);
        });
    }

    const onSubmit = async (data: ProjectFormType) => {
        const id = params.get("_id");
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

    const nombreEstado = (valor: number) => {
        return 0;
        //return Object.keys(PROJECT_STATUS).find(key => PROJECT_STATUS[key as keyof typeof PROJECT_STATUS] === valor)?.toUpperCase();
    }

    const projectTypeLabel = (valor: number) => {
        return 0;
        //return Object.keys(PROJECT_TYPE).find(key => PROJECT_TYPE[key as keyof typeof PROJECT_TYPE] === valor)?.toUpperCase();
    }

    const statusColors = ["bg-yellow-300", "bg-green-500", "bg-gray-400", "bg-blue-500", "bg-yellow-500"];

    useEffect(() => {
        if (!initData.current) {
            initData.current = true;
            const projectId = params.get("projectId");
            getProjects();
        }
    }, [])

    return (
        <main className="p-6 mt-8 h-screen overflow-y-scroll">
            <div className="w-full p-6">
                <div className="relative overflow-x-auto shadow-md sm:rounded-lg p-2">
                    <div className="flex items-center justify-between flex-column flex-wrap md:flex-row space-y-4 md:space-y-0 pb-4 bg-white dark:bg-gray-900">
                        <div className="flex items-center space-x-4 text-ship-cove-800">
                            <Link href="/modulos">
                                <AiFillHome size="1.4rem" className="text-gray-700 dark:text-gray-300 ml-2" />
                            </Link>
                            <IoIosArrowForward size="1.5rem" className="text-gray-700 dark:text-gray-300" />
                            <span className="text-sm font-semibold leading-6 text-gray-700 dark:text-gray-300">PROYECTOS</span>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="relative">
                                <label htmlFor="table-search" className="sr-only">Search</label>
                                <div className="absolute inset-y-0 rtl:inset-r-0 start-0 flex items-center ps-3 pointer-events-none">
                                    <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
                                    </svg>
                                </div>
                                <input type="text" id="table-search-users" className="block p-2 ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg w-80 bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="Codigo/Nombre" />
                            </div>
                            <Link href="/modulos/homeneo/proyectos/edicion">
                                <button className="flex w-full justify-center rounded-md bg-ship-cove-500 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-ship-cove-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
                                    type="submit">
                                    <FaPlus size="1rem" className="mt-1" /><span className="mt-0">&nbsp;Nuevo</span>
                                </button>
                            </Link>
                        </div>
                    </div>
                    <div className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                        <div className="w-full text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <div className="flex">
                                <div className="w-2/12 py-2 pl-3">
                                    CLIENTE
                                </div>
                                <div className="w-6/12 py-2 pl-3">
                                    TITULO / ESTADO
                                </div>
                                <div className="w-1/12 py-2 pl-3 text-center">
                                    PROGRESO
                                </div>
                                <div className="w-1/12 py-2 pl-3 text-center">
                                    RENTABILIDAD
                                </div>
                                <div className="w-2/12 py-2 text-center">ACCIONES</div>
                            </div>
                        </div>
                    </div>
                    <div>
                        {projects && projects.map(project => (
                            <div key={project.id} className="flex bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-600 h-24">
                                <div className="w-2/12 flex items-center pl-4 text-gray-900 whitespace-nowrap dark:text-white">
                                    {project.clientImg && <img className="w-10 h-10 rounded-full" src={project.clientImg} alt={`${project.clientName} avatar`} />}
                                    {project.clientImg == "" && <FaUserCircle className="w-10 h-10 text-slate-400" size="1em" />}
                                    <div className="ps-3">
                                        <div className="text-base font-semibold">{project.clientName}</div>
                                    </div>
                                </div>
                                <div className="w-6/12 px-2 flex items-center">
                                    <div>
                                        <div className="flex">
                                            <p className={`text-xs ${statusColors[project.projectType]} text-white rounded-md px-2 pt-1 pb-0 h-6`}>{projectTypeLabel(project.projectType)}</p>
                                            <p className="uppercase font-extrabold text-xl ml-2">{project.title}</p>
                                        </div>
                                        <div className="flex items-center text-xs">
                                            <div className={`h-2.5 w-2.5 rounded-full me-2 ${statusColors[project.status]}`}></div>
                                            {nombreEstado(project.status)}
                                        </div>
                                        <p className="text-xs text-gray-400 uppercase">KICKOFF {project.kickOff ? dayjs(project.kickOff).format('dd DD/MMM/YYYY') : 'NO-YET'}</p>
                                    </div>
                                </div>
                                <div className="w-1/12 py-4">
                                    <CircularProgressbar className="orbitron h-14" strokeWidth={10} value={project.progress} text={`${Math.round(project.progress)}%`}
                                        styles={buildStyles({
                                            textSize: '1.5rem',
                                            pathTransitionDuration: 0.75,
                                        })} />
                                </div>
                                <div className="w-1/12 text-center pt-7">
                                    <p className="orbitron text-2xl">{project.rentability}<small>%</small></p>
                                </div>
                                <div className="w-2/12 px-2 py-7 flex text-center justify-center">
                                    <Link href={{
                                        pathname: "/modulos/homeneo/proyectos/edicion",
                                        query: { _id: project.id }
                                    }} className="hover:text-blue-400 shadow-xl rounded-md w-24 h-14 mr-2">
                                        <RiPencilFill size="1.5rem" className="mx-auto" /><span className="text-xs">EDITAR</span>
                                    </Link>
                                    <Link href={{
                                        pathname: "/modulos/homeneo/proyectos/tareas",
                                        query: { projectId: project.id }
                                    }} className="hover:text-blue-400 shadow-xl rounded-md w-24 h-14 mr-2">
                                        <MdTask size="1.5rem" className="mx-auto" /><span className="text-xs">TAREAS</span>
                                    </Link>
                                    <Link href={{
                                        pathname: "/modulos/homeneo/proyectos/sprints",
                                        query: { projectId: project.id }
                                    }} className="hover:text-blue-400 shadow-xl rounded-md w-24 h-14 mr-2">
                                        <TbSubtask size="1.5rem" className="mx-auto" /><span className="text-xs">SPRINTS</span>
                                    </Link>
                                </div>
                            </div>
                        ))}
                        {projects && projects.length === 0 && !loadingList && (<div className="flex justify-center py-10">
                            <GiNightSleep size="3rem" />
                            <p className="text-xl mt-2 ml-4 uppercase">Sin proyectos</p></div>)}
                    </div>
                </div>
            </div>
        </main>
    )
}