import { ICilindroView } from "@/types/types";
import { getColorEstanque } from "@/lib/uix";
import Image from "next/image";

interface CylinderPosition {
  top: number;
  left: number;
  width: number;
  height: number;
}

export default function CargaCilindros({
    cargados, 
    calculatePosition
}: {
    cargados: ICilindroView[];
    calculatePosition: (index: number, isLoaded: boolean) => CylinderPosition;
}) {
    return (
        <>
            {cargados.reverse().map((item, index) => {
                const position = calculatePosition(index, true);
                return (
                    <Image
                        key={`cargado_${index}`}
                        src={`/ui/tanque_biox${getColorEstanque(item.elemento)}.png`}
                        alt={`tank_cargado_${index}`}
                        width={position.width}
                        height={position.height}
                        className="absolute"
                        style={{
                            top: position.top,
                            left: position.left,
                            zIndex: 200 + cargados.length - index
                        }}
                        priority={false}
                    />
                );
            })}
        </>
    );
}