"use client"

import { CircularProgressbar } from "react-circular-progressbar";
import Loader from "@/components/Loader";
import Link from "next/link";
import { AiFillHome } from "react-icons/ai";
import { IoIosArrowForward } from "react-icons/io";
import { useRouter, useSearchParams } from "next/navigation";
import dayjs from "dayjs";

export default function RegisterForm({ project, sprints, loader }) {    
    const router = useRouter();
    const params = useSearchParams();

    return (<main className="pt-6 px-6 pb-16 mt-12 h-screen overflow-y-auto">
            <div className="flex items-center justify-between flex-column flex-wrap md:flex-row space-y-4 md:space-y-0 pb-4 bg-white dark:bg-gray-900">
                <div className="flex items-start space-x-4 text-ship-cove-800 pt-4">
                    <Link href="/modulos">
                        <AiFillHome size="1.4rem" className="text-gray-700 dark:text-gray-300 ml-2" />
                    </Link>
                    <IoIosArrowForward size="1.5rem" className="text-gray-700 dark:text-gray-300" />
                    <Link href={`/modulos/homeneo/proyectos${params.get("contractId") ? '?contractId=' + params.get("contractId") : ''}`}>
                    <span className="text-sm font-semibold leading-6 text-gray-700 dark:text-gray-300">PROYECTOS</span>
                    </Link>
                    <IoIosArrowForward size="1.5rem" className="text-gray-700 dark:text-gray-300" />
                    <span className="text-sm font-semibold leading-6 text-gray-700 dark:text-gray-300">SPRINTS</span>
                </div>
            </div>
            {sprints.length > 0 ? <>
                <div className="flex flex-wrap justify-center gap-4 uppercase">
                    {sprints.map((sprint, index) => (
                        <div key={index} className="w-[180px] m-2">
                            <div className="p-4 bg-ship-cove-800 rounded-lg shadow-lg">
                                <h3 className="text-center text-sm font-semibold text-gray-200">
                                    Sprint {String(index + 1).padStart(2, '0')}
                                </h3>
                                <div className="flex justify-center min-h-20 max-h-20 overflow-hidden text-ellipsis">
                                    <p className="text-center text-xs text-gray-400 mt-2 mb-2">
                                        {sprint.sprints.map(task => task.taskShortDescription).join(', ')}
                                    </p>
                                </div>
                                <div className="text-center text-4xl text-gray-300 mb-4 orbitron">
                                    {Math.round(sprint.progress)}<small>%</small>
                                </div>
                                <div className="w-full bg-ship-cove-300 h-4 dark:bg-gray-700 rounded-full">
                                    <div
                                        className="bg-ship-cove-400 h-4 rounded-full"
                                        style={{ width: `${sprint.progress}%` }}
                                    ></div>
                                </div>
                            </div>
                            <p className="text-center text-xs text-gray-500 mt-4">
                                {sprint.sprints[0].taskIndexFrom} - {sprint.sprints[sprint.sprints.length - 1].taskIndexTo}
                            </p>
                        </div>
                    ))}
                    <div className="flex justify-center mt-8">
                        <div className="w-full flex justify-center">
                            <div className="w-1/2 flex justify-end">
                                <CircularProgressbar
                                    className="orbitron"
                                    value={Number((sprints.reduce((acc, sprint) => acc + sprint.progress, 0) / sprints.length).toFixed(0))}
                                    text={`${(sprints.reduce((acc, sprint) => acc + sprint.progress, 0) / sprints.length).toFixed(0)}%`}
                                    styles={{
                                        root: { width: '204px' },
                                        path: { stroke: `rgba(138,159,208,0.4)` },
                                        text: { fill: 'rgba(138,159,208)', fontSize: '18px', textAnchor: 'middle', dominantBaseline: 'middle' },
                                        trail: { stroke: '#d6d6d6' },
                                    }}
                                />
                            </div>
                            <div className="w-1/2 mt-14 ml-6 uppercase">
                                <p className="text-md text-gray-500">
                                    Fecha de término</p>
                                <p className="text-lg text-gray-600 uppercase">
                                    {(sprints?.length > 0 && sprints[sprints.length - 1].taskIndexTo != null) ? dayjs(sprints[sprints.length - 1].taskIndexTo).format('DD/MMM/YYYY') : (sprints?.length > 0 ? dayjs(sprints[sprints.length - 1].taskIndexTo).format('DD/MMM/YYYY') : '--/--/--')}
                                </p>
                                <p className="text-xs text-gray-500 mt-4">
                                    Última actualización</p>
                                <p className="text-md text-gray-500">
                                    {sprints?.length > 0 ? dayjs(sprints[0].lastUpdate).format('DD/MMM/YYYY') : '--/--/--'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </> : <div className="flex justify-center mt-12 h-screen">
                <Loader />
            </div>}
        </main>);
}