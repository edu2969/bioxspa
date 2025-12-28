const elementos = ["o2", "co2", "n2o", "ar", "he", "aligal", "aire alphagaz", "n2 (liquido)", "n2", "atal", "arcal", "c2h2", "acetileno", "argon"];
const colores = ["blanco", "gris", "negro", "verde", "cafe", "blanco", "negro_blanco", "negro", "negro", "amarillo", "amarillo", "azul", "amarillo", "verde"];

export const getColorEstanque = (elemento) => {
    if(!elemento) return "";
    const index = elementos.indexOf(elemento.toLowerCase());
    return index !== -1 ? "_" + colores[index] : ""; 
}

