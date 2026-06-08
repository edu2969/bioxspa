// hooks/useSucursales.ts

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

export interface ISucursalSelectable {
  id: string;
  nombre: string;
  ventasActivas: number;
}

export function useSucursales() {
  const [selectedSucursalId, setSelectedSucursalId] =
    useState<string>("");

  const query = useQuery<ISucursalSelectable[]>({
    queryKey: ["sucursales"],
    queryFn: async () => {
      const response = await fetch(
        "/api/pedidos/asignacion/sucursales"
      );

      if (!response.ok) {
        throw new Error(
          "Failed to fetch sucursales"
        );
      }

      const data = await response.json();
      console.log("DATA SUCURSALES", data);
      return data.sucursales;
    },

    staleTime: 1000 * 60 * 10,
  });

  useEffect(() => {
    if (!query.data?.length) return;

    const localSucursalId = localStorage.getItem("sucursalId");

    console.log("LOCAL SUCURSAL ID", localSucursalId);

    if (localSucursalId) {
      setSelectedSucursalId(
        localSucursalId
      );
      return;
    }

    const defaultId = String(
      query.data[0].id
    );

    localStorage.setItem(
      "sucursalId",
      defaultId
    );

    setSelectedSucursalId(
      defaultId
    );
  }, [query.data]);

  const changeSucursal = (
    sucursalId: string
  ) => {
    localStorage.setItem(
      "sucursalId",
      sucursalId
    );

    setSelectedSucursalId(
      sucursalId
    );
  };

  return {
    sucursales: query.data ?? [],
    selectedSucursalId,
    changeSucursal,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}