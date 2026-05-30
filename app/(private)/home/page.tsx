import HomeAccessPanel from "@/components/_prefabs/HomeAccessPanel";
import { ChecklistProvider } from "@/context/ChecklistContext";

export default function HomePage() {
    return <ChecklistProvider tipo="personal">
        <HomeAccessPanel />
    </ChecklistProvider>;
}