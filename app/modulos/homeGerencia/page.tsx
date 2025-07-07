import BranchBussinessView from "@/components/branch/BranchBussinessView";

export default function SucursalesVistaCliente() {    
    return (<div>
        <BranchBussinessView googleMapsApiKey={process.env.GOOGLE_API_KEY} />
    </div>);
}