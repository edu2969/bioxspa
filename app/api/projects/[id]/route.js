import { NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import Project from "@/models/project";
import Task from "@/models/task";
import Contract from "@/models/contract";
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { PROJECT_STATUS } from "@/app/utils/constants";

dayjs.extend(utc);
dayjs.extend(timezone);

export async function POST(req, { params }) {
    const body = await req.json();
    await connectMongoDB();    
    console.log("Update project...", body);
    const tasks = await Task.find({ projectId: params.id }).sort({ priority: 1 });
    let currentStartDate = dayjs(body.kickOff).utc();

    const project = await Project.findById(params.id);
    let inDefinition = project.status === PROJECT_STATUS.defining;    
    var hasChanged = project.status !== body.status;        
    for (const task of tasks) {
        let endDate = currentStartDate;
        let hoursRemaining = inDefinition ? task.weight : task.estimatedWeight;
        while (hoursRemaining > 0) {
            if (endDate.day() === 0 || endDate.day() === 6) { // Skip weekends
                endDate = endDate.add(1, 'day').hour(8).minute(0).second(0).millisecond(0);
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
                    endDate = endDate.hour(14).minute(0).second(0).millisecond(0); // Move to afternoon session
                } else {
                    endDate = endDate.add(1, 'day').hour(8).minute(0).second(0).millisecond(0); // Move to next day morning
                }
            }
        }

        // Ajustar la fecha de fin para que termine a las X-1:59 minutos
        endDate = endDate.minute(59).second(0).millisecond(0);

        if(hasChanged) {
            if(task.weight == null) {
                task.weight = task.estimatedWeight;
            }
            if(task.estimatedWeight == null) {
                task.estimatedWeight = task.weight;
            }
        }

        // Actualizar las fechas de la tarea
        await Task.findByIdAndUpdate(task._id, {
            startDate: currentStartDate.toDate(),
            endDate: endDate.toDate(),
            weight: task.weight,
            estimatedWeight: task.estimatedWeight,
        });

        // La siguiente tarea comienza a la hora exacta
        currentStartDate = endDate.add(1, 'minute').minute(0).second(0).millisecond(0);
    }

    // Actualizar el proyecto con las nuevas fechas
    body.end = currentStartDate.toDate();
    const resp = await Project.findByIdAndUpdate(params.id, body);

    return resp ? NextResponse.json(resp) : NextResponse.json(error.message, {
        status: 404,
    });
}

export async function GET(req, { params }) {
    console.log("getProjectById...", params);
    await connectMongoDB();
    const projectDoc = await Project.findOne({ _id: params.id });
    if (!projectDoc) {
        return NextResponse.json("Proyecto " + params.id + " not found", {
            status: 400,
        });
    }

    const contract = await Contract.findOne({ _id: projectDoc.contractId });
    const tasks = await Task.find({ projectId: params.id });

    const project = projectDoc.toObject(); 
    project.tasks = tasks;
    project.contractId = contract._id;
    project.clientId = contract.clientId;

    console.log("Project found: ", project, contract);
    return NextResponse.json({ project });
}