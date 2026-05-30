import DetalleDeudas from "@/components/deudas/DetalleDeudas";

export default async function DetalleDeudasPage({ params }: { params: { clienteId: string } }) {
    const { clienteId } = await params;
    return <DetalleDeudas clienteId={clienteId}/>;
}