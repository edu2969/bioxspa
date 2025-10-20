export function buildEnvioDTE(
    dtesXML: string[],
    rutEmisor: string,
    rutReceptor: string
): string {
    console.log(`📦 Construyendo envío con ${dtesXML.length} DTEs...`);

    const fechaEnvio = new Date().toISOString().replace(/[:-]/g, '').split('.')[0];
    const idEnvio = `ENV${fechaEnvio}`;

    return `<?xml version="1.0" encoding="ISO-8859-1"?>
<EnvioDTE version="1.0" xmlns="http://www.sii.cl/SiiDte" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sii.cl/SiiDte EnvioDTE_v10.xsd">
    <SetDTE ID="SetDoc">
        <Caratula version="1.0">
            <RutEmisor>${rutEmisor}</RutEmisor>
            <RutEnvia>${rutReceptor}</RutEnvia>
            <RutReceptor>60803000-K</RutReceptor>
            <FchResol>${fechaEnvio}</FchResol>
            <NroResol>${idEnvio}</NroResol>
            <TmstFirmaEnv>${new Date().toISOString()}</TmstFirmaEnv>
            <SubTotDTE>
                <TpoDTE>33</TpoDTE>
                <NroDTE>${dtesXML.length}</NroDTE>
            </SubTotDTE>
        </Caratula>
${dtesXML.join('\n')}
    </SetDTE>
</EnvioDTE>`;
}