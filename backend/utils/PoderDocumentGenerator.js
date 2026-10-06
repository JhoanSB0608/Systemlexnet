const PdfPrinter = require('pdfmake');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');

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

// Prepara las firmas (poderdante y apoderado) descargando las que vinieron como
// URL de archivo subido para dejarlas como data URL (base64) antes de construir el PDF.
// Las rutas relativas se resuelven contra `baseUrl` (host del backend que genera el PDF).
async function loadFirmaImages(data = {}, baseUrl = '') {
  const copy = { ...data };
  for (const key of ['firma', 'firmaApoderado']) {
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
// Fuentes: Calibri (cuerpo) y Verdana (encabezado), como el original.
// ---------------------------------------------------------------------------
const fontsDir = path.resolve(__dirname, '..', 'fonts');
const tryFile = name => (fs.existsSync(path.join(fontsDir, name)) ? path.join(fontsDir, name) : null);

const FONTS = {
  Calibri: {
    normal: tryFile('calibri-regular.ttf') || 'Helvetica',
    bold: tryFile('calibri-bold.ttf') || 'Helvetica-Bold',
    italics: tryFile('calibri-italic.ttf') || 'Helvetica-Oblique',
    bolditalics: tryFile('calibri-bold-italic.ttf') || 'Helvetica-BoldOblique'
  },
  Verdana: {
    normal: tryFile('Verdana.ttf') || 'Helvetica',
    bold: tryFile('Verdana-Bold.ttf') || 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique'
  },
  Times: {
    normal: tryFile('times-regular.ttf') || 'Helvetica',
    bold: tryFile('times-bold.ttf') || 'Helvetica-Bold',
    italics: tryFile('times-italic.ttf') || 'Helvetica-Oblique',
    bolditalics: tryFile('times-bolditalic.ttf') || 'Helvetica-BoldOblique'
  }
};

// ---------------------------------------------------------------------------
// Métricas de la fuente: medimos el ancho real con pdfkit (las mismas métricas
// que pdfmake usa para partir líneas), en vez de parsear el TTF a mano.
// ---------------------------------------------------------------------------
const PDFKit = require('pdfkit');

const fontSizes = {};

function kitFontName(ttfPath) {
  if (!fontSizes[ttfPath]) {
    const doc = new PDFKit();
    fontSizes[ttfPath] = 0;
    const f = doc.font(ttfPath)._font;
    fontSizes[ttfPath] = f;
    fontSizes[ttfPath].doc = doc;
  }
  return fontSizes[ttfPath];
}

function realWidth(text, bold = false) {
  if (!text) return 0;
  const font = kitFontName(bold ? (tryFile('calibri-bold.ttf') || '') : (tryFile('calibri-regular.ttf') || ''));
  return font.widthOfString(text, 14);
}

function spansWidth(spans) {
  return spans.reduce((w, s) => w + (s.t ? realWidth(s.t, s.bold) : 0), 0);
}

const FULL_SPACE = realWidth(' ') || 3.17;
const THIN_SPACE = realWidth('\u2009') || 1.5;
const COL_WIDTH = 530 - 85.1; // ancho de la columna del original

// Emula la justificación del original: reparte espacios extra entre palabras
// para estirar cada línea hasta la columna. Nunca borra un espacio visible;
// si la línea natural desborda (tolerancia de Word a líneas justo al límite),
// quita primero el espacio final y luego reduce huecos con espacio fino.
function stretchLine(spans) {
  const charsToSpans = arr => {
    const res = [];
    for (const c of arr) {
      const last = res[res.length - 1];
      if (last && last.bold === c.bold) last.t += c.ch;
      else res.push({ t: c.ch, bold: c.bold });
    }
    return res;
  };

  const chars = [];
  for (const sp of spans) for (const ch of sp.t) chars.push({ ch, bold: sp.bold });

  let work = chars.concat();
  const natural = spansWidth(spans);

  // línea al límite: encoger conservando espacios visibles
  if (natural > COL_WIDTH) {
    if (work.length && work[work.length - 1].ch === ' ') {
      work = work.slice(0, work.length - 1); // se quita un espacio FINAL (no afecta el texto visible)
    }
    let measured = spansWidth(charsToSpans(work));
    for (let pass = 0; pass < 3 && measured > COL_WIDTH; pass++) {
      // sustituir espacios simples por finos (cada uno ahorra ~0.37pt), empezando por el final
      for (let i = work.length - 1; i > 0 && measured > COL_WIDTH; i--) {
        if (work[i].ch === ' ' && work[i - 1].ch !== ' ') {
          work[i].ch = '\u2009';
          measured = spansWidth(charsToSpans(work));
        }
      }
    }
  }

  const gIdx = [];
  for (let i = 1; i < work.length; i++) if (work[i].ch === ' ' && work[i - 1].ch !== ' ') gIdx.push(i);
  const real = spansWidth(charsToSpans(work));
  const need = COL_WIDTH - real;

  // reparto uniforme: espacios completos por hueco
  const pads = gIdx.map(() => 0);
  if (need > 0 && gIdx.length) {
    let quota = Math.floor(need / FULL_SPACE);
    let i = 0;
    while (quota > 0) {
      pads[i % gIdx.length]++;
      quota--;
      i++;
    }
    // colchón: añadir un espacio más si no se pasa de la columna
    let placed = pads.reduce((s, q) => s + q * FULL_SPACE, 0);
    let guard = 0;
    while (real + placed + FULL_SPACE <= COL_WIDTH + 0.01 && guard++ < 300) {
      const k = guard % gIdx.length;
      pads[k]++;
      placed += FULL_SPACE;
    }
  }

  const out = [];
  let gi = 0;
  for (let i = 0; i < work.length; i++) {
    out.push(work[i]);
    if (gi < gIdx.length && gIdx[gi] === i) {
      for (let x = 0; x < pads[gi]; x++) out.push({ ch: ' ', bold: work[i].bold });
      gi++;
    }
  }

  const result = [];
  for (const c of out) {
    const last = result[result.length - 1];
    if (last && last.bold === c.bold) last.t += c.ch;
    else result.push({ t: c.ch, bold: c.bold });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Layout del original (medido sobre "PODER ANDREA ESTEFANIA RODRIGUEZ.pdf").
// ---------------------------------------------------------------------------
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 1008;
const MARGIN_LEFT = 85.1;
const MARGIN_RIGHT = 82;
const MARGIN_TOP = 85.8;
const MARGIN_BOTTOM = 117;
const SLOT = 17.15;
const LINE_HEIGHT = SLOT / 14; // 1.225 -> línea de 17.15pt
const HEADER_LINE_HEIGHT = SLOT / 18.5; // encabezado Verdana 18.5 también ocupa una slot
const NAVY = '#002A72';

const fechaPorPartes = dateStr => {
  if (!dateStr) return { diaMes: '-- del mes de --', anio: '----' };
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return { diaMes: '-- del mes de --', anio: '----' };
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return { diaMes: `${date.getUTCDate()} del mes de ${meses[date.getUTCMonth()]}`, anio: `${date.getUTCFullYear()}` };
};

function buildPoderDocDefinition(data = {}) {
  const { destinatario, poderdante, apoderado, siniestro, firma, firmaApoderado } = data;

  // Imágenes de firma listas para incrustar (draw -> data URL; upload -> ya convertida).
  const toSignatureImage = (sig) => {
    if (!sig || typeof sig !== 'object') return null;
    if (typeof sig.data === 'string' && /^data:image\//i.test(sig.data)) return sig.data;
    return null;
  };
  const poderdanteSignature = toSignatureImage(firma);
  const apoderadoSignature = toSignatureImage(firmaApoderado);

  const nombrePod = (poderdante?.nombre || '').toUpperCase();
  const nombreApo = (apoderado?.nombre || '').toUpperCase();

  const genero = (poderdante?.genero || 'masculino').toLowerCase();
  const palabraIdentificacion = genero === 'femenino' ? 'identificada' : 'identificado';

  const aseg = (siniestro?.aseguradora || '').toUpperCase();
  const leyNum = (siniestro?.ley || '').replace(/^ley\s+/i, '');
  const tp = (siniestro?.tipoProceso || '').toUpperCase();
  const idxPor = tp.indexOf(' POR ');
  const tpoP1 = idxPor >= 0 ? tp.slice(0, idxPor + 4) : tp;
  const tpoP2 = idxPor >= 0 ? tp.slice(idxPor + 4).trimStart() : '';

  const { diaMes, anio } = fechaPorPartes(siniestro?.fecha);

  const apoWords = nombreApo.split(' ');
  const apoL1 = apoWords.slice(0, 3).join(' ');
  const apoL2 = apoWords.slice(3).join(' ');

  const BLANK = () => ({ text: '\u00A0' });

  // Función para partir el nombre dinámico en el encabezado (mitad Bold, mitad normal)
  const formatHeaderName = (name) => {
    if (!name) return [{ text: '', bold: true }];
    const words = name.split(' ');
    const mid = Math.ceil(words.length / 2);
    return [
      { text: words.slice(0, mid).join(' ') + ' ', bold: true },
      { text: words.slice(mid).join(' ') }
    ];
  };

  const L = (spans, opts = {}) => {
    const arr = (Array.isArray(spans) ? spans : [{ t: spans, bold: false }]).filter(s => s.t.length);
    const finalSpans = opts.noStretch ? arr : stretchLine(arr);
    return {
      text: finalSpans.map(s => ({ text: s.t, ...(s.bold ? { bold: true } : {}) })),
      alignment: 'left',
      ...(opts.margin ? { margin: opts.margin } : {})
    };
  };

  const R = (t, bold = false) => ({ t, bold });

  // ---- Encabezado Dinámico ----
  const headerBlock = {
    stack: [
      {
        text: formatHeaderName(nombreApo),
        alignment: 'right',
        color: NAVY,
        font: 'Verdana',
        fontSize: 18
      },
      {
        text: (apoderado?.cargo || '').toUpperCase(),
        color: NAVY,
        font: 'Verdana',
        fontSize: 9.5,
        alignment: 'right',
        margin: [0, 2, 0, 0]
      }
    ],
    margin: [0, 0, 0, 35]
  };

  // ---- Sección de firmas ----
  const firmas = [
    { text: 'EL PODERDANTE:', alignment: 'left' },
    BLANK(), BLANK(), BLANK(), BLANK(),
    { text: nombrePod, bold: true, alignment: 'left' },
    { text: [{ text: 'c.c', bold: true }, { text: poderdante?.cedula }], alignment: 'left' },
    BLANK(),
    { text: 'APODERADO:', alignment: 'left', margin: [0, 9.1, 0, 0] },
    { text: '\u00A0', margin: [0, 9.25, 0, 0] },
    { text: '\u00A0', margin: [0, 9.3, 0, 0] },
    { text: nombreApo, bold: true, alignment: 'left', margin: [0, 9.35, 0, 0] },
    { text: [{ text: 'c.c.', bold: true }, { text: apoderado?.cedula }], alignment: 'left' },
    { text: [{ text: 't.p.', bold: true }, { text: apoderado?.tarjetaProfesional }], alignment: 'left' }
  ];

  const c1 = [
    headerBlock, // Insertamos el bloque dinámico aquí
    
    { text: 'Señores:', alignment: 'left' },
    { text: (destinatario?.entidad || '').toUpperCase(), bold: true, alignment: 'left' },
    { text: destinatario?.ciudad ? `Ciudad: ${destinatario.ciudad}` : 'Ciudad.', alignment: 'left', margin: [0, 0, 0, 15] },

    // ---- Tabla nativa con bordes y sombreado (REEMPLAZA LOS headRow) ----
    {
      margin: [0, 0, 0, 15],
      table: {
        widths: [135, '*'],
        body: [
          [
            { text: 'REFERENCIA', bold: true, fillColor: '#E7E6E6', margin: [5.6, 2, 0, 2] },
            { text: 'PODER AMPLIO, ESPECIAL Y SUFICIENTE', margin: [5.6, 2, 0, 2],  bold: true, fillColor: '#E7E6E6', }
          ],
          [
            { text: 'PODERDANTE', bold: true, fillColor: '#E7E6E6', margin: [5.6, 2, 0, 2] },
            { text: nombrePod, margin: [5.6, 2, 0, 2] }
          ],
          [
            { text: 'APODERADO', bold: true, fillColor: '#E7E6E6', margin: [5.6, 2, 0, 2] },
            { text: nombreApo, margin: [5.6, 2, 0, 2] }
          ]
        ]
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => 'black',
        vLineColor: () => 'black',
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0
      }
    },

    L([R(nombrePod, true), R(` , ${palabraIdentificacion} con cedula de`)], { margin: [0, 0, 0, 0] }),
    L(`ciudadanía N°${poderdante?.cedula} expedida en ${poderdante?.ciudadExpedicion} del departamento de`),
    L(`${poderdante?.departamentoExpedicion}, vecinos de esta ciudad, quienes de ahora en adelante se`),
    L([R('denominara '), R('“poderdante”', true), R(' por medio del presente documento confiero poder')]),
    L([R('especial, amplio y suficiente a los abogados '), R(apoL1, true)]),
    L([R(apoL2, true), R(`, identificado con Cedula de ciudadanía No. ${apoderado?.cedula} expedida`)]),
    L(`en la ciudad de ${apoderado?.ciudadExpedicion}, portador de la tarjeta profesional ${apoderado?.tarjetaProfesional} adscrito al`),
    L('consejo Superior de la Judicatura, para que en mi nombre y representación'),
    L('inicie, tramite, concilie y culmine el procedimiento de reclamación de'),
    L('indemnización amparada por el seguro obligatorio de accidentes de tránsito'),
    L('(SOAT) y las demás entidades que se vieron relacionadas con la ocasión del'),
    L('siniestro y que se consideren responsables del mismo, de igual manera otorgo'),
    L([R('quien de ahora en adelante se denominaran '), R('el apoderado,', true), R(' el cual se regirá')]),
    L('por las siguientes estipulaciones:', { noStretch: true, margin: [0, 0, 0, SLOT] }),

    L([R('PRIMERA. ', true), R('Se otorga poder y facultades especiales a los apoderados para que,')]),
    L('en nombre y representación del poderdante, asuma y lleve hasta su'),
    L(`terminación ante la aseguradora ${aseg}, de acuerdo con la ley`),
    L(`${leyNum}, el proceso de ${tpoP1}`),
    L(`${tpoP2} del señor poderdante, bajo el número de póliza`),
    L(`${siniestro?.poliza} ante los hechos ocurridos el día ${diaMes}`),
    L(`del año ${anio}.`, { noStretch: true, margin: [0, 0, 0, SLOT] }),

    L([R('SEGUNDO. ', true), R('El apoderado queda debidamente autorizado para consultar bases')]),
    L('de datos la información pertinente para la consecución de los documentos y'),
    L('pruebas que deba allegar ante ustedes.', { noStretch: true, margin: [0, 0, 0, SLOT] }),

    L([R('TERCERO. ', true), R('El apoderado queda debidamente autorizado para recibir por medio')]),
    L('de cuenta bancaria por el otorgada, el desembolso del total de la'),
    L('indemnización por accidente de tránsito.', { noStretch: true, margin: [0, 0, 0, SLOT] }),

    L([R('CUARTO. ', true), R('Manifiesto que me encuentro en facultades de realizar estos')]),
    L('tramites por ser titular de este derecho.', { noStretch: true, margin: [0, 0, 0, SLOT] })
  ];

  const c2 = [
    { text: '', pageBreak: 'before' }, 
    headerBlock, // Añadimos el encabezado también en la segunda hoja
    
    L([R('QUINTA. ', true), R('Como poderdantes, manifestamos bajo gravedad de juramento que,')]),
    L('NO hemos otorgado poder a otro abogado para la resolución de este conflicto'),
    L('y que, NO hemos suscrito otro contrato de prestación de servicios.', { noStretch: true, margin: [0, 0, 0, SLOT] }),

    L('Para el fiel cumplimiento de este mandato, le confiero a mi apoderado las'),
    L('facultades expresas consagradas en el Artículo 77 del Código General del'),
    L([R('Proceso, y de manera especial las de '), R('solicitar, presentar, tramitar la ', true)]),
    L([R('reclamación, subsanar requerimientos, transigir, conciliar, desistir, revocar', true)]),
    L([R('y, de forma taxativa y expresa, la facultad de COBRAR Y PERCIBIR', true), R(' todas las')]),
    L('sumas de dinero que resulten a mi favor por concepto de las indemnizaciones'),
    L('de ley.', { noStretch: true, margin: [0, 0, 0, SLOT] }),

    L('Mi apoderado queda plenamente facultado para firmar formatos de'),
    L('transacciones, actas, recibos de pago, finiquitos y realizar cualquier actuación'),
    L('administrativa o judicial necesaria para la efectividad de los derechos'),
    L('amparados por la póliza SOAT.', { noStretch: true, margin: [0, 0, 0, SLOT] }),

    L('Reconozco personería jurídica a nuestro apoderado en los términos y para los'),
    L('efectos del presente mandato.', { noStretch: true, margin: [0, 0, 0, SLOT] }),

    ...firmas,
    ...(poderdanteSignature ? [{ image: poderdanteSignature, fit: [110, 45], absolutePosition: { x: 90, y: 500 } }] : []),
    ...(apoderadoSignature ? [{ image: apoderadoSignature, fit: [110, 45], absolutePosition: { x: 90, y: 640 } }] : []),
  ];

  return {
    pageSize: 'LEGAL',
    pageMargins: [MARGIN_LEFT, MARGIN_TOP, MARGIN_RIGHT, MARGIN_BOTTOM],
    defaultStyle: { font: 'Calibri', fontSize: 14, lineHeight: LINE_HEIGHT, alignment: 'left' },
    content: [...c1, ...c2]
  };
}

// ---------------------------------------------------------------------------
// PODER ESPECIAL PARA LIQUIDACIÓN PATRIMONIAL DIRECTA (Ley 2445 de 2025).
// Layout medido sobre "PODER LIQUIDACION DIRECTA - MANUEL ENRIQUE CASTILLO
// HERRERAdocx.pdf": página LETTER (612x792), Times New Roman 12pt, línea de
// 13.8pt, margen izquierdo 85.2, derecho 82 y superior ~71.
// ---------------------------------------------------------------------------
const LIQ_PAGE = { width: 612, height: 792 };
const LIQ_LEFT = 85.2;
const LIQ_RIGHT = 82;
const LIQ_TOP = 71;
const LIQ_BOTTOM = 71;
const LIQ_FAC_HANG = 103.2 - 85.2;        // 18: número a 103.2
const LIQ_FAC_TEXT = 121.2 - 85.2;        // 36: texto (continuaciones) a 121.2
const LIQ_CONTENT_WIDTH = LIQ_PAGE.width - LIQ_LEFT - LIQ_RIGHT; // 444.8
const LIQ_FAC_COL = LIQ_CONTENT_WIDTH - LIQ_FAC_HANG - (LIQ_FAC_TEXT - LIQ_FAC_HANG); // 408.8

const textoPorGenero = {
  masculino: { articulo: 'el abogado', ident: 'identificado', portador: 'portador' },
  femenino: { articulo: 'la abogada', ident: 'identificada', portador: 'portadora' },
};

const FACULTADES_LIQUIDACION = [
  { lead: 'Presentar solicitud de liquidación patrimonial directa', rest: ' ante el juzgado civil competente, con cumplimiento de los requisitos del artículo 539 del Código General del Proceso, excepto lo previsto en el numeral 2 y el parágrafo del artículo 539A, conforme al artículo 9 de la Ley 2445 de 2025.' },
  { lead: 'Aportar y suscribir', rest: ' toda la documentación requerida, incluyendo: informe de causas de la cesación de pagos, relación de acreedores, relación de bienes (si los hubiere), relación de procesos judiciales, certificación de ingresos, información sobre sociedad conyugal o patrimonial, discriminación de obligaciones alimentarias, y constancia de matrícula mercantil (si aplica).' },
  { lead: 'Recibir notificaciones', rest: ' personales, por estado y por aviso que se decreten dentro del proceso.' },
  { lead: 'Solicitar y recibir', rest: ' autos, providencias y demás actuaciones judiciales.' },
  { lead: 'Intervenir en todas las audiencias', rest: ' que se programen, incluyendo la audiencia de adjudicación de bienes.' },
  { lead: 'Proponer, aceptar o rechazar', rest: ' acuerdos resolutorios, planes de pago, o cualquier otra forma de solución dentro del proceso.' },
  { lead: 'Objetar y contradecir', rest: ' acreencias, inventarios, avalúos y proyectos de adjudicación.' },
  { lead: 'Solicitar la designación de liquidador', rest: ' y ejercer control sobre su gestión.' },
  { lead: 'Pedir y recibir', rest: ' copias, certificaciones y constancias de todo el expediente.' },
  { lead: 'Solicitar el descargue', rest: ' de las obligaciones no cubiertas una vez culminado el proceso.' },
  { lead: 'Interponer recursos', rest: ' (reposición, apelación, queja) contra las providencias que se profieran.' },
  { lead: 'Sustituir este poder', rest: ' total o parcialmente en uno o varios abogados, facultad que podrá ejercerse en cualquier momento.' },
  { lead: 'Realizar cualquier otra gestión', rest: ' judicial, administrativa o registral que sea necesaria para culminar exitosamente el trámite de liquidación patrimonial directa.' },
];

function buildPoderLiquidacionDocDefinition(data = {}) {
  const { destinatario, poderdante, apoderado, firma, firmaApoderado } = data;

  const toSignatureImage = (sig) => {
    if (!sig || typeof sig !== 'object') return null;
    if (typeof sig.data === 'string' && /^data:image\//i.test(sig.data)) return sig.data;
    return null;
  };
  const sigPod = toSignatureImage(firma);
  const sigApo = toSignatureImage(firmaApoderado);

  const nombrePod = (poderdante?.nombre || '').trim();
  const cedulaPod = poderdante?.cedula || '';
  const ciuExpPod = poderdante?.ciudadExpedicion || '';
  const domicilio = poderdante?.domicilio || '';
  const municipio = poderdante?.municipio || '';
  const departamento = poderdante?.departamento || '';
  const correoPod = poderdante?.correo || '';

  const generoApo = (apoderado?.genero || 'femenino').toLowerCase();
  const probApo = textoPorGenero[generoApo] || textoPorGenero.femenino;
  const nombreApo = (apoderado?.nombre || '').trim();
  const cedulaApo = apoderado?.cedula || '';
  const ciuExpApo = [apoderado?.ciudadExpedicion, apoderado?.departamentoExpedicion].filter(Boolean).join(', ') || apoderado?.ciudadExpedicion || '';
  const tpApo = apoderado?.tarjetaProfesional || '';
  const dirApo = apoderado?.direccion || '';
  const emailApo = apoderado?.email || '';
  const telApo = apoderado?.telefono || '';

  const juzgado = (destinatario?.entidad || '').toUpperCase();

  const M = (text, bold = false) => ({ text, ...(bold ? { bold: true } : {}) });

  const body = [
    { text: 'Yo, ' },
    { text: nombrePod + ',', bold: true },
    { text: ' mayor de edad, identificado(a) con cédula de ciudadanía No. ' },
    { text: cedulaPod, bold: true },
    { text: ' expedida en ' },
    { text: ciuExpPod + ',', bold: true },
    { text: ' domiciliado(a) en ' },
    { text: domicilio + ',', bold: true },
    { text: ' municipio de ' },
    { text: municipio + ',', bold: true },
    { text: ' departamento de ' },
    { text: departamento + ',', bold: true },
    { text: ' en pleno uso de mis facultades legales y de conformidad con lo dispuesto en los artículos 2142 y siguientes del Código Civil colombiano, ' },
    { text: 'OTORGO PODER ESPECIAL, amplio, cumplido y bastante, ', bold: true },
    { text: `a favor de ${probApo.articulo} ` },
    { text: nombreApo + ',', bold: true },
    { text: ` mayor de edad, ${probApo.ident} con cédula de ciudadanía No. ` },
    { text: cedulaApo, bold: true },
    { text: ' expedida en ' },
    { text: ciuExpApo + ',', bold: true },
    { text: ` ${probApo.portador} de la Tarjeta Profesional No. ` },
    { text: tpApo, bold: true },
    { text: ' expedida por el Consejo Superior de la Judicatura, con domicilio profesional en ' },
    { text: dirApo + ',', bold: true },
    { text: ' correo electrónico ' },
    { text: emailApo, bold: true },
    { text: ' y teléfono ' },
    { text: telApo + ',', bold: true },
    { text: ' para que en mi nombre y representación realice todas las gestiones necesarias para tramitar el proceso de ' },
    { text: 'LIQUIDACIÓN PATRIMONIAL DIRECTA', bold: true },
    { text: ' de que trata la ' },
    { text: 'Ley 2445 de 2025', bold: true },
    { text: ' (modificatoria del Título IV de la Ley 1564 de 2012), incluyendo las siguientes facultades:' },
  ];

  const faculties = FACULTADES_LIQUIDACION.map((f, i) => ({
    columns: [
      { width: LIQ_FAC_TEXT - LIQ_FAC_HANG, text: `${i + 1}.` },
      { width: LIQ_FAC_COL, text: [M(f.lead, true), M(f.rest)], alignment: 'justify' },
    ],
    margin: [LIQ_FAC_HANG, 0, 0, 8],
  }));

  return {
    pageSize: LIQ_PAGE,
    pageMargins: [LIQ_LEFT, LIQ_TOP, LIQ_RIGHT, LIQ_BOTTOM],
    defaultStyle: { font: 'Times', fontSize: 12, lineHeight: 1.03862 },
    content: [
      { text: 'Señor:', bold: true },
      { text: juzgado, margin: [0, 0, 0, 8] },
      { text: 'E. S. D.', margin: [0, 0, 0, 29.8] },
      { text: 'REFERENCIA: PODER ESPECIAL PARA TRAMITAR PROCESO DE LIQUIDACIÓN PATRIMONIAL DIRECTA (LEY 2445 DE 2025)', bold: true, margin: [0, 0, 0, 29.8] },
      { text: body, alignment: 'justify', margin: [0, 0, 0, 29.8] },
      ...faculties,
      {
        text: 'Este poder es ESPECIAL y se limita exclusivamente al trámite de liquidación patrimonial directa aquí descrito, conforme a la Ley 2445 de 2025 y el Decreto 1136 de 2025. No comprende actos de disposición que excedan el marco de la liquidación, ni faculta al apoderado para celebrar aquellos actos que conforme a la ley deban constar en instrumento público con facultades específicas adicionales.',
        alignment: 'justify', margin: [0, 0, 0, 8],
      },
      {
        text: 'El presente poder tendrá vigencia desde la fecha de su otorgamiento hasta la culminación total del proceso de liquidación patrimonial directa, incluyendo las gestiones de descargue y las que sean necesarias para la ejecución de lo ordenado en el auto de terminación.',
        alignment: 'justify', margin: [0, 0, 0, 8],
      },
      { text: 'Atentamente,' },
      { text: '\u00A0' },
      ...(sigPod
        ? [{ image: sigPod, fit: [150, 55], margin: [0, 6, 0, 10], alignment: 'left' }]
        : [{ text: '\u00A0' }]),
      { text: '\u00A0' },
      { text: nombrePod, bold: true },
      { text: `C.C. No. ${cedulaPod} expedida en ${ciuExpPod}` },
      { text: `Correo electrónico: ${correoPod}` },
      { text: '\u00A0' },
      { text: 'ACEPTO EL PODER:', bold: true },
      { text: '\u00A0' },
      ...(sigApo
        ? [{ image: sigApo, fit: [150, 55], margin: [0, 6, 0, 10], alignment: 'left' }]
        : [{ text: '\u00A0' }]),
      { text: '\u00A0' },
      { text: nombreApo, bold: true },
      { text: `C.C. No. ${cedulaApo} expedida en ${ciuExpApo}` },
      { text: `TP ${tpApo} CSJ` },
      { text: `Correo Electrónico: ${emailApo}` },
    ],
  };
}
  
  async function generatePoderPdf(data = {}, options = {}) {
    const enriched = await loadFirmaImages(data, options.baseUrl);
    const docDefinition =
      enriched.tipo === 'liquidacion'
        ? buildPoderLiquidacionDocDefinition(enriched)
        : buildPoderDocDefinition(enriched);
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

  module.exports = { generatePoderPdf, buildPoderDocDefinition, buildPoderLiquidacionDocDefinition };