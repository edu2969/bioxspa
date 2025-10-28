import HomeGerencia from "@/components/HomeGerencia";

export default function HomeGerenciaPage() {    
    return (<div>
        <HomeGerencia googleMapsApiKey={process.env.GOOGLE_API_KEY} />
    </div>);
}