import { useQuery } from "@tanstack/react-query";
import { ICilindro } from "./types";
import { useMemo } from "react";

const offsetByModel = (marca: string, modelo: string) => {
    const marcaSplit = (marca.split(" ")[0] || "").toLowerCase();
    const modeloSplit = (modelo.split(" ")[0] || "").toLowerCase();
    if (!marca || !modelo) {
        return {
            baseTop: 28,
            baseLeft: 76,
            scaleFactor: 1.5,
            verticalIncrement: 4
        };
    }
    const offsets: Record<
        "hyundai_porter" | "ford_ranger" | "mitsubishi_l200" | "volkswagen_constellation" |
        "volkswagen_delivery" | "kia_frontier" | "ford_transit" | "desconocido_desconocido",
        number[]
    > = {
        "hyundai_porter": [-8, 96, 1.5, 4],
        "ford_ranger": [-16, 198, 1.5, 4],
        "mitsubishi_l200": [28, 76, 1.5, 4],
        "volkswagen_constellation": [28, 76, 1.5, 4],
        "volkswagen_delivery": [28, 76, 1.5, 4],
        "kia_frontier": [28, 76, 1.5, 4],
        "ford_transit": [-8, 186, 1.5, 4],
        "desconocido_desconocido": [28, 76, 1.5, 4],
    };
    const key = (marcaSplit + "_" + modeloSplit) as keyof typeof offsets;
    const data = offsets[key] ?? offsets["desconocido_desconocido"];
    return {
        baseTop: data[0],
        baseLeft: data[1],
        scaleFactor: data[2],
        verticalIncrement: data[3]
    };
}

function calculateTubePosition(index: number, marca: string, modelo: string) {
    const offsets = offsetByModel(marca, modelo);
    const baseTop = offsets.baseTop;
    const baseLeft = offsets.baseLeft;
    const scaleFactor = offsets.scaleFactor;
    const verticalIncrement = 5;

    const top = baseTop + Number(!(index % 2)) * verticalIncrement - Math.floor(index / 2) * verticalIncrement - Math.floor(index / 4) * verticalIncrement; // Ajuste vertical con perspectiva y separación de grupos
    const left = baseLeft + Number(!(index % 2)) * 14 + Math.floor(index / 2) * 12 + Math.floor(index / 4) * 8; // Ajuste horizontal con perspectiva

    return { top, left, width: (14 * scaleFactor) + 'px', height: (78 * scaleFactor) + 'px' };
}

export default function CargaCilindros({
    vehiculoId, marca, modelo
}: {
    vehiculoId?: string;
    marca: string;
    modelo: string
}) {
    const memoizedCalculateTubePosition = useMemo(() => calculateTubePosition, []);

    const { data: carga } = useQuery<ICilindro[]>({
        queryKey: ['carga-cilindros', marca, modelo],
        queryFn: async () => {
            const response = await fetch(`/api/flota/cargaCilindros?vehiculoId=${vehiculoId}`);
            const data = await response.json();
            console.log("DATA", data);
            return data.cilindros ?? [];
        },
        throwOnError(error, query) {
            console.error("Error fetching carga cilindros:", error, query);
            return true;
        },
        enabled: !!vehiculoId
    });

    return <>
        {carga && carga.map((cilindro, idx) => {
            const pos = memoizedCalculateTubePosition(idx, marca, modelo);
            return (
                <div
                    key={idx}
                    style={{
                        position: "absolute",
                        left: pos.left,
                        top: pos.top,
                        zIndex: 2,
                        width: 32,
                        height: 64,
                        background: cilindro.esIndustrial ? "#60A5FA" : "#F59E42",
                        borderRadius: "8px",
                        border: "2px solid #333",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        fontWeight: "bold",
                        fontSize: "0.8rem",
                    }}
                    title={`Elemento: ${cilindro.elementos}, Peso: ${cilindro.peso}kg`}
                >
                    {cilindro.elementos}
                </div>
            );
        })}
    </>;
}