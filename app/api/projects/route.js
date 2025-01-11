import { connectMongoDB } from "@/lib/mongodb";
import Project from "@/models/project";
import Client from "@/models/client";
import Contract from "@/models/contract";
import Task from "@/models/task";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/authOptions";
import { PROJECT_STATUS, USER_ROLE } from "@/app/utils/constants";

export async function GET(req) {
    const session = await getServerSession(authOptions);
    const userRole = session?.user?.role;
    const userId = session?.user?.id;
    const userClientId = session?.user?.clientId;

    if (!userRole) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const contractId = url.searchParams.get("contractId");
    const clientId = url.searchParams.get("clientId");
    console.log("getProjects by contractId", contractId);
    console.log("SESSION", session);
    await connectMongoDB();

    let query = {};
    if (userRole === USER_ROLE.neo) {
        query = { status: { $ne: PROJECT_STATUS.closed } };
    } else if (userRole === USER_ROLE.client) {
        const contracts = await Contract.find({ clientId: userClientId });
        const contractIds = contracts.map(contract => contract._id);
        query = { contractId: { $in: contractIds }, status: { $ne: PROJECT_STATUS.closed } };
    } else if (contractId) {
        query = { contractId, status: { $ne: PROJECT_STATUS.closed } };
    } else if (clientId) {
        const contracts = await Contract.find({ clientId });
        const contractIds = contracts.map(contract => contract._id);
        query = { contractId: { $in: contractIds }, status: { $ne: PROJECT_STATUS.closed } };
    } else {
        query = { status: { $ne: PROJECT_STATUS.closed } };
    }

    console.log("QUERY", query);

    const projects = await Project.find(query);
    const decoratedProjects = await Promise.all(projects.map(async (project) => {
        const contract = await Contract.findById(project.contractId);
        const client = await Client.findById(contract?.clientId);
        const tasks = await Task.find({ projectId: project._id });
        return {
            id: project._id,
            identifier: project.identifier,
            clientImg: client?.imgLogo ?? '',
            clientName: client?.name ?? '',
            contractId: project.contractId,
            projectType: project.projectType,
            title: project.title,
            status: project.status,
            kickOff: project.kickOff,
            end: project.end,
            progress: tasks.length > 0 ? tasks.reduce((acc, task) => acc + (task.progress ?? 0), 0) / tasks.length : 0,
            rentability: project.rentability ?? 0,
        };
    }));
    return NextResponse.json({ projects: decoratedProjects });
}

export async function POST(req) {
    const body = await req.json();
    console.log("Create Project...", body);    
    const project = new Project(body);    
    const projectCount = await Project.countDocuments();
    project.identifier = projectCount + 1;
    project.createdAt = new Date();
    await project.save();
    return NextResponse.json(project);
}
