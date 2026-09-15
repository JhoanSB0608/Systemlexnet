const PdfPrinter = require('pdfmake');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { PDFDocument } = require('pdf-lib');
const {
  fetchUrlToDataUrl,
  safe,
  formatCifra,
  letrasMoneda,
  nombreCompletoDeudor,
  identificacionDeudor,
  esFemenino,
  suscrito,
  identificado,
} = require('./LiquidacionDocumentGenerator');

// ---------------------------------------------------------------------------
// Generador de la PLANTILLA DE ANEXOS de la Liquidación Patrimonial Directa:
// 8 anexos con la estructura del documento de muestra (PlantillaAnexos.pdf).
// Anexo 3 (bienes) y Anexo 6 (certificación laboral) incorporan la imagen
// subida en el formulario; en todos los anexos firma el DEUDOR.
// ---------------------------------------------------------------------------

const fontsDir = path.resolve(__dirname, '..', 'fonts');
const tryFile = (name) =>
  fs.existsSync(path.join(fontsDir, name)) ? path.join(fontsDir, name) : null;

const FONTS = {
  Times: {
    normal: tryFile('times-regular.ttf') || tryFile('calibri-regular.ttf') || tryFile('Roboto-Regular.ttf') || '',
    bold: tryFile('times-bold.ttf') || tryFile('calibri-bold.ttf') || tryFile('Roboto-Bold.ttf') || '',
    italics: tryFile('times-italic.ttf') || tryFile('calibri-italic.ttf') || tryFile('Roboto-Italic.ttf') || '',
    bolditalics: tryFile('times-bolditalic.ttf') || tryFile('calibri-bold-italic.ttf') || tryFile('Roboto-BoldItalic.ttf') || '',
  },
};

const PAGE_WIDTH = 612;
const MARGIN = 72;

// -------------------- Helpers --------------------
const ltrim = (s) => String(s == null ? '' : s).trim();

const formatFecha = (v) => {
  if (!v) return 'Se desconoce esta información.';
  const d = new Date(v);
  if (isNaN(d.getTime())) return 'Se desconoce esta información.';
  return `${d.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}.`;
};

const todayText = () => {
  const now = new Date();
  const day = now.getDate();
  const month = now.toLocaleDateString('es-CO', { month: 'long' });
  return `La presente certificación se expide a los ${day} días de ${month.toLowerCase()} de ${now.getFullYear()} por solicitud del interesado.`;
};

// Descarga un archivo remoto (relativo o absoluto) y devuelve un Buffer.
function fetchUrlToBuffer(url) {
  return new Promise((resolve) => {
    const mod = url.startsWith('https:') ? https : http;
    let settled = false;
    const done = (value) => {
      if (!settled) {
        settled = true;
        resolve(value);
      }
    };
    const req = mod.get(url, (res) => {
      if (res.statusCode >= 400) {
        res.resume();
        return done(null);
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        done(buf.length ? buf : null);
      });
      res.on('error', () => done(null));
    });
    req.setTimeout(15000, () => {
      req.destroy();
      done(null);
    });
    req.on('error', () => done(null));
  });
}

// Determina si un archivo (REDAM, anexo 3 o anexo 6) es un PDF según su tipo
// MIME (tipo/type) o la extensión del nombre/url.
function esArchivoPdf(archivo = {}) {
  const tipo = String(archivo.tipo || archivo.type || '').toLowerCase();
  if (tipo.startsWith('image/')) return false;
  if (tipo === 'application/pdf') return true;
  const nombre = String(archivo.name || '');
  return /\.pdf$/i.test(nombre) || /\.pdf$/i.test(String(archivo.url || ''));
}

const getAcreedorData = (a) => {
  if (!a) return null;
  if (a.acreedor && typeof a.acreedor === 'object' && !Array.isArray(a.acreedor)) return a.acreedor;
  return null;
};

const getAcreedorNombre = (a) => {
  const ac = getAcreedorData(a);
  if (ac && ac.nombre) return ac.nombre;
  if (a && a.nombreAcreedor) return a.nombreAcreedor;
  return 'No reporta';
};

const diasMoraDeAcreencia = (a) => {
  if (!a || !a.creditoEnMora) return a && a.pagoPorLibranza ? 'Al día – por libranza' : 'Al día';
  if (a.moraMas90Dias) return 'Más de 90 días';
  if (a.diasDeMora) return `${a.diasDeMora} días`;
  return 'En mora';
};

const parrafo = (text, fontSize = 11, opts = {}) =>
  ({ text, fontSize, alignment: 'justify', margin: [0, 4, 0, 4], ...opts });

const tituloAnexo = (numero, subtitulo) => {
  const stack = [
    { text: `ANEXO No. ${numero}`, bold: true, fontSize: 13, alignment: 'center', margin: [0, 0, 0, 15] },
    { text: subtitulo.toUpperCase(), bold: true, fontSize: 12, alignment: 'center', margin: [0, 0, 0, 12] },
  ];
  return { stack, pageBreak: numero > 1 ? 'before' : undefined };
};

const saltoDeLinea = { text: '', margin: [0, 15, 0, 0] };


const overrideTitle = (text, opts = {}) => ({
  text: text.toUpperCase(),
  bold: true,
  fontSize: 11,
  alignment: 'center',
  margin: [0, 6, 0, 8],
  ...opts,
});

function firmaDeudorBloque(deudor = {}, firmaDeudor) {
  const stack = [];
  if (firmaDeudor && firmaDeudor.data && /^data:/i.test(firmaDeudor.data)) {
    stack.push({ image: firmaDeudor.data, width: 170, alignment: 'left', margin: [0, 6, 0, 2] });
  } else {
    stack.push({ canvas: [{ type: 'line', x1: 0, y1: 8, x2: 210, y2: 8, lineWidth: 0.8, lineColor: 'black' }], margin: [0, 12, 0, 10] });
  }
  stack.push({ text: nombreCompletoDeudor(deudor), bold: true, fontSize: 11, margin: [0, 0, 0, 2] });
  stack.push({
    text: `${identificado(deudor.genero).replace(/^./, (c) => c.toUpperCase())} con Cédula de Ciudadanía No. ${safe(deudor.cedula)} expedida en ${safe(deudor.ciudadExpedicion)}`,
    fontSize: 11,
    margin: [0, 0, 0, 10],
  });
  return { stack, margin: [0, 10, 0, 0] };
}

const tableLayout = {
  hLineWidth: () => 1,
  vLineWidth: () => 1,
  paddingLeft: () => 5,
  paddingRight: () => 5,
  paddingTop: () => 3,
  paddingBottom: () => 3,
};

// Tabla de filas [clave, valor] de una acreencia (formato del Anexo 1).
function detalleAcreencia(a, idx) {
  const ac = getAcreedorData(a);
  const fromAc = (k) => (ac && ac[k] != null && ac[k] !== '' ? ac[k] : null);
  const cuantiaTotal = Number(a.capital || 0) + Number(a.valorTotalInteresCorriente || 0) + Number(a.valorTotalInteresMoratorio || 0);
  const filas = [
    ['Nombre', getAcreedorNombre(a)],
    ['Tipo de Documento', fromAc('tipoDoc') || 'No reporta'],
    ['No. de Documento', fromAc('nitCc') || a.documento || 'No reporta'],
    ['Dirección de notificación judicial', fromAc('direccion') || a.direccion || 'No reporta'],
    ['País', fromAc('pais') || 'Colombia'],
    ['Departamento', fromAc('departamento') || a.departamento || 'No reporta'],
    ['Ciudad', fromAc('ciudad') || a.ciudad || 'No reporta'],
    ['Dirección de notificación electrónica', fromAc('email') || a.email || 'No reporta'],
    ['Teléfono', fromAc('telefono') || a.telefono || 'No reporta'],
    ['Tipo de Acreencia', a.tipoAcreencia || 'No reporta'],
    ['Naturaleza del crédito', a.naturalezaCredito || 'No reporta'],
    ['Crédito en condición de legalmente postergado (Artículo 572A, Causal 1)', a.creditoPostergado ? 'SI' : 'NO'],
    ['Descripción del crédito', a.descripcionCredito || 'No reporta'],
    ['Valor en capital', formatCifra(a.capital) || 'Se desconoce esta información'],
    ['Valor en interés corriente', Number(a.valorTotalInteresCorriente) > 0 ? formatCifra(a.valorTotalInteresCorriente) : 'Se desconoce esta información'],
    ['Tasa de interés corriente', a.tasaInteresCorriente || 'No reporta'],
    ['Tipo de interés corriente', a.tipoInteresCorriente || 'No reporta'],
    ['Cuantía total de la obligación', formatCifra(cuantiaTotal) || 'Se desconoce esta información'],
    ['¿El pago del crédito se está realizando mediante libranza o cualquier otro tipo de descuento por nómina?', a.pagoPorLibranza ? 'SI' : 'NO'],
    ['Número de días en mora', diasMoraDeAcreencia(a)],
    ['Más de 90 días en mora', a.creditoEnMora ? (a.moraMas90Dias ? 'SI' : 'NO') : 'No'],
    ['Valor en interés moratorio', Number(a.valorTotalInteresMoratorio) > 0 ? formatCifra(a.valorTotalInteresMoratorio) : 'Se desconoce esta información'],
    ['Tasa de interés moratorio', a.tasaInteresMoratorio || 'No reporta'],
    ['Tipo de interés moratorio', a.tipoInteresMoratorio || 'No reporta'],
    ['Fecha de otorgamiento', formatFecha(a.fechaOtorgamiento)],
    ['Fecha de vencimiento', formatFecha(a.fechaVencimiento)],
  ];
  return {
    table: {
      widths: ['40%', '60%'],
      body: [
        [
          { text: `Acreencia No. ${idx + 1}`, colSpan: 2, alignment: 'center', bold: true, fontSize: 10 },
          {},
        ],
        ...filas.map(([k, v]) => [
          { text: k, fontSize: 9 },
          { text: v, fontSize: 9 },
        ]),
      ],
    },
    layout: tableLayout,
    margin: [0, idx > 0 ? 12 : 0, 0, 0],
  };
}

function procesoBloque(proceso = {}, index) {
  const filas = [
    ['Proceso Judicial', safe(proceso.tipoProceso)],
    ['Tipo de Proceso', safe(proceso.procesoJudicial || 'Proceso Ejecutivo')],
    ['Tipo de Juzgado', safe(proceso.juzgado)],
    ['Número de Radicación', safe(proceso.radicado)],
    ['Estado del Proceso', safe(proceso.estado)],
    ['Demandante', safe(proceso.demandante)],
    ['Demandado', safe(proceso.demandado)],
    ['Valor', formatCifra(proceso.valor)],
    ['Departamento', safe(proceso.departamento)],
    ['Ciudad', safe(proceso.ciudad)],
    ['Dirección', safe(proceso.direccionJuzgado)],
    ['Dirección electrónica', safe(proceso.emailJuzgado)],
  ];
  return {
    stack: [
      {
        table: {
          widths: ['34%', '66%'],
          body: [
            [
              {
                text: `Proceso Judicial\nNo. ${safe(proceso.radicado)}`,
                colSpan: 2,
                alignment: 'center',
                fontSize: 10,
              },
              {},
            ],
            ...filas.map(([k, v]) => [
              { text: k, fontSize: 9 },
              { text: v, fontSize: 9 },
            ]),
          ],
        },
        layout: tableLayout,
      },
    ],
    margin: [0, index > 0 ? 10 : 0, 0, 0],
  };
}

// -------------------- Definición del documento --------------------
function buildAnexosDocDefinition(solicitud = {}) {
  const normalized = (solicitud && typeof solicitud.toObject === 'function') ? solicitud.toObject() : solicitud;
  const {
    deudor = {},
    acreencias = [],
    procesosJudiciales = [],
    informacionFinanciera = {},
    firmaDeudor = {},
    bienesInventarioImagen = {},
    certificacionLaboralImagen = {},
    redamArchivo = {},
  } = normalized;

  const nombreDeudor = nombreCompletoDeudor(deudor);
  const identDeudor = identificacionDeudor(deudor);
  const deudorIntro = `${nombreDeudor}, ${identDeudor},`;

  const totalCapital = acreencias.reduce((s, a) => s + (Number(a.capital) || 0), 0);
  const capitalLibranza = acreencias
    .filter((a) => a.pagoPorLibranza === true && a.creditoEnMora !== true)
    .reduce((s, a) => s + (Number(a.capital) || 0), 0);
  const obligacionesEnMora = (acreencias || []).filter((a) => a.creditoEnMora === true && a.moraMas90Dias === true);
  const capitalObligaciones = obligacionesEnMora.reduce((s, a) => s + (Number(a.capital) || 0), 0);

  const actPrincipal = Number(informacionFinanciera.ingresosActividadPrincipal) || 0;
  const otrasActividades = Number(informacionFinanciera.ingresosOtrasActividades) || 0;
  const ingresos = (actPrincipal + otrasActividades) || Number(informacionFinanciera.ingresosMensuales) || 0;

  const gastosPersonales = (informacionFinanciera.gastosPersonales && typeof informacionFinanciera.gastosPersonales === 'object')
    ? informacionFinanciera.gastosPersonales
    : {};
  const gastosDetallados = Object.values(gastosPersonales).reduce((s, v) => s + (Number(v) || 0), 0);
  const gastos = gastosDetallados || Number(informacionFinanciera.gastosMensuales) || 0;
  const recursosDisponibles = ingresos - gastos;

  const docDefinition = {
    pageSize: 'LETTER',
    pageMargins: [72, 60, 72, 60],
    defaultStyle: {
      font: 'Times',
      fontSize: 11,
      lineHeight: 1.3,
    },
    content: [],
  };

  const c = docDefinition.content;

  // ============ ANEXO 1 ============
  c.push(tituloAnexo(1, 'RELACIÓN COMPLETA Y ACTUALIZADA DE ACREENCIAS'));
  c.push(saltoDeLinea);
  c.push(parrafo('PROCESO: SOLICITUD DE LIQUIDACIÓN PATRIMONIAL DIRECTA', 10, { bold: true }));
  c.push(saltoDeLinea);
  c.push(parrafo(`DEUDOR: ${nombreDeudor} - C.C. No. ${safe(deudor.cedula)} expedida en ${safe(deudor.ciudadExpedicion)}`, 10, { margin: [0, 0, 0, 10] }));

  c.push(saltoDeLinea);

  if ((acreencias || []).length === 0) {
    c.push(parrafo('No se reportan acreencias.'));
  } else {
    const pct = (v) => (totalCapital > 0 ? `${((v / totalCapital) * 100).toFixed(2)}%` : '0.00%');
    const summaryBody = [
      [
        { text: 'ACREEDORES', bold: true, fontSize: 9, alignment: 'center' },
        { text: 'CAPITAL', bold: true, fontSize: 9, alignment: 'center' },
        { text: 'DERECHO DE VOTO', bold: true, fontSize: 9, alignment: 'center' },
        { text: 'DÍAS EN MORA', bold: true, fontSize: 9, alignment: 'center' },
      ],
      [
        { text: 'QUINTA CLASE', colSpan: 4, bold: true, fontSize: 9, alignment: 'center' },
        {}, {}, {},
      ],
      ...acreencias.map((a) => [
        { text: getAcreedorNombre(a), fontSize: 9 },
        { text: formatCifra(a.capital), fontSize: 9, alignment: 'right' },
        { text: pct(Number(a.capital) || 0), fontSize: 9, alignment: 'center' },
        { text: diasMoraDeAcreencia(a), fontSize: 9, alignment: 'center' },
      ]),
      [
        { text: 'TOTAL ACREENCIAS QUINTA CLASE', bold: true, fontSize: 9 },
        { text: formatCifra(totalCapital), bold: true, fontSize: 9, alignment: 'right' },
        { text: pct(totalCapital), bold: true, fontSize: 9, alignment: 'center' },
        { text: '', fontSize: 9 },
      ],
      [
        { text: 'TOTAL ACREENCIAS', bold: true, fontSize: 9 },
        { text: formatCifra(totalCapital), bold: true, fontSize: 9, alignment: 'right' },
        { text: pct(totalCapital), bold: true, fontSize: 9, alignment: 'center' },
        { text: '', fontSize: 9 },
      ],
      [
        { text: 'CRÉDITOS POR LIBRANZA O DESCUENTO DE NÓMINA PAGADOS EFECTIVAMENTE', bold: true, fontSize: 9 },
        { text: formatCifra(capitalLibranza), bold: true, fontSize: 9, alignment: 'right' },
        { text: 'No reportados', fontSize: 9, alignment: 'center' },
        { text: '', fontSize: 9 },
      ],
      [
        { text: 'CAPITAL EN MORA POR MÁS DE 90 DÍAS', bold: true, fontSize: 9 },
        { text: formatCifra(capitalObligaciones), bold: true, fontSize: 9, alignment: 'right' },
        { text: pct(capitalObligaciones), bold: true, fontSize: 9, alignment: 'center' },
        { text: obligacionesEnMora.length ? 'Más de 90 días' : '', fontSize: 9, alignment: 'center' },
      ],
    ];
    c.push({ table: { widths: ['42%', '20%', '18%', '20%'], body: summaryBody }, layout: tableLayout, margin: [0, 0, 0, 14] });

    c.push(overrideTitle('DETALLE DE CADA ACREENCIA', { pageBreak: 'before' }));   
    
    acreencias.forEach((a, idx) => {
      c.push(detalleAcreencia(a, idx));
    });
  }

  // ============ ANEXO 2 ============
  c.push(tituloAnexo(2, 'CAUSAS QUE ME LLEVARON AL PROCESO DE INSOLVENCIA'));
  c.push(parrafo(
    `${suscrito(deudor.genero)}, ${deudorIntro} actuando en nombre propio, de conformidad con el articulo 539 numeral 2 Ley 1564 de 2012, por medio del presente doy a conocer las causas que me sumergieron en la situación de insolvencia, en la que me encuentro tal y como se detallan a continuación.`
  ));
  c.push(parrafo(
    'Soy una persona natural no comerciante, actualmente me encuentro en una grave situación económica, debido al sobreendeudamiento y al inadecuado uso de mi economía que sobre pasó mi capacidad de pago, adicional la mala administración de mis recursos económicos.'
  ));
  c.push(parrafo(
    'Mi carga financiera ha excedido mis ingresos mensuales netos para cubrir mis gastos básicos de subsistencia y los de mis personas a cargo, generando un incumplimiento generalizado en mis obligaciones crediticias por mi mínima capacidad de pago.'
  ));
  c.push(parrafo(
    'Dado el estado de iliquidez, he perdido completamente la capacidad de reestructurar mi situación financiera, por lo cual me veo obligado a acudir al mecanismo de insolvencia, concretamente liquidación patrimonial como única vía para resolver de forma ordenada y conforme a la ley el pago de mis deudas, protegiendo al tiempo mi mínimo vital y el de mi familia, para cumplir con cada una de mis responsabilidades.'
  ));
  c.push(parrafo(
    'Así las cosas y con base en los argumentos expuestos en precedencia, se hace necesario de manera respetuosa solicitar al señor juez del concurso sea aceptada la solicitud en virtud de que se me ha hecho difícil el cumplimiento de las obligaciones, pues es evidente que me encuentro en un sobregiro y esta adversidad limita las capacidades de maniobrar y de cumplir las obligaciones respectivas.'
  ));
  c.push(parrafo(todayText(), 11, { margin: [0, 12, 0, 4] }));
  c.push(firmaDeudorBloque(deudor, firmaDeudor));

  // ============ ANEXO 3 ============
  c.push(tituloAnexo(3, 'RELACIÓN E INVENTARIO DE LOS BIENES MUEBLES E INMUEBLES'));
  c.push(parrafo(
    `${suscrito(deudor.genero)}, ${deudorIntro} actuando en nombre propio certifico bajo la gravedad de juramento que no poseo bienes muebles o inmuebles para adjudicar.`
  ));
  c.push(parrafo('Se presenta una relación completa y detallada de los bienes muebles e inmuebles:'));
  c.push(parrafo('Bienes Muebles', 11, { bold: true, alignment: 'left', margin: [0, 8, 0, 2] }));
  c.push(parrafo('Se manifiesta bajo la gravedad de juramento que no se poseen Bienes Muebles.'));
  c.push(parrafo('Bienes Inmuebles', 11, { bold: true, alignment: 'left', margin: [0, 8, 0, 2] }));
  c.push(parrafo('Se manifiesta bajo la gravedad de juramento que no se poseen Bienes Inmuebles.'));
  if (bienesInventarioImagen && bienesInventarioImagen.data) {
    c.push(parrafo('Inventario de bienes:', 11, { bold: true, alignment: 'left', margin: [0, 10, 0, 2] }));
    c.push({
      image: bienesInventarioImagen.data,
      width: Math.min(420, PAGE_WIDTH - MARGIN * 2),
      alignment: 'center',
      margin: [0, 6, 0, 8],
    });
  } else if (esArchivoPdf(bienesInventarioImagen)) {
    c.push(parrafo('El inventario de bienes se adjunta como PDF al final de este documento.', 10, { italics: true, alignment: 'left', margin: [0, 8, 0, 4] }));
  }
  c.push(firmaDeudorBloque(deudor, firmaDeudor));

  // ============ ANEXO 4 ============
  c.push(tituloAnexo(4, 'RELACION DE PROCESOS JUDICIALES'));
  c.push(parrafo(
    `${nombreDeudor}, ${identDeudor}, actuando en nombre propio y en mi calidad de persona natural no comerciante, manifiesto bajo la gravedad de juramento que cursan en mi contra los siguientes procesos judiciales en contra:`
  ));
  if ((procesosJudiciales || []).length === 0) {
    c.push(parrafo('No cursan procesos judiciales o actuaciones de cobro en mi contra.'));
  } else {
    procesosJudiciales.forEach((proceso, idx) => {
      c.push(procesoBloque(proceso, idx));
    });
  }
  c.push(parrafo(todayText(), 11, { margin: [0, 12, 0, 4] }));
  c.push(firmaDeudorBloque(deudor, firmaDeudor));

  // ============ ANEXO 5 ============
  c.push(tituloAnexo(5, 'CERTIFICACIÓN 30% EN MORA'));
  c.push(parrafo(
    `${nombreDeudor}, ${identDeudor}, actuando en nombre propio y en mi calidad de persona natural no comerciante, manifiesto bajo la gravedad de juramento que me encuentro en mora con mis acreedores por más de noventa días y así mismo cumplo con las más de treinta por ciento (30%) de mis obligaciones vencidas con más de dos acreedores.`
  ));
  c.push(firmaDeudorBloque(deudor, firmaDeudor));

  // ============ ANEXO 6 ============
  c.push(tituloAnexo(6, 'CERTIFICACIÓN LABORAL DE INGRESOS'));
  const cargo = ltrim(informacionFinanciera.cargoEmpleo) || ltrim(informacionFinanciera.tipoEmpleo) || 'cargo';
  const entidad = ltrim(informacionFinanciera.entidadEmpleadora) || ltrim(informacionFinanciera.descripcionActividadEconomica) || 'mi entidad empleadora';
  const neto = recursosDisponibles > 0 ? recursosDisponibles : 0;
  c.push(parrafo(
    `${suscrito(deudor.genero)}, ${deudorIntro} actuando en nombre propio certifico bajo la gravedad de juramento que actualmente desempeño como ${cargo} de ${entidad}, en donde devengo la suma de ` +
    `${letrasMoneda(ingresos) || 'LA SUMA DE CERO PESOS'} (${formatCifra(ingresos) || '$0'})${neto > 0 ? `, sin embargo, percibo ${letrasMoneda(neto)} (${formatCifra(neto)}), por los descuentos de nómina que me son efectuados` : ''}.`
  ));
  if (certificacionLaboralImagen && certificacionLaboralImagen.data) {
    c.push(parrafo('Certificación laboral:', 11, { bold: true, alignment: 'left', margin: [0, 10, 0, 2] }));
    c.push({
      image: certificacionLaboralImagen.data,
      width: Math.min(420, PAGE_WIDTH - MARGIN * 2),
      alignment: 'center',
      margin: [0, 6, 0, 8],
    });
  } else if (esArchivoPdf(certificacionLaboralImagen)) {
    c.push(parrafo('La certificación laboral se adjunta como PDF al final de este documento.', 10, { italics: true, alignment: 'left', margin: [0, 8, 0, 4] }));
  }
  c.push(firmaDeudorBloque(deudor, firmaDeudor));

  // ============ ANEXO 7 ============
  c.push(tituloAnexo(7, 'CERTIFICACIÓN DE GASTOS MENSUALES'));
  c.push(parrafo(
    `${suscrito(deudor.genero)}, ${deudorIntro} actuando en nombre propio por medio del presente certifico que los gastos para mi manutención y los de las personas a mi cargo ascienden a la suma de ` +
    `${letrasMoneda(gastos) || 'LA SUMA DE CERO PESOS'} (${formatCifra(gastos) || '$0'}), correspondientes a vivienda, alimentación, salud, transporte, servicios públicos, educación, y demás egresos indispensables.`
  ));
  c.push(parrafo('RELACIÓN DE GASTOS MENSUALES', 11, { bold: true, alignment: 'left', margin: [0, 10, 0, 6] }));
  const gastosLabels = {
    alimentacion: 'Alimentación',
    salud: 'Salud',
    arriendo: 'Arriendo o Cuota Vivienda',
    serviciosPublicos: 'Servicios Públicos',
    educacion: 'Educación',
    transporte: 'Transporte',
    conservacionBienes: 'Conservación de Bienes',
    cuotaLeasingHabitacional: 'Cuota De Leasing Habitacional',
    arriendoOficina: 'Arriendo Oficina/Consultorio',
    cuotaSeguridadSocial: 'Cuota De Seguridad Social',
    cuotaAdminPropiedadHorizontal: 'Cuota De Administración Propiedad Horizontal',
    cuotaLeasingVehiculo: 'Cuota De Leasing Vehículo',
    cuotaLeasingOficina: 'Cuota De Leasing Oficina/Consultorio',
    seguros: 'Seguros',
    vestuario: 'Vestuario',
    recreacion: 'Recreación',
    gastosPersonasCargo: 'Gastos Personas a Cargo',
    otros: 'Otros Gastos',
  };
  const gastosBody = [
    [
      { text: 'Concepto', bold: true, fontSize: 9 },
      { text: 'Valor', bold: true, fontSize: 9, alignment: 'right' },
    ],
    ...Object.entries(gastosPersonales)
      .filter(([key, value]) => gastosLabels[key] && Number(value) > 0)
      .map(([key, value]) => [
        { text: gastosLabels[key], fontSize: 9 },
        { text: formatCifra(value) || '$0', fontSize: 9, alignment: 'right' },
      ]),
    [{ text: 'Total gastos mensuales', fontSize: 9, bold: true }, { text: formatCifra(gastos) || '$0', fontSize: 9, alignment: 'right', bold: true }],
    [{ text: 'Monto de recursos disponibles', fontSize: 9 }, { text: formatCifra(recursosDisponibles) || '$0', fontSize: 9, alignment: 'right' }],
  ];
  c.push({ table: { widths: ['70%', '30%'], body: gastosBody }, layout: tableLayout, margin: [0, 0, 0, 4] });
  c.push(parrafo(todayText(), 11, { margin: [0, 12, 0, 4] }));
  c.push(firmaDeudorBloque(deudor, firmaDeudor));

  // ============ ANEXO 8 ============
  c.push(tituloAnexo(8, 'CERTIFICACIÓN DE VERACIDAD DE LA INFORMACIÓN'));
  c.push(parrafo(
    `${nombreDeudor}, ${identDeudor}, actuando en nombre propio y en mi calidad de persona natural no comerciante, manifiesto bajo la gravedad de juramento que de conformidad a lo establecido en el parágrafo primero del artículo 539 modificado por el artículo 10 de la Ley 2445 de 2025, certifico que la información entregada y allegada en el presente proceso de insolvencia, que se adelantará bajo la figura de liquidación patrimonial, es veraz y cierta y que no he incurrido en omisiones, imprecisiones o errores que impidan conocer mi verdadera situación económica y mi capacidad de pago.`
  ));
  c.push(parrafo(todayText(), 11, { margin: [0, 12, 0, 4] }));
  c.push(firmaDeudorBloque(deudor, firmaDeudor));

  // ============ ANEXO REDAM (imagen) ============
  // Si el REDAM es una imagen se incrusta en una sola página al final del
  // documento de anexos. Si es un PDF se fusiona en generateLiquidacionAnexosPdf.
  if (redamArchivo && redamArchivo.data && !esArchivoPdf(redamArchivo)) {
    c.push({
      image: redamArchivo.data,
      pageBreak: 'before',
      alignment: 'center',
      fit: [468, 660],
      margin: [0, 12, 0, 12],
    });
  }

  return docDefinition;
}

// Carga las imágenes remotas de los anexos (inventario de bienes, certificación
// laboral) y la firma del deudor para poder incrustarlas en el PDF.
async function loadAnexosImages(solicitud = {}, baseUrl = '') {
  const copy = (solicitud && typeof solicitud.toObject === 'function') ? solicitud.toObject() : { ...solicitud };

  const download = async (img) => {
    if (!img || !img.url || /^data:/i.test(img.url)) return img;
    let url = img.url;
    if (!/^https?:\/\//i.test(url) && baseUrl) {
      url = url.startsWith('/') ? `${baseUrl}${url}` : `${baseUrl}/${url}`;
    }
    if (/^https?:\/\//i.test(url)) {
      const dataUrl = await fetchUrlToDataUrl(url);
      if (dataUrl) return { ...img, data: dataUrl };
    }
    return img;
  };

  const firma = copy.firmaDeudor;
  if (firma && typeof firma === 'object' && firma.source === 'upload' && firma.url && !/^data:/i.test(firma.url)) {
    let url = firma.url;
    if (!/^https?:\/\//i.test(url) && baseUrl) {
      url = url.startsWith('/') ? `${baseUrl}${url}` : `${baseUrl}/${url}`;
    }
    if (/^https?:\/\//i.test(url)) {
      const dataUrl = await fetchUrlToDataUrl(url);
      if (dataUrl) copy.firmaDeudor = { ...firma, data: dataUrl };
    }
  }

  // Anexos 3 y 6: si son imágenes se cargan como dataUrl para incrustarlas en el
  // PDF; si son PDF se conserva el url y se anexan por fusión PDF al final.
  if (copy.bienesInventarioImagen && !esArchivoPdf(copy.bienesInventarioImagen)) {
    copy.bienesInventarioImagen = await download(copy.bienesInventarioImagen);
  }
  if (copy.certificacionLaboralImagen && !esArchivoPdf(copy.certificacionLaboralImagen)) {
    copy.certificacionLaboralImagen = await download(copy.certificacionLaboralImagen);
  }

  // REDAM: si es imagen se carga como dataUrl (se renderiza en una página al
  // final); si es PDF se conserva el url y se anexa por fusión PDF.
  if (copy.redamArchivo && !esArchivoPdf(copy.redamArchivo)) {
    copy.redamArchivo = await download(copy.redamArchivo);
  }

  return copy;
}

// -------------------- Generador principal --------------------
async function generateLiquidacionAnexosPdf(solicitud = {}, baseUrl = '') {
  const data = await loadAnexosImages(solicitud, baseUrl);
  const docDefinition = buildAnexosDocDefinition(data);

  const baseBuffer = await new Promise((resolve, reject) => {
    try {
      const printer = new PdfPrinter(FONTS);
      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      const chunks = [];
      pdfDoc.on('data', (chunk) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', reject);
      pdfDoc.end();
    } catch (error) {
      console.error('Error al generar el PDF de anexos:', error);
      reject(error);
    }
  });

  // Descarga (o decodifica) el PDF de un archivo anexo y fusiona sus páginas
  // al final del documento de anexos.
  const appendPdf = async (buffer, archivo) => {
    if (!archivo || !esArchivoPdf(archivo) || !archivo.url) return buffer;
    try {
      let pdfBuffer = null;
      if (/^data:application\/pdf;base64,/i.test(archivo.url)) {
        pdfBuffer = Buffer.from(archivo.url.split(',')[1], 'base64');
      } else if (/^https?:\/\//i.test(archivo.url) || baseUrl) {
        let url = archivo.url;
        if (!/^https?:\/\//i.test(url) && baseUrl) {
          url = url.startsWith('/') ? `${baseUrl}${url}` : `${baseUrl}/${url}`;
        }
        if (/^https?:\/\//i.test(url)) {
          pdfBuffer = await fetchUrlToBuffer(url);
        }
      }
      if (pdfBuffer) {
        const mainDoc = await PDFDocument.load(buffer);
        const pdfDoc = await PDFDocument.load(pdfBuffer);
        const pages = await mainDoc.copyPages(pdfDoc, pdfDoc.getPageIndices());
        pages.forEach((page) => mainDoc.addPage(page));
        return Buffer.from(await mainDoc.save());
      }
      console.warn('[Anexos] No se pudo descargar un PDF adjunto, se omite la fusión.');
      return buffer;
    } catch (error) {
      console.error('[Anexos] Error al fusionar un PDF adjunto:', error);
      return buffer;
    }
  };

  // Fusión de PDFs de anexos 3, 6 y REDAM en ese orden.
  let result = baseBuffer;
  result = await appendPdf(result, data.bienesInventarioImagen);
  result = await appendPdf(result, data.certificacionLaboralImagen);
  result = await appendPdf(result, data.redamArchivo);

  return result;
}

module.exports = { generateLiquidacionAnexosPdf, buildAnexosDocDefinition };