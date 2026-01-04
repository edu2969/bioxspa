import { useMemo } from "react";
import { ICilindroView } from "@/types/types";
import { getColorEstanque } from "@/lib/uix";
import Image from "next/image";

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
        "volkswagen_delivery" | "kia_frontier" | "ford_transit" | "desconocida_desconocido",
        number[]
    > = {
        "hyundai_porter": [-8, 96, 1.5, 4],
        "ford_ranger": [-16, 198, 1.5, 4],
        "mitsubishi_l200": [28, 76, 1.5, 4],
        "volkswagen_constellation": [28, 76, 1.5, 4],
        "volkswagen_delivery": [28, 76, 1.5, 4],
        "kia_frontier": [28, 76, 1.5, 4],
        "ford_transit": [-8, 186, 1.5, 4],
        "desconocida_desconocido": [28, 76, 1.5, 4],
    };
    const key = (marcaSplit + "_" + modeloSplit) as keyof typeof offsets;
    const data = offsets[key] ?? offsets["desconocida_desconocido"];
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
    marca, modelo, cargados
}: {
    marca: string;
    modelo: string,
    cargados: Array<ICilindroView>
}) {
    const memoizedCalculateTubePosition = useMemo(() => calculateTubePosition, []);

    return <>    
        {cargados.reverse().map((item, index) => {
            // Deducción de descargado usando historialCarga                                                        
            const elem = item.elemento;
            const pos = memoizedCalculateTubePosition(index, marca, modelo);
            return (
                <Image
                    key={index}
                    src={`/ui/tanque_biox${getColorEstanque(elem)}.png`}
                    alt={`tank_${index}`}
                    width={14 * 4}
                    height={78 * 4}
                    className={`absolute`}
                    style={calculateTubePosition(cargados.length - index - 1, marca, modelo)}
                    priority={false}
                />
            );
        })}
    </>;
}