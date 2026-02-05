"use client";

import { FaFileContract, FaRoute, FaSignInAlt } from "react-icons/fa";
import { HiUserGroup } from "react-icons/hi";
import { TbReportMoney, TbTruckLoading } from "react-icons/tb";
import AccessButton from "./homeAccessPanel/AccessButton";
import { IAccessButtonProps } from "./homeAccessPanel/types";
import { useQuery } from "@tanstack/react-query";
import Loader from "../Loader";
import { useState } from "react";
import { useAuthorization } from "@/lib/auth/useAuthorization";
import { RESOURCES, ACTIONS, ROLES } from "@/lib/auth/permissions";

// ===============================================
// CONFIGURACIÓN DE MÓDULOS BASADA EN PERMISOS
// ===============================================

const getModulesForUser = (
  auth: ReturnType<typeof useAuthorization>,
  contadores: number[]
): IAccessButtonProps[] => {
  const modules: IAccessButtonProps[] = [];

  // Módulo de Pedidos para Gestores/Supervisores
  if (auth.hasRole([ROLES.COLLECTIONS, ROLES.MANAGER, ROLES.SUPER_ADMIN])) {
    modules.push({
      key: "pedidos_management",
      href: "/pages/pedidos",
      icon: <FaFileContract className="mx-auto mb-1" size="6rem" />,
      label: "PEDIDOS",
      index: 0,
      badges: [{
        color: "bg-red-500",
        value: contadores[0] > 999999 ? '999999+' : contadores[0],
        text: "x APROBAR"
      }],
    });
  }

  // Módulo de Asignación para Encargados/Responsables
  if (auth.hasRole([ROLES.COLLECTIONS, ROLES.MANAGER, ROLES.SUPER_ADMIN])) {
    modules.push({
      key: "asignacion",
      href: "/pages/asignacion",
      icon: <FaSignInAlt className="mx-auto mb-1" size="6rem" />,
      label: "ASIGNACION",
      index: 1,
      badges: [{
        color: "bg-red-500",
        value: contadores[0] > 999999 ? '999999+' : (contadores[1] ?? 0),
        text: "x ASIGNAR"
      }, {
        color: "bg-blue-500",
        value: contadores[1] > 999999 ? '999999+' : (contadores[2] ?? 0),
        text: "x PREPARAR"
      }, {
        color: "bg-blue-500",
        value: contadores[2] > 999999 ? '999999+' : (contadores[3] ?? 0),
        text: "en RUTA"
      }]
    });
  }

  // Módulo de Cobros para Cobranza
  if (auth.hasRole([ROLES.COLLECTIONS, ROLES.MANAGER, ROLES.SUPER_ADMIN])) {
    modules.push({
      key: "cobros",
      href: "/pages/cobros",
      icon: <TbReportMoney className="mx-auto mb-1" size="6rem" />,
      label: "COBROS",
      index: 2
    });
  }

  // Módulo de Clientes para usuarios con permisos de gestión
  if (auth.canAny([
    { resource: RESOURCES.CLIENTES, action: ACTIONS.READ },
    { resource: RESOURCES.CLIENTES, action: ACTIONS.CREATE },
    { resource: RESOURCES.CLIENTES, action: ACTIONS.UPDATE }
  ])) {
    modules.push({
      key: "clientes",
      href: "/pages/configuraciones/clientes",
      icon: <HiUserGroup className="mx-auto mb-1" size="6rem" />,
      label: "CLIENTES",
      index: 3,
      badges: [{
        color: "bg-green-500",
        value: contadores[3] > 999999 ? '999999+' : (contadores[3] ?? 0),
        text: "x ACTIVOS"
      }]
    });
  }

  // Módulo específico para Conductores
  if (auth.hasRole([ROLES.DRIVER])) {
    modules.push({
      key: "rutas_conductor",
      href: "/pages/homeConductor/pedidos",
      icon: <FaRoute className="mx-auto mb-1" size="6rem" />,
      label: "RUTAS",
      index: 0,
      badges: [{
        color: "bg-green-500",
        value: contadores[0] > 999999 ? '999999+' : (contadores[0] ?? 0),
        text: "x ACTIVOS"
      }]
    });
  }

  // Módulo específico para Despachadores
  if (auth.hasRole([ROLES.DISPATCHER])) {
    modules.push({
      key: "despacho",
      href: "/pages/homeDespacho/pedidos",
      icon: <TbTruckLoading className="mx-auto mb-1" size="6rem" />,
      label: "DESPACHO",
      index: 0,
      badges: [{
        color: "bg-green-500",
        value: contadores[0] > 999999 ? '999999+' : (contadores[0] ?? 0),
        text: "x PEDIDO" + (contadores[0] === 1 ? "" : "S")
      }]
    });
  }

  return modules;
};

export default function HomeAccessPanel() {
    const [routingIndex, setRoutingIndex] = useState(-1);
    const auth = useAuthorization();

    const { data: homeCounters, isLoading } = useQuery<Array<number>>({
        queryKey: ['home-counters'],
        queryFn: async () => {
            const response = await fetch('/api/home', {
                method: 'GET',
                credentials: 'include'
            });
            const resp = await response.json();
            console.log("Home counters data:", resp);
            return resp.data || [];
        },
        enabled: !!auth.user // Solo ejecutar si hay usuario autenticado
    });

    // Mostrar loader mientras carga la autenticación o los datos
    if (!auth.user || isLoading || !homeCounters) {
        return (
            <main className="w-full min-h-screen flex flex-col justify-center items-center p-4 md:p-6 max-w-2xl mx-auto mt-0">
                <Loader />
            </main>
        );
    }

    const userModules = getModulesForUser(auth, homeCounters);

    // Si no hay módulos disponibles para el usuario
    if (userModules.length === 0) {
        return (
            <main className="w-full min-h-screen flex flex-col justify-center items-center p-4 md:p-6 max-w-2xl mx-auto mt-0">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Bienvenido</h2>
                    <p className="text-gray-600">
                        Tu cuenta está configurada pero aún no tienes acceso a ningún módulo.
                        <br />
                        Contacta al administrador para obtener los permisos necesarios.
                    </p>
                </div>
            </main>
        );
    }

    return (
        <main className="w-full min-h-screen flex flex-col justify-center items-center p-4 md:p-6 max-w-2xl mx-auto mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                {userModules.map((mod, idx) => (
                    <AccessButton 
                        key={mod.key} 
                        props={mod} 
                        routingIndex={routingIndex} 
                        setRoutingIndex={setRoutingIndex} 
                    />
                ))}            
            </div>
            
            {/* Debug info en desarrollo */}
            {process.env.NODE_ENV === 'development' && (
                <div className="mt-8 p-4 bg-gray-100 rounded-lg text-xs">
                    <details>
                        <summary className="cursor-pointer font-semibold">Debug: Información de Usuario</summary>
                        <div className="mt-2 space-y-1">
                            <div><strong>Usuario:</strong> {auth.user?.email}</div>
                            <div><strong>Roles:</strong> {auth.userRoles.join(', ')}</div>
                            <div><strong>Módulos disponibles:</strong> {userModules.length}</div>
                        </div>
                    </details>
                </div>
            )}
        </main>
    );
}