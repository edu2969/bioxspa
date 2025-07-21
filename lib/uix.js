const elementos = ["o2", "co2", "n2o", "ar", "he", "aligal", "aire alphagaz", "n2 (liquido)", "n2", "atal", "arcal", "c2h2",];
const colores = ["verde", "azul", "rojo", "amarillo", "azul", "rojo", "amarillo", "verde", "rojo", "rojo", "azul", "azul", "rojo"];

export const getColorEstanque = (elemento) => {
    if(!elemento) return "";
    const index = elementos.indexOf(elemento.toLowerCase());
    return index !== -1 ? "_" + colores[index] : ""; 
}

