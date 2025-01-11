import { NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import Task from "@/models/task";
import { TASK_STATUS } from "@/app/utils/constants";

export async function POST(req, { params }) {
    const body = await req.json();
    console.log("POST TASK", body);
    await connectMongoDB();
    body.progress = body.todos?.filter(t => t.finishedAt != null).length / (body.todos?.length ?? 1) * 100;
    if(body.status == TASK_STATUS.defining) {
        body.estimatedWeight = body.todos?.reduce((acc, t) => acc + (t.hours ?? 0), 0);    
    } else body.weight = body.todos?.reduce((acc, t) => acc + (t.hours ?? 0), 0);
    const resp = await Task.findByIdAndUpdate(params.id, body);    
    return resp ? NextResponse.json(resp) : NextResponse.json(error.message, {
        status: 404,
    })
}

export async function GET(req, { params }) {
    await connectMongoDB();
    const task = await Task.findOne({ _id: params.id });
    return NextResponse.json(task ? { task } : ("Task " + params + " not found", {
        status: 400,
    }));
}

export async function DELETE(req, { params }) {
    await connectMongoDB();
    const { id } = params;

    try {
        const task = await Task.findByIdAndDelete(id);
        if (!task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }
        return NextResponse.json({ message: 'Task deleted successfully' }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}