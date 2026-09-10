const PdfPrinter = require('pdfmake');
const http = require('http');
const https = require('https');

// ---------------------------------------------------------------------------
// Fidelidad tipográfica con el original: el PDF de muestra usa Arial 11 sobre
// página LETTER (612x792) con márgenes de 72pt. Arial es métricamente
// compatible con Helvetica, por lo que usar Helvetica nativa de pdfmake
// reproduce los mismos cortes de línea y justificación (alinea hasta x≈540).
// ---------------------------------------------------------------------------

const FONTS = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
};

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 72;
const COL_WIDTH = PAGE_WIDTH - MARGIN * 2; // 468 -> columna 72..540
const LINE_HEIGHT = 1.42; // 11pt * 1.42 ≈ 15.6pt; reproduce el interlineado visual (texto 72..540)
const SPACE_BEFORE = 10; // espacio extra (~10pt) antes de encabezados/ítems
const SIGNATURE_COL_WIDTH = 217; // columna de firmas (72..289 / 306..523)
const COLUMN_GAP = 17;
const TABLE_LEFT = -5.6; // el original desplaza la tabla 5.6pt a la izquierda de la columna de texto

// Descarga una imagen remota (URL) y la convierte a data URL base64 para que
// pdfmake pueda incrustarla (las firmas "upload" viven en un archivo, p.ej. GCS).
function fetchUrlToDataUrl(url) {
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
        const contentType = String(res.headers['content-type'] || 'image/png').split(';')[0].trim();
        done(buf.length ? `data:${contentType};base64,${buf.toString('base64')}` : null);
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

// Prepara las firmas (comitente y contractual) descargando las que vinieron como
// URL de archivo subido para dejarlas como data URL (base64) antes de construir el PDF.
async function loadFirmaImages(data = {}, baseUrl = '') {
  const copy = { ...data };
  for (const key of ['firma', 'firmaContractual']) {
    const sig = copy[key];
    if (!sig || typeof sig !== 'object' || sig.source !== 'upload' || !sig.url || /^data:/i.test(sig.url)) continue;
    let url = sig.url;
    if (!/^https?:\/\//i.test(url) && baseUrl) {
      url = url.startsWith('/') ? `${baseUrl}${url}` : `${baseUrl}/${url}`;
    }
    if (!/^https?:\/\//i.test(url)) continue;
    const dataUrl = await fetchUrlToDataUrl(url);
    if (dataUrl) copy[key] = { ...sig, data: dataUrl };
  }
  return copy;
}

// ---------------------------------------------------------------------------
// Utilidades de texto
// ---------------------------------------------------------------------------

const ltrim = (s) => String(s == null ? '' : s).trim();

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// Divide una fecha (string/Date) en { dia, mes, anio } para interpolar en el texto.
// Usa componentes UTC para evitar el desfase de zona horaria (ISO -> fecha local -1).
const fechaPorPartes = (dateStr) => {
  const date = dateStr ? new Date(dateStr) : new Date();
  if (!dateStr || isNaN(date.getTime())) {
    return { dia: '__', mes: '______', anio: '____' };
  }
  return {
    dia: date.getUTCDate(),
    mes: MESES[date.getUTCMonth()],
    anio: date.getUTCFullYear(),
  };
};

function buildContratoDocDefinition(data = {}) {
  const { comitente, abogado, siniestro, ciudadFirma, fechaFirma, firma, firmaContractual } = data;

  const nombreC = ltrim(comitente?.nombre).toUpperCase();
  const cedulaC = ltrim(comitente?.cedula);
  const ciudadC = ltrim(comitente?.ciudad);
  const nombreA = ltrim(abogado?.nombre).toUpperCase();
  const cedulaA = ltrim(abogado?.cedula);
  const tpA = ltrim(abogado?.tarjetaProfesional);
  const victima = ltrim(siniestro?.victimaNombre).toUpperCase() || nombreC;
  const porcentaje = ltrim(siniestro?.porcentaje);
  const letras = ltrim(siniestro?.porcentajeLetras);
  const ciudadSign = ltrim(ciudadFirma) || ciudadC;

  const accidente = fechaPorPartes(siniestro?.fecha);
  const firmaFecha = fechaPorPartes(fechaFirma);

  // Imágenes de firma listas para incrustar (draw -> data URL; upload -> ya convertida).
  const toSignatureImage = (sig) => {
    if (!sig || typeof sig !== 'object') return null;
    if (typeof sig.data === 'string' && /^data:image\//i.test(sig.data)) return sig.data;
    return null;
  };
  const comitenteSignature = toSignatureImage(firma);
  const contractualSignature = toSignatureImage(firmaContractual);

  // Encabezado de cláusula (negrita, centrado a la izquierda).
  const clausula = (texto, opts = {}) => ({
    text: texto.toUpperCase(),
    bold: true,
    margin: [0, opts.marginTop == null ? SPACE_BEFORE : opts.marginTop, 0, 0],
    ...(opts.pageBreak ? { pageBreak: 'before' } : {}),
  });

  // Párrafo justificado con posibles segmentos en negrita.
  const parrafo = (spans, opts = {}) => {
    const arr = (Array.isArray(spans) ? spans : [{ text: spans, bold: false }]).filter((s) => s.text);
    return {
      text: arr.map((s) => ({ text: s.text, ...(s.bold ? { bold: true } : {}) })),
      alignment: 'justify',
      ...(opts.margin ? { margin: opts.margin } : {}),
    };
  };
  const P = (t, opts) => parrafo(t, opts);
  const B = (t) => ({ text: t, bold: true });

  // ---------------------------------------------------------------------------
  // Página 1
  // ---------------------------------------------------------------------------
  const titleBlock = [
    {
      text: 'CONTRATO DE PRESTACIÓN DE SERVICIOS PROFESIONALES DE',
      alignment: 'center',
      bold: true,
      fontSize: 14,
    },
    {
      text: 'ABOGADO',
      alignment: 'center',
      bold: true,
      fontSize: 14,
      margin: [0, 4, 0, 14],
    },
  ];

  const intro = P([
    { text: 'Entre los suscritos a saber, Por una parte ' },
    B(nombreC),
    { text: `, mayor de edad, domiciliado en la ciudad de ${ciudadC}, identificado con la Cédula de Ciudadanía N° ${cedulaC}, quien para efectos del presente contrato se denominará EL COMITENTE (o El Cliente); y por la otra parte, ${nombreA}, mayor de edad, abogado en ejercicio, identificado con Cédula de Ciudadanía N°${cedulaA} y portador de la Tarjeta Profesional N° ${tpA} del Consejo Superior de la Judicatura, quien para efectos de este instrumento se denominará EL CONTRACTUAL (o El Abogado), hemos convenido celebrar el presente contrato de prestación de servicios jurídicos, el cual se regirá por las siguientes cláusulas:` },
  ]);

  const clausula1 = [
    clausula('CLÁUSULA PRIMERA: OBJETO DEL CONTRATO'),
    P(
      `EL CONTRACTUAL se obliga a prestar sus servicios profesionales como abogado a favor de EL COMITENTE, para adelantar, tramitar, gestionar y culminar la reclamación administrativa de indemnización ante la entidad aseguradora correspondiente, derivada del amparo del Seguro Obligatorio de Accidentes de Tránsito (SOAT) con ocasión del accidente de tránsito ocurrido el día ${accidente.dia} de ${accidente.mes} del año ${accidente.anio}, donde resultó afectada la víctima ${victima}`
    ),
  ];

  const clausula2 = [
    clausula('CLÁUSULA SEGUNDA: ALCANCE DE LOS SERVICIOS Y ETAPAS'),
    P(
      'La gestión encomendada comprende el análisis técnico de las glosas si las hubiere, el diligenciamiento e integración de los formularios oficiales (v.g. FURPEN), la radicación del expediente probatorio, la atención a requerimientos, interposición de recursos en la vía gubernativa y la gestión final de cobro. Las etapas se estructuran según la siguiente tabla:'
    ),
  ];

  const tablaEtapas = {
    margin: [TABLE_LEFT, SPACE_BEFORE, 0, 0],
    table: {
      widths: [156.2, 156.2, 156.1],
      body: [
        [
          { text: 'Etapa Contractual', bold: true, margin: [5.6, 2, 0, 2] },
          { text: 'Descripción de la Gestión', bold: true, margin: [5.6, 2, 0, 2] },
          { text: 'Estado Probatorio', bold: true, margin: [5.6, 2, 0, 2] },
        ],
        [
          { text: 'Etapa I: Probatoria y Confección', margin: [5.6, 2, 0, 2] },
          { text: 'Recolección de epicrisis, actas de la autoridad de tránsito, facturas y estructuración del formulario FURPEN.', margin: [5.6, 2, 0, 2] },
          { text: 'A cargo de ambas partes.', margin: [5.6, 2, 0, 2] },
        ],
        [
          { text: 'Etapa II: Radicación y Auditoría', margin: [5.6, 2, 0, 2] },
          { text: 'Presentación formal ante la aseguradora y seguimiento al proceso de auditoría médica/legal.', margin: [5.6, 2, 0, 2] },
          { text: 'A cargo del Abogado.', margin: [5.6, 2, 0, 2] },
        ],
        [
          { text: 'Etapa III: Liquidación y Cobro', margin: [5.6, 2, 0, 2] },
          { text: 'Gestión del pago efectivo y aplicación de la facultad de percibir.', margin: [5.6, 2, 0, 2] },
          { text: 'Cierre del Contrato.', margin: [5.6, 2, 0, 2] },
        ],
      ],
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => 'black',
      vLineColor: () => 'black',
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 1,
      paddingBottom: () => 1,
    },
  };

  // ---------------------------------------------------------------------------
  // Página 2
  // ---------------------------------------------------------------------------
  const clausula3 = [
    clausula('CLÁUSULA TERCERA: HONORARIOS PROFESIONALES', { pageBreak: true, marginTop: 25 }),
    P([
      { text: 'Como contraprestación por los servicios jurídicos efectivamente prestados, EL COMITENTE pagará a EL CONTRACTUAL una cuota de Litis equivalente al ' },
      B(`${porcentaje}%`),
      { text: ' ' },
      B(`(${letras})`),
      { text: ' del valor total neto que la entidad aseguradora reconozca y pague por concepto de las indemnizaciones amparadas por el SOAT.' },
    ]),
    P(
      "PARÁGRAFO PRIMERO: Estos honorarios se causarán bajo la condición de 'Cuota de Litis' (Cuota Litis), por lo cual solo se harán efectivos en el momento en que se reciba el pago por parte de la aseguradora."
    ),
  ];

  const clausula4 = [
    clausula('CLÁUSULA CUARTA: FACULTAD DE PERCIBIR Y COBRO'),
    P(
      'En virtud del poder especial otorgado de forma simultánea a este contrato, EL COMITENTE autoriza expresamente a EL CONTRACTUAL para que perciba de manera directa el valor de los honorarios pactados en la Cláusula Tercera al momento de la liquidación de los dineros por parte de la aseguradora, transfiriendo inmediatamente el saldo restante a la cuenta bancaria del cliente.'
    ),
  ];

  const obligaciones = (parte) => {
    const lista = parte === 'comitente'
      ? [
          '1. Suministrar de manera oportuna, verídica y completa toda la documentación requerida para la reclamación (Epicrisis original, copia del denuncio penal, informe de tránsito, certificados médicos, entre otros).',
          '2. Abstenerse de revocar el poder conferido o realizar arreglos directos con la aseguradora sin el consentimiento escrito de su abogado.',
          '3. Asumir los costos estrictos de copias, notarías, envíos certificados o dictámenes de la Junta de Calificación de Invalidez si fuesen necesarios, toda vez que los honorarios del abogado cubren únicamente el trabajo intelectual y de gestión.',
        ]
      : [
          '1. Poner a disposición del caso toda su diligencia, conocimiento técnico y cuidado para buscar el éxito de la reclamación.',
          '2. Mantener informado a EL COMITENTE sobre el estado del trámite y las decisiones de auditoría emitidas por la entidad aseguradora.',
          '3. Guardar estricto secreto profesional sobre los datos sensibles del cliente.',
        ];
    return [
      clausula(parte === 'comitente'
        ? 'CLÁUSULA QUINTA: OBLIGACIONES DE EL COMITENTE (EL CLIENTE)'
        : 'CLÁUSULA SEXTA: OBLIGACIONES DE EL CONTRACTUAL (EL ABOGADO)'),
      P(lista[0]),
      P(lista[1], { margin: [0, SPACE_BEFORE, 0, 0] }),
      P(lista[2], { margin: [0, SPACE_BEFORE, 0, 0] }),
    ];
  };

  // ---------------------------------------------------------------------------
  // Página 3
  // ---------------------------------------------------------------------------
  const clausula7 = [
    clausula('CLÁUSULA SÉPTIMA: TERMINACIÓN ANTICIPADA Y CLÁUSULA PENAL', { pageBreak: true, marginTop: 0 }),
    P(
      'Si EL COMITENTE decide revocar de manera unilateral e injustificada el mandato judicial otorgado antes de la culminación del trámite, o si decide desistir del proceso habiendo ya trabajado el profesional, se causará a favor de EL CONTRACTUAL una sanción penal equivalente al valor total de los honorarios calculados sobre la expectativa real de la reclamación, como indemnización por el trabajo profesional invertido.'
    ),
    P(
      `Para constancia de lo anterior y en señal de pleno acuerdo con lo estipulado, se firma el presente instrumento en dos (2) ejemplares del mismo tenor, en la ciudad de ${ciudadSign}, el día ${firmaFecha.dia} de ${firmaFecha.mes} del año ${firmaFecha.anio}.`,
      { margin: [0, 39, 0, 0] }
    ),
  ];

  // Línea de firma: se dibuja como una línea sólida (canvas en flujo) en lugar de
// texto de guiones bajos. Los guiones ('___...') quedaban fuera de la columna
// derecha por el ajuste de palabras de pdfmake (aparecían solo en la izquierda).
// El trazo se coloca dentro de una caja (y1=8) + margin-bottom para que quede
// un pequeño aire entre la línea y el rótulo, como en el documento original.
const lineaFirma = () => ({
  canvas: [
    {
      type: 'line',
      x1: 0,
      y1: 8,
      x2: SIGNATURE_COL_WIDTH - 9,
      y2: 8,
      lineWidth: 0.6,
      lineColor: 'black',
    },
  ],
  margin: [0, 8, 0, 6],
});

  // Cada columna de firma es un stack independiente: imagen (solo si existe) +
  // línea + rótulo. De este modo nunca se genera un elemento `image: null`
  // (que hacía fallar pdfmake cuando solo se dibujaba una de las dos firmas) y
  // la línea de firma queda siempre renderizada en ambas columnas.
  const firmaColumna = (sigImage, nameLines) => {
    const stack = [];
    if (sigImage) {
      stack.push({
        image: sigImage,
        fit: [SIGNATURE_COL_WIDTH - 40, 48],
        alignment: 'left',
        margin: [0, 16, 0, 4],
      });
    }
    stack.push(lineaFirma(), ...nameLines);
    return { width: SIGNATURE_COL_WIDTH, stack };
  };

  const firmaBlock = [
    {
      columns: [
        firmaColumna(comitenteSignature, [
          { text: 'EL COMITENTE:' },
          { text: nombreC || '________________', bold: true },
          { text: `C.C. N°${cedulaC}` },
        ]),
        firmaColumna(contractualSignature, [
          { text: 'EL CONTRACTUAL:' },
          { text: nombreA || '________________', bold: true },
          { text: `C.C. N°${cedulaA}` },
          { text: `T.P. N°${tpA} del C.S. de la J.` },
        ]),
      ],
      columnGap: COLUMN_GAP,
      margin: [0, 16, 0, 30],
    },
  ];

  return {
    pageSize: 'LETTER',
    pageMargins: [MARGIN, MARGIN, MARGIN, MARGIN],
    defaultStyle: { font: 'Helvetica', fontSize: 11, lineHeight: LINE_HEIGHT },
    content: [
      ...titleBlock,
      intro,
      ...clausula1,
      ...clausula2,
      tablaEtapas,
      ...clausula3,
      ...clausula4,
      ...obligaciones('comitente'),
      ...obligaciones('contractual'),
      ...clausula7,
      ...firmaBlock,
    ],
  };
}

async function generateContratoPdf(data = {}, options = {}) {
  const enriched = await loadFirmaImages(data, options.baseUrl);
  const docDefinition = buildContratoDocDefinition(enriched);
  const printer = new PdfPrinter(FONTS);
  const pdfDoc = printer.createPdfKitDocument(docDefinition);
  return new Promise((resolve, reject) => {
    const chunks = [];
    pdfDoc.on('data', (chunk) => chunks.push(chunk));
    pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
    pdfDoc.on('error', reject);
    pdfDoc.end();
  });
}

module.exports = { generateContratoPdf, buildContratoDocDefinition };