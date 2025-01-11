import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Project from "@/models/project";
import Task from "@/models/task";
import User from "@/models/user";
import { PROJECT_STATUS } from "@/app/utils/constants";

export async function GET(req) {
    await connectMongoDB();
    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId");    
    const project = await Project.findOne({ _id: projectId });
    const tasks = await Task.find({ projectId: projectId });    
    const decoratedTasks = await Promise.all(tasks.map(async (task) => {
        const client = await User.findOne({ _id: task.asignTo });
        var progress = task.todos?.length > 0 ? Math.round((task.todos.filter(todo => todo.finishedAt != null).length / task.todos.length) * 100) : 0;
        return {
            id: task._id,
            asignedToImg: client?.avatarImg ?? "/profiles/neo.jpg",
            identifier: task.identifier,
            taskType: task.taskType,
            title: task.title,
            status: task.status,
            weight: project.status === PROJECT_STATUS.defining ? task.estimatedWeight : task.weight,
            startDate: task.startDate,
            endDate: task.endDate,
            progress: progress,
        };
    }));
    return NextResponse.json({ tasks: decoratedTasks });
}

export async function POST(req) {
    const body = await req.json();
    const task = new Task(body);
    const project = await Project.findOne({ _id: task.projectId });
    const taskCount = await Task.countDocuments();
    task.priority = taskCount + 1;
    if(project.status === PROJECT_STATUS.defining) {
        task.estimatedWeight = task.weight;
    }
    task.createdAt = new Date();
    await task.save();
    return NextResponse.json(task);
}