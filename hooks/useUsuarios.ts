import { IUsuario } from "@/types/usuario";
import { useQuery } from "@tanstack/react-query";

export function useUsuarios() {
    const { data: usuarios, isLoading } = useQuery<IUsuario[]>({
        queryKey: ["usuarios"],
        queryFn: async () => {
            const resp = await fetch('/api/usuarios');
            const data = await resp.json();
            return data.usuarios;
        }
    });

    return {
        usuarios,
        isLoading
    };
}