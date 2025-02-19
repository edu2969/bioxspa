import EditSucursal from '@/components/EditSucursal.jsx';

export default function Page() {
    const googleMapsApiKey = process.env.GOOGLE_API_KEY;

    return (
        <EditSucursal googleMapsApiKey={googleMapsApiKey} />
    );
}
