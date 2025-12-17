import EditVehiculo from "@/components/flota/EditVehiculo";

interface EditVehiculoPageProps {
    params: {
        vehiculoId: string[];
    };
}

export default function EditVehiculoPage({ params }: EditVehiculoPageProps) {
    return <EditVehiculo vehiculoId={params.vehiculoId[0]} />;
}