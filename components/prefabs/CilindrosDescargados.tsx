export default function CilindrosDescargados({
    vehiculoId, marca, modelo
}: {
    vehiculoId?: string;
    marca: string;
    modelo: string
}) {
    return (
        <div>
            Cilindros Descargados {vehiculoId} - {marca} {modelo}
        </div>
    );
}