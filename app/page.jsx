import { StrictMode } from "react";
import {
  Outlet, 
  RouterProvider,
  createRouter,
  createRouterConfig
} from "@tanstack/react-router";

import LoginForm from "@/components/LoginForm";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/utils/authOptions";
import HomeAccessPanel from "@/components/prefabs/HomeAccessPanel";
import ConductorPanel from "@/components/conductor/ConductorPanel";
import JefaturaDespacho from "@/components/JefaturaDespacho";
import Pedidos from "@/components/pedidos/Pedidos";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const routerConfig = createRouterConfig().createChildren((createRouter) => [
    createRouter({
      path: "/",
      component: LoginForm,
    }, {
      path: "/home",
      component: HomeAccessPanel
    }, {
      path: "/conductor",
      component: ConductorPanel
    }, {
      path: "/despacho",
      component: JefaturaDespacho
    }, {
      path: "/pedidos",
      component: Pedidos
    })
  ])
  const router = createRouter({ routerConfig });

  if (session) {
    redirect("/modulos");
  }

  return (
    <RouterProvider router={router}>
      <StrictMode>
        <Outlet />
      </StrictMode>
    </RouterProvider>
  );
}