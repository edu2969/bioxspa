import { Suspense } from "react";
import EditSucursal from '@/components/EditSucursal';

export default function Page() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <EditSucursal />
    </Suspense>
  );
}