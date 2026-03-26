const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableCell,
  TableRow,
  WidthType,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  VerticalAlign,
  PageBreak,
  ImageRun,
} = require('docx');
const moment = require('moment');
const { Unidades } = require('./numeroALetras');

// --- Helper Functions ---

const formatCurrency = (num) => {
  if (num == null || Number.isNaN(Number(num))) return '$0,00';
  return `$${Number(num).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (d) => {
  if (!d) return 'Se desconoce esta información';
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return 'Fecha inválida';
    return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return String(d);
  }
};

const safe = (v, fallback = 'No reporta') => (v === undefined || v === null || v === '' ? fallback : v);

// --- Styling and Components ---

const FONT_FAMILY = 'Calibri';
const FONT_SIZE = 18; // 9pt
const FONT_SIZE_SMALL = 16; // 8pt
const FONT_SIZE_VERY_SMALL = 14; // 7pt

const createTextRun = (text, options = {}) => new TextRun({ text: String(text), font: FONT_FAMILY, size: options.size || FONT_SIZE, ...options });
const createParagraph = (children, options = {}) => new Paragraph({ children, spacing: { after: 100, line: 276, lineRule: "auto" }, ...options });
const createHeading = (text, bold = true) => createParagraph([createTextRun(text, { bold })], { spacing: { before: 240, after: 120 } });

const createCell = (children, options = {}) => new TableCell({
  children,
  verticalAlign: VerticalAlign.CENTER,
  margins: { top: 20, bottom: 20, left: 40, right: 40 },
  ...options
});

const createHeaderCell = (text, size = FONT_SIZE) => createCell([createParagraph([createTextRun(text, { bold: true, size })], { alignment: AlignmentType.CENTER })]);

const createBorderedTable = (rows, columnWidths) => {
  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: columnWidths.map(w => w * 100), // Simplified percentage based widths
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      insideVertical: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    },
  });
};


// --- Document Builder ---

async function generateSolicitudDocx(solicitud = {}) {
  // ========== DATA PREPARATION ========== 
  const deudor = solicitud.deudor || {};
  const sede = solicitud.sede || {};
  const acreencias = Array.isArray(solicitud.acreencias) ? solicitud.acreencias : [];
  const bienesMuebles = Array.isArray(solicitud.bienesMuebles) ? solicitud.bienesMuebles : [];
  const bienesInmuebles = Array.isArray(solicitud.bienesInmuebles) ? solicitud.bienesInmuebles : [];
  const infoFin = solicitud.informacionFinanciera || {};
  const procesosJudiciales = Array.isArray(infoFin.procesosJudiciales) ? infoFin.procesosJudiciales : [];
  const obligacionesAlimentarias = Array.isArray(infoFin.obligacionesAlimentarias) ? infoFin.obligacionesAlimentarias : [];
  const propuestaPago = solicitud.propuestaPago;
  const nombreCompleto = `${(deudor.primerNombre || '')} ${(deudor.segundoNombre || '')} ${(deudor.primerApellido || '')} ${(deudor.segundoApellido || '')}`.replace(/\s+/g, ' ').trim();
  const totalCapital = acreencias.reduce((s, a) => s + (Number(a.capital) || 0), 0);
  const acreenciasEnMora = acreencias.filter(a => a.creditoEnMora).length;
  const capitalEnMora = acreencias.filter(a => a.creditoEnMora).reduce((s, a) => s + (Number(a.capital) || 0), 0);

  const children = [];

  // ========== ENCABEZADO ========== 
  children.push(createParagraph([createTextRun('Señores')]));
  children.push(createParagraph([createTextRun(safe(sede.entidadPromotora?.toUpperCase()), { bold: true })]));
  children.push(createParagraph([createTextRun(safe(sede.sedeCentro))]));
  children.push(createParagraph([createTextRun(`${safe(sede.ciudad)} - ${safe(sede.departamento)}`)]));
  children.push(createParagraph([createTextRun('')]));

  // ========== REFERENCIA Y DEUDOR ========== 
  children.push(createParagraph([
    createTextRun('REFERENCIA:', { bold: true }),
    createTextRun(' Solicitud de Insolvencia Económica de Persona Natural No Comerciante.'),
  ]));
  children.push(createParagraph([
    createTextRun('DEUDOR(A):', { bold: true }),
    createTextRun(` ${nombreCompleto.toUpperCase()} - C.C. ${safe(deudor.cedula)}`),
  ]));
  children.push(createParagraph([createTextRun('')]));

  // ========== PÁRRAFOS INTRODUCTORIOS ========== 
  children.push(createParagraph([
    createTextRun(nombreCompleto, { bold: true }),
    createTextRun(`, mayor de edad, con domicilio en la ciudad de ${safe(deudor.ciudad)} - ${safe(deudor.departamento)}, identificado(a) con cédula de ciudadanía número ${safe(deudor.cedula)}, expedida en la ciudad de ${safe(deudor.ciudadExpedicion)} - ${safe(deudor.departamentoExpedicion)} actuando en mi propio nombre y en mi condición de `),
    createTextRun('PERSONA NATURAL NO COMERCIANTE', { bold: true }),
    createTextRun(', con fundamento en la Ley 1564 de 2012, modificada en su título IV por la ley 2445 de 2025, especialmente en el Artículo 531 y siguientes y en Decreto Reglamentario 1069 de 2015, mediante el presente escrito solicito que se inicie y tramite el correspondiente proceso de negociación de deudas con los acreedores declarados en la presente solicitud, de quienes se suministrará información completa en el capitulo correspondiente.'),
  ], { alignment: AlignmentType.JUSTIFIED }));

  children.push(createParagraph([
    createTextRun(`En adición a lo antes expuesto, declaro que soy una persona natural no comerciante, identifico y relaciono a ${acreencias.length} (${Unidades(acreencias.length)}) acreencias, de las cuales con ${acreenciasEnMora} (${Unidades(acreenciasEnMora)}) acreencias me encuentro en mora por más de noventa (90) días y el valor porcentual de mis obligaciones incumplidas representan no menos de treinta por ciento (30%) del pasivo total a mi cargo, cumpliendo de esta forma con los supuestos de insolvencia establecidos en el Artículo 538 del Código General del Proceso, modificado por el articulo Noveno (9) de la ley 2445 de 2025, razón por la cual, es procedente este trámite.`),
  ], { alignment: AlignmentType.JUSTIFIED }));

  children.push(createParagraph([
    createTextRun('De manera expresa, declaro en mi calidad de deudor(a), bajo la gravedad del juramento, que toda la información que se suministra y adjunta en esta solicitud es verdadera, no se ha incurrido en omisiones, imprecisiones o errores que impidan conocer mi verdadera situación económica y capacidad de pago.'),
  ], { alignment: AlignmentType.JUSTIFIED }));
  
  children.push(createParagraph([
    createTextRun('De conformidad al Artículo 539 de la Ley 1564 de 2012, la presente solicitud se fundamenta: La solicitud de trámite de negociación de deudas deberá ser presentada directamente por el deudor, quien podrá comparecer al trámite acompañado o representado por apoderado judicial. Será obligatoria su asistencia con o a través de apoderado judicial en los casos en que sea superada la minima cuantía. La solicitud deberá contener:'),
  ], { alignment: AlignmentType.JUSTIFIED }));
  children.push(createParagraph([createTextRun('')]));

  // ========== 1. CAUSAS DE INSOLVENCIA ========== 
  children.push(createHeading('1. LAS SIGUIENTES SON LAS CAUSAS QUE CONLLEVARON A LA SITUACIÓN DE INSOLVENCIA ECONÓMICA:'));
  const causasTexto = solicitud.causasInsolvencia || `TOME LA DECISIÓN DE ADQUIRIR LOS DISTINTOS CRÉDITOS CON EL OBJETIVO DE MEJORAR MI CALIDAD DE VIDA Y LA MI FAMILIA, ADEMÁS DE QUERER GENERAR INGRESOS EXTRAS POR ELLO DECIDÍ INVERTIR EN UNA MONEDA DIGITAL QUE OFRECÍA GRAN RENTABILIDAD DE GANANCIAS, SIN EMBARGO, CON EL TIEMPO DESAFORTUNADAMENTE LA PLATAFORMA DE DICHA MONEDA DESAPARECIÓ SIN GENERAR ALGÚN TIPO DE GANANCIA, POR LO QUE EL DINERO ALLÍ INVERTIDO SE PERDIÓ Y ACTUALMENTE NO CUENTO CON LA CAPACIDAD DE PAGO PARA CUMPLIR EN DEBIDA FORMA CON MIS OBLIGACIONES CREDITICIAS, YA QUE LO DEVENGADO SOLO ES SUFICIENTE PARA MIS GASTOS PERSONALES Y FAMILIARES, POR ELLO, ME ENCUENTRO EN MORA EN LA MAYORÍA DE ELLAS E INICIO EL PRESENTE PROCESO`;
  children.push(createParagraph([createTextRun(causasTexto.toUpperCase())], { alignment: AlignmentType.JUSTIFIED, indentation: { left: 720 } }));
  children.push(createParagraph([createTextRun('')]));

  // ========== 2. RESUMEN DE ACREENCIAS ========== 
  children.push(createParagraph([new PageBreak()]));
  children.push(createHeading('2. RESUMEN DE LAS ACREENCIAS:'));
  const resumenHeader = new TableRow({
    children: [
      createHeaderCell('ACREEDORES'),
      createHeaderCell('CAPITAL'),
      createHeaderCell('QUÓRUM'),
      createHeaderCell('INTERÉS\n CORRIENTE'),
      createHeaderCell('INTERÉS DE\n MORA'),
      createHeaderCell('OTROS\n CONCEPTOS\n CAUSADOS'),
      createHeaderCell('DÍAS EN\n MORA'),
    ],
    tableHeader: true,
  });

  const resumenRows = [resumenHeader];
  
  const getClassFromNaturaleza = (naturaleza) => {
    if (!naturaleza) return 'QUINTA CLASE';
    if (naturaleza.toUpperCase().includes('PRIMERA CLASE')) return 'PRIMERA CLASE';
    if (naturaleza.toUpperCase().includes('SEGUNDA CLASE')) return 'SEGUNDA CLASE';
    if (naturaleza.toUpperCase().includes('TERCERA CLASE')) return 'TERCERA CLASE';
    if (naturaleza.toUpperCase().includes('CUARTA CLASE')) return 'CUARTA CLASE';
    return 'QUINTA CLASE';
  };

  const groupedAcreencias = acreencias.reduce((acc, a) => {
    const aClass = getClassFromNaturaleza(a.naturalezaCredito);
    if (!acc[aClass]) acc[aClass] = [];
    acc[aClass].push(a);
    return acc;
  }, {});

  const classOrder = ['PRIMERA CLASE', 'SEGUNDA CLASE', 'TERCERA CLASE', 'CUARTA CLASE', 'QUINTA CLASE'];
  let grandTotalCapital = 0;
  let grandTotalInteresCorriente = 0;
  let grandTotalInteresMoratorio = 0;

  classOrder.forEach(className => {
    if (groupedAcreencias[className]) {
      resumenRows.push(new TableRow({
        children: [createCell([createParagraph([createTextRun(className, { bold: true })], { alignment: AlignmentType.CENTER })], { columnSpan: 7 })],
      }));

      let classTotalCapital = 0;
      let classTotalInteresCorriente = 0;
      let classTotalInteresMoratorio = 0;

      groupedAcreencias[className].forEach(a => {
        const nombre = (a.acreedor && (typeof a.acreedor === 'object' ? (a.acreedor.nombre || '') : a.acreedor)) || 'No reporta';
        const capital = Number(a.capital) || 0;
        const interesCorriente = Number(a.valorTotalInteresCorriente) || 0;
        const interesMoratorio = Number(a.valorTotalInteresMoratorio) || 0;

        classTotalCapital += capital;
        classTotalInteresCorriente += interesCorriente;
        classTotalInteresMoratorio += interesMoratorio;

        const porcentaje = totalCapital > 0 ? `${(Math.floor((capital / totalCapital) * 10000) / 100).toFixed(2)}%` : '0.00%';
        const diasMora = a.creditoEnMora ? 'Más de 90\ndías.' : '';

        resumenRows.push(new TableRow({
          children: [
            createCell([createParagraph([createTextRun(nombre)])]),
            createCell([createParagraph([createTextRun(formatCurrency(capital))], { alignment: AlignmentType.RIGHT })]),
            createCell([createParagraph([createTextRun(porcentaje)], { alignment: AlignmentType.CENTER })]),
            createCell([createParagraph([createTextRun(formatCurrency(interesCorriente))], { alignment: AlignmentType.RIGHT })]),
            createCell([createParagraph([createTextRun(formatCurrency(interesMoratorio))], { alignment: AlignmentType.RIGHT })]),
            createCell([createParagraph([createTextRun('No Reporta')], { alignment: AlignmentType.CENTER })]),
            createCell([createParagraph([createTextRun(diasMora)], { alignment: AlignmentType.CENTER })]),
          ],
        }));
      });

      grandTotalCapital += classTotalCapital;
      grandTotalInteresCorriente += classTotalInteresCorriente;
      grandTotalInteresMoratorio += classTotalInteresMoratorio;

      const classPorcentaje = totalCapital > 0 ? `${(Math.floor((classTotalCapital / totalCapital) * 10000) / 100).toFixed(2)}%` : '0.00%';
      resumenRows.push(new TableRow({
        children: [
          createCell([createParagraph([createTextRun(`TOTAL ACREENCIAS ${className}`, { bold: true })])]),
          createCell([createParagraph([createTextRun(formatCurrency(classTotalCapital), { bold: true })], { alignment: AlignmentType.RIGHT })]),
          createCell([createParagraph([createTextRun(classPorcentaje, { bold: true })], { alignment: AlignmentType.CENTER })]),
          createCell([createParagraph([createTextRun(formatCurrency(classTotalInteresCorriente), { bold: true })], { alignment: AlignmentType.RIGHT })]),
          createCell([createParagraph([createTextRun(formatCurrency(classTotalInteresMoratorio), { bold: true })], { alignment: AlignmentType.RIGHT })]),
          createCell([createParagraph([createTextRun('$0,00', { bold: true })], { alignment: AlignmentType.CENTER })]),
          createCell([createParagraph([createTextRun('')])]),
        ],
      }));
    }
  });

  resumenRows.push(new TableRow({
    children: [
      createCell([createParagraph([createTextRun('TOTAL ACREENCIAS', { bold: true })])]),
      createCell([createParagraph([createTextRun(formatCurrency(grandTotalCapital), { bold: true })], { alignment: AlignmentType.RIGHT })]),
      createCell([createParagraph([createTextRun('100.00%', { bold: true })], { alignment: AlignmentType.CENTER })]),
      createCell([createParagraph([createTextRun(formatCurrency(grandTotalInteresCorriente), { bold: true })], { alignment: AlignmentType.RIGHT })]),
      createCell([createParagraph([createTextRun(formatCurrency(grandTotalInteresMoratorio), { bold: true })], { alignment: AlignmentType.RIGHT })]),
      createCell([createParagraph([createTextRun('$0,00', { bold: true })], { alignment: AlignmentType.CENTER })]),
      createCell([createParagraph([createTextRun('')])]),
    ],
  }));

  const moraPorcentaje = totalCapital > 0 ? `${(Math.floor((capitalEnMora / totalCapital) * 10000) / 100).toFixed(2)}%` : '0.00%';
  resumenRows.push(new TableRow({
    children: [
      createCell([createParagraph([createTextRun('TOTAL DEL CAPITAL EN MORA POR MÁS DE 90 DÍAS\n(No aplica a créditos cuyo pago se esté realizando mediante libranza o descuento por nómina)', { bold: true })])]),
      createCell([createParagraph([createTextRun(formatCurrency(capitalEnMora), { bold: true })], { alignment: AlignmentType.RIGHT })]),
      createCell([createParagraph([createTextRun(moraPorcentaje, { bold: true })], { alignment: AlignmentType.CENTER })]),
      createCell([createParagraph([])], { columnSpan: 4 }),
    ],
  }));

  children.push(createBorderedTable(resumenRows, [25, 15, 10, 15, 15, 10, 10]));
  children.push(createParagraph([createTextRun('')]));

  // ========== 3. DETALLE DE ACREENCIAS ========== 
  children.push(createHeading('3. DETALLE DE LAS ACREENCIAS:'));
  children.push(createParagraph([createTextRun('Se presenta una relación completa y actualizada de todos los acreedores, en el orden de prelación de créditos que señalan los Artículos 2488 y siguientes del Código Civil y con corte al último día calendario del mes inmediatamente anterior a aquel en que se presenta la solicitud:')], { alignment: AlignmentType.JUSTIFIED }));
  
  children.push(createParagraph([new PageBreak()]));

  acreencias.forEach((a, idx) => {
    const nombreAcreedor = (a.acreedor && (typeof a.acreedor === 'object' ? (a.acreedor.nombre || '') : a.acreedor)) || 'No reporta';
    const detalleData = [
        ['Nombre', nombreAcreedor],
        ['Tipo de Documento', a.acreedor.tipoDoc],
        ['No. de Documento', safe((a.acreedor && (a.acreedor.nit || a.acreedor.nitCc || a.acreedor.documento)) || a.documento || '')],
        ['Dirección de notificación judicial', (a.acreedor && a.acreedor.direccion) || safe(a.direccion)],
        ['País', 'Colombia'],
        ['Departamento', (a.acreedor && a.acreedor.departamento) || safe(a.departamento,)],
        ['Ciudad', (a.acreedor && a.acreedor.ciudad) || safe(a.ciudad,)],
        ['Dirección de notificación electrónica', (a.acreedor && a.acreedor.email) || safe(a.email)],
        ['Teléfono', (a.acreedor && a.acreedor.telefono) || safe(a.telefono)],
        ['Tipo de Acreencia', safe(a.tipoAcreencia)],
        ['Naturaleza del crédito', safe(a.naturalezaCredito)],
        ['Crédito en condición de legalmente postergado (Artículo 572A,\nCausal 1)', a.creditoPostergado ? 'SI' : 'NO'],
        ['Descripción del crédito', safe(a.descripcionCredito)],
        ['Valor en capital', formatCurrency(a.capital)],
        ['Valor en interés corriente', a.valorTotalInteresCorriente > 0 ? formatCurrency(a.valorTotalInteresCorriente) : 'Se desconoce esta información'],
        ['Tasa de interés corriente', safe(a.tasaInteresCorriente)],
        ['Tipo de interés corriente', safe(a.tipoInteresCorriente)],
        ['Cuantía total de la obligación', formatCurrency((Number(a.capital||0) + Number(a.valorTotalInteresCorriente||0) + Number(a.valorTotalInteresMoratorio||0)))],
        ['¿El pago del crédito se está realizando mediante libranza o\ncualquier otro tipo de descuento por nómina?', a.pagoPorLibranza ? 'SI' : 'NO'],
        ['Número de días en mora', a.creditoEnMora ? 'Más de 90 días' : ''],
        ['Más de 90 días en mora', a.creditoEnMora ? 'SI' : 'No'],
        ['Valor en interes moratorio', a.valorTotalInteresMoratorio > 0 ? formatCurrency(a.valorTotalInteresMoratorio) : 'Se desconoce esta información'],
        ['Tasa de interés moratorio', safe(a.tasaInteresMoratorio)],
        ['Tipo de interés moratorio', safe(a.tipoInteresMoratorio)],
        ['Fecha de otorgamiento', formatDate(a.fechaOtorgamiento) + '.'],
        ['Fecha de vencimiento', formatDate(a.fechaVencimiento) + '.']
    ];
const tableRows = detalleData.map(
  ([label, value]) =>
    new TableRow({
      cantSplit: true,
      children: [
        createCell([
          createParagraph([createTextRun(label)], {
            keepLines: true,
            keepNext: true,
          }),
        ]),
        createCell([
          createParagraph([createTextRun(value)], {
            keepLines: true,
            keepNext: true,
          }),
        ]),
      ],
    })
);    tableRows.unshift(new TableRow({ cantSplit: true, children: [createCell([createParagraph([createTextRun(`Acreencia No. ${idx + 1}`, { bold: true })], { alignment: AlignmentType.CENTER })], { columnSpan: 2 })] }));
    children.push(createBorderedTable(tableRows, [50, 50]));
    children.push(createParagraph([createTextRun('')]));
  });

  // ========== 4. BIENES ========== 
  children.push(createParagraph([new PageBreak()]));
  children.push(createHeading('4. RELACIÓN E INVENTARIO DE LOS BIENES MUEBLES E INMUEBLES:'));
  children.push(createParagraph([createTextRun('Se presenta una relación completa y detallada de los bienes muebles e inmuebles:')], { alignment: AlignmentType.JUSTIFIED, indentation: { left: 720 } }));
  children.push(createHeading('4.1 Bienes Muebles', true));
  if (!bienesMuebles.length) {
    children.push(createParagraph([createTextRun('Se manifiesta bajo la gravedad de juramento que no se poseen Bienes Muebles.')], { indentation: { left: 720 } }));
  } else {
    bienesMuebles.forEach((b, i) => {
        const bienData = [
            ['Descripción', safe(b.descripcion)],
            ['Clasificación', safe(b.clasificacion)],
            ['Marca', safe(b.marca)],
        ];

        if (b.clasificacion === 'Vehiculo') {
            bienData.push(['Modelo', safe(b.modelo)]);
            bienData.push(['Placa', safe(b.placa)]);
            bienData.push(['Tarjeta de Propiedad', safe(b.tarjetaPropiedad)]);
            bienData.push(['Oficina de Tránsito', safe(b.oficinaTransito)]);
        }

        bienData.push(['Avalúo Comercial Estimado', formatCurrency(b.avaluoComercial)]);
        const tableRows = bienData.map(([label, value]) => new TableRow({ children: [createCell([createParagraph([createTextRun(label)])]), createCell([createParagraph([createTextRun(value)])])] }));
        tableRows.unshift(new TableRow({ children: [createCell([createParagraph([createTextRun(`Bien Mueble No. ${i + 1}`, { bold: true })], { alignment: AlignmentType.CENTER })], { columnSpan: 2 })] }));
        children.push(createBorderedTable(tableRows, [50, 50]));
        children.push(createParagraph([createTextRun('')]));
    });
  }
  
  children.push(createHeading('4.2 Bienes Inmuebles', true));
  if (!bienesInmuebles.length) {
    children.push(createParagraph([createTextRun('Se manifiesta bajo la gravedad de juramento que no se poseen Bienes Inmuebles.')], { indentation: { left: 720 } }));
  } else {
     bienesInmuebles.forEach((b, i) => {
        const bienData = [
            ['Descripción', safe(b.descripcion)],
            ['Matrícula Inmobiliaria', safe(b.matricula)],
            ['Dirección', safe(b.direccion)],
            ['Ciudad', safe(b.ciudad)],
            ['Avalúo Comercial', formatCurrency(b.avaluoComercial)],
            ['Afectado a Vivienda Familiar', b.afectadoVivienda ? 'SI' : 'NO']
        ];
        const tableRows = bienData.map(([label, value]) => new TableRow({ children: [createCell([createParagraph([createTextRun(label)])]), createCell([createParagraph([createTextRun(value)])])] }));
        tableRows.unshift(new TableRow({ children: [createCell([createParagraph([createTextRun(`Bien Inmueble No. ${i + 1}`, { bold: true })], { alignment: AlignmentType.CENTER })], { columnSpan: 2 })] }));
        children.push(createBorderedTable(tableRows, [50, 50]));
        children.push(createParagraph([createTextRun('')]));
    });
  }

  // ========== 5. PROCESOS JUDICIALES ========== 
  children.push(createHeading('5. PROCESOS JUDICIALES, ADMINISTRATIVOS O PRIVADOS'));
  if (!procesosJudiciales.length) {
      children.push(createParagraph([createTextRun('Se manifiesta bajo la gravedad de juramento que no se tienen procesos en contra.')], { indentation: { left: 720 } }));
  } else {
      procesosJudiciales.forEach((p, idx) => {
          const procesoData = [
              ['Proceso Judicial', safe(p.tipoProceso), 'En Contra'],
              ['Tipo de Proceso', safe(p.tipoProceso)],
              ['Tipo Juzgado', safe(p.juzgado)],
              ['Número de Radicación', safe(p.radicado)],
              ['Estado del Proceso', safe(p.estadoProceso)],
              ['Demandante', safe(p.demandante)],
              ['Demandado', safe(p.demandado)],
              ['Valor', formatCurrency(p.valor)],
              ['Departamento', safe(p.departamento)],
              ['Ciudad', safe(p.ciudad)],
              ['Dirección Juzgado', safe(p.direccionJuzgado)]
          ];
          const tableRows = procesoData.map(([label, value]) => new TableRow({ children: [createCell([createParagraph([createTextRun(label, {size: FONT_SIZE_SMALL})])]), createCell([createParagraph([createTextRun(value, {size: FONT_SIZE_SMALL})])])] }));
          tableRows.unshift(new TableRow({ children: [createCell([createParagraph([createTextRun(`Proceso Judicial No. ${safe(p.radicado)}`, { bold: true })], { alignment: AlignmentType.CENTER })], { columnSpan: 2 })] }));
          children.push(createBorderedTable(tableRows, [50, 50]));
          children.push(createParagraph([createTextRun('')]));
      });
  }

  // ========== 6. OBLIGACIONES ALIMENTARIAS ========== 
  children.push(createHeading('6. OBLIGACIONES ALIMENTARIAS'));
  if (!obligacionesAlimentarias.length) {
      children.push(createParagraph([createTextRun('No se reportan obligaciones alimentarias.')], { indentation: { left: 720 } }));
  } else {
      obligacionesAlimentarias.forEach((o, idx) => {
          const obligacionData = [
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
          const tableRows = obligacionData.map(([label, value]) => new TableRow({ children: [createCell([createParagraph([createTextRun(label, {size: FONT_SIZE_SMALL})])]), createCell([createParagraph([createTextRun(value, {size: FONT_SIZE_SMALL})])])] }));
          tableRows.unshift(new TableRow({ children: [createCell([createParagraph([createTextRun(`Obligación Alimentaria No. ${idx + 1}`, { bold: true })], { alignment: AlignmentType.CENTER })], { columnSpan: 2 })] }));
          children.push(createBorderedTable(tableRows, [50, 50]));
          children.push(createParagraph([createTextRun('')]));
      });
  }

  // ========== 7. RELACIÓN DE GASTOS ========== 
  children.push(createHeading('7. RELACIÓN DE GASTOS DE SUBSISTENCIA DEL DEUDOR Y DE PERSONAS A SU CARGO:'));
  const gastosLabels = { alimentacion: 'Alimentación', salud: 'Salud', arriendo: 'Arriendo o Cuota Vivienda', serviciosPublicos: 'Servicios Públicos', educacion: 'Educación', transporte: 'Transporte', conservacionBienes: 'Conservación de Bienes', cuotaLeasingHabitacional: 'Cuota De Leasing Habitacional', arriendoOficina: 'Arriendo Oficina/Consultorio', cuotaSeguridadSocial: 'Cuota De Seguridad Social', cuotaAdminPropiedadHorizontal: 'Cuota De Administración Propiedad Horizontal', cuotaLeasingVehiculo: 'Cuota De Leasing Vehículo', cuotaLeasingOficina: 'Cuota De Leasing Oficina/Consultorio', seguros: 'Seguros', vestuario: 'Vestuario', recreacion: 'Recreación', gastosPersonasCargo: 'Gastos Personas a Cargo', otros: 'Otros Gastos' };
  const gastosPersonales = infoFin.gastosPersonales || {};
  let totalGastos = 0;
  const gastosRows = [];
  for (const key in gastosPersonales) {
      const value = parseFloat(gastosPersonales[key]);
      if (value > 0 && gastosLabels[key]) {
          gastosRows.push(new TableRow({ children: [createCell([createParagraph([createTextRun(gastosLabels[key], {size: FONT_SIZE_SMALL})])]), createCell([createParagraph([createTextRun(formatCurrency(value), {size: FONT_SIZE_SMALL})])])] }));
          totalGastos += value;
      }
  }
  if (gastosRows.length === 0) {
      gastosRows.push(new TableRow({ children: [createCell([createParagraph([createTextRun('No se reportan gastos.', {size: FONT_SIZE_SMALL})], { alignment: AlignmentType.CENTER })], { columnSpan: 2 })] }));
  } else {
      gastosRows.push(new TableRow({ children: [createCell([createParagraph([createTextRun('TOTAL GASTOS', { bold: true, size: FONT_SIZE_SMALL })])]), createCell([createParagraph([createTextRun(formatCurrency(totalGastos), { bold: true, size: FONT_SIZE_SMALL })])])] }));
  }
  gastosRows.unshift(new TableRow({ children: [createCell([createParagraph([createTextRun('Gastos de Subsistencia', { bold: true })])]), createCell([createParagraph([createTextRun('')])])] }));
  children.push(createBorderedTable(gastosRows, [50, 50]));
  children.push(createParagraph([createTextRun('')]));

  // ========== 8. RELACIÓN DE INGRESOS ========== 
  children.push(createHeading('8. RELACIÓN DE INGRESOS:'));
  const actPrincipal = Number(infoFin.ingresosActividadPrincipal);
  const otrasActividades = isNaN(Number(infoFin.ingresosOtrasActividades)) ? infoFin.ingresosOtrasActividades : Number(infoFin.ingresosOtrasActividades);
  const ingresosMensuales = typeof otrasActividades === 'number' ? actPrincipal + otrasActividades : actPrincipal;
  const ingresosData = [
      ['Ingresos mensuales por actividad económica', formatCurrency(actPrincipal)],
      ['Empleo', infoFin.tieneEmpleo ? 'SI' : 'NO'],
      ['Tipo de empleo', safe(infoFin.tipoEmpleo)],
      ['Descripción de la actividad económica', safe(infoFin.descripcionActividadEconomica)],
      ['Ingresos mensuales por otras actividades', safe(infoFin.ingresosOtrasActividades)]
  ];
  const ingresosRowsTable = ingresosData.map(([label, value]) => new TableRow({ children: [createCell([createParagraph([createTextRun(label, {size: FONT_SIZE_SMALL})])]), createCell([createParagraph([createTextRun(value, {size: FONT_SIZE_SMALL})])])] }));
  ingresosRowsTable.push(new TableRow({ children: [createCell([createParagraph([createTextRun('TOTAL DE INGRESOS MENSUALES', { bold: true, size: FONT_SIZE_SMALL })])]), createCell([createParagraph([createTextRun(typeof otrasActividades === 'number' ? formatCurrency(ingresosMensuales) : formatCurrency(actPrincipal), { bold: true, size: FONT_SIZE_SMALL })])])] }));
  ingresosRowsTable.unshift(new TableRow({ children: [createCell([createParagraph([createTextRun('Ingresos', { bold: true })], { alignment: AlignmentType.CENTER })], { columnSpan: 2 })] }));
  children.push(createBorderedTable(ingresosRowsTable, [50, 50]));
  children.push(createParagraph([createTextRun('')]));

  // ========== 9. SOCIEDAD CONYUGAL ========== 
  children.push(createHeading('9. INFORMACIÓN SOBRE SOCIEDAD CONYUGAL O PATRIMONIAL:'));
  const sociedadConyugal = solicitud.sociedadConyugal || {};
  const conyugalData = [];
  if (sociedadConyugal.activa) {
      conyugalData.push(['Tengo o he tenido sociedad conyugal o patrimonial vigente', 'Sí']);
      conyugalData.push(['La sociedad conyugal o patrimonial está disuelta pero no liquidada', sociedadConyugal.disuelta ? 'Sí' : 'No']);
      conyugalData.push(['Nombres y Apellidos del Cónyuge', safe(sociedadConyugal.nombreConyuge)]);
      conyugalData.push(['Tipo de Documento', safe(sociedadConyugal.tipoDocConyuge)]);
      conyugalData.push(['Número de Documento', safe(sociedadConyugal.numDocConyuge)]);
  } else {
      conyugalData.push(['Tengo o he tenido sociedad conyugal o patrimonial vigente', 'No']);
  }
  const conyugalRowsTable = conyugalData.map(([label, value]) => new TableRow({ children: [createCell([createParagraph([createTextRun(label)])]), createCell([createParagraph([createTextRun(value)])])] }));
  conyugalRowsTable.unshift(new TableRow({ children: [createCell([createParagraph([createTextRun('Sociedad Conyugal o Patrimonial', { bold: true })], { alignment: AlignmentType.CENTER })], { columnSpan: 2 })] }));
  children.push(createBorderedTable(conyugalRowsTable, [50, 50]));
  children.push(createParagraph([createTextRun('')]));

  // ========== 10. PROPUESTA DE PAGO ========== 
  children.push(createParagraph([new PageBreak()]));
  children.push(createHeading('10. PROPUESTA DE PAGO:'));
  if (!propuestaPago || propuestaPago.tipoNegociacion !== 'proyeccion') {
      children.push(createParagraph([createTextRun('No se presenta una propuesta de pago proyectada.')], { indentation: { left: 720 } }));
  } else {
      classOrder.forEach(className => {
          if (groupedAcreencias[className]) {
              const classAcreencias = groupedAcreencias[className];
              const classTotalCapital = classAcreencias.reduce((s, a) => s + (Number(a.capital) || 0), 0);

              children.push(createParagraph([createTextRun('CRÉDITOS PRINCIPALES', { bold: true, size: 20 })], { alignment: AlignmentType.CENTER }));
              children.push(createParagraph([createTextRun(className, { bold: true })], { alignment: AlignmentType.CENTER }));

              const capital = classTotalCapital;
              const plazo = parseInt(propuestaPago.plazo, 10);
              const interesEA = parseFloat(propuestaPago.interesEA);
              const interesMensual = (Math.pow(1 + interesEA / 100, 1 / 12) - 1) * 100;
              const monthlyRate = interesMensual / 100;
              const startDate = new Date(propuestaPago.fechaInicioPago.$date || propuestaPago.fechaInicioPago);
              const diaPago = parseInt(propuestaPago.diaPago, 10) || 1;
              const formaPago = propuestaPago.formaPago;

              const detalleBody = [
                  new TableRow({ children: [createCell([createParagraph([createTextRun(`Tabla de Detalle de Proyección - ${className}`, { bold: true })], { alignment: AlignmentType.CENTER })], { columnSpan: 2 })] }),
                  new TableRow({ children: [createCell([createParagraph([createTextRun('Capital Adeudado', { bold: true })])]), createCell([createParagraph([createTextRun(formatCurrency(capital))], { alignment: AlignmentType.RIGHT })])] }),
                  new TableRow({ children: [createCell([createParagraph([createTextRun('Fecha de Inicio', { bold: true })])]), createCell([createParagraph([createTextRun(formatDate(startDate))], { alignment: AlignmentType.RIGHT })])] }),
                  new TableRow({ children: [createCell([createParagraph([createTextRun('Forma de Pago', { bold: true })])]), createCell([createParagraph([createTextRun(formaPago || 'Cuota Fija')], { alignment: AlignmentType.RIGHT })])] }),
                  new TableRow({ children: [createCell([createParagraph([createTextRun('Plazo de Pago (Meses)', { bold: true })])]), createCell([createParagraph([createTextRun(`${plazo}`)], { alignment: AlignmentType.RIGHT })])] }),
                  new TableRow({ children: [createCell([createParagraph([createTextRun('Interés Efectivo Anual (EA)', { bold: true })])]), createCell([createParagraph([createTextRun(`${interesEA.toFixed(2)} %`)], { alignment: AlignmentType.RIGHT })])] }),
                  new TableRow({ children: [createCell([createParagraph([createTextRun('Interés Nominal Mensual', { bold: true })])]), createCell([createParagraph([createTextRun(`${interesMensual.toFixed(4)} %`)], { alignment: AlignmentType.RIGHT })])] }),
              ];
              children.push(createBorderedTable(detalleBody, [50, 50]));
              children.push(createParagraph([createTextRun('')]));

              let cuotaFija = 0;
              if (monthlyRate > 0) {
                  cuotaFija = capital * (monthlyRate * Math.pow(1 + monthlyRate, plazo)) / (Math.pow(1 + monthlyRate, plazo) - 1);
              } else {
                  cuotaFija = capital / plazo;
              }

              const distribBody = [
                  new TableRow({ children: [createCell([createParagraph([createTextRun(`Distribución de la cuota fija - ${className}`, { bold: true })], { alignment: AlignmentType.CENTER })], { columnSpan: 5 })] }),
                  new TableRow({ children: [createCell([createParagraph([createTextRun('Cuota fija de pago:', { bold: true })])]), createCell([createParagraph([createTextRun(formatCurrency(cuotaFija), { bold: true })])], { columnSpan: 4 })] }),
                  new TableRow({ children: [createHeaderCell('Acreedor', FONT_SIZE_SMALL), createHeaderCell('Descripción', FONT_SIZE_SMALL), createHeaderCell('Capital Actualizado', FONT_SIZE_SMALL), createHeaderCell('Porcentaje', FONT_SIZE_SMALL), createHeaderCell('Distribución', FONT_SIZE_SMALL)] }),
              ];
              classAcreencias.forEach(a => {
                  const cap = Number(a.capital);
                  const porcentaje = capital > 0 ? (cap / capital) * 100 : 0;
                  const distrib = cuotaFija * (porcentaje / 100);
                  const nombreAcreedor = (a.acreedor && (typeof a.acreedor === 'object' ? a.acreedor.nombre : a.acreedor)) || 'No reporta';
                  const descripcion = safe(a.descripcionCredito, 'No reporta');
                  distribBody.push(new TableRow({ children: [
                      createCell([createParagraph([createTextRun(nombreAcreedor, {size: FONT_SIZE_SMALL})])]),
                      createCell([createParagraph([createTextRun(descripcion, {size: FONT_SIZE_SMALL})])]),
                      createCell([createParagraph([createTextRun(formatCurrency(cap), {size: FONT_SIZE_SMALL})], { alignment: AlignmentType.RIGHT })]),
                      createCell([createParagraph([createTextRun(`${porcentaje.toFixed(2)}%`, {size: FONT_SIZE_SMALL})], { alignment: AlignmentType.CENTER })]),
                      createCell([createParagraph([createTextRun(formatCurrency(distrib), {size: FONT_SIZE_SMALL})], { alignment: AlignmentType.RIGHT })]),
                  ]}));
              });
              children.push(createBorderedTable(distribBody, [20, 25, 20, 15, 20]));
              children.push(createParagraph([createTextRun('')]));

              const proyeccionBody = [
                  new TableRow({ children: [createCell([createParagraph([createTextRun(`Tabla de Proyección de Pagos - ${className}`, { bold: true })], { alignment: AlignmentType.CENTER })], { columnSpan: 8 })] }),
                  new TableRow({ children: [createHeaderCell('Pago No.', FONT_SIZE_VERY_SMALL), createHeaderCell('Saldo Capital', FONT_SIZE_VERY_SMALL), createHeaderCell('Pago Capital', FONT_SIZE_VERY_SMALL), createHeaderCell('Pago Interés', FONT_SIZE_VERY_SMALL), createHeaderCell('Monto de Pago', FONT_SIZE_VERY_SMALL), createHeaderCell('Saldo Final Capital', FONT_SIZE_VERY_SMALL), createHeaderCell('Plazo en días', FONT_SIZE_VERY_SMALL), createHeaderCell('Fecha', FONT_SIZE_VERY_SMALL)] }),
              ];
              let saldo = capital;
              for (let i = 1; i <= plazo; i++) {
                  const pagoInteres = saldo * monthlyRate;
                  const pagoCapital = cuotaFija - pagoInteres;
                  const saldoFinal = saldo - pagoCapital;
                  const fechaPago = new Date(startDate);
                  fechaPago.setMonth(startDate.getMonth() + i - 1);
                  fechaPago.setDate(diaPago);
                  proyeccionBody.push(new TableRow({ children: [
                      createCell([createParagraph([createTextRun(i.toString(), {size: FONT_SIZE_VERY_SMALL})], { alignment: AlignmentType.CENTER })]),
                      createCell([createParagraph([createTextRun(formatCurrency(saldo), {size: FONT_SIZE_VERY_SMALL})], { alignment: AlignmentType.RIGHT })]),
                      createCell([createParagraph([createTextRun(formatCurrency(pagoCapital), {size: FONT_SIZE_VERY_SMALL})], { alignment: AlignmentType.RIGHT })]),
                      createCell([createParagraph([createTextRun(formatCurrency(pagoInteres), {size: FONT_SIZE_VERY_SMALL})], { alignment: AlignmentType.RIGHT })]),
                      createCell([createParagraph([createTextRun(formatCurrency(cuotaFija), {size: FONT_SIZE_VERY_SMALL})], { alignment: AlignmentType.RIGHT })]),
                      createCell([createParagraph([createTextRun(formatCurrency(Math.max(saldoFinal, 0)), {size: FONT_SIZE_VERY_SMALL})], { alignment: AlignmentType.RIGHT })]),
                      createCell([createParagraph([createTextRun('30', {size: FONT_SIZE_VERY_SMALL})], { alignment: AlignmentType.CENTER })]),
                      createCell([createParagraph([createTextRun(fechaPago.toLocaleDateString('es-CO'), {size: FONT_SIZE_VERY_SMALL})], { alignment: AlignmentType.CENTER })]),
                  ]}));
                  saldo = saldoFinal;
              }
              children.push(createBorderedTable(proyeccionBody, [5, 15, 15, 15, 15, 15, 10, 10]));
              children.push(createParagraph([createTextRun('')]));
          }
      });
  }

  // ========== 11. SOLICITUD SOBRE LA TARIFA ========== 
  children.push(createParagraph([new PageBreak()]));
  children.push(createHeading('11. SOLICITUD SOBRE LA TARIFA:'));
  children.push(createParagraph([createTextRun('Atendiendo las tarifas contenidas en el Decreto 2677 de 2012, por las condiciones de insolvencia económica en que me encuentro, con el debido respeto y con fundamento en el Articulo 536 de la Ley 1564 de 2012, le solicito fijar una tarifa que me permita tener acceso a este procedimiento de insolvencia económica de la persona natural no comerciante')], { alignment: AlignmentType.JUSTIFIED, indentation: { left: 720 } }));

  // ========== 12. FUNDAMENTOS DE DERECHO ========== 
  children.push(createHeading('12. FUNDAMENTOS DE DERECHO:'));
  children.push(createParagraph([createTextRun('La presente solicitud de Insolvencia Económica de la Persona Natural No Comerciante se encuentra fundamentada conforme al Titulo IV de la Ley 1564 de 2012, Decreto Reglamentario 1069 de 2015 y demás disposiciones complementarias y conducentes.')], { alignment: AlignmentType.JUSTIFIED, indentation: { left: 720 } }));

  // ========== 13. ANEXOS ========== 
  children.push(createHeading('13. ANEXOS:'));
  children.push(createParagraph([createTextRun('Para efectos del cumplimiento de los requisitos exigidos, se anexan los siguientes documentos:')], { indentation: { left: 720 } }));
  children.push(createParagraph([createTextRun('13.1 Otros anexos')], { indentation: { left: 720 } }));
  const anexos = solicitud.anexos || [];
  anexos.forEach(anexo => {
      children.push(createParagraph([createTextRun(`     • ${anexo.filename}`)], { indentation: { left: 1080 } }));
  });

  // ========== 14. NOTIFICACIONES ========== 
  children.push(createHeading('14. NOTIFICACIONES'));
  children.push(createParagraph([createTextRun('Deudor', { bold: true })], { indentation: { left: 720 } }));
  children.push(createParagraph([createTextRun(nombreCompleto)], { indentation: { left: 720 } }));
  children.push(createParagraph([createTextRun(`País: Colombia`)], { indentation: { left: 720 } }));
  children.push(createParagraph([createTextRun(`Departamento: ${safe(deudor.departamento)}`)], { indentation: { left: 720 } }));
  children.push(createParagraph([createTextRun(`Ciudad: ${safe(deudor.ciudad)}`)], { indentation: { left: 720 } }));
  children.push(createParagraph([createTextRun(`Dirección: ${safe(deudor.domicilio)}`)], { indentation: { left: 720 } }));
  children.push(createParagraph([createTextRun(`Teléfono / Celular: ${safe(deudor.telefono)}`)], { indentation: { left: 720 } }));
  children.push(createParagraph([createTextRun(`Correo electrónico: ${safe(deudor.email)}`)], { indentation: { left: 720 } }));
  children.push(createParagraph([createTextRun('Acreedores: Mis acreedores recibirán las notificaciones según las indicaciones que he suministrado para cada uno.')], { indentation: { left: 720 } }));

  // ========== FIRMA ========== 
  children.push(createParagraph([createTextRun('')], { spacing: { before: 480 } }));
  children.push(createParagraph([createTextRun('Atentamente,')]));
  children.push(createParagraph([createTextRun('')], { spacing: { before: 960 } }));
  children.push(createParagraph([createTextRun(nombreCompleto, { bold: true })], { alignment: AlignmentType.CENTER }));
  children.push(createParagraph([createTextRun(safe(deudor.email))], { alignment: AlignmentType.CENTER }));
  children.push(createParagraph([createTextRun(`Fecha: ${new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'numeric', year: 'numeric' })} - ${new Date().toLocaleTimeString('es-CO')}`)], { alignment: AlignmentType.CENTER }));
  children.push(createParagraph([createTextRun('C.C. ' + safe(deudor.cedula))], { alignment: AlignmentType.CENTER }));
  children.push(createParagraph([createTextRun('Deudor(a)')], { alignment: AlignmentType.CENTER }));

  const docInstance = new Document({
    creator: 'SystemLex',
    title: `Solicitud de Insolvencia - ${nombreCompleto}`,
    styles: {
      paragraph: {
        run: { font: FONT_FAMILY, size: FONT_SIZE },
      },
    },
    sections: [{
      properties: {
        pageSize: {
          width: 12240,
          height: 20160,
        },
        page: {
          margin: {
            top: 1900, 
            right: 800,
            bottom: 3000,
            left: 800,
          },
        },
      },
      children,
    }],
  });

  const buffer = await Packer.toBuffer(docInstance);
  return buffer;
}

const generateConciliacionDocx = async (solicitud = {}) => {
  const {
    infoGeneral = {},
    convocantes = [],
    convocados = [],
    hechos = [],
    pretensiones = [],
    firma = {},
    sede = {},
    anexos
  } = solicitud;

  const FONT_SIZE_12PT = 24;

  const createConciliacionTextRun = (text, options = {}) => new TextRun({
    text: String(text),
    font: FONT_FAMILY,
    size: FONT_SIZE_12PT,
    ...options
  });

  const createConciliacionParagraph = (children, options = {}) => new Paragraph({
    children,
    spacing: { after: 100, line: 300, lineRule: "auto" }, // 1.25 line height for 12pt font
    ...options
  });

  const children = [];

  // --- ENCABEZADO ---
  children.push(createConciliacionParagraph([createConciliacionTextRun('Señores')]));
  children.push(createConciliacionParagraph([createConciliacionTextRun(safe(sede.entidadPromotora).toUpperCase(), { bold: true })]));
  children.push(createConciliacionParagraph([createConciliacionTextRun(`${safe(sede.sedeCentro).toUpperCase()} - ${safe(sede.ciudad).toUpperCase()}`)]));
  children.push(createConciliacionParagraph([createConciliacionTextRun('')]));

  // --- REFERENCIA ---
  children.push(createConciliacionParagraph([
    createConciliacionTextRun('REF. ', { bold: true }),
    createConciliacionTextRun('SOLICITUD CONCILIACIÓN EXTRAJUDICIAL EN DERECHO ', { bold: true }),
  ]));
  children.push(createConciliacionParagraph([createConciliacionTextRun('')]));

  // --- IDENTIFICACIÓN ---
  const convocante = convocantes[0] || {};
  const nombreConvocante = convocante.tipoInvolucrado === 'Persona Jurídica'
    ? safe(convocante.razonSocial)
    : `${safe(convocante.primerNombre)} ${safe(convocante.segundoNombre)} ${safe(convocante.primerApellido)} ${safe(convocante.segundoApellido)}`.trim().toUpperCase();
  const idConvocante = `${safe(convocante.tipoIdentificacion)} No. ${safe(convocante.numeroIdentificacion)} de ${safe(convocante.ciudadExpedicion)}`;

  const convocado = convocados[0] || {};
  const nombreConvocado = convocado.tipoInvolucrado === 'Persona Jurídica'
    ? safe(convocado.razonSocial)
    : `${safe(convocado.primerNombre)} ${safe(convocado.segundoNombre)} ${safe(convocado.primerApellido)} ${safe(convocado.segundoApellido)}`.trim().toUpperCase();
  const idConvocado = `${safe(convocado.tipoIdentificacion)} No. ${safe(convocado.numeroIdentificacion)} de ${safe(convocado.ciudadExpedicion)}`;

  children.push(createConciliacionParagraph([
    createConciliacionTextRun(nombreConvocante, { bold: true }),
    createConciliacionTextRun(`, identificado(a) con ${idConvocante}; mayor de edad y domiciliado en la ciudad de ${safe(convocante.ciudad)}, solicitamos respetuosamente a usted se sirva de celebrar `),
    createConciliacionTextRun('AUDIENCIA DE CONCILIACIÓN EXTRAJUDICIAL EN DERECHO – ', { bold: true }),
    createConciliacionTextRun(safe(infoGeneral.tema).toUpperCase(), { bold: true }),
    createConciliacionTextRun(' - ', { bold: true }),
    createConciliacionTextRun('en contra de '),
    createConciliacionTextRun(nombreConvocado, { bold: true }),
    createConciliacionTextRun(` identificado(a) con ${idConvocado}; de acuerdo con lo siguiente:`)
  ], { alignment: AlignmentType.JUSTIFIED }));
  children.push(createConciliacionParagraph([createConciliacionTextRun('')]));

  // --- HECHOS ---
  children.push(createConciliacionParagraph([createConciliacionTextRun('HECHOS', { bold: true })], { alignment: AlignmentType.CENTER, spacing: { before: 300, after: 100 } }));

  hechos.forEach((h, idx) => {
    const numero = ['PRIMERO', 'SEGUNDO', 'TERCERO', 'CUARTO', 'QUINTO'][idx] || `${idx + 1}`;
    const descripcion = (h.descripcion || '').replace(/<[^>]+>/g, '');
    children.push(createConciliacionParagraph([
      createConciliacionTextRun(`${numero} – `, { bold: true }),
      createConciliacionTextRun(descripcion)
    ], { alignment: AlignmentType.JUSTIFIED, spacing: { before: 100, after: 100 } }));
  });
  children.push(createConciliacionParagraph([createConciliacionTextRun('')]));

  // --- PETICIONES ---
  children.push(createConciliacionParagraph([createConciliacionTextRun('PETICIONES', { bold: true })], { alignment: AlignmentType.CENTER, spacing: { before: 400, after: 100 } }));

  pretensiones.forEach((p, idx) => {
    const numero = ['PRIMERA', 'SEGUNDA', 'TERCERA', 'CUARTA'][idx] || `${idx + 1}`;
    const descripcion = (p.descripcion || '').replace(/<[^>]+>/g, '');
    children.push(createConciliacionParagraph([
      createConciliacionTextRun(`${numero}: `, { bold: true }),
      createConciliacionTextRun(descripcion)
    ], { alignment: AlignmentType.JUSTIFIED, spacing: { before: 100, after: 100 } }));
  });
  children.push(createConciliacionParagraph([createConciliacionTextRun('')]));

  // --- FUNDAMENTOS DE DERECHO ---
  children.push(createConciliacionParagraph([createConciliacionTextRun('FUNDAMENTOS DE DERECHO', { bold: true })], { alignment: AlignmentType.CENTER, spacing: { before: 400, after: 100 } }));
  children.push(createConciliacionParagraph([
    createConciliacionTextRun('El artículo 44 de la Constitución Política de Colombia; Títulos XII y XXI del Código Civil; Ley 27 de 1977; Ley 1098 del 2006; artículo 133 a 159 del decreto 2737 de 1989; Ley 75 del 1968; artículo 390 y siguientes del Código General del Proceso y demás normas concordantes.')
  ], { alignment: AlignmentType.JUSTIFIED }));
  children.push(createConciliacionParagraph([createConciliacionTextRun('')]));

  // --- ANEXOS ---
  children.push(createConciliacionParagraph([createConciliacionTextRun('ANEXOS', { bold: true })], { alignment: AlignmentType.CENTER, spacing: { before: 400, after: 100 } }));
  children.push(createConciliacionParagraph([createConciliacionTextRun('Anexo los siguientes documentos')]));

  const anexosList = anexos && anexos.length > 0
    ? anexos.map(anexo => `${anexo.descripcion} - ${anexo.filename}`)
    : [
        `Copia de cédula de ciudadanía de ${nombreConvocante}`,
        `Copia de cédula de ciudadanía de ${nombreConvocado}`,
        `Registro civil de ${nombreConvocado}`,
        'Certificado de Cuenta Bancaria',
        'Poder otorgado'
      ];
  
  anexosList.forEach(item => {
      children.push(createConciliacionParagraph([createConciliacionTextRun(item)], { bullet: { level: 0 }}));
  });
  children.push(createConciliacionParagraph([createConciliacionTextRun('')]));

  // --- NOTIFICACIONES ---
  children.push(createConciliacionParagraph([createConciliacionTextRun('NOTIFICACIONES', { bold: true })], { alignment: AlignmentType.CENTER, spacing: { before: 400, after: 100 } }));
  children.push(createConciliacionParagraph([
    createConciliacionTextRun('La Accionante:', { bold: true }),
  ]));
  children.push(createConciliacionParagraph([
    createConciliacionTextRun(`Email: ${safe(convocante.email)}`),
  ]));
  children.push(createConciliacionParagraph([createConciliacionTextRun('')]));
  children.push(createConciliacionParagraph([
    createConciliacionTextRun('El accionado:', { bold: true }),
  ]));
  children.push(createConciliacionParagraph([
    createConciliacionTextRun(`Email: ${safe(convocado.email)}`),
  ]));
  children.push(createConciliacionParagraph([createConciliacionTextRun('')], { spacing: { after: 600 } }));

  // --- FIRMA ---
  children.push(createConciliacionParagraph([createConciliacionTextRun('Atentamente;')]));
  children.push(createConciliacionParagraph([createConciliacionTextRun('')], { spacing: { after: 200 } }));

  if (firma && firma.data) {
    const base64Data = firma.data.split('base64,').pop();
    if (base64Data) {
        try {
            children.push(createConciliacionParagraph([new ImageRun({
                data: Buffer.from(base64Data, 'base64'),
                transformation: {
                    width: 200,
                    height: 100,
                },
            })]));
        } catch (e) {
            console.error("Error processing signature image for DOCX:", e);
        }
    }
  }

  children.push(createConciliacionParagraph([createConciliacionTextRun('')])); 
  
  children.push(createConciliacionParagraph([
      createConciliacionTextRun(nombreConvocante, { bold: true }),
  ]));
  children.push(createConciliacionParagraph([
    createConciliacionTextRun(`Cédula de Ciudadanía No. ${safe(convocante.numeroIdentificacion)} de ${safe(convocante.ciudadExpedicion)}.`)
  ]));

  const doc = new Document({
    creator: 'SystemLex',
    title: `Conciliacion - ${nombreConvocante}`,
    sections: [{
      properties: {
        pageSize: {
          width: 12240, // LETTER width in dxa (8.5in * 1440)
          height: 15840, // LETTER height in dxa (11in * 1440)
        },
        page: {
          margin: {
            top: 1900, 
            right: 800,
            bottom: 1900,
            left: 800,
          },
        },
      },
      children,
    }],
  });

  return Packer.toBuffer(doc);
};


module.exports = { generateSolicitudDocx, generateConciliacionDocx };
