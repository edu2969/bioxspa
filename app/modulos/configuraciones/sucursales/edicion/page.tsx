import { Suspense } from "react";
import EditSucursal from '@/components/EditSucursal';
import Loader from "@/components/Loader";

export default function Page() {
  const apiKey = process.env.GOOGLE_API_KEY || "";
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full">
      <Loader texto="Cargando..." />
      </div>}>
      <EditSucursal googleMapsApiKey={apiKey} />
    </Suspense>
  );
}