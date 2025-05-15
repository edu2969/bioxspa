export const GasToNuMap = {
    "o2": "NU001",
    "oxigeno": "NU001",
    "atal": "NU002",
    "ar": "NU003",
    "argon": "NU003",
    "co2": "NU004",
    "aligal": "NU005",
    "oxido nitroso": "NU006",
    "n2o": "NU006",
    "aire alphagaz": "NU007",
    "alphagaz": "NU007",
    "nitrogeno liquido": "NU008",
    "n2 (liquido)": "NU008",
    "nitrogeno": "NU008",
    "helio": "NU009",
    "he": "NU009",
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
