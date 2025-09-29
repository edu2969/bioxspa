import puppeteer from 'puppeteer';
import { DTETest } from '../casos-test';

export class PDFGenerator {
  
  /**
   * Genera PDF de factura electrónica
   */
  static async generarFacturaPDF(data: DTETest, outputPath: string): Promise<void> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      
      // Generar HTML de la factura
      const facturaHTML = this.generarHTMLFactura(data);
      
      // Cargar HTML en la página
      await page.setContent(facturaHTML, {
        waitUntil: 'networkidle0'
      });

      // Configurar formato de página
      await page.pdf({
        path: outputPath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          bottom: '20mm',
          left: '15mm',
          right: '15mm'
        }
      });

      console.log(`✅ PDF generado: ${outputPath}`);

    } finally {
      await browser.close();
    }
  }

  /**
   * Genera HTML estilizado para la factura
   */
  private static generarHTMLFactura(data: DTETest): string {
    const { items, receptor, descuentoGlobal } = data;
    
    // Calcular totales
    const itemsAfectos = items.filter(item => item.afecto);
    const itemsExentos = items.filter(item => !item.afecto);
    
    const subtotalAfecto = itemsAfectos.reduce((sum, item) => sum + item.montoItem, 0);
    const subtotalExento = itemsExentos.reduce((sum, item) => sum + item.montoItem, 0);
    
    // Aplicar descuento global si existe
    let descuentoTotal = 0;
    if (descuentoGlobal && descuentoGlobal.sobreAfectos) {
      descuentoTotal = descuentoGlobal.tipo === 'P' 
        ? Math.round(subtotalAfecto * (descuentoGlobal.valor / 100))
        : descuentoGlobal.valor;
    }
    
    const neto = subtotalAfecto - descuentoTotal;
    const iva = Math.round(neto * 0.19);
    const total = neto + iva + subtotalExento;

    const tipoDocumento = this.obtenerTipoDocumento(data.tipoDTE);

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Factura Electrónica ${data.folio}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
        }
        
        .empresa-info {
            flex: 1;
        }
        
        .empresa-info h1 {
            color: #2c5aa0;
            font-size: 24px;
            margin-bottom: 10px;
        }
        
        .empresa-info p {
            margin: 3px 0;
        }
        
        .documento-info {
            width: 250px;
            border: 2px solid #c41e3a;
            padding: 15px;
            text-align: center;
            background-color: #f8f8f8;
        }
        
        .documento-info h2 {
            color: #c41e3a;
            font-size: 18px;
            margin-bottom: 10px;
        }
        
        .documento-info .numero {
            font-size: 20px;
            font-weight: bold;
            color: #333;
            margin: 10px 0;
        }
        
        .receptor-section {
            margin-bottom: 30px;
        }
        
        .receptor-section h3 {
            background-color: #f0f0f0;
            padding: 8px 12px;
            margin-bottom: 15px;
            border-left: 4px solid #2c5aa0;
        }
        
        .receptor-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        
        .detalle-items {
            margin-bottom: 30px;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        
        .items-table th,
        .items-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        
        .items-table th {
            background-color: #2c5aa0;
            color: white;
            font-weight: bold;
        }
        
        .items-table tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        
        .text-right {
            text-align: right !important;
        }
        
        .text-center {
            text-align: center !important;
        }
        
        .totales {
            float: right;
            width: 300px;
            margin-top: 20px;
        }
        
        .totales-table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .totales-table td {
            border: 1px solid #ddd;
            padding: 8px;
        }
        
        .totales-table .label {
            background-color: #f0f0f0;
            font-weight: bold;
        }
        
        .total-final {
            background-color: #2c5aa0;
            color: white;
            font-weight: bold;
            font-size: 14px;
        }
        
        .footer {
            margin-top: 50px;
            text-align: center;
            font-size: 10px;
            color: #666;
            clear: both;
        }
        
        .timbre {
            margin-top: 30px;
            text-align: center;
            font-size: 10px;
            border: 1px solid #333;
            padding: 10px;
            background-color: #f8f8f8;
        }
        
        .numero-formato {
            font-weight: bold;
            color: #c41e3a;
        }
        
        @media print {
            body { print-color-adjust: exact; }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- HEADER -->
        <div class="header">
            <div class="empresa-info">
                <h1>EMPRESA CERTIFICACION SII</h1>
                <p><strong>RUT:</strong> 12.345.678-9</p>
                <p><strong>Giro:</strong> CERTIFICACION ELECTRONICA</p>
                <p><strong>Dirección:</strong> DIRECCION EMPRESA</p>
                <p><strong>Comuna:</strong> SANTIAGO</p>
                <p><strong>Ciudad:</strong> SANTIAGO</p>
                <p><strong>Teléfono:</strong> (02) 2234-5678</p>
                <p><strong>Email:</strong> contacto@empresa.cl</p>
            </div>
            
            <div class="documento-info">
                <h2>R.U.T. 12.345.678-9</h2>
                <h2>${tipoDocumento.nombre}</h2>
                <div class="numero">Nº ${data.folio.toString().padStart(6, '0')}</div>
                <p><strong>S.I.I. - ${tipoDocumento.codigo}</strong></p>
            </div>
        </div>

        <!-- INFORMACIÓN DEL RECEPTOR -->
        <div class="receptor-section">
            <h3>Datos del Cliente</h3>
            <div class="receptor-grid">
                <div>
                    <p><strong>Señor(es):</strong> ${receptor.razonSocial}</p>
                    <p><strong>RUT:</strong> <span class="numero-formato">${receptor.rut}</span></p>
                    <p><strong>Giro:</strong> ${receptor.giro}</p>
                </div>
                <div>
                    <p><strong>Dirección:</strong> ${receptor.direccion}</p>
                    <p><strong>Comuna:</strong> ${receptor.comuna}</p>
                    <p><strong>Ciudad:</strong> ${receptor.ciudad}</p>
                    <p><strong>Fecha Emisión:</strong> ${this.formatearFecha(data.fechaEmision)}</p>
                </div>
            </div>
        </div>

        <!-- DETALLE DE ITEMS -->
        <div class="detalle-items">
            <h3>Detalle de Productos/Servicios</h3>
            <table class="items-table">
                <thead>
                    <tr>
                        <th style="width: 60px;">Item</th>
                        <th>Descripción</th>
                        <th style="width: 80px;" class="text-center">Cant.</th>
                        <th style="width: 100px;" class="text-right">Precio Unit.</th>
                        ${items.some(item => item.descuentoPct) ? '<th style="width: 80px;" class="text-right">Desc. %</th>' : ''}
                        <th style="width: 100px;" class="text-right">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(item => `
                        <tr>
                            <td class="text-center">${item.nroLinDet}</td>
                            <td>${item.nombre}${item.codItem ? `<br><small>Código: ${item.codItem}</small>` : ''}</td>
                            <td class="text-center">${item.cantidad}${item.unidadMedida ? ` ${item.unidadMedida}` : ''}</td>
                            <td class="text-right">$${this.formatearNumero(item.precioUnitario)}</td>
                            ${items.some(i => i.descuentoPct) ? `<td class="text-right">${item.descuentoPct || '-'}%</td>` : ''}
                            <td class="text-right">$${this.formatearNumero(item.montoItem)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <!-- TOTALES -->
        <div class="totales">
            <table class="totales-table">
                ${subtotalExento > 0 ? `
                    <tr>
                        <td class="label">Subtotal Exento:</td>
                        <td class="text-right">$${this.formatearNumero(subtotalExento)}</td>
                    </tr>
                ` : ''}
                ${neto > 0 ? `
                    <tr>
                        <td class="label">Neto:</td>
                        <td class="text-right">$${this.formatearNumero(neto)}</td>
                    </tr>
                ` : ''}
                ${descuentoTotal > 0 ? `
                    <tr>
                        <td class="label">Descuento Global:</td>
                        <td class="text-right">-$${this.formatearNumero(descuentoTotal)}</td>
                    </tr>
                ` : ''}
                ${iva > 0 ? `
                    <tr>
                        <td class="label">IVA (19%):</td>
                        <td class="text-right">$${this.formatearNumero(iva)}</td>
                    </tr>
                ` : ''}
                <tr class="total-final">
                    <td>TOTAL:</td>
                    <td class="text-right">$${this.formatearNumero(total)}</td>
                </tr>
            </table>
        </div>

        <div style="clear: both;"></div>

        <!-- TIMBRE ELECTRÓNICO -->
        <div class="timbre">
            <p><strong>TIMBRE ELECTRÓNICO SII</strong></p>
            <p>Resolución: ${Math.floor(Math.random() * 100)} de ${new Date().getFullYear()}</p>
            <p>Documento procesado electrónicamente</p>
        </div>

        <!-- FOOTER -->
        <div class="footer">
            <p>Factura generada electrónicamente - Sistema BioXSPA</p>
            <p>Para consultas: contacto@empresa.cl</p>
        </div>
    </div>
</body>
</html>`;
  }

  private static obtenerTipoDocumento(tipoDTE: number) {
    const tipos: {[key: number]: {nombre: string, codigo: string}} = {
      33: { nombre: 'FACTURA ELECTRÓNICA', codigo: 'Tipo 33' },
      34: { nombre: 'FACTURA EXENTA ELECTRÓNICA', codigo: 'Tipo 34' },
      39: { nombre: 'BOLETA ELECTRÓNICA', codigo: 'Tipo 39' },
      41: { nombre: 'BOLETA EXENTA ELECTRÓNICA', codigo: 'Tipo 41' },
      52: { nombre: 'GUÍA DE DESPACHO ELECTRÓNICA', codigo: 'Tipo 52' },
      56: { nombre: 'NOTA DE DÉBITO ELECTRÓNICA', codigo: 'Tipo 56' },
      61: { nombre: 'NOTA DE CRÉDITO ELECTRÓNICA', codigo: 'Tipo 61' }
    };
    
    return tipos[tipoDTE] || { nombre: 'DOCUMENTO ELECTRÓNICO', codigo: `Tipo ${tipoDTE}` };
  }

  private static formatearFecha(fecha: string): string {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  private static formatearNumero(numero: number): string {
    return numero.toLocaleString('es-CL');
  }
}