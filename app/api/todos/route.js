import { NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import Task from "@/models/task";

export async function GET(req) {
    await connectMongoDB();
    
    const url = new URL(req.url);
    const taskType = url.searchParams.get("taskType");

    if (!taskType) {
        return NextResponse.json({ error: "taskType parameter is required" }, { status: 400 });
    }

    try {
        // Encontrar la tarea más reciente del mismo taskType que tenga "todos"
        const recentTask = await Task.findOne({ taskType, todos: { $exists: true, $ne: [] } })
            .sort({ createdAt: -1 })
            .exec();

        if (!recentTask) {
            return NextResponse.json({ error: "No tasks found with the specified taskType and todos" }, { status: 404 });
        }

        // Generar el arreglo de todos con los nombres de las tareas y los pesos existentes
        const todos = recentTask.todos.map(todo => ({
            title: todo.title,
            hours: todo.hours
        }));

        return NextResponse.json({ todos });
    } catch (error) {
        console.error("Error fetching tasks:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}