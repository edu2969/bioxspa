"use client";

import { FaFileContract, FaRoute, FaSignInAlt } from "react-icons/fa";
import { HiUserGroup } from "react-icons/hi";
import { TbReportMoney, TbTruckLoading } from "react-icons/tb";
import AccessButton from "./homeAccessPanel/AccessButton";
import { IAccessButtonProps } from "./homeAccessPanel/types";
import { USER_ROLE } from "@/app/utils/constants";
import { useQuery } from "@tanstack/react-query";
import Loader from "../Loader";
import { useSession } from "next-auth/react";
import { Session } from "next-auth";
import { useState } from "react";

const modules = (contadores: number[], session: Session): IAccessButtonProps[] => {
    const role = session?.user?.role ?? USER_ROLE.invitado;
    return [USER_ROLE.encargado, USER_ROLE.responsable, USER_ROLE.cobranza].includes(role) ?
    [{
        key: "button_01",        
        href: "/pages/pedidos",
        icon: <FaFileContract className="mx-auto mb-1" size="6rem" />,
        label: "PEDIDOS",
        index: 0,
        badges: [{
            color: "bg-red-500",
            value: contadores[0] > 999999 ? '999999+' : contadores[0],
            text: "x APROBAR"
        }],        
    },
    {
        key: "button_02",
        href: "/pages/asignacion",
        icon: <FaSignInAlt className="mx-auto mb-1" size="6rem" />,
        label: "ASIGNACION",
        index: 1,
        badges: [{
            color: "bg-red-500",
            value: contadores[1] > 999999 ? '999999+' : (contadores[1] ?? 0),
            text: "x ASIGNAR"
        }, {
            color: "bg-blue-500",
            value: contadores[2] > 999999 ? '999999+' : (contadores[2] ?? 0),
            text: "x PREPARAR"
        }, {
            color: "bg-blue-500",
            value: contadores[3] > 999999 ? '999999+' : (contadores[3] ?? 0),
            text: "en RUTA"
        }]
    }, {
        key: "button_03",
        href: "/pages/cobros",
        icon: <TbReportMoney className="mx-auto mb-1" size="6rem" />,
        label: "COBROS",
        index: 2
    }, {
        key: "button_04",
        href: "/pages/configuraciones/clientes",
        icon: <HiUserGroup className="mx-auto mb-1" size="6rem" />,
        label: "CLIENTES",
        index: 3,
        badges: [
            {
                color: "bg-green-500",
                value: contadores[0] > 999999 ? '999999+' : (contadores[0] ?? 0),
                text: "x ACTIVOS"
            }, {
                color: "bg-gray-500",
                value: contadores[1] > 999999 ? '999999+' : (contadores[1] ?? 0),
                text: "en QUIEBRA"
            }
        ]
    }] : [{
        key: "button_05",
        href: `/pages/home${session?.user?.role === USER_ROLE.conductor ? "Conductor" : "Despacho"}/pedidos`,
        icon: session?.user?.role === USER_ROLE.conductor 
            ? <FaRoute className="mx-auto mb-1" size="6rem" />
            : <TbTruckLoading className="mx-auto mb-1" size="6rem" />,
        label: "PEDIDOS",
        index: 0,
        badges: [{
            color: "bg-green-500",
            value: contadores[0] > 999999 ? '999999+' : (contadores[0] ?? 0),
            text: "x ACTIVOS"
        }]
    }]
};

export default function HomeAccessPanel() {
    const [routingIndex, setRoutingIndex] = useState(-1);
    const { data: session } = useSession();

    const { data: homeCounters } = useQuery<Array<number>>({
        queryKey: ['homeCounters'],
        queryFn: async () => {
            const response = await fetch('/api/home');
            const data = await response.json();
            return data.contadores;
        }
    });

    return (<main className="w-full min-h-screen flex flex-col justify-center items-center p-4 md:p-6 max-w-2xl mx-auto mt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            {(homeCounters && session) ? modules(homeCounters, session).map((mod, idx) => (
                <AccessButton key={`access_button_${idx}`} props={mod} routingIndex={routingIndex} setRoutingIndex={setRoutingIndex} />)) : <Loader />}
        </div>
    </main>);
}