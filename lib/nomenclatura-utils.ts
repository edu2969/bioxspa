export const getCampoSubase = (campo: string): string => {
    return campo
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .toLowerCase();
}
    