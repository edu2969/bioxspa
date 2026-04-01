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
import { RESOURCES, ACTIONS } from "@/lib/auth/permissions";
import { TIPO_CARGO, TIPO_CHECKLIST } from "@/app/utils/constants";
import { useRealtimeQuery } from "@/hooks/useRealtimeQuery";
import { useChecklist } from "@/components/context/ChecklistContext";
import { PiWarningOctagonBold } from "react-icons/pi";

const getModulesForUser = (
  auth: ReturnType<typeof useAuthorization>,
  contadores: number[],
  sessionRoles: number[],
  conductorWarningMessage?: React.ReactNode
): IAccessButtonProps[] => {
  const modules: IAccessButtonProps[] = [];
  const hasSessionRole = (roles: number[]) => roles.some((role) => sessionRoles.includes(role));

  // Módulo de Pedidos para Gestores/Supervisores
  if (hasSessionRole([TIPO_CARGO.cobranza, TIPO_CARGO.responsable, TIPO_CARGO.gerente, TIPO_CARGO.encargado])) {
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
  if (hasSessionRole([TIPO_CARGO.cobranza, TIPO_CARGO.encargado, TIPO_CARGO.responsable])) {
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
  if (hasSessionRole([TIPO_CARGO.cobranza, TIPO_CARGO.gerente, TIPO_CARGO.neo])) {
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
  if (hasSessionRole([TIPO_CARGO.conductor])) {
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
      }],
      warningMessage: conductorWarningMessage
    });
  }

  // Módulo específico para Despachadores
  if (hasSessionRole([TIPO_CARGO.despacho])) {
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
  const { hasApprovedChecklist, isLoadingChecklist } = useChecklist();
  const sessionRoles = auth.getUserCargos().map((cargo) => cargo.tipo);
  const userId = auth.user?.id || null;

  const conductorNeedsPersonal = !hasApprovedChecklist(TIPO_CHECKLIST.personal);
  const conductorNeedsVehiculo = !hasApprovedChecklist(TIPO_CHECKLIST.vehiculo);
  const conductorWarningMessage = conductorNeedsPersonal || conductorNeedsVehiculo ? 
    (<div className="absolute top-2 left-2 flex items-center bg-red-100 text-red-700 px-2 py-1 rounded shadow z-20">
        <PiWarningOctagonBold className="mr-2 text-red-600" />
        <span className="text-xs font-semibold">Falta checklist</span>
    </div>) : undefined;

  useRealtimeQuery({
    channelName: `home-counters-ventas-${userId}`,
    schema: 'public',
    table: 'ventas',
    event: '*',
    queryKeys: [['home-counters', userId]],
    enabled: !!userId,
  });

  useRealtimeQuery({
    channelName: `home-counters-rutas-${userId}`,
    schema: 'public',
    table: 'rutas_despacho',
    event: '*',
    queryKeys: [['home-counters', userId]],
    enabled: !!userId,
  });  

  const { data: homeCounters, isLoading } = useQuery<Array<number>>({
    queryKey: ['home-counters', userId],
    queryFn: async () => {
      const response = await fetch('/api/home');
      const resp = await response.json();
      console.log(">>>>>> Home counters response:", resp);
      return resp.data || [];
    },
    enabled: !!userId // Solo ejecutar si hay usuario autenticado
  });

  // Mostrar loader mientras carga la autenticación o los datos
  if (!auth.user || isLoading || isLoadingChecklist || !homeCounters) {
    return (
      <main className="w-full min-h-screen flex flex-col justify-center items-center p-4 md:p-6 max-w-2xl mx-auto mt-0">
        <Loader />
      </main>
    );
  }

  const userModules = getModulesForUser(auth, homeCounters, sessionRoles, conductorWarningMessage);

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
              <div><strong>Roles:</strong>...</div>
              <div><strong>Módulos disponibles:</strong> {userModules.length}</div>
            </div>
          </details>
        </div>
      )}
    </main>
  );
}