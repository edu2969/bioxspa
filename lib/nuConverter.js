export const GasToNuMap = {
    "o2": "NU002",
    "oxigeno": "NU1001",
    "atal": "NU002",
    "ar": "NU003",
    "argon": "NU1006",
    "co2": "NU1013",
    "aligal": "NU005",
    "etileno": "NU1962",
    "oxido nitroso": "NU006",
    "hidrogeno": "NU1049",
    "h2": "NU1049",
    "n2o": "NU1070",
    "aire alphagaz": "NU007",
    "alphagaz": "NU007",
    "nitrogeno liquido": "NU008",
    "n2 (liquido)": "NU008",
    "nitrogeno": "NU1066",
    "oxido nitroso": "NU1070",
    "helio": "NU1046",
    "he": "NU1046",
    "arcal": "NU010",
    "acetileno": "NU011",
    "c2h2": "NU011",
    "cargal": "NU012",
};

export function getNUCode(gas) {
    if(!gas) {
        return "NU???";
    }
    const normalizedGas = gas.toLowerCase().trim();
    return GasToNuMap[normalizedGas] || null;
}
