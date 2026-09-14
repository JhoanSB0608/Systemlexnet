const PdfPrinter = require('pdfmake');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { numeroALetras } = require('./numeroALetras');

// ---------------------------------------------------------------------------
// Fidelidad tipográfica con el original: el PDF de muestra (Solicitud de
// Liquidación Patrimonial Directa) usa Times New Roman 11 sobre página LETTER
// (612x792) con márgenes de 72pt. Se usan las fuentes Liberation Serif
// (métricamente compatibles con Times New Roman).
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
const PAGE_HEIGHT = 792;
const MARGIN = 72;
const COL_WIDTH = PAGE_WIDTH - MARGIN * 2; // 468

const tableLayout = {
  hLineWidth: () => 1,
  vLineWidth: () => 1,
  paddingLeft: () => 5,
  paddingRight: () => 5,
  paddingTop: () => 3,
  paddingBottom: () => 3,
};

const formatCurrency = (num) => {
  if (num == null || Number.isNaN(Number(num))) return '$0,00';
  return `$${Number(num).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// -------------------- Helpers --------------------
const safe = (v, fallback = '') => (v === undefined || v === null || v === '') ? fallback : v;
const ltrim = (s) => String(s == null ? '' : s).trim();

const formatCifra = (num) => {
  const n = Number(num);
  if (!Number.isFinite(n) || n <= 0) return '';
  return `$${n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

// Normaliza la salida de numeroALetras para reflejar la redacción del documento
// original (p. ej. "MILLONES SEISCIENTOS MIL PESOS", no "MILLONES DE
// SEISCIENTOS CERO MIL CERO PESOS"). Solo afecta a este generador.
const normalizarLetras = (s) => s
  .replace(/\bUN MILLON DE\b/g, 'UN MILLÓN')
  .replace(/\bUN MILLON\b/g, 'UN MILLÓN')
  .replace(/\bMILLONES DE\b/g, 'MILLONES')
  .replace(/\bMILLONES CERO\b/g, 'MILLONES')
  .replace(/\bMILLÓN CERO\b/g, 'MILLÓN')
  .replace(/\bCERO MIL\b/g, 'MIL')
  .replace(/\bMIL CERO\b/g, 'MIL')
  .replace(/\bCIENTO CERO\b/g, 'CIENTO')
  .replace(/\bCERO PESOS\b/g, 'PESOS')
  .replace(/\s{2,}/g, ' ')
  .trim();

const letrasMoneda = (num) => {
  const n = Number(num);
  if (!Number.isFinite(n) || n <= 0) return '';
  return `${normalizarLetras(numeroALetras(n))} MCTE`;
};

// -------------------- Firmas (descarga imágenes remotas) --------------------
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

async function loadFirmaImages(data = {}, baseUrl = '') {
  const copy = (data && typeof data.toObject === 'function') ? data.toObject() : { ...data };
  const sig = copy.firma;
  if (!sig || typeof sig !== 'object' || sig.source !== 'upload' || !sig.url || /^data:/i.test(sig.url)) return copy;
  let url = sig.url;
  if (!/^https?:\/\//i.test(url) && baseUrl) {
    url = url.startsWith('/') ? `${baseUrl}${url}` : `${baseUrl}/${url}`;
  }
  if (/^https?:\/\//i.test(url)) {
    const dataUrl = await fetchUrlToDataUrl(url);
    if (dataUrl) copy.firma = { ...sig, data: dataUrl };
  }
  return copy;
}

// -------------------- Texto base del deudor --------------------
const nombreCompletoDeudor = (deudor = {}) =>
  [deudor.primerNombre, deudor.segundoNombre, deudor.primerApellido, deudor.segundoApellido]
    .filter(Boolean).join(' ').trim().toUpperCase();

const identificacionDeudor = (deudor = {}) =>
  `identificado(a) con cédula de ciudadanía No. ${safe(deudor.cedula)} expedida en ${safe(deudor.ciudadExpedicion)}`;

const datosDeudor = (deudor = {}) => {
  return [
    `con domicilio en la ciudad de ${safe(deudor.ciudad)} – ${safe(deudor.departamento)}, `,
    `dirección física en ${safe(deudor.direccion)}, correo electrónico `,
    { text: safe(deudor.email), decoration: 'underline' }, // <-- Aquí aplicamos el subrayado
    ` y número telefónico ${safe(deudor.telefono)}`
  ];
};

// -------------------- Tabla de datos de un proceso judicial --------------------
function procesoBloque(proceso = {}, index) {
  // Ajusté las filas basándome en los campos de tu segunda imagen.
  // Nota: Agregué 'Tipo de Proceso', verifica de qué propiedad de tu objeto 'proceso' viene 'En Contra'.
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
            // 1. Nueva fila superior con colSpan para que ocupe el ancho de ambas columnas
            [
              { 
                text: `Proceso Judicial\nNo. ${safe(proceso.radicado)}`, 
                colSpan: 2, 
                alignment: 'center', // Centra el texto
                fontSize: 10 
              }, 
              {} // IMPORTANTE: Al usar colSpan: 2, la siguiente celda debe ir vacía
            ],
            // 2. Mapeo dinámico del resto de las filas
            ...filas.map(([k, v]) => [
              { text: k, fontSize: 10 }, // Eliminado el "bold: true" para coincidir con la imagen
              { text: v, fontSize: 10 },
            ]),
          ],
        },
        layout: {
          // 3. Grosor a 1 y eliminación de colores grises para un borde negro sólido
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          paddingLeft: () => 5,
          paddingRight: () => 5,
          paddingTop: () => 3,
          paddingBottom: () => 3,
        },
        // 4. Eliminado el margin [12, 0, 0, 0] para que la tabla se alinee a la izquierda
      },
    ],
    margin: [0, index > 0 ? 10 : 0, 0, 0],
  };
}

// Pruebas por defecto de la sección VII. PRUEBAS (cuando el formulario no
// guarda ninguna selección de pruebas).
const PRUEBAS_DEFAULT = [
  'Copia de la cédula de ciudadanía del solicitante.',
  'Poder conferido al apoderado judicial.',
  'Anexo No. 1: Relación completa y actualizada de acreencias.',
  'Desprendible de Nomina',
  'Documentos relacionados con sociedad conyugal.',
  'Certificado REDAM, si resulta aplicable por la existencia o inexistencia de obligaciones alimentarias.',
];

// -------------------- Definición del documento --------------------
function buildLiquidacionDocDefinition(solicitud = {}) {
  const normalized = (solicitud && typeof solicitud.toObject === 'function') ? solicitud.toObject() : solicitud;
  const {
    sede = {},
    deudor = {},
    apoderado = {},
    acreencias = [],
    procesosJudiciales = [],
    informacionFinanciera = {},
    pruebas = [],
    firma = {},
    anexos = [],
  } = normalized;

  const nombreDeudor = nombreCompletoDeudor(deudor);
  const identDeudor = identificacionDeudor(deudor);
  const bloqueDatos = datosDeudor(deudor);

  const totalCapital = acreencias.reduce((s, a) => s + (Number(a.capital) || 0), 0);
  const cuantia = Number(informacionFinanciera.cuantiaTotal || totalCapital) || 0;

  // Ingresos: se priorizan los campos del formulario de liquidación (estilo
  // insolvencia); si no están presentes se conservan los valores anteriores.
  const actPrincipal = Number(informacionFinanciera.ingresosActividadPrincipal) || 0;
  const otrasActividades = Number(informacionFinanciera.ingresosOtrasActividades) || 0;
  const ingresos = (actPrincipal + otrasActividades) || Number(informacionFinanciera.ingresosMensuales) || 0;

  // Gastos: si el usuario diligenció la relación detallada se suman sus
  // valores; de lo contrario se usa el total autorreportado.
  const gastosPersonales = (informacionFinanciera.gastosPersonales && typeof informacionFinanciera.gastosPersonales === 'object')
    ? informacionFinanciera.gastosPersonales
    : {};
  const gastosDetallados = Object.values(gastosPersonales).reduce((s, v) => s + (Number(v) || 0), 0);
  const gastos = gastosDetallados || Number(informacionFinanciera.gastosMensuales) || 0;
  const capacidad = Number(informacionFinanciera.capacidadPago) || Math.max(ingresos - gastos, 0);

  const cargoEmpleo = safe(informacionFinanciera.cargoEmpleo) || safe(informacionFinanciera.tipoEmpleo) || 'actividad económica';
  const entidadEmpleadora = safe(informacionFinanciera.entidadEmpleadora) || safe(informacionFinanciera.descripcionActividadEconomica) || 'mi entidad empleadora';
  const obligacionesAlimentarias = Array.isArray(informacionFinanciera.obligacionesAlimentarias) ? informacionFinanciera.obligacionesAlimentarias : [];

  // Las obligaciones se derivan de las acreencias marcadas como en mora por más
  // de 90 días. Si no hay ninguna marcada se conservan los valores autorreportados.
  const obligacionesEnMora = (acreencias || []).filter(
    (a) => a.creditoEnMora === true && a.moraMas90Dias === true
  );
  const capitalObligaciones = obligacionesEnMora.reduce((s, a) => s + (Number(a.capital) || 0), 0);
  const numObligaciones = obligacionesEnMora.length || Number(informacionFinanciera.numeroObligaciones) || 0;
  const numAcreedores = new Set(
    obligacionesEnMora
      .map((a) => (a.acreedor && (a.acreedor._id || a.acreedor)) || a.nombreAcreedor)
      .filter(Boolean)
  ).size || Number(informacionFinanciera.numeroAcreedores) || 0;
  const porcPasivo = (obligacionesEnMora.length > 0 && totalCapital > 0)
    ? Math.round((capitalObligaciones / totalCapital) * 1000) / 10
    : (Number(informacionFinanciera.porcentajePasivo) || 0);

  const tituloJuzgado = safe(sede.juzgado) || 'JUEZ CIVIL MUNICIPAL (REPARTO)';
  const nombreApoderado = safe(apoderado.nombreCompleto).toUpperCase();

  const docDefinition = {
    pageSize: 'LETTER',
    pageMargins: [90, 72, 90, 72],
    defaultStyle: {
      font: 'Times',
      fontSize: 11,
      lineHeight: 1.38,
    },
    content: [],
  };

  const c = docDefinition.content;

  const parrafo = (text, opts = {}) => ({ text, fontSize: 11, alignment: 'justify', margin: [0, 4, 0, 4], ...opts });

  const tituloSeccion = (text) => ({
    text,
    bold: true,
    fontSize: 11,
    alignment: 'center',
    margin: [0, 10, 0, 6],
  });

  // Defines la constante (puedes ajustar el 15 al tamaño que prefieras)
  const saltoDeLinea = { text: '', margin: [0, 15, 0, 0] };

  // ============ ENCABEZADO ============
  c.push(parrafo('SEÑOR', { margin: [0, 0, 0, 6] }));
  c.push(parrafo(`${tituloJuzgado} De ${safe(sede.ciudad)} - ${safe(sede.departamento)} (REPARTO)`, { bold: true, margin: [0, 0, 0, 6] }));
  c.push(parrafo('E. S. D.', { margin: [0, 0, 0, 10] }));

  c.push(saltoDeLinea);

  c.push(parrafo([
    { text: 'REFERENCIA: ', bold: true },
    { text: 'SOLICITUD DE APERTURA DE LIQUIDACIÓN PATRIMONIAL DIRECTA DE PERSONA NATURAL NO COMERCIANTE', bold: true },
  ], { margin: [0, 0, 0, 8] }));

  c.push(saltoDeLinea);

  c.push(parrafo([
    { text: 'SOLICITANTE / DEUDOR: ', bold: true },
    `${nombreDeudor} - C.C. No. ${safe(deudor.cedula)} expedida en ${safe(deudor.ciudadExpedicion)}`,
  ], { margin: [0, 0, 0, 8] }));

  c.push(saltoDeLinea);

  c.push(parrafo([
    { text: 'Yo ', bold: false },
    { text: `${nombreApoderado}, `, bold: true },
    { text: `mayor de edad, identificada con C.C. N° ${safe(apoderado.cedula)} de ${safe(apoderado.ciudadExpedicion)}, con T.P. ${safe(apoderado.tp)} del C.S.J., actuando en nombre y representación de mi prohijado `, bold: false }, 
    { text: `${nombreDeudor}, `, bold: true },
    { text: `mayor de edad, ${identDeudor}, ${bloqueDatos}, respetuosamente me permito solicitar a su despacho la `, bold: false },
    { text: 'APERTURA DEL PROCEDIMIENTO DE LIQUIDACIÓN PATRIMONIAL DIRECTA', bold: true },
    `, regulado en el Título IV de la Sección Tercera del Libro Tercero de la Ley 1564 de 2012 —Código General del Proceso—, con fundamento en los siguientes:`,
  ], { margin: [0, 0, 0, 10] }));

  c.push(saltoDeLinea);

  // ============ I. IDENTIFICACIÓN DEL DEUDOR Y CALIDAD ============
  c.push(tituloSeccion('I. IDENTIFICACIÓN DEL DEUDOR Y CALIDAD'));
  c.push(parrafo(
    `Mi apoderado es persona natural no comerciante, por cuanto no ejerce profesionalmente actividades mercantiles, no se encuentra inscrito en el registro mercantil como comerciante y no desarrolla actos de comercio de forma habitual o profesional.`
  ));

  c.push(saltoDeLinea);

  // ============ II. COMPETENCIA ============
  c.push(tituloSeccion('II. COMPETENCIA'));
  c.push(parrafo(
    `Es competente este despacho para conocer de la presente solicitud por el factor territorial, toda vez que el domicilio del deudor se encuentra ubicado en el municipio de ${safe(deudor.ciudad)}, ${safe(deudor.departamento)}, de conformidad con el numeral 8 del artículo 28 del Código General del Proceso.`
  ));
  c.push(parrafo([
    'Igualmente, por el factor funcional y de cuantía, el conocimiento corresponde a este despacho, ya que el monto total del capital adeudado por el solicitante asciende a la suma de ',
    { text: `${letrasMoneda(cuantia)} (${formatCifra(cuantia)}),`.toUpperCase(), bold: true },
    ' cuantía que corresponde a ',
    { text: 'MENOR CUANTÍA', bold: true },
    ', de conformidad con las disposiciones vigentes del Código General del Proceso.',
  ], { margin: [0, 0, 0, 10] }));

  c.push(saltoDeLinea);

  // ============ III. PRETENSIONES ============
  c.push(tituloSeccion('III. PRETENSIONES'));

  c.push(parrafo([
    { text: 'PRIMERA. ADMITIR ', bold: true },
    'la presente solicitud de liquidación patrimonial directa promovida por ',
    { text: nombreDeudor, bold: true },
    ` mayor de edad, ${identDeudor}.`
  ]));

  c.push(saltoDeLinea);

  c.push(parrafo([
    { text: 'SEGUNDA. DECRETAR ', bold: true },
    'la apertura del procedimiento de liquidación patrimonial directa del patrimonio de ',
    { text: nombreDeudor, bold: true },
    `, mayor de edad, ${identDeudor}, en su condición de persona natural no comerciante, conforme a las normas del Título IV de la Sección Tercera del Libro Tercero de la Ley 1564 de 2012, modificado por la Ley 2445 de 2025.`
  ]));

  c.push(saltoDeLinea);

  c.push(parrafo([
    { text: 'TERCERA. DECLARAR ', bold: true },
    `que el deudor se encuentra en situación de cesación de pagos, por cuanto ha incumplido el pago de ${numObligaciones} obligaciones dinerarias a favor de ${numAcreedores} acreedores por más de noventa (90) días, obligaciones que representan el ${porcPasivo}% del total de su pasivo, exceptuando los créditos por libranzas que se descuentan directamente por nómina.`,
  ]));

  c.push(saltoDeLinea);
  
  c.push(parrafo([
    { text: 'CUARTA. TENER ', bold: true },
    'como presentada y vinculada al expediente la relación completa y actualizada de acreencias contenida en el Anexo No. 1 de esta solicitud, para efectos de determinar la cesación de pagos, la cuantía, los acreedores a notificar, la calificación y graduación de los créditos y las demás actuaciones propias del procedimiento.',
  ]));

  c.push(saltoDeLinea);

  c.push(parrafo([
    { text: 'QUINTA. RECONOCER ', bold: true },
    'que el deudor no posee bienes embargables, activos realizables, derechos patrimoniales disponibles, dineros, vehículos, inmuebles, inversiones, acciones, cuotas sociales, derechos fiduciarios o cualquier otro activo que pueda integrar la masa de liquidación, circunstancia que se manifiesta bajo la gravedad del juramento.',
  ]));

  c.push(saltoDeLinea);

  c.push(parrafo([
    { text: 'SEXTA. DESIGNAR ', bold: true },
    'al deudor, señor(a) ',
    { text: nombreDeudor, bold: true },
    `, mayor de edad, ${identDeudor}, como liquidador o administrador de la liquidación, bajo vigilancia, control e instrucciones del juzgado, con la obligación de rendir los informes, inventarios, cuentas y explicaciones que sean requeridos.`
  ]));

  c.push(parrafo(
    'Esta petición se fundamenta en que no existe masa activa, bienes embargables ni activos realizables que administrar, enajenar o adjudicar; por ello, la designación de un auxiliar externo puede originar gastos desproporcionados e imposibles de sufragar, sin que exista patrimonio liquidable con cargo al cual puedan pagarse.'
  ));

  c.push(parrafo([
    { text: 'OCTAVA. EN SUBSIDIO DE LA PRETENSIÓN ANTERIOR', bold: true },
    ', si el despacho considera improcedente la designación del deudor como liquidador o administrador, designar un liquidador perteneciente a la lista de auxiliares de la justicia o al listado legalmente aplicable, procurando que sus honorarios y gastos sean fijados de manera razonable, proporcional y acorde con la inexistencia de bienes en la masa liquidatoria.',
  ]));

  c.push(saltoDeLinea);

  c.push(parrafo([
    { text: 'NOVENA. ORDENAR', bold: true },
    'que se produzcan los efectos propios de la apertura del procedimiento de liquidación patrimonial directa, entre ellos:',
  ]));

  c.push(saltoDeLinea);

  c.push(parrafo([
    { text: 'a) ', bold: true },
    'La incorporación al trámite de los procesos ejecutivos, de cobro, ejecución especial, jurisdicción coactiva, restitución de bienes por mora y demás actuaciones patrimoniales que cursen contra el deudor, en los casos legalmente procedentes.',
  ]));

  procesosJudiciales.forEach((proceso, idx) => {
    c.push(procesoBloque(proceso, idx));
  });

  c.push(saltoDeLinea);
  c.push(saltoDeLinea);

  c.push(parrafo([
    { text: 'b) ', bold: true },
    'La suspensión de los procesos y actuaciones de cobro individual que deban someterse al fuero de atracción concursal.',
  ]));
  c.push(saltoDeLinea);
  c.push(parrafo([
    { text: 'c) ', bold: true },
    'La prohibición de iniciar nuevos procesos, acciones o actuaciones de cobro individual por obligaciones causadas antes de la apertura del procedimiento, salvo las excepciones legales.',
  ]));
  c.push(saltoDeLinea);
  c.push(parrafo([
    { text: 'd) ', bold: true },
    'La interrupción de la prescripción y la inoperancia de la caducidad respecto de los créditos sometidos al trámite, en los términos de la ley.',
  ]));
  c.push(saltoDeLinea);
  c.push(parrafo([
    { text: 'e) ', bold: true },
    'La prevención a los acreedores para que se abstengan de adelantar actuaciones de cobro judicial, extrajudicial, administrativo o privado contrarias a los efectos del proceso de liquidación patrimonial.',
  ]));
  c.push(saltoDeLinea);

  c.push(parrafo([
    { text: 'DÉCIMA. ORDENAR', bold: true },
    'la publicación del aviso de apertura del procedimiento de liquidación patrimonial, mediante el mecanismo legalmente previsto, para que los acreedores no relacionados presenten oportunamente sus créditos, con los documentos que los soporten.',
  ]));

  c.push(saltoDeLinea);

  c.push(parrafo([
    { text: 'DÉCIMA PRIMERA. REQUERIR', bold: true },
    'a los acreedores relacionados y a quienes comparezcan al trámite para que presenten sus créditos con los respectivos soportes, discriminando capital, intereses, otros conceptos, naturaleza de la obligación, fecha de exigibilidad, garantías, privilegios, prelaciones y datos de contacto para notificaciones.',
  ]));

  c.push(saltoDeLinea);

  c.push(parrafo([
    { text: 'DÉCIMA SEGUNDA. OFICIAR', bold: true },
    'a los despachos judiciales, entidades administrativas y autoridades de jurisdicción coactiva que aparecen relacionados en el Anexo No. 3, para que informen sobre la existencia, estado y cuantía de los procesos, medidas cautelares, embargos, secuestros, descuentos, títulos judiciales o actuaciones de cobro adelantadas contra el deudor.',
  ]));

  c.push(saltoDeLinea);

  c.push(parrafo([
    { text: 'DÉCIMA TERCERA. OFICIAR', bold: true },
    'a las entidades financieras, cooperativas, fondos de empleados, pagadores, empleadores, administradoras de nómina y demás acreedores relacionados en el Anexo No. 1, para que informen sobre saldos, obligaciones, descuentos, embargos, garantías, procesos de cobro y datos de contacto actualizados del acreedor.',
  ]));

  c.push(saltoDeLinea);

  c.push(parrafo([
    { text: 'DÉCIMA CUARTA. OFICIAR', bold: true },
    'a los operadores, fuentes y usuarios de información financiera, crediticia, comercial y de servicios, particularmente a:',
  ]));

  c.push(saltoDeLinea);

  const listaCentrales = [
    '1. TRANSUNION COLOMBIA S.A. – CIFIN.',
    '2. DATACRÉDITO EXPERIAN COLOMBIA S.A.',
    '3. Las demás centrales de riesgo, operadores, fuentes y usuarios de datos financieros, crediticios, comerciales y de servicios que registren obligaciones a nombre del deudor.',
  ];
  listaCentrales.forEach((item) => c.push(parrafo(item)));

  c.push(saltoDeLinea);

  c.push(parrafo(
    'Para que, en el marco de sus competencias y con observancia de la Ley 1266 de 2008, la Ley 1581 de 2012 y demás disposiciones aplicables, incorporen en la historia crediticia del deudor la anotación referente a la apertura del procedimiento de liquidación patrimonial; identifiquen que las obligaciones se encuentran sometidas al trámite concursal; se abstengan de registrar información que contradiga las decisiones judiciales; y actualicen los datos reportados cuando se profiera providencia de adjudicación, terminación, cierre o cualquier decisión que determine el tratamiento jurídico de las obligaciones insolutas.'
  ));

  c.push(saltoDeLinea);
  
  c.push(parrafo([
    { text: 'DÉCIMA QUINTA. OFICIAR ', bold: true },
    `a la DIAN, a la Secretaría de Hacienda de ${safe(deudor.ciudad)} – ${safe(deudor.departamento)} y a las entidades públicas que puedan tener acreencias o procesos de cobro contra el deudor, a fin de que informen la existencia de obligaciones tributarias, procesos de cobro coactivo, medidas cautelares, saldos y demás información relevante para el procedimiento.`,
  ]));

  c.push(saltoDeLinea);

  c.push(parrafo([
    { text: 'DÉCIMA SEXTA. DECRETAR ', bold: true },
    'las demás medidas, comunicaciones, requerimientos y decisiones que sean necesarias para asegurar la debida publicidad, universalidad, igualdad de los acreedores, transparencia y eficacia del procedimiento de liquidación patrimonial.',
  ]));

  c.push(saltoDeLinea);

  // ============ IV. HECHOS ============
  c.push({ ...tituloSeccion('IV. HECHOS'), });

  c.push(parrafo([
    { text: 'PRIMERO. ', bold: true },
    'El suscrito, ',
    { text: nombreDeudor, bold: true },
    `, mayor de edad, ${identDeudor} y tiene su domicilio en el municipio de${safe(deudor.ciudad)} – ${safe(deudor.departamento)}, dirección física en ${safe(deudor.direccion)}.`
  ]));

  c.push(saltoDeLinea);

  c.push(parrafo([
    { text: 'SEGUNDO. ', bold: true },
    'El suscrito ostenta la condición de persona natural no comerciante, por cuanto no ejerce profesionalmente actividades mercantiles ni ejecuta actos de comercio de manera habitual y organizada.',
  ]));

  c.push(saltoDeLinea);

  c.push(parrafo([
    { text: 'TERCERO. ', bold: true },
    'Mi situación económica se deterioró, debido a que adquirí los distintos créditos con el fin de mejorar mi calidad de vida y la de mi familia, sin embargo, el manejo dado no fue el adecuado, con el ánimo de sobrellevar las deudas sobre pase mi capacidad de pago, por lo que actualmente lo devengado no es suficiente para cubrir tantos mis gastos familiares y personales y estar al día con los pagos de mis obligaciones crediticias, razón por la cual me encuentro en mora en la mayoría de ellas y por ende inicio el presente proceso.',
  ]));

  c.push(saltoDeLinea);

  c.push(parrafo([
    { text: 'CUARTO. ', bold: true },
    `Actualmente percibo ingresos mensuales aproximados de `,
    { text: `${letrasMoneda(ingresos)} (${formatCifra(ingresos)}),`.toUpperCase(), bold: true },
    ` provenientes del salario como ${cargoEmpleo} del ${entidadEmpleadora}.`,
  ]));

  c.push(saltoDeLinea);

  c.push(parrafo([
    { text: 'QUINTO. ', bold: true },
    `Mis gastos mensuales necesarios para subsistencia y sostenimiento propio y de mi núcleo familiar ascienden aproximadamente a la suma de `,
    { text: `${letrasMoneda(gastos)} (${formatCifra(gastos)}),`.toUpperCase(), bold: true },
    ' correspondientes a vivienda, alimentación, salud, transporte, servicios públicos, educación, y demás egresos indispensables.',
  ]));

  c.push(saltoDeLinea);

  c.push(parrafo([
    { text: 'SEXTO. ', bold: true },
    'Después de cubrir los gastos esenciales de subsistencia, cuento con una capacidad de pago aproximada de ',
    { text: `${letrasMoneda(capacidad)} (${formatCifra(capacidad)})`.toUpperCase(), bold: true },
    ' mensuales, suma insuficiente para atender el valor, número, exigibilidad y condiciones de las obligaciones pendientes.',
  ]));

  c.push(saltoDeLinea);

  c.push(parrafo([
    { text: 'SÉPTIMO. ', bold: true },
    'A la fecha de presentación de esta solicitud, mantengo obligaciones dinerarias a favor de los acreedores relacionados en el ANEXO No. 1, denominado "RELACIÓN COMPLETA Y ACTUALIZADA DE ACREENCIAS".',
  ]));

  c.push(saltoDeLinea);

  c.push(parrafo([
    { text: 'OCTAVO. ', bold: true },
    'El capital total de las obligaciones relacionadas asciende aproximadamente a ',
    { text: `${letrasMoneda(cuantia)} (${formatCifra(cuantia)}),`.toUpperCase(), bold: true },
    ' sin perjuicio de la actualización de intereses, gastos, costos y demás conceptos que deban ser acreditados por los acreedores dentro del trámite.',
  ]));

  c.push(saltoDeLinea);

  c.push(parrafo([
    { text: 'NOVENO. ', bold: true },
    `Me encuentro en situación de cesación de pagos, puesto que he incumplido el pago de ${numObligaciones} obligaciones dinerarias a favor de ${numAcreedores} acreedores por un término superior a noventa (90) días.`,
  ]));

  c.push(saltoDeLinea);

  c.push(parrafo([
    { text: 'DÉCIMO. ', bold: true },
    `Las obligaciones vencidas e incumplidas por más de noventa (90) días representan aproximadamente el ${porcPasivo}% del pasivo total a mi cargo, superando el mínimo legal exigido para la configuración de la cesación de pago exceptuando los créditos por libranzas que se descuentan directamente por nómina.`,
  ]));

  c.push(saltoDeLinea);

  c.push(parrafo([
    { text: 'DÉCIMO PRIMERO. ', bold: true },
    'En mi contra cursan los siguientes procesos o actuaciones de cobro:',
  ]));

  c.push(saltoDeLinea);

  procesosJudiciales.forEach((proceso, idx) => {
    c.push(procesoBloque(proceso, idx));
  });

  c.push(saltoDeLinea);

  c.push(parrafo([
    { text: 'DÉCIMO SEGUNDO. ', bold: true },
    'No poseo bienes embargables, activos realizables, inmuebles, vehículos, dineros disponibles en cuentas bancarias, inversiones, títulos, derechos fiduciarios, acciones, cuotas sociales, establecimientos de comercio, derechos económicos ni otros bienes que puedan integrar la masa de liquidación.',
  ]));

  c.push(saltoDeLinea);

  c.push(parrafo([
    { text: 'DÉCIMO TERCERO. ', bold: true },
    'La inexistencia de bienes embargables y de activos realizables se declara bajo la gravedad del juramento. La información suministrada se soporta en los documentos anexos y se presenta de buena fe, de manera completa, veraz y actualizada.',
  ]));

  c.push(saltoDeLinea);

  if (deudor.sociedadConyugalActiva) {
    c.push(parrafo([
      { text: 'DÉCIMO CUARTO. ', bold: true },
      `Tengo sociedad conyugal vigente con ${safe(deudor.nombreConyuge).toUpperCase()}, identificada con Cedula de Ciudadanía No. ${safe(deudor.cedulaConyuge)} de ${safe(deudor.ciudadExpedicionConyuge)}, circunstancia que se informa al despacho para los efectos legales correspondientes.`,
    ]));
  } else {
    c.push(parrafo([
      { text: 'DÉCIMO CUARTO. ', bold: true },
      'No existe sociedad conyugal vigente, circunstancia que se informa al despacho para los efectos legales correspondientes.',
    ]));
  }

  c.push(saltoDeLinea);

  c.push(parrafo([
    { text: 'DÉCIMO QUINTO. ', bold: true },
    'Ante la inexistencia de masa activa y la ausencia de bienes realizables, la designación de un liquidador externo podría generar gastos sin que exista patrimonio suficiente para sufragarlos. Por ello, solicito que el despacho estudie, de encontrarlo jurídicamente viable, la posibilidad de designar al deudor como liquidador o administrador de la liquidación, bajo supervisión judicial y con los controles que sean procedentes.',
  ]));

  c.push(saltoDeLinea);

  c.push(parrafo([
    { text: 'DÉCIMO SEXTO. ', bold: true },
    'El suscrito se compromete a colaborar de manera plena y permanente con el despacho, el liquidador que se designe, los acreedores y las autoridades que intervengan; a suministrar información veraz; a comparecer cuando sea requerido; y a cumplir todas las órdenes que se impartan dentro del trámite.',
  ]));

  c.push(saltoDeLinea);

  // ============ RELACIÓN ECONÓMICA DETALLADA ============
  c.push({ ...tituloSeccion('RELACIÓN DE GASTOS DE SUBSISTENCIA DEL DEUDOR Y DE PERSONAS A SU CARGO'), });

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

  const bodyGastos = [
    [
      {
        text: 'Gastos de Subsistencia',
        bold: true,
        fontSize: 9,
        alignment: 'center',
        margin: [0, 4, 0, 4],
        colSpan: 2
      },
      {}
    ],
  ];

  let totalGastosDetalle = 0;
  for (const key in gastosPersonales) {
    const value = parseFloat(gastosPersonales[key]);
    if (value > 0 && gastosLabels[key]) {
      bodyGastos.push([
        { text: gastosLabels[key], fontSize: 9, margin: [4, 3, 2, 3] },
        { text: formatCurrency(value), fontSize: 9, margin: [4, 3, 2, 3] }
      ]);
      totalGastosDetalle += value;
    }
  }

  if (bodyGastos.length === 1) {
    bodyGastos.push([
      { text: 'No se reportan gastos.', fontSize: 9, margin: [4, 3, 2, 3], colSpan: 2, alignment: 'center' },
      {}
    ]);
  } else {
    bodyGastos.push([
      { text: 'TOTAL GASTOS', bold: true, fontSize: 9, margin: [4, 3, 2, 3] },
      { text: formatCurrency(totalGastosDetalle), bold: true, fontSize: 9, margin: [4, 3, 2, 3] }
    ]);
  }

  c.push({
    unbreakable: true,
    columns: [
      {
        width: '*',
        table: {
          widths: ['*', '*'],
          body: bodyGastos
        },
        layout: tableLayout,
      }
    ],
    margin: [15, 0, 0, 10]
  });

  c.push({ ...tituloSeccion('RELACIÓN DE INGRESOS'), });

  const bodyIngresos = [
    [
      {
        text: 'Ingresos',
        bold: true,
        fontSize: 9,
        alignment: 'center',
        margin: [0, 4, 0, 4],
        colSpan: 2
      },
      {}
    ],
    [
      { text: 'Ingresos mensuales por actividad económica', fontSize: 9, margin: [4, 3, 2, 3] },
      { text: formatCurrency(actPrincipal), fontSize: 9, margin: [4, 3, 2, 3], alignment: 'right' }
    ],
    [
      { text: 'Empleo', fontSize: 9, margin: [4, 3, 2, 3] },
      { text: informacionFinanciera.tieneEmpleo ? 'SI' : 'NO', fontSize: 9, margin: [4, 3, 2, 3] }
    ],
    [
      { text: 'Tipo de empleo', fontSize: 9, margin: [4, 3, 2, 3] },
      { text: safe(informacionFinanciera.tipoEmpleo), fontSize: 9, margin: [4, 3, 2, 3] }
    ],
    [
      { text: 'Descripción de la actividad económica', fontSize: 9, margin: [4, 3, 2, 3] },
      { text: safe(informacionFinanciera.descripcionActividadEconomica), fontSize: 9, margin: [4, 3, 2, 3] }
    ],
    [
      { text: 'Ingresos mensuales por otras actividades', fontSize: 9, margin: [4, 3, 2, 3] },
      { text: formatCurrency(otrasActividades), fontSize: 9, margin: [4, 3, 2, 3], alignment: 'right' }
    ],
    [
      { text: 'TOTAL DE INGRESOS MENSUALES', bold: true, fontSize: 9, margin: [4, 3, 2, 3] },
      { text: formatCurrency(actPrincipal + otrasActividades), bold: true, fontSize: 9, margin: [4, 3, 2, 3], alignment: 'right' }
    ],
  ];

  c.push({
    unbreakable: true,
    columns: [
      {
        width: '*',
        table: {
          widths: ['*', '*'],
          body: bodyIngresos
        },
        layout: tableLayout,
      }
    ],
    margin: [15, 0, 0, 10]
  });

  // ============ OBLIGACIONES ALIMENTARIAS ============
  c.push({ ...tituloSeccion('OBLIGACIONES ALIMENTARIAS'), });

  if (!obligacionesAlimentarias.length) {
    c.push(parrafo('No se reportan obligaciones alimentarias.'));
  } else {
    obligacionesAlimentarias.forEach((o, idx) => {
      const body = [
        [
          {
            text: `Obligación Alimentaria No. ${idx + 1}`,
            bold: true,
            fontSize: 9,
            alignment: 'center',
            margin: [0, 4, 0, 4],
            colSpan: 2
          },
          {}
        ],
      ];

      const detalleRows = [
        ['Beneficiario', safe(o.beneficiario)],
        ['Tipo de Identificación', safe(o.tipoIdentificacion)],
        ['Número de Identificación', safe(o.numeroIdentificacion)],
        ['Parentesco', safe(o.parentesco)],
        ['Cuantía Mensual', formatCurrency(o.cuantia)],
        ['Periodo de Pago', safe(o.periodoPago)],
        ['Estado de la Obligación', safe(o.estadoObligacion)],
        ['¿La obligación se encuentra demandada?', o.obligacionDemandada ? 'SI' : 'NO'],
        ['País de Residencia', safe(o.paisResidencia)],
        ['Departamento', safe(o.departamento)],
        ['Ciudad', safe(o.ciudad)],
        ['Dirección', safe(o.direccion)],
        ['Correo Electrónico del Beneficiario', safe(o.emailBeneficiario)]
      ];

      detalleRows.forEach(row => {
        body.push([
          { text: row[0], fontSize: 9, margin: [4, 3, 2, 3] },
          { text: row[1], fontSize: 9, margin: [4, 3, 2, 3] }
        ]);
      });

      c.push({
        unbreakable: true,
        columns: [
          {
            width: '*',
            table: {
              widths: ['*', '*'],
              body
            },
            layout: tableLayout,
          }
        ],
        margin: [15, 0, 0, 10]
      });
    });
  }

  c.push(saltoDeLinea);

  // ============ V. FUNDAMENTOS DE DERECHO ============
  c.push({ ...tituloSeccion('V. FUNDAMENTOS DE DERECHO'), });
  c.push(parrafo('La presente solicitud se fundamenta en las siguientes disposiciones:'));
  const fundamentos = [
    'Artículos 29, 83, 228 y 229 de la Constitución Política de Colombia.',
    'Ley 1564 de 2012 —Código General del Proceso—, particularmente las disposiciones contenidas en el Título IV de la Sección Tercera del Libro Tercero, relativo a la insolvencia de la persona natural no comerciante.',
    'Artículos 17 numeral 9, 28 numeral 8, 531, 532, 533, 534, 538, 563 y siguientes del Código General del Proceso, según las modificaciones introducidas por la Ley 2445 de 2025 y las correcciones normativas aplicables.',
    'Ley 2445 de 2025, mediante la cual se modificó el régimen de insolvencia de la persona natural no comerciante y se incorporaron reglas sobre liquidación patrimonial directa.',
    'Decreto 1136 de 2025, en cuanto corrige los yerros formales de la Ley 2445 de 2025 y precisa el alcance de las disposiciones reformadas.',
    'Decreto 2677 de 2012 y las normas reglamentarias que resulten vigentes, compatibles y aplicables en relación con operadores de insolvencia, liquidadores y procedimientos de insolvencia.',
    'Ley 1266 de 2008, Ley 1581 de 2012 y demás normas concordantes sobre protección de datos personales, información financiera, crediticia, comercial y de servicios.',
  ];
  fundamentos.forEach((f, i) => c.push(parrafo(`${i + 1}. ${f}`, { margin: [12, 4, 0, 4] })));
  c.push(saltoDeLinea);
  // ============ VI. CUANTÍA ============
  c.push(tituloSeccion('VI. CUANTÍA'));
  c.push(parrafo([
    'La cuantía del presente trámite corresponde al valor total del capital de las obligaciones relacionadas en el Anexo No. 1, el cual asciende a ',
    { text: `${letrasMoneda(cuantia)} (${formatCifra(cuantia)}).`.toUpperCase(), bold: true },
  ]));
  c.push(parrafo('Por lo anterior, el presente asunto es de MENOR cuantía y corresponde a la competencia del Juzgado Civil Municipal.'));

  c.push(saltoDeLinea);

  // ============ VII. PRUEBAS ============
  c.push(tituloSeccion('VII. PRUEBAS'));
  c.push(parrafo('Solicito que se tengan como pruebas los siguientes documentos:'));
  const pruebasSeleccionadas = (pruebas || [])
    .map((p) => safe(p).trim())
    .filter(Boolean);
  const pruebasList = pruebasSeleccionadas.length ? pruebasSeleccionadas : PRUEBAS_DEFAULT;
  pruebasList.forEach((p, i) => c.push(parrafo(`${i + 1}. ${p}`, { margin: [12, 4, 0, 4] })));

  c.push(saltoDeLinea);

  // ============ VIII. JURAMENTO ============
  c.push({ ...tituloSeccion('VIII. JURAMENTO'),});
  c.push(parrafo('Bajo la gravedad del juramento, que se entiende prestado con la presentación de este escrito, manifiesto que:'));
  const juramentos = [
    'Soy persona natural no comerciante.',
    'La relación de acreedores, obligaciones, bienes, activos, ingresos, gastos, procesos y demás información económica aportada es completa, veraz y se encuentra actualizada a la fecha de presentación de esta solicitud.',
    'No he ocultado, omitido, enajenado fraudulentamente, gravado, transferido ni alterado información relacionada con bienes, derechos, ingresos, obligaciones, acreedores, procesos, garantías, codeudores o actuaciones de cobro.',
    'No poseo bienes embargables, activos realizables ni derechos patrimoniales disponibles que integren la masa de liquidación, salvo aquellos que se hayan informado expresamente al despacho.',
    'Los datos de contacto de los acreedores corresponden a la información que conozco y a la que aparece en los CERTIFICADO DE EXISTENCIA Y REPRESENTACIÓN LEGAL.',
    'La información contenida en los anexos se presenta de buena fe y con el propósito de permitir el trámite transparente, universal y ordenado de la liquidación patrimonial.',
  ];
  juramentos.forEach((j, i) => c.push(parrafo(`${i + 1}. ${j}`, { margin: [12, 10, 0, 10] })));
  
  c.push(saltoDeLinea);
  
  // ============ IX. NOTIFICACIONES ============
  c.push({ ...tituloSeccion('IX. NOTIFICACIONES'),});

  const bloqueNotificacion = (titulo, filas) =>
    c.push({
      stack: [
        { text: titulo, bold: true, margin: [0, 0, 0, 2] },
        ...filas.map((f) => parrafo(f, { fontSize: 11, alignment: 'left' })),
      ],
      margin: [0, 4, 0, 8],
    });

  c.push(saltoDeLinea);

  bloqueNotificacion(`DEUDOR / SOLICITANTE: ${nombreDeudor}`, [
    `C.C. No. ${safe(deudor.cedula)} expedida en ${safe(deudor.ciudadExpedicion)}`,
    `Dirección: ${safe(deudor.direccion)}`,
    `Municipio: ${safe(deudor.ciudad)} – ${safe(deudor.departamento)}`,
    `Correo electrónico: ${safe(deudor.email)}`,
  ]);

  c.push(saltoDeLinea);

  bloqueNotificacion(`LA SUSCRITA: ${nombreApoderado}`, [
    `C.C. No. ${safe(apoderado.cedula)} de ${safe(apoderado.ciudadExpedicion)} – Norte de Santander`,
    `T.P. No. ${safe(apoderado.tp)} del Consejo Superior de la Judicatura`,
    `Dirección: ${safe(apoderado.direccion)}`,
    `Correo electrónico: ${safe(apoderado.email)}`,
    `Teléfono: ${safe(apoderado.telefono)}`,
  ]);

  c.push(saltoDeLinea);

  c.push(parrafo([
    { text: 'ACREEDORES: ', bold: true },
    'Las direcciones físicas, electrónicas y demás datos de contacto conocidos de los acreedores se encuentran individualizados en el Anexo No. 1, denominado "Relación completa y actualizada de acreencias", se manifiesta bajo la gravedad de juramento que las direcciones físicas y electrónicas relacionadas, son las indicadas en cada uno de los certificados de representación legal de las entidades y los cuales, son debidamente anexados.',
  ], { margin: [0, 0, 0, 12] }));

  c.push(saltoDeLinea);

  c.push(parrafo('Del señor Juez,', { margin: [0, 0, 0, 8] }));
  c.push(parrafo('Atentamente,', { margin: [0, 0, 0, 18] }));

  // Firma (si existe)
  if (firma && firma.data) {
    c.push({
      image: firma.data,
      width: 190,
      alignment: 'left',
      margin: [0, 0, 0, 4],
    });
  } else {
    c.push({
      canvas: [{ type: 'line', x1: 0, y1: 8, x2: 217, y2: 8, lineWidth: 0.8, lineColor: 'black' }],
      margin: [0, 8, 0, 12],
    });
  }

  c.push({
    text: [
      { text: `${nombreApoderado}\n`, bold: true },
      `C.C. No. ${safe(apoderado.cedula)} de ${safe(apoderado.ciudadExpedicion)} – Norte de Santander\n`,
      `T.P. No. ${safe(apoderado.tp)} del Consejo Superior de la Judicatura`,
    ],
    fontSize: 11,
    alignment: 'left',
  });
  c.push(parrafo('Apoderado judicial', { alignment: 'left', margin: [0, 2, 0, 0] }));

  return docDefinition;
}

// -------------------- Generador principal --------------------
async function generateLiquidacionPdf(solicitud = {}, baseUrl = '') {
  const data = await loadFirmaImages(solicitud, baseUrl);
  const docDefinition = buildLiquidacionDocDefinition(data);

  return new Promise((resolve, reject) => {
    try {
      const printer = new PdfPrinter(FONTS);
      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      const chunks = [];
      pdfDoc.on('data', (chunk) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', reject);
      pdfDoc.end();
    } catch (error) {
      console.error('Error al generar el PDF de liquidación:', error);
      reject(error);
    }
  });
}

module.exports = {
  generateLiquidacionPdf,
  buildLiquidacionDocDefinition,
  fetchUrlToDataUrl,
  loadFirmaImages,
  safe,
  formatCifra,
  letrasMoneda,
  nombreCompletoDeudor,
  identificacionDeudor,
};