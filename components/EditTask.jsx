import { useEffect, useState } from 'react';
import { FaCheck, FaRegSave, FaTimes, FaTrash, FaUserCircle } from 'react-icons/fa';
import { useForm } from "react-hook-form";
import { RiPencilFill } from 'react-icons/ri';
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';
import { SlNote } from "react-icons/sl";
import { LuListTodo } from "react-icons/lu";
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import Link from 'next/link';
import { AiFillHome } from 'react-icons/ai';

dayjs.extend(utc);
dayjs.extend(timezone);

export default function EditTask({ params, router }) {
    const [users, setUsers] = useState([]);
    const [task, setTask] = useState({
        id: undefined,
        projectId: "",
        priority: 0,
        title: "",
        asignedTo: null,
        taskType: null,
        status: 0,
        description: "",
        startDate: null,
        todos: [],
        logs: [],
    });
    const [logEditing, setLogEditing] = useState([]);
    const {
        setValue,
        register,
        handleSubmit,
        formState: { errors }
    } = useForm();

    async function loadUsers() {
        console.log("GETTING USERS..", new Date());
        const response = await fetch(`/api/users`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            }
        });
        if (response.status == 201) {
            console.log("No se pudo obtener los usuarios");
        }
        const data = await response.json();
        console.log("DATA", data);
        setUsers(data.users);
    }

    async function loadTask(id) {
        if (!id) return;
        const response = await fetch(`/api/tasks/${id}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            }
        });
        if (response.status == 201) {
            console.log("No se pudo obtener la tarea");
        }
        const data = await response.json();
        Object.keys(data.task).forEach(key => {
            if (data.task[key] != null && (key === 'startDate' || key === 'endDate')) {
                const formattedDate = dayjs(data.task[key]).tz('America/Santiago').format("YYYY-MM-DD HH:mm");
                setValue(key, formattedDate);
            } else {
                setValue(key, data.task[key]);
            }
        });
        setTask(data.task);
        if (data.task.logs?.length > 0) {
            setLogEditing(data.task.logs.map(() => false));
        }
    }

    const onSubmit = async (data) => {
        const projectId = params.get("projectId");
        if (!projectId) return;
        data.projectId = projectId;
        data.todos = task.todos;
        data.logs = task.logs;
        data.weight = task.weight;
        data.endDate = task.endDate;
        console.log("DATA", data);
        try {
            await fetch(`/api/tasks/${params.get("_id") ?? ''}`, {
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

    const handleTaskTypeChange = async (e) => {
        const taskType = e.target.value;
        if (task.todos.length > 0 || taskType == 0) {
            console.log("Omit");
            return;
        }
        setValue("taskType", taskType, { shouldValidate: true });
        try {
            const response = await fetch(`/api/todos?taskType=${taskType}`);
            const data = await response.json();

            if (response.ok) {
                const todos = data.todos.map(todo => ({
                    title: todo.title,
                    hours: todo.hours
                }));
                setTask(prevTask => ({
                    ...prevTask,
                    weight: todos.reduce((acc, todo) => acc + todo.hours, 0),
                    todos
                }));
            } else {
                console.error("Error fetching todos:", data.error);
            }
        } catch (error) {
            console.error("Error fetching todos:", error);
        }
    };

    const collaboratorImgUrl = (collaboratorId) => {
        return users.find(user => user.id === collaboratorId)?.avatarImg ?? "/profiles/neo.jpg";
    }

    useEffect(() => {
        async function loadData() {
            await Promise.all([loadUsers()]);
            const taskId = params.get("_id");
            loadTask(taskId);
        }
        loadData();
    }, [])

    return (<main className="w-full h-screen">
        <div className="flex items-center justify-between flex-column flex-wrap md:flex-row space-y-4 md:space-y-0 pt-4 mx-10 bg-white dark:bg-gray-900">
            <div className="flex items-center space-x-4 text-ship-cove-800">
                <Link href="/modulos">
                    <AiFillHome size="1.25rem" className="text-gray-700 dark:text-gray-300 ml-2" />
                </Link>
                <IoIosArrowForward size="1.25rem" className="text-gray-700 dark:text-gray-300" />
                <span className="text-sm font-semibold leading-6 text-gray-700 dark:text-gray-300">TAREAS</span>
                <IoIosArrowForward size="1.25rem" className="text-gray-700 dark:text-gray-300" />
                <span className="text-sm font-semibold leading-6 text-gray-700 dark:text-gray-300">EDICIÓN</span>
            </div>
        </div>
        <div className="w-full pb-12 pt-0">
            <div className="max-w-lg mx-auto">
                <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6 flex flex-wrap">
                    <div className="w-full">
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700">Título</label>
                        <input id="title" type="text" {...register("title", { required: "El título es requerido" })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm" />
                        {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
                    </div>
                    <div className="w-3/12 pr-2">
                        <label htmlFor="assignedTo" className="block text-sm font-medium text-gray-700">Asignado a</label>
                        <select id="assignedTo" {...register("assignedTo")} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm">
                            <option value="">SELECCIONE UNO</option>
                            {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                        </select>
                    </div>
                    <div className="w-1/2 pr-2">
                        <label htmlFor="taskType" className="block text-sm font-medium text-gray-700">Tipo de tarea</label>
                        <select
                            id="taskType"
                            {...register("taskType", { 
                                valueAsNumber: true,
                                required: "Requerido"
                             })}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                            onChange={handleTaskTypeChange}
                        >
                            <option value="">SELECCIONE UNO</option>
                            <option value={1}>DESARROLLO SOFTWARE</option>
                            <option value={2}>FIX</option>
                            <option value={3}>GARANTÍA</option>
                            <option value={4}>TERRENO</option>
                            <option value={5}>GESTIÓN</option>
                            <option value={6}>CAPACITACIÓN</option>
                        </select>
                        {errors.taskType && <p className="text-red-500 text-xs mt-1">{errors.taskType.message}</p>}
                    </div>
                    <div className="w-3/12 pl-2">
                        <label htmlFor="status" className="block text-sm font-medium text-gray-700">Estado</label>
                        <select id="status" {...register("status", { 
                            valueAsNumber: true,
                            required: 'Requerido' 
                        })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm">
                            <option value="">SELECCIONE UNO</option>
                            <option value={0}>DEFINICIÓN</option>
                            <option value={1}>ACTIVA</option>
                            <option value={2}>INACTIVA</option>
                            <option value={3}>CERRADA</option>
                        </select>
                        {errors.status && <p className="text-red-500 text-xs mt-1">{errors.status.message}</p>}
                    </div>
                    <div className="w-full">
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Descripción</label>
                        <textarea id="description" {...register("description")}
                            rows={6}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm" />
                    </div>

                    <div className="w-full shadow-lg p-3">
                        <div className="flex">
                            <label className="text-md font-medium text-gray-700 text-nowrap"><b>TODO</b> LIST</label>
                            <div className="w-full flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newTodo = { finishedAt: null, title: '', hours: 0 };
                                        setTask({ ...task, todos: [...task.todos, newTodo] });
                                    }}
                                    className="mt-2 flex justify-center rounded-md bg-ship-cove-500 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-ship-cove-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
                                >
                                    <LuListTodo size="1.15rem" className="mt-0.5 mr-3" />Agregar TODO
                                </button>
                            </div>
                        </div>
                        {task.todos && task.todos.map((todo, index) => (
                            <div key={index} className="flex items-center space-x-2 mt-2">
                                <input
                                    type="checkbox"
                                    checked={!!todo.finishedAt}
                                    onChange={(e) => {
                                        const newTodos = [...task.todos];
                                        newTodos[index].finishedAt = e.target.checked ? new Date() : null;
                                        setTask({ ...task, todos: newTodos });
                                    }}
                                    className="w-6 h-6 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                />
                                <input
                                    type="text"
                                    value={todo.title}
                                    onChange={(e) => {
                                        const newTodos = [...task.todos];
                                        newTodos[index].title = e.target.value;
                                        setTask({ ...task, todos: newTodos });
                                    }}
                                    className="w-9/12 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                                />
                                <input
                                    type="number"
                                    value={todo.hours}
                                    onChange={(e) => {
                                        const newTodos = [...task.todos];
                                        newTodos[index].hours = parseInt(e.target.value, 10);
                                        task.weight = newTodos.reduce((acc, todo) => acc + todo.hours, 0);
                                        setTask({ ...task, todos: newTodos });
                                    }}
                                    className="w-2/12 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        console.log("TODOS", task.todos);
                                        const newTodos = task.todos ? task.todos.filter((_, i) => i !== index) : [];
                                        setTask({ ...task, todos: newTodos });
                                    }}
                                    className="w-1/12 text-white hover:text-persian-red-700 bg-persian-red-500 hover:bg-persian-red-200 rounded-md px-3 py-2.5"
                                ><FaTrash /></button>
                            </div>
                        ))}
                    </div>

                    <div className="w-2/12">
                        <label htmlFor="weight" className="block text-sm font-medium text-gray-700">Peso</label>
                        <p className="font-bold text-2xl mt-2">{task.weight}&nbsp;<small>HH</small></p>
                    </div>
                    <div className="w-1/2 pr-2 pl-4">
                        <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Fecha inicio</label>
                        <input
                            type="datetime-local"
                            id="startDate"
                            {...register("startDate", { valueAsDate: true })}
                            onChange={(e) => {
                                const startDate = dayjs(e.target.value); // Set start time to 08:00
                                let endDate = startDate;
                                let totalHours = task.todos.reduce((acc, todo) => acc + todo.hours, 0);
                                console.log("RESUME", startDate.format(), totalHours);
                                let hoursRemaining = totalHours;

                                while (hoursRemaining > 0) {
                                    if (endDate.day() === 0 || endDate.day() === 6) { // Skip weekends
                                        endDate = endDate.add(1, 'day').hour(8).minute(0);
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
                                            endDate = endDate.hour(14).minute(0); // Move to afternoon session
                                        } else {
                                            endDate = endDate.add(1, 'day').hour(8).minute(0); // Move to next day morning
                                        }
                                    }
                                }

                                setTask({ ...task, endDate: endDate.toDate() });
                            }}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                        />
                    </div>
                    <div className="w-4/12 pl-2">
                        <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">Fecha término</label>
                        <p className="uppercase text-sm mt-3">{dayjs(task.endDate).format("DD/MMM/YY HH:mm")}</p>
                    </div>

                    <div className="w-full shadow-lg p-3 mt-6">
                        <div className="flex">
                            <label className="text-md font-medium text-gray-700 text-nowrap"><b>BITÁCORA</b></label>
                            <div className="w-full flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newLog = { collaboratorId: '', date: new Date(), entry: '' };
                                        setTask({ ...task, logs: [...task.logs, newLog] });
                                        setLogEditing([...logEditing, true]);
                                    }}
                                    className="mt-2 flex justify-center rounded-md bg-ship-cove-500 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-ship-cove-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600">
                                    <SlNote size="1.15rem" className="mt-0.5 mr-3" />AGREGAR
                                </button>
                            </div>
                        </div>
                        {task.logs && task.logs.map((log, index) => (
                            <div key={`logs_` + index} className="flex items-center space-x-2 mt-2">
                                {logEditing[index] ? (
                                    <>
                                        <div className="w-10/12">
                                            <div className="w-full flex items-center">
                                                <select
                                                    value={log.collaboratorId}
                                                    onChange={(e) => {
                                                        const newLogs = [...task.logs];
                                                        newLogs[index].collaboratorId = e.target.value;
                                                        setTask({ ...task, logs: newLogs });
                                                    }}
                                                    className="w-1/2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm mr-1"
                                                ><option>SELECCIONE UNO</option>
                                                    {users.map(user => (
                                                        <option key={user.id} value={user.id}>{user.name}</option>
                                                    ))}
                                                </select>
                                                <input
                                                    type="date"
                                                    value={new Date(log.date).toISOString().split('T')[0]}
                                                    onChange={(e) => {
                                                        const newLogs = [...task.logs];
                                                        newLogs[index].date = dayjs(e.target.value).add(8, 'hour').utc().format();
                                                        setTask({ ...task, logs: newLogs });
                                                    }}
                                                    className="w-1/2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm ml-1"
                                                />
                                            </div>
                                            <textarea
                                                value={log.entry}
                                                onChange={(e) => {
                                                    const newLogs = [...task.logs];
                                                    newLogs[index].entry = e.target.value;
                                                    setTask({ ...task, logs: newLogs });
                                                }}
                                                rows={3}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm resize-y overflow-auto mt-2"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                logEditing[index] = !logEditing[index];
                                                setTask({ ...task, logs: [...task.logs] });
                                                setLogEditing([...logEditing]);
                                            }}
                                            className="w-1/12 text-green-500 hover:text-green-700 hover:bg-green-200 rounded-md px-3 py-2.5"
                                        ><FaCheck /></button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                logEditing[index] = !logEditing[index];
                                                setLogEditing([...logEditing]);
                                            }}
                                            className="w-1/12 text-persian-red-500 hover:text-persian-red-700 hover:bg-persian-red-200 rounded-md px-3 py-2.5"
                                        ><FaTimes /></button>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-full">
                                            <div className="flex items-center">
                                                {users.find(user => user.id === log.collaboratorId)?.avatarImg == null ? (
                                                    <FaUserCircle size="2rem" className="w-10 h-10 text-slate-400" />
                                                ) : (
                                                    <img src={collaboratorImgUrl(log.collaboratorId)} className="w-10 h-10 rounded-full" />
                                                )}
                                                <div className="w-full ml-2">
                                                    <div className="flex justify-between items-center">
                                                        <p className="text-sm font-medium text-gray-700">{users.find(user => user._id === log.collaboratorId)?.name}</p>
                                                        <p className="mb-1 ml-1 mr-4 text-xs text-gray-500 italic">{dayjs(log.date).format("DD/MMM/YYYY")}</p>
                                                    </div>
                                                    <p className="w-full text-sm mt-1">{log.entry}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                logEditing[index] = !logEditing[index];
                                                setLogEditing([...logEditing]);
                                            }}
                                            className="w-1/12 text-white hover:text-ship-cove-700 bg-ship-cove-500 hover:bg-ship-cove-200 rounded-md px-3 py-2.5"
                                        ><RiPencilFill /></button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newLogs = task.logs ? task.logs.filter((_, i) => i !== index) : [];
                                                setTask({ ...task, logs: newLogs });
                                            }}
                                            className="w-1/12 text-white hover:text-persian-red-700 bg-persian-red-500 hover:bg-persian-red-200 rounded-md px-3 py-2.5"
                                        ><FaTrash /></button>
                                    </>
                                )}
                            </div>
                        ))}
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