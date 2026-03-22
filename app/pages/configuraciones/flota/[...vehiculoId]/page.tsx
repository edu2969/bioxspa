import EditVehiculo from "@/components/flota/EditVehiculo";
import { notFound } from "next/navigation";

interface EditVehiculoPageProps {
    params: Promise<{
        vehiculoId: string[];
    }>;
}

export default async function EditVehiculoPage({ params }: EditVehiculoPageProps) {
    const { vehiculoId } = await params;
    const id = vehiculoId?.[0];

    if (!id) {
        notFound();
    }

    return <EditVehiculo vehiculoId={id} />;
}