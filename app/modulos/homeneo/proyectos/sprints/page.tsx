"use client"

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PROJECT_STATUS } from "@/app/utils/constants";
import SprintView from "@/components/SprintView";
import dayjs from "dayjs";

export default function Sprints() {
    const [sprints, setSprints] = useState<SprintView[]>([]);
    const [project, setProject] = useState<ProjectFormType | null>(null);
    const [loadingList, setLoadingList] = useState(true);
    const initData = useRef(false);
    const params = useSearchParams();

    async function getProjectById() {
        const res = await fetch(`/api/projects/${params.get("projectId")}`);
        const data = await res.json();
        console.log("Project Data", data);
        setProject(data.project);
    }

    async function getSprints() {
        const res = await fetch(`/api/tasks?projectId=${params.get("projectId")}`);
        res.json().then((data: TaskItemListType[] | any) => {
            const tasks = data.tasks;
            console.log("TASKS", data.tasks);
            const sprints: SprintView[] = [];
            let currentSprint: SprintItemView[] = [];
            let currentSprintHours = 0;
            let sprintStartDate = dayjs(tasks[0].startDate);
            let totalHours = 0;
    
            tasks.forEach((task: TaskItemListType) => {
                const taskWeight = project?.status === PROJECT_STATUS.defining ? task.estimatedWeight : task.weight;
                totalHours += taskWeight;
    
                if (currentSprintHours + taskWeight > 40) {
                    // Close current sprint and start a new one
                    if (currentSprint.length > 0) {
                        sprints.push({
                            lastUpdate: new Date(),
                            endDate: null,
                            estimatedEndDate: sprintStartDate.add(totalHours / 40, 'week').toDate(),
                            progress: currentSprint.reduce((acc, t) => acc + t.percentaje, 0) / currentSprint.length || 0,
                            sprints: currentSprint,
                        });
                    }
                    currentSprint = [];
                    currentSprintHours = 0;
                    sprintStartDate = sprintStartDate.add(1, 'week');
                }
    
                const taskStartDate = dayjs(task.startDate);
                const taskEndDate = dayjs(task.endDate);
                const taskShortDescription = task.title + (taskEndDate.isAfter(sprintStartDate.add(1, 'week')) ? ' (*)' : '');
    
                currentSprint.push({
                    title: task.title,
                    taskIndexFrom: taskStartDate.format('DD/MMM/YYYY'),
                    taskIndexTo: taskEndDate.format('DD/MMM/YYYY'),
                    taskShortDescription: taskShortDescription,
                    percentaje: task.progress ?? 0
                });
    
                currentSprintHours += taskWeight;
            });
    
            // Add the last sprint if it has tasks
            if (currentSprint.length > 0) {
                sprints.push({
                    lastUpdate: new Date(),
                    endDate: null,
                    estimatedEndDate: sprintStartDate.add(totalHours / 40, 'week').toDate(),
                    progress: currentSprint.reduce((acc, t) => acc + t.percentaje, 0) / currentSprint.length || 0,
                    sprints: currentSprint,
                });
            }
    
            setSprints(sprints);
            console.log("Sprints", sprints);
            setLoadingList(false);
        });
    }

    useEffect(() => {
        if (!initData.current) {
            initData.current = true;
            getProjectById().then(() => {
                getSprints();
            });
        }
    }, []);

    return (<SprintView project={project} sprints={sprints} loader={loadingList}/>);
}