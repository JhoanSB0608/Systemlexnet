import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import {
  TextField, Button, Typography, Box, Grid, Tabs, Tab, Checkbox,
  FormControlLabel, Tooltip, FormControl, InputLabel, Select, MenuItem, FormHelperText,
  alpha, useTheme, Stack, Avatar, IconButton, Chip, LinearProgress, Collapse,
  Alert, Badge, RadioGroup, Radio, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, CircularProgress,
  Divider, Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import {
  LocationCity as LocationCityIcon,
  Person as PersonIcon,
  Gavel as GavelIcon,
  Receipt as ReceiptIcon,
  AccountBalance as AccountBalanceIcon,
  TrendingUp as TrendingUpIcon,
  AttachFile as AttachFileIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  UploadFile as UploadFileIcon,
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Close as CloseIcon,
  Create as CreateIcon,
  Restore as RestoreIcon,
  CloudDone as CloudDoneIcon,
  CloudUpload as CloudUploadIcon,
  AccountBalanceWallet as AccountBalanceWalletIcon,
  Warning as WarningIcon,
  Verified as VerifiedIcon,
  Info as InfoIcon,
  AttachMoney as AttachMoneyIcon
} from '@mui/icons-material';
import ReactSelect from "react-select";
import { useQuery } from '@tanstack/react-query';
import SignatureCanvas from 'react-signature-canvas';
import LocationSelector from './LocationSelector';
import { uploadFile } from '../../services/fileStorageService';
import { getAcreedores } from '../../services/acreedorService';
import { useDebounce } from '../../hooks/useDebounce';
import { useBorradorAutosave } from '../../hooks/useBorradorAutosave';
import borradorService, { TIPO_LIQUIDACION } from '../../services/borradorService';
import GlassCard from '../common/GlassCard';

// Pruebas predeterminadas de la sección "Pruebas". El usuario puede marcarlas o
// desmarcarlas y crear pruebas personalizadas; el documento lista la selección.
const PRUEBAS_PREDETERMINADAS = [
  'Copia de la cédula de ciudadanía del solicitante.',
  'Poder conferido al apoderado judicial.',
  'Anexo No. 1: Relación completa y actualizada de acreencias.',
  'Desprendible de Nomina',
  'Documentos relacionados con sociedad conyugal.',
  'Certificado REDAM, si resulta aplicable por la existencia o inexistencia de obligaciones alimentarias.',
];

// --- Reusable Glassmorphism Components ---

const GlassTextField = React.forwardRef(({ error, helperText, ...props }, ref) => {
  const theme = useTheme();
  return (
    <TextField
      {...props}
      inputRef={ref}
      error={!!error}
      helperText={helperText}
      variant="outlined"
      sx={{
        '& .MuiOutlinedInput-root': {
          borderRadius: '12px',
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(10px)',
          '& fieldset': { border: '1px solid rgba(255, 255, 255, 0.2)' },
          '&:hover fieldset': { border: '1px solid rgba(255, 255, 255, 0.3)' },
          '&.Mui-focused fieldset': { border: `2px solid ${error ? theme.palette.error.main : alpha(theme.palette.primary.main, 0.5)} !important` },
        },
        '& .MuiInputLabel-root': {
          color: 'rgba(0, 0, 0, 0.6)',
          '&.Mui-focused': { color: error ? theme.palette.error.main : theme.palette.primary.main },
        },
        ...props.sx
      }}
    />
  );
});

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

// Reusable Description Modal component
const DescriptionModal = ({ open, onClose, onConfirm, defaultValue = '' }) => {
  const theme = useTheme();
  const [description, setDescription] = useState(defaultValue);

  const handleConfirm = () => {
    onConfirm(description);
    setDescription('');
  };

  const handleClose = () => {
    onClose();
    setDescription('');
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.85)} 0%, ${alpha(theme.palette.background.paper, 0.7)} 100%)`,
          backdropFilter: 'blur(40px) saturate(180%)',
          border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
          borderRadius: 4,
          boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.37)}`,
          overflow: 'hidden',
        }
      }}
      BackdropProps={{
        sx: {
          backdropFilter: 'blur(8px)',
          backgroundColor: alpha(theme.palette.common.black, 0.5),
        }
      }}
    >
      <DialogTitle
        sx={{
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.secondary.main, 0.08)} 100%)`,
          py: 3,
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            ¿Desea añadir una descripción al Anexo?
          </Typography>
          <IconButton onClick={handleClose}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ py: 3 }}>
        <TextField
          autoFocus
          margin="dense"
          label="Descripción (Opcional)"
          type="text"
          fullWidth
          variant="outlined"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleConfirm();
            }
          }}
        />
      </DialogContent>
      <DialogActions sx={{ p: 3, borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
        <Button onClick={handleClose} color="inherit">
          Cancelar
        </Button>
        <Button onClick={() => onConfirm('')} color="primary">
          Omitir descripción
        </Button>
        <Button onClick={handleConfirm} variant="contained" color="primary">
          Confirmar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Limpia el payload del auto-guardado: elimina objetos File para poder persistirlo en JSON.
const sanitizeBorradorPayload = (data) => {
  return JSON.parse(
    JSON.stringify(data, (key, value) => {
      if (key === 'file') return undefined;
      if (typeof File !== 'undefined' && value instanceof File) return undefined;
      return value;
    })
  );
};

// Prepara los datos de un documento (edición o retomar borrador) para el form de react-hook-form.
const buildFormattedData = (initialData) => ({
  ...initialData,
  deudor: {
    ...(initialData.deudor || {}),
    noComerciante: initialData.deudor?.noComerciante ?? true,
    sociedadConyugalActiva: initialData.deudor?.sociedadConyugalActiva ?? false,
  },
  acreencias: initialData.acreencias?.map((a) => ({
    ...a,
    capital: a.capital ?? '',
    creditoEnMora: !!a.creditoEnMora,
    moraMas90Dias: !!a.moraMas90Dias,
    pagoPorLibranza: !!a.pagoPorLibranza,
    creditoPostergado: !!a.creditoPostergado,
  })),
  procesosJudiciales: initialData.procesosJudiciales?.map((p) => ({
    ...p,
    valor: p.valor ?? '',
  })),
  pruebas: initialData.pruebas?.length ? initialData.pruebas : [...PRUEBAS_PREDETERMINADAS],
  informacionFinanciera: {
    gastosPersonales: {},
    obligacionesAlimentarias: [],
    ...(initialData.informacionFinanciera || {}),
  },
  anexos: initialData.anexos?.map((a) => ({
    ...a,
    name: a.name,
    url: a.url,
    file: undefined,
  })),
  firmaDeudor: initialData.firmaDeudor || { source: 'draw', data: null, file: null },
  bienesInventarioImagen: initialData.bienesInventarioImagen || { name: '', url: '', descripcion: '' },
  certificacionLaboralImagen: initialData.certificacionLaboralImagen || { name: '', url: '', descripcion: '' },
  redamArchivo: initialData.redamArchivo || { name: '', url: '', tipo: '', descripcion: '' },
});

const LiquidacionForm = ({ onSubmit, resetToken, initialData, isUpdating }) => {
  const theme = useTheme();
  const selectSx = {
    minWidth: 250,
    width: '100%',
    borderRadius: '12px',
    background: 'rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    '& .MuiOutlinedInput-notchedOutline': {
      border: '1px solid rgba(255, 255, 255, 0.2)',
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
      border: '1px solid rgba(255, 255, 255, 0.3)',
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      border: `2px solid ${alpha(theme.palette.primary.main, 0.5)} !important`,
    },
    '&:hover': {
      background: 'rgba(255, 255, 255, 0.12)',
    },
    '&.Mui-focused': {
      background: 'rgba(255, 255, 255, 0.15)',
    },
  };

  const menuProps = {
    PaperProps: {
      sx: {
        backgroundColor: alpha(theme.palette.background.paper, 0.9),
        backdropFilter: 'blur(20px)',
        border: `1px solid ${alpha('#fff', 0.1)}`,
        borderRadius: '12px',
        maxHeight: 300,
        '& .MuiMenuItem-root': {
          padding: '10px 16px',
          '&:hover': {
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
          },
          '&.Mui-selected': {
            backgroundColor: alpha(theme.palette.primary.main, 0.2),
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.3),
            },
          },
        },
      },
    },
  };

  const { register, control, handleSubmit, watch, setValue, getValues, trigger, formState: { errors }, reset, setError, clearErrors } = useForm({
    defaultValues: {
      sede: { departamento: '', ciudad: '', juzgado: '' },
      deudor: {
        primerNombre: '', segundoNombre: '', primerApellido: '', segundoApellido: '',
        genero: '', cedula: '', departamentoExpedicion: '', ciudadExpedicion: '', direccion: '',
        email: '', telefono: '', departamento: '', ciudad: '', noComerciante: true,
        sociedadConyugalActiva: false, nombreConyuge: '', cedulaConyuge: '', ciudadExpedicionConyuge: '',
      },
      apoderado: { nombreCompleto: '', genero: '', cedula: '', ciudadExpedicion: '', tp: '', direccion: '', email: '', telefono: '' },
      acreencias: [],
      procesosJudiciales: [],
      pruebas: [...PRUEBAS_PREDETERMINADAS],
      informacionFinanciera: {
        ingresosActividadPrincipal: '',
        descripcionActividadEconomica: '',
        tieneEmpleo: false,
        tipoEmpleo: '',
        ingresosOtrasActividades: '',
        gastosPersonales: {},
        obligacionesAlimentarias: [],
        tieneBienesEmbargables: false,
      },
      anexos: [],
      firma: { source: 'draw', data: null, file: null },
      firmaDeudor: { source: 'draw', data: null, file: null },
      bienesInventarioImagen: { name: '', url: '', descripcion: '' },
      certificacionLaboralImagen: { name: '', url: '', descripcion: '' },
      redamArchivo: { name: '', url: '', tipo: '', descripcion: '' },
    }
  });

  const { fields: acreenciasFields, append: appendAcreencia, remove: removeAcreencia } = useFieldArray({ control, name: 'acreencias', rules: { minLength: { value: 1, message: 'Debe agregar al menos una obligación / acreencia' } } });
  const { fields: procesosFields, append: appendProceso, remove: removeProceso } = useFieldArray({ control, name: 'procesosJudiciales' });
  const { fields: obligacionesFields, append: appendObligacion, remove: removeObligacion } = useFieldArray({ control, name: 'informacionFinanciera.obligacionesAlimentarias' });
  const { fields: anexosFields, append: appendAnexo, remove: removeAnexo } = useFieldArray({ control, name: 'anexos' });

  const updateGastosPersonasCargo = () => {
    const obligaciones = getValues('informacionFinanciera.obligacionesAlimentarias');
    const totalCuantia = obligaciones?.reduce((sum, obligacion) => {
      return sum + (parseFloat(obligacion.cuantia) || 0);
    }, 0) || 0;
    setValue('informacionFinanciera.gastosPersonales.gastosPersonasCargo', totalCuantia);
  };

  const pruebasSeleccionadas = watch('pruebas') || [];
  const pruebasPersonalizadas = pruebasSeleccionadas.filter((p) => !PRUEBAS_PREDETERMINADAS.includes(p));
  const [nuevaPrueba, setNuevaPrueba] = useState('');

  const togglePrueba = (texto) => {
    const actuales = new Set(pruebasSeleccionadas);
    if (actuales.has(texto)) actuales.delete(texto); else actuales.add(texto);
    const ordenadas = [
      ...PRUEBAS_PREDETERMINADAS.filter((t) => actuales.has(t)),
      ...pruebasPersonalizadas.filter((t) => actuales.has(t)),
    ];
    setValue('pruebas', ordenadas);
  };

  const agregarPrueba = () => {
    const texto = nuevaPrueba.trim();
    if (!texto) return;
    if (!pruebasSeleccionadas.includes(texto)) {
      setValue('pruebas', [...pruebasSeleccionadas, texto]);
    }
    setNuevaPrueba('');
  };

  const quitarPrueba = (texto) => {
    setValue('pruebas', pruebasSeleccionadas.filter((p) => p !== texto));
  };

  const [tabValue, setTabValue] = useState(0);
  const [validationError, setValidationError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingAnexos, setUploadingAnexos] = useState({});
  const [uploadingImagenAnexo3, setUploadingImagenAnexo3] = useState(false);
  const [uploadingImagenAnexo6, setUploadingImagenAnexo6] = useState(false);
  const [uploadingRedam, setUploadingRedam] = useState(false);
  const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);
  const [savedSections, setSavedSections] = useState({
    sede: false,
    deudor: false,
    apoderado: false,
    acreencias: false,
    procesosJudiciales: false,
    informacionFinanciera: false,
    anexos: false,
    firma: false,
  });

  // ============ GUARDADO PARCIAL / AUTO-SAVE ============
  const tipoSolicitud = TIPO_LIQUIDACION;
  const esEdicion = !!initialData;
  const esBorrador = esEdicion && initialData.estado === 'borrador';
  const autosaveEnabled = !esEdicion || esBorrador;
  const restoredRef = useRef(false);
  const [isRestoringDraft, setIsRestoringDraft] = useState(false);
  const [borradorUpdatedAt, setBorradorUpdatedAt] = useState(null);

  const {
    borradorId,
    saveStatus,
    lastSavedAt,
    requestSave,
    flushSave,
    clearBorrador,
  } = useBorradorAutosave({
    tipoSolicitud,
    enabled: autosaveEnabled,
    borradorId: esBorrador ? initialData._id : null,
  });

  const buildAutosavePayload = (sectionDeltas) => {
    const formData = getValues();
    const cleaned = sanitizeBorradorPayload(formData);
    const nuevasSecciones = sectionDeltas
      ? { ...savedSections, ...sectionDeltas }
      : savedSections;
    return { ...cleaned, seccionesGuardadas: nuevasSecciones };
  };
  // ======================================================

  const sigCanvas = useRef({});
  const signatureContainerRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ width: 500, height: 200 });
  const watchedFirmaSource = watch('firma.source');
  const [signatureSource, setSignatureSource] = useState('draw');
  const [signatureImage, setSignatureImage] = useState(null);

  const sigCanvasDeudor = useRef({});
  const signatureContainerDeudorRef = useRef(null);
  const [deudorCanvasSize, setDeudorCanvasSize] = useState({ width: 500, height: 200 });
  const watchedFirmaDeudorSource = watch('firmaDeudor.source');
  const [signatureSourceDeudor, setSignatureSourceDeudor] = useState('draw');
  const [signatureImageDeudor, setSignatureImageDeudor] = useState(null);

  const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState(false);
  const [currentFileToProcess, setCurrentFileToProcess] = useState(null);
  const [currentAnexoIndex, setCurrentAnexoIndex] = useState(null);

  const { data: acreedoresData, isLoading } = useQuery({ queryKey: ['acreedores'], queryFn: () => getAcreedores({ pageIndex: 0, pageSize: 1000, sorting: JSON.stringify([{ id: 'nombre', desc: false }]) }) });
  const [isAcreenciasModalOpen, setIsAcreenciasModalOpen] = useState(false);

  useEffect(() => {
    if (restoredRef.current) return;
    let cancelled = false;
    const finish = () => {
      if (!cancelled) restoredRef.current = true;
    };

    // Modo edición (documento o borrador existente)
    if (initialData) {
      console.log('[LiquidacionForm] InitialData received:', initialData);
      const formattedData = buildFormattedData(initialData);
      console.log('[LiquidacionForm] Formatted data for reset:', formattedData);
      reset(formattedData);

      if (initialData.firma) {
        const { source, data, url } = initialData.firma;
        setSignatureSource(source || 'draw');
        if (source === 'draw' && data) {
          setTimeout(() => {
            if (sigCanvas.current && sigCanvas.current.fromDataURL) {
              sigCanvas.current.fromDataURL(data);
            }
          }, 200);
        } else if (source === 'upload' && url) {
          const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://api.systemlex.com.co';
          setSignatureImage(`${backendUrl}${url}`);
          setValue('firma.url', url);
        }
      }

      if (initialData.firmaDeudor) {
        const { source, data, url } = initialData.firmaDeudor;
        setSignatureSourceDeudor(source || 'draw');
        if (source === 'draw' && data) {
          setTimeout(() => {
            if (sigCanvasDeudor.current && sigCanvasDeudor.current.fromDataURL) {
              sigCanvasDeudor.current.fromDataURL(data);
            }
          }, 200);
        } else if (source === 'upload' && url) {
          const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://api.systemlex.com.co';
          setSignatureImageDeudor(`${backendUrl}${url}`);
          setValue('firmaDeudor.url', url);
        }
      }

      if (esBorrador && initialData.seccionesGuardadas) {
        setSavedSections((prev) => ({ ...prev, ...initialData.seccionesGuardadas }));
        setBorradorUpdatedAt(initialData.updatedAt || null);
        setIsRestoringDraft(true);
      } else {
        setSavedSections({
          sede: true, deudor: true, apoderado: true, acreencias: true,
          procesosJudiciales: true, informacionFinanciera: true, anexos: true, firma: true,
        });
      }
      finish();
      return () => { cancelled = true; };
    }

    // Modo creación: si hay un borrador en localStorage para este tipo, reanudarlo.
    if (autosaveEnabled && borradorId) {
      (async () => {
        try {
          console.log('[LiquidacionForm] Reanudando borrador:', borradorId);
          const draf = await borradorService.obtenerBorrador(borradorId, tipoSolicitud);
          if (cancelled) return;
          reset(buildFormattedData(draf));
          if (draf.seccionesGuardadas) {
            setSavedSections((prev) => ({ ...prev, ...draf.seccionesGuardadas }));
          }
          setBorradorUpdatedAt(draf.updatedAt || null);
          setIsRestoringDraft(true);
        } catch (error) {
          console.error('[LiquidacionForm] No se pudo reanudar el borrador:', error);
          if (!cancelled) clearBorrador();
        } finally {
          finish();
        }
      })();
      return () => { cancelled = true; };
    }

    const t = setTimeout(finish, 1200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData, autosaveEnabled, borradorId, reset, resetToken, tipoSolicitud, clearBorrador]);

  useLayoutEffect(() => {
    function handleResize() {
      if (signatureContainerRef.current) {
        const { width } = signatureContainerRef.current.getBoundingClientRect();
        setCanvasSize({ width: width > 0 ? width : 500, height: 200 });
      }
      if (signatureContainerDeudorRef.current) {
        const { width } = signatureContainerDeudorRef.current.getBoundingClientRect();
        setDeudorCanvasSize({ width: width > 0 ? width : 500, height: 200 });
      }
    }
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (watchedFirmaSource) {
      setSignatureSource(watchedFirmaSource);
    }
  }, [watchedFirmaSource]);

  useEffect(() => {
    if (watchedFirmaDeudorSource) {
      setSignatureSourceDeudor(watchedFirmaDeudorSource);
    }
  }, [watchedFirmaDeudorSource]);

  // Verificar que noComerciante siempre esté activo para esta solicitud.
  const watchNoComerciante = watch('deudor.noComerciante');
  useEffect(() => {
    if (!watchNoComerciante) {
      setValue('deudor.noComerciante', true);
    }
  }, [watchNoComerciante, setValue]);

  const watchSociedadConyugal = watch('deudor.sociedadConyugalActiva');

  const acreenciasValues = watch('acreencias');
  const totalAcreencias = (acreenciasValues || []).reduce((s, a) => s + (Number(a.capital) || 0), 0);

  const totalCapital = (acreenciasValues || []).reduce((sum, a) => sum + (parseFloat(a.capital) || 0), 0) || 0;
  const obligacionesEnMora = (acreenciasValues || []).filter(a => a.creditoEnMora === true && a.moraMas90Dias === true);
  const capitalObligaciones = obligacionesEnMora.reduce((sum, a) => sum + (parseFloat(a.capital) || 0), 0) || 0;
  const porcentajeMora = totalCapital > 0 ? (capitalObligaciones / totalCapital * 100) : 0;

  const validacionLiquidacion = {
    alMenosUnaAcreencia: (acreenciasValues || []).length >= 1,
    hayObligacionesEnMora: obligacionesEnMora.length >= 1,
    capitalObligacionesEnMora: capitalObligaciones > 0,
  };
  const cumpleRequisitos = validacionLiquidacion.alMenosUnaAcreencia && validacionLiquidacion.hayObligacionesEnMora && validacionLiquidacion.capitalObligacionesEnMora;

  const getClassFromNaturaleza = (naturaleza) => {
    if (!naturaleza) return 'QUINTA CLASE';
    if (naturaleza.toUpperCase().includes('PRIMERA CLASE')) return 'PRIMERA CLASE';
    if (naturaleza.toUpperCase().includes('SEGUNDA CLASE')) return 'SEGUNDA CLASE';
    if (naturaleza.toUpperCase().includes('TERCERA CLASE')) return 'TERCERA CLASE';
    if (naturaleza.toUpperCase().includes('CUARTA CLASE')) return 'CUARTA CLASE';
    return 'QUINTA CLASE';
  };

  const formatMoney = (num) => {
    const value = Number(num) || 0;
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  };

  const getAcreedorData = (a) => {
    if (!a) return null;
    if (a.acreedor && typeof a.acreedor === 'object' && a.acreedor._id) return a.acreedor;
    const found = acreedoresData?.rows?.find(ac => ac._id === a.acreedor);
    return found || null;
  };

  const getAcreedorNombre = (a) => {
    const ac = getAcreedorData(a);
    if (ac) return ac.nombre;
    if (!a) return 'No reporta';
    if (typeof a.acreedor === 'string' && a.acreedor) return a.acreedor;
    return 'No reporta';
  };

  const acreenciasPreview = (() => {
    const lista = acreenciasValues || [];
    const clases = ['PRIMERA CLASE', 'SEGUNDA CLASE', 'TERCERA CLASE', 'CUARTA CLASE', 'QUINTA CLASE'];
    const grouped = lista.reduce((acc, a) => {
      const cls = getClassFromNaturaleza(a.naturalezaCredito);
      if (!acc[cls]) acc[cls] = [];
      acc[cls].push(a);
      return acc;
    }, {});
    const clasesConDatos = clases.filter(cls => grouped[cls] && grouped[cls].length > 0);
    return { grouped, clasesConDatos, total: totalCapital };
  })();

  const handleSignatureDeudorFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setValue('firmaDeudor.file', file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSignatureImageDeudor(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImagenAnexoChange = (path, setUploading) => async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const mime = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');
      const { fileUrl, uniqueFilename } = await uploadFile(file);
      setValue(`${path}.name`, uniqueFilename, { shouldValidate: true });
      setValue(`${path}.url`, fileUrl, { shouldValidate: true });
      setValue(`${path}.tipo`, mime, { shouldValidate: true });
      setValue(`${path}.type`, mime, { shouldValidate: true });
    } catch (error) {
      console.error('Error subiendo archivo del anexo:', error);
      setError(`${path}.url`, { type: 'manual', message: 'Error al subir el archivo' });
    } finally {
      setUploading(false);
      e.target.value = null;
    }
  };

  const imagenAnexo3Url = watch('bienesInventarioImagen.url');
  const imagenAnexo3Name = watch('bienesInventarioImagen.name');
  const imagenAnexo3Tipo = watch('bienesInventarioImagen.tipo') || watch('bienesInventarioImagen.type');
  const esImagenAnexo3Pdf = !!imagenAnexo3Tipo && !String(imagenAnexo3Tipo).startsWith('image/');
  const imagenAnexo6Url = watch('certificacionLaboralImagen.url');
  const imagenAnexo6Name = watch('certificacionLaboralImagen.name');
  const imagenAnexo6Tipo = watch('certificacionLaboralImagen.tipo') || watch('certificacionLaboralImagen.type');
  const esImagenAnexo6Pdf = !!imagenAnexo6Tipo && !String(imagenAnexo6Tipo).startsWith('image/');

  const redamUrl = watch('redamArchivo.url');
  const redamName = watch('redamArchivo.name');
  const redamTipo = watch('redamArchivo.tipo');

  const handleRedamChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingRedam(true);
    try {
      const mime = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');
      const { fileUrl, uniqueFilename } = await uploadFile(file);
      setValue('redamArchivo.name', uniqueFilename, { shouldValidate: true });
      setValue('redamArchivo.url', fileUrl, { shouldValidate: true });
      setValue('redamArchivo.tipo', mime, { shouldValidate: true });
      setValue('redamArchivo.descripcion', 'Anexo REDAM');
    } catch (error) {
      console.error('Error subiendo archivo REDAM:', error);
      setError('redamArchivo.url', { type: 'manual', message: 'Error al subir el archivo' });
    } finally {
      setUploadingRedam(false);
      e.target.value = null;
    }
  };

  const handleSignatureFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setValue('firma.file', file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSignatureImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnexoChange = (e, index) => {
    const file = e.target.files[0];
    if (!file) return;

    setCurrentFileToProcess(file);
    setCurrentAnexoIndex(index);
    setIsDescriptionModalOpen(true);

    e.target.value = null;
  };

  const handleDescriptionConfirm = async (description) => {
    if (!currentFileToProcess || currentAnexoIndex === null) return;

    setIsDescriptionModalOpen(false);
    setUploadingAnexos(prev => ({ ...prev, [currentAnexoIndex]: true }));

    try {
      console.log(`[LiquidacionForm] GCS Upload for index ${currentAnexoIndex}, file:`, currentFileToProcess.name, 'Description:', description);
      const { fileUrl, uniqueFilename } = await uploadFile(currentFileToProcess);
      console.log(`[LiquidacionForm] GCS Upload successful for index ${currentAnexoIndex}. URL: ${fileUrl}, Filename: ${uniqueFilename}`);

      setValue(`anexos.${currentAnexoIndex}.name`, uniqueFilename, { shouldValidate: true });
      setValue(`anexos.${currentAnexoIndex}.url`, fileUrl, { shouldValidate: true });
      setValue(`anexos.${currentAnexoIndex}.descripcion`, description);
      setValue(`anexos.${currentAnexoIndex}.file`, undefined);

    } catch (error) {
      console.error('Error uploading anexo:', error);
      setError(`anexos.${currentAnexoIndex}.url`, { type: 'manual', message: 'Error al subir el archivo' });
    } finally {
      setUploadingAnexos(prev => ({ ...prev, [currentAnexoIndex]: false }));
      setCurrentFileToProcess(null);
      setCurrentAnexoIndex(null);
    }
  };

  const handleSaveSection = async (sectionName, nextTabIndex) => {
    setIsSaving(true);
    let fieldsToValidate = [];

    switch (sectionName) {
      case 'sede': fieldsToValidate = ['sede']; break;
      case 'deudor': fieldsToValidate = ['deudor']; break;
      case 'apoderado': fieldsToValidate = ['apoderado']; break;
      case 'acreencias': fieldsToValidate = ['acreencias']; break;
      case 'procesosJudiciales': fieldsToValidate = ['procesosJudiciales']; break;
      case 'informacionFinanciera': fieldsToValidate = ['informacionFinanciera']; break;
      case 'anexos': fieldsToValidate = ['anexos']; break;
      case 'firma': fieldsToValidate = ['firma', 'firmaDeudor']; break;
      default: break;
    }

    const results = await Promise.all(fieldsToValidate.map(field => trigger(field)));
    const isValid = results.every(Boolean);

    if (isValid) {
      setValidationError('');
      if (autosaveEnabled) {
        requestSave(buildAutosavePayload({ [sectionName]: true }));
        await flushSave();
      } else {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      setSavedSections(prev => ({ ...prev, [sectionName]: true }));
      if (nextTabIndex !== undefined) {
        setTabValue(nextTabIndex);
      }
    } else {
      setValidationError('Hay errores en la sección actual. Por favor, revise los campos marcados.');
    }
    setIsSaving(false);
  };

  const onInvalid = (errors) => {
    console.error('Errores de validación del formulario:', errors);
    setValidationError('El formulario tiene errores. Por favor, revise todas las pestañas y corrija los campos marcados en rojo.');
  };

  const customOnSubmit = async (data) => {
    setIsUploading(true);

    if (autosaveEnabled) {
      try {
        await flushSave();
      } catch (e) {
        console.warn('[LiquidacionForm] No se pudo vaciar la cola de auto-guardado:', e);
      }
    }

    const dataToSend = {
      ...data,
      acreencias: (data.acreencias || []).map((a) => {
        const acreedorData = acreedoresData?.rows?.find(ac => ac._id === a.acreedor);
        return {
          ...a,
          acreedor: acreedorData || a.acreedor,
          creditoEnMora: !!a.creditoEnMora,
          moraMas90Dias: !!a.moraMas90Dias,
          pagoPorLibranza: !!a.pagoPorLibranza,
          creditoPostergado: !!a.creditoPostergado,
        };
      }),
      pruebas: (data.pruebas || []).map((p) => (p || '').trim()).filter(Boolean),
      anexos: (data.anexos || []).map(anexo => ({
        ...anexo,
        name: anexo.url ? anexo.name : (anexo.descripcion ? ' ' : anexo.name),
        url: anexo.url || '',
      })),
    };

    // La cuantía total se calcula automáticamente si no fue indicada por el usuario.
    if (!dataToSend.informacionFinanciera?.cuantiaTotal) {
      dataToSend.informacionFinanciera = {
        ...(dataToSend.informacionFinanciera || {}),
        cuantiaTotal: totalAcreencias || 0,
      };
    }

    // Process Signature File
    if (signatureSource === 'upload' && dataToSend.firma?.file instanceof File) {
      try {
        const { fileUrl, uniqueFilename } = await uploadFile(dataToSend.firma.file);
        dataToSend.firma = {
          source: 'upload',
          name: uniqueFilename || dataToSend.firma.file.name,
          url: fileUrl,
        };
      } catch (error) {
        console.error('Error uploading signature:', error);
        dataToSend.firma = { ...dataToSend.firma, error: 'Upload failed' };
      }
    } else if (signatureSource === 'draw' && sigCanvas.current && !sigCanvas.current.isEmpty()) {
      dataToSend.firma = {
        source: 'draw',
        data: sigCanvas.current.getTrimmedCanvas().toDataURL('image/png')
      };
    }

    // Process Deudor Signature File
    if (signatureSourceDeudor === 'upload' && dataToSend.firmaDeudor?.file instanceof File) {
      try {
        const { fileUrl, uniqueFilename } = await uploadFile(dataToSend.firmaDeudor.file);
        dataToSend.firmaDeudor = {
          source: 'upload',
          name: uniqueFilename || dataToSend.firmaDeudor.file.name,
          url: fileUrl,
        };
      } catch (error) {
        console.error('Error uploading deudor signature:', error);
        dataToSend.firmaDeudor = { ...dataToSend.firmaDeudor, error: 'Upload failed' };
      }
    } else if (signatureSourceDeudor === 'draw' && sigCanvasDeudor.current && !sigCanvasDeudor.current.isEmpty()) {
      dataToSend.firmaDeudor = {
        source: 'draw',
        data: sigCanvasDeudor.current.getTrimmedCanvas().toDataURL('image/png')
      };
    }

    if (autosaveEnabled && borradorId) {
      dataToSend._borradorId = borradorId;
      dataToSend.estado = 'completa';
    }

    setIsUploading(false);
    console.log('[LiquidacionForm] Final data being sent to parent onSubmit:', dataToSend);
    await onSubmit(dataToSend);

    if (autosaveEnabled) {
      clearBorrador();
    }
  };

  useEffect(() => {
    if (resetToken) {
      reset();
      setTabValue(0);
      setValidationError('');
      setSavedSections({
        sede: false,
        deudor: false,
        apoderado: false,
        acreencias: false,
        procesosJudiciales: false,
        informacionFinanciera: false,
        anexos: false,
        firma: false,
      });
      restoredRef.current = false;
      setIsRestoringDraft(false);
      setBorradorUpdatedAt(null);
      if (autosaveEnabled) clearBorrador();
    }
  }, [resetToken, reset, autosaveEnabled, clearBorrador]);

  const watchedAll = watch();
  const debouncedWatchedAll = useDebounce(watchedAll, 3000);

  useEffect(() => {
    if (!autosaveEnabled) return;
    if (!restoredRef.current) return;
    if (isUploading) return;
    try {
      requestSave(buildAutosavePayload());
    } catch (e) {
      console.warn('[LiquidacionForm] Error al encolar auto-guardado:', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedWatchedAll]);

  const allSectionsSaved = Object.values(savedSections).every(Boolean);
  const completionPercentage = (Object.values(savedSections).filter(Boolean).length / Object.values(savedSections).length) * 100;

  const tabsConfig = [
    { key: 'sede', label: 'Sede / Juzgado', icon: LocationCityIcon, color: '#673ab7' },
    { key: 'deudor', label: 'Deudor', icon: PersonIcon, color: '#2196f3' },
    { key: 'apoderado', label: 'Apoderado', icon: GavelIcon, color: '#ff9800' },
    { key: 'acreencias', label: 'Acreencias', icon: ReceiptIcon, color: '#ff5722' },
    { key: 'procesosJudiciales', label: 'Procesos', icon: AccountBalanceIcon, color: '#f44336' },
    { key: 'informacionFinanciera', label: 'Financiera', icon: TrendingUpIcon, color: '#4caf50' },
    { key: 'anexos', label: 'Pruebas', icon: AttachFileIcon, color: '#009688' },
    { key: 'firma', label: 'Firma', icon: CreateIcon, color: '#795548' },
  ];

  return (
    <Box>
      <GlassCard hover={false} sx={{ mb: 3, p: 3 }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar
                sx={{
                  width: 48,
                  height: 48,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                }}
              >
                <AccountBalanceWalletIcon />
              </Avatar>
              <Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  Solicitud de Liquidación Patrimonial Directa
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Complete todos los pasos para generar la solicitud
                </Typography>
              </Box>
            </Stack>
          </Stack>
          <Chip
            icon={<TrendingUpIcon />}
            label={`${completionPercentage.toFixed(0)}% Completado`}
            sx={{
              background: alpha(theme.palette.success.main, 0.1),
              color: theme.palette.success.main,
              fontWeight: 600,
              px: 2,
              py: 2.5,
              alignSelf: 'flex-start'
            }}
          />
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', ml: { xs: 0, sm: 'auto' } }}>
            {isRestoringDraft && (
              <Chip
                icon={<RestoreIcon />}
                label={borradorUpdatedAt
                  ? `Borrador del ${new Date(borradorUpdatedAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}`
                  : 'Borrador en curso'}
                sx={{
                  background: alpha(theme.palette.info.main, 0.12),
                  color: theme.palette.info.main,
                  fontWeight: 700,
                }}
              />
            )}
            {autosaveEnabled && saveStatus === 'saving' && (
              <Chip
                icon={<CloudUploadIcon />}
                label="Guardando..."
                sx={{
                  background: alpha(theme.palette.warning.main, 0.12),
                  color: theme.palette.warning.main,
                  fontWeight: 600,
                }}
              />
            )}
            {autosaveEnabled && saveStatus === 'saved' && (
              <Chip
                icon={<CloudDoneIcon />}
                label={lastSavedAt
                  ? `Guardado ${lastSavedAt.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`
                  : 'Guardado'}
                sx={{
                  background: alpha(theme.palette.success.main, 0.12),
                  color: theme.palette.success.main,
                  fontWeight: 600,
                }}
              />
            )}
            {autosaveEnabled && saveStatus === 'error' && (
              <Chip
                icon={<ErrorIcon />}
                label="Error al guardar (se reintentará)"
                sx={{
                  background: alpha(theme.palette.error.main, 0.12),
                  color: theme.palette.error.main,
                  fontWeight: 600,
                }}
              />
            )}
          </Box>
          <Box>
            <LinearProgress
              variant="determinate"
              value={completionPercentage}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: alpha(theme.palette.grey[500], 0.1),
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                  background: `linear-gradient(90deg, ${theme.palette.success.main}, ${theme.palette.info.main})`,
                },
              }}
            />
          </Box>
        </Stack>
      </GlassCard>

      <Collapse in={!!validationError}>
        <GlassCard
          hover={false}
          sx={{
            mb: 3,
            border: `2px solid ${alpha(theme.palette.error.main, 0.3)}`,
            background: `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.1)} 0%, ${alpha(theme.palette.error.main, 0.05)} 100%)`,
          }}
        >
          <Alert
            severity="error"
            icon={<ErrorIcon sx={{ fontSize: 28 }} />}
            sx={{ background: 'transparent', border: 'none' }}
            action={
              <IconButton size="small" onClick={() => setValidationError('')} sx={{ color: theme.palette.error.main }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            }
          >
            {validationError}
          </Alert>
        </GlassCard>
      </Collapse>

      <GlassCard hover={false} sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              minHeight: 72,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              transition: 'all 0.3s ease',
              '&:hover': { background: alpha(theme.palette.primary.main, 0.05) },
              '&.Mui-selected': { color: theme.palette.primary.main },
            },
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '3px 3px 0 0',
              background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            },
          }}
        >
          {tabsConfig.map((tab, index) => {
            const Icon = tab.icon;
            const isSaved = savedSections[tab.key];
            const isDisabled = index > 0 && !Object.values(savedSections).slice(0, index).every(Boolean);

            return (
              <Tab
                key={tab.key}
                disabled={isDisabled}
                onClick={() => setTabValue(index)}
                label={
                  <Stack spacing={0.5} alignItems="center">
                    <Badge badgeContent={isSaved ? <CheckCircleIcon sx={{ fontSize: 16 }} /> : null} color="success">
                      <Icon sx={{ fontSize: 24, color: isSaved ? theme.palette.success.main : tab.color }} />
                    </Badge>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>{tab.label}</Typography>
                  </Stack>
                }
                sx={{ opacity: isDisabled ? 0.4 : 1, '&.Mui-disabled': { color: 'text.disabled' } }}
              />
            );
          })}
        </Tabs>
      </GlassCard>

      <form onSubmit={handleSubmit(customOnSubmit, onInvalid)}>
        <TabPanel value={tabValue} index={0}>
          <GlassCard sx={{ p: 3 }}>
            <Stack spacing={3}>
              <Typography variant="h6">Sede / Juzgado</Typography>
              <GlassTextField
                {...register('sede.juzgado', { required: 'Campo requerido' })}
                label="Juzgado (texto de encabezado del documento)"
                fullWidth
                error={!!errors.sede?.juzgado}
                helperText={errors.sede?.juzgado?.message}
              />
              <LocationSelector
                control={control}
                errors={errors}
                watch={watch}
                setValue={setValue}
                showDepartment={true}
                showCity={true}
                departmentFieldName="sede.departamento"
                cityFieldName="sede.ciudad"
                departmentLabel="Departamento"
                cityLabel="Ciudad"
                departmentGridProps={{ xs: 12, sm: 6 }}
                cityGridProps={{ xs: 12, sm: 6 }}
                departmentRules={{ required: 'Campo requerido' }}
                cityRules={{ required: 'Campo requerido' }}
              />
              <Button variant="contained" onClick={() => handleSaveSection('sede', 1)} disabled={isSaving} startIcon={<SaveIcon />} sx={{ mt: 2 }}>
                {isSaving ? 'Guardando...' : 'Guardar y Continuar'}
              </Button>
            </Stack>
          </GlassCard>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <GlassCard sx={{ p: 3 }}>
            <Stack spacing={3}>
              <Typography variant="h6">Datos del Deudor</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}><GlassTextField {...register('deudor.primerNombre', { required: 'Campo requerido' })} label="Primer Nombre" fullWidth error={!!errors.deudor?.primerNombre} helperText={errors.deudor?.primerNombre?.message} /></Grid>
                <Grid item xs={12} sm={6} md={3}><GlassTextField {...register('deudor.segundoNombre')} label="Segundo Nombre" fullWidth /></Grid>
                <Grid item xs={12} sm={6} md={3}><GlassTextField {...register('deudor.primerApellido', { required: 'Campo requerido' })} label="Primer Apellido" fullWidth error={!!errors.deudor?.primerApellido} helperText={errors.deudor?.primerApellido?.message} /></Grid>
                <Grid item xs={12} sm={6} md={3}><GlassTextField {...register('deudor.segundoApellido')} label="Segundo Apellido" fullWidth /></Grid>

                <Grid item xs={12} sm={6}><GlassTextField {...register('deudor.cedula', { required: 'Campo requerido' })} label="Cédula de Ciudadanía" fullWidth error={!!errors.deudor?.cedula} helperText={errors.deudor?.cedula?.message} /></Grid>
                <Grid item xs={12} sm={6}><GlassTextField {...register('deudor.ciudadExpedicion', { required: 'Campo requerido' })} label="Ciudad de Expedición" fullWidth error={!!errors.deudor?.ciudadExpedicion} helperText={errors.deudor?.ciudadExpedicion?.message} /></Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth error={!!errors.deudor?.genero}>
                    <InputLabel>Género</InputLabel>
                    <Controller
                      name="deudor.genero"
                      control={control}
                      defaultValue=""
                      rules={{ required: 'Campo requerido' }}
                      render={({ field }) => (
                        <Select {...field} label="Género" sx={selectSx}>
                          <MenuItem value="Masculino">Masculino</MenuItem>
                          <MenuItem value="Femenino">Femenino</MenuItem>
                        </Select>
                      )}
                    />
                    {errors.deudor?.genero && <FormHelperText>{errors.deudor?.genero?.message}</FormHelperText>}
                  </FormControl>
                </Grid>

                <Grid item xs={12}><GlassTextField {...register('deudor.direccion', { required: 'Campo requerido' })} label="Dirección Física" fullWidth error={!!errors.deudor?.direccion} helperText={errors.deudor?.direccion?.message} /></Grid>
                <Grid item xs={12} sm={6}><GlassTextField {...register('deudor.email', { required: 'Campo requerido', pattern: { value: /^\S+@\S+$/i, message: 'Email inválido' } })} label="Email" type="email" fullWidth error={!!errors.deudor?.email} helperText={errors.deudor?.email?.message} /></Grid>
                <Grid item xs={12} sm={6}><GlassTextField {...register('deudor.telefono', { required: 'Campo requerido' })} label="Teléfono" fullWidth error={!!errors.deudor?.telefono} helperText={errors.deudor?.telefono?.message} /></Grid>
                <Grid item xs={12} sm={4}><LocationSelector
                  control={control}
                  errors={errors}
                  watch={watch}
                  setValue={setValue}
                  showDepartment={true}
                  showCity={true}
                  departmentFieldName="deudor.departamento"
                  cityFieldName="deudor.ciudad"
                  departmentLabel="Departamento de Domicilio"
                  cityLabel="Ciudad de Domicilio"
                  departmentGridProps={{ xs: 12, sm: 6 }}
                  cityGridProps={{ xs: 12, sm: 6 }}
                  departmentRules={{ required: 'Campo requerido' }}
                  cityRules={{ required: 'Campo requerido' }}
                /></Grid>
                <Grid item xs={12} sm={4}>
                  <FormControlLabel
                    control={<Controller name="deudor.noComerciante" control={control} render={({ field }) => <Checkbox {...field} checked={!!field.value} />} />}
                    label="Persona natural no comerciante"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Controller name="deudor.sociedadConyugalActiva" control={control} render={({ field }) => <Checkbox {...field} checked={!!field.value} />} />}
                    label="¿Existe sociedad conyugal activa?"
                  />
                </Grid>
                {watchSociedadConyugal && (
                  <>
                    <Grid item xs={12} sm={5}><GlassTextField {...register('deudor.nombreConyuge', { required: 'Ingrese el nombre del cónyuge' })} label="Nombre del Cónyuge" fullWidth error={!!errors.deudor?.nombreConyuge} helperText={errors.deudor?.nombreConyuge?.message} /></Grid>
                    <Grid item xs={12} sm={4}><GlassTextField {...register('deudor.cedulaConyuge', { required: 'Ingrese la cédula del cónyuge' })} label="Cédula del Cónyuge" fullWidth error={!!errors.deudor?.cedulaConyuge} helperText={errors.deudor?.cedulaConyuge?.message} /></Grid>
                    <Grid item xs={12} sm={3}><GlassTextField {...register('deudor.ciudadExpedicionConyuge', { required: 'Campo requerido' })} label="Ciudad de Expedición" fullWidth error={!!errors.deudor?.ciudadExpedicionConyuge} helperText={errors.deudor?.ciudadExpedicionConyuge?.message} /></Grid>
                  </>
                )}
              </Grid>
              <Button variant="contained" onClick={() => handleSaveSection('deudor', 2)} disabled={isSaving} startIcon={<SaveIcon />} sx={{ mt: 2 }}>
                {isSaving ? 'Guardando...' : 'Guardar y Continuar'}
              </Button>
            </Stack>
          </GlassCard>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <GlassCard sx={{ p: 3 }}>
            <Stack spacing={3}>
              <Typography variant="h6">Datos del Apoderado</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}><GlassTextField {...register('apoderado.nombreCompleto', { required: 'Campo requerido' })} label="Nombre Completo" fullWidth error={!!errors.apoderado?.nombreCompleto} helperText={errors.apoderado?.nombreCompleto?.message} /></Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth error={!!errors.apoderado?.genero}>
                    <InputLabel>Género</InputLabel>
                    <Controller
                      name="apoderado.genero"
                      control={control}
                      defaultValue=""
                      rules={{ required: 'Campo requerido' }}
                      render={({ field }) => (
                        <Select {...field} label="Género" sx={selectSx}>
                          <MenuItem value="Masculino">Masculino</MenuItem>
                          <MenuItem value="Femenino">Femenino</MenuItem>
                        </Select>
                      )}
                    />
                    {errors.apoderado?.genero && <FormHelperText>{errors.apoderado?.genero?.message}</FormHelperText>}
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}><GlassTextField {...register('apoderado.cedula', { required: 'Campo requerido' })} label="Cédula" fullWidth error={!!errors.apoderado?.cedula} helperText={errors.apoderado?.cedula?.message} /></Grid>
                <Grid item xs={12} sm={6}><GlassTextField {...register('apoderado.ciudadExpedicion', { required: 'Campo requerido' })} label="Ciudad de Expedición" fullWidth error={!!errors.apoderado?.ciudadExpedicion} helperText={errors.apoderado?.ciudadExpedicion?.message} /></Grid>
                <Grid item xs={12} sm={6}><GlassTextField {...register('apoderado.tp', { required: 'Campo requerido' })} label="Tarjeta Profesional" fullWidth error={!!errors.apoderado?.tp} helperText={errors.apoderado?.tp?.message} /></Grid>
                <Grid item xs={12}><GlassTextField {...register('apoderado.direccion', { required: 'Campo requerido' })} label="Dirección" fullWidth error={!!errors.apoderado?.direccion} helperText={errors.apoderado?.direccion?.message} /></Grid>
                <Grid item xs={12} sm={6}><GlassTextField {...register('apoderado.email', { required: 'Campo requerido', pattern: { value: /^\S+@\S+$/i, message: 'Email inválido' } })} label="Email" type="email" fullWidth error={!!errors.apoderado?.email} helperText={errors.apoderado?.email?.message} /></Grid>
                <Grid item xs={12} sm={6}><GlassTextField {...register('apoderado.telefono', { required: 'Campo requerido' })} label="Teléfono" fullWidth error={!!errors.apoderado?.telefono} helperText={errors.apoderado?.telefono?.message} /></Grid>
              </Grid>
              <Button variant="contained" onClick={() => handleSaveSection('apoderado', 3)} disabled={isSaving} startIcon={<SaveIcon />} sx={{ mt: 2 }}>
                {isSaving ? 'Guardando...' : 'Guardar y Continuar'}
              </Button>
            </Stack>
          </GlassCard>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <GlassCard>
            <Box sx={{ p: 3 }}>
              <Stack spacing={3}>
                <Controller
                  name="acreencias"
                  control={control}
                  rules={{
                    validate: value => (value || []).length >= 1 || 'Debe agregar al menos una acreencia'
                  }}
                  render={() => (
                    <>
                      {errors.acreencias?.root && (
                        <FormHelperText error>{errors.acreencias.root.message}</FormHelperText>
                      )}
                    </>
                  )}
                />

                <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar sx={{ bgcolor: alpha(tabsConfig[3].color, 0.1), color: tabsConfig[3].color }}>
                      <AccountBalanceIcon />
                    </Avatar>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      Relación de Acreencias
                    </Typography>
                  </Stack>

                  <Button
                    variant="outlined"
                    onClick={() => appendAcreencia({ diasDeMora: '', moraMas90Dias: false, capital: '', creditoEnMora: false, pagoPorLibranza: false, creditoPostergado: false })}
                    startIcon={<AddIcon />}
                    sx={{
                      borderRadius: '12px',
                      borderColor: alpha(tabsConfig[3].color, 0.3),
                      color: tabsConfig[3].color,
                      '&:hover': {
                        borderColor: tabsConfig[3].color,
                        background: alpha(tabsConfig[3].color, 0.1),
                      },
                    }}
                  >
                    Agregar
                  </Button>
                </Stack>

                {acreenciasFields.length === 0 ? (
                  <Box
                    sx={{
                      py: 6,
                      textAlign: 'center',
                      color: 'text.secondary',
                    }}
                  >
                    <WarningIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                    <Typography variant="body1">
                      No hay acreencias agregadas. Haga clic en "Agregar" para comenzar.
                    </Typography>
                  </Box>
                ) : (
                  <Stack spacing={2}>
                    {acreenciasFields.map((field, index) => {
                      const capital = parseFloat(watch(`acreencias.${index}.capital`)) || 0;
                      const interesCorriente = parseFloat(watch(`acreencias.${index}.valorTotalInteresCorriente`)) || 0;
                      const interesMoratorio = parseFloat(watch(`acreencias.${index}.valorTotalInteresMoratorio`)) || 0;
                      const cuantiaTotal = capital + interesCorriente + interesMoratorio;

                      return (
                        <Box key={field.id}>
                          <GlassCard
                            sx={{
                              border: `1px solid ${alpha(tabsConfig[3].color, 0.2)}`,
                            }}
                          >
                            <Box sx={{ p: 2 }}>
                              <Stack spacing={2}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                  <Chip
                                    label={`Acreencia #${index + 1}`}
                                    size="small"
                                    sx={{
                                      background: alpha(tabsConfig[3].color, 0.1),
                                      color: tabsConfig[3].color,
                                      fontWeight: 600,
                                    }}
                                  />
                                  <IconButton
                                    onClick={() => removeAcreencia(index)}
                                    size="small"
                                    sx={{
                                      color: theme.palette.error.main,
                                      '&:hover': {
                                        background: alpha(theme.palette.error.main, 0.1),
                                      },
                                    }}
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </Stack>

                                <Grid container spacing={2}>
                                  <Grid item xs={12}>
                                    <FormControl fullWidth error={!!errors.acreencias?.[index]?.acreedor}>
                                      <Controller
                                        name={`acreencias.${index}.acreedor`}
                                        control={control}
                                        rules={{ required: "Campo requerido" }}
                                        render={({ field }) => {
                                          const options = acreedoresData?.rows?.map((a) => ({
                                            value: a._id,
                                            label: a.nombre,
                                          })) || [];
                                          return (
                                            <>
                                              <ReactSelect
                                                {...field}
                                                isClearable
                                                options={options}
                                                value={options.find(option => option.value === field.value)}
                                                onChange={option => field.onChange(option ? option.value : '')}
                                                isLoading={isLoading}
                                                placeholder="Selecciona un acreedor..."
                                                menuPortalTarget={document.body}
                                                styles={{
                                                  control: (base) => ({
                                                    ...base,
                                                    backgroundColor: '#f9fafb',
                                                    border: '1px solid #d1d5db',
                                                    borderRadius: 8,
                                                    minHeight: 48,
                                                    fontSize: '15px',
                                                    paddingLeft: 2,
                                                    boxShadow: 'none',
                                                    '&:hover': { borderColor: '#9ca3af' },
                                                  }),
                                                  menuPortal: (base) => ({
                                                    ...base,
                                                    zIndex: 9999,
                                                  }),
                                                  menu: (base) => ({
                                                    ...base,
                                                    width: "max-content",
                                                    minWidth: "100%",
                                                  }),
                                                }}
                                              />
                                              {errors.acreencias?.[index]?.acreedor && (
                                                <FormHelperText>{errors.acreencias?.[index]?.acreedor?.message}</FormHelperText>
                                              )}
                                            </>
                                          );
                                        }}
                                      />
                                    </FormControl>
                                  </Grid>

                                  <Grid item xs={12} sm={4}>
                                    <FormControl fullWidth error={!!errors.acreencias?.[index]?.tipoAcreencia}>
                                      <InputLabel>Tipo de Acreencia</InputLabel>
                                      <Controller
                                        name={`acreencias.${index}.tipoAcreencia`}
                                        control={control}
                                        defaultValue=""
                                        rules={{ required: 'Campo requerido' }}
                                        render={({ field }) => (
                                          <Select
                                            {...field}
                                            label="Tipo de Acreencia"
                                            sx={selectSx}
                                          >
                                            <MenuItem value="Deudor">Deudor</MenuItem>
                                            <MenuItem value="Codeudor">Codeudor</MenuItem>
                                            <MenuItem value="Avalista">Avalista</MenuItem>
                                            <MenuItem value="Fiador">Fiador</MenuItem>
                                            <MenuItem value="Desconozco esta Información">Desconozco esta Información</MenuItem>
                                            <MenuItem value="Otro">Otro</MenuItem>
                                          </Select>
                                        )}
                                      />
                                      {errors.acreencias?.[index]?.tipoAcreencia && <FormHelperText>{errors.acreencias?.[index]?.tipoAcreencia?.message}</FormHelperText>}
                                    </FormControl>
                                  </Grid>
                                  {watch(`acreencias.${index}.tipoAcreencia`) === 'Otro' && (
                                    <Grid item xs={12} sm={8}>
                                      <GlassTextField
                                        {...register(`acreencias.${index}.otroTipoAcreencia`, { required: 'Campo requerido' })}
                                        label="Descripción del Tipo de Acreencia"
                                        fullWidth
                                      />
                                    </Grid>
                                  )}

                                  <Grid item xs={12} sm={8}>
                                    <FormControl fullWidth error={!!errors.acreencias?.[index]?.naturalezaCredito}>
                                      <InputLabel>Naturaleza del Crédito</InputLabel>
                                      <Controller
                                        name={`acreencias.${index}.naturalezaCredito`}
                                        control={control}
                                        defaultValue=""
                                        rules={{ required: 'Campo requerido' }}
                                        render={({ field }) => (
                                          <Select
                                            {...field}
                                            label="Naturaleza del Crédito"
                                            sx={selectSx}
                                            MenuProps={menuProps}
                                          >
                                            <MenuItem value="Primera Clase: Alimentos de Menores">Primera Clase: Alimentos de Menores</MenuItem>
                                            <MenuItem value="Primera Clase: Obligaciones Laborales">Primera Clase: Obligaciones Laborales</MenuItem>
                                            <MenuItem value="Primera Clase: Obligaciones con el Fisco">Primera Clase: Obligaciones con el Fisco</MenuItem>
                                            <MenuItem value="Segunda Clase: Prendario">Segunda Clase: Prendario</MenuItem>
                                            <MenuItem value="Tercera Clase: Hipotecarios - Escritura">Tercera Clase: Hipotecarios - Escritura</MenuItem>
                                            <MenuItem value="Cuarta Clase: Proveedores Estratégicos">Cuarta Clase: Proveedores Estratégicos</MenuItem>
                                            <MenuItem value="Quinta clase: Quirografarios - Letras">Quinta clase: Quirografarios - Letras</MenuItem>
                                            <MenuItem value="Quinta clase: Quirografarios - Pagaré">Quinta clase: Quirografarios - Pagaré</MenuItem>
                                            <MenuItem value="Quinta clase: Quirografarios - Cheque">Quinta clase: Quirografarios - Cheque</MenuItem>
                                            <MenuItem value="Quinta clase: Quirografarios - Factura">Quinta clase: Quirografarios - Factura</MenuItem>
                                            <MenuItem value="Quinta clase: Quirografarios - Sentencia Judicial">Quinta clase: Quirografarios - Sentencia Judicial</MenuItem>
                                            <MenuItem value="Quinta clase: Quirografarios - Leasing">Quinta clase: Quirografarios - Leasing</MenuItem>
                                            <MenuItem value="Quinta clase: Quirografarios - Leasing - Vehículo">Quinta clase: Quirografarios - Leasing - Vehículo</MenuItem>
                                            <MenuItem value="Quinta clase: Quirografarios - Leasing - Maquinaria">Quinta clase: Quirografarios - Leasing - Maquinaria</MenuItem>
                                            <MenuItem value="Quinta clase: Sin Documento">Quinta clase: Sin Documento</MenuItem>
                                            <MenuItem value="Quinta clase: Cánones Vencidos de los Contratos de Leasing">Quinta clase: Cánones Vencidos de los Contratos de Leasing</MenuItem>
                                          </Select>
                                        )}
                                      />
                                      {errors.acreencias?.[index]?.naturalezaCredito && <FormHelperText>{errors.acreencias?.[index]?.naturalezaCredito?.message}</FormHelperText>}
                                    </FormControl>
                                  </Grid>

                                  <Grid item xs={12}>
                                    <GlassTextField
                                      {...register(`acreencias.${index}.descripcionCredito`, { required: 'Campo requerido' })}
                                      label="Descripción del Crédito"
                                      fullWidth
                                      error={!!errors.acreencias?.[index]?.descripcionCredito}
                                      helperText={errors.acreencias?.[index]?.descripcionCredito?.message}
                                    />
                                  </Grid>
                                  <Grid item xs={6} sm={3}>
                                    <GlassTextField
                                      {...register(`acreencias.${index}.capital`, { required: 'Campo requerido' })}
                                      label="Valor en Capital"
                                      type="number"
                                      fullWidth
                                      error={!!errors.acreencias?.[index]?.capital}
                                      helperText={errors.acreencias?.[index]?.capital?.message}
                                    />
                                  </Grid>
                                  <Grid item xs={6} sm={3}>
                                    <GlassTextField
                                      {...register(`acreencias.${index}.valorTotalInteresCorriente`)}
                                      label="Valor Total Interés Corriente"
                                      type="number"
                                      fullWidth
                                      sx={{ minWidth: 250 }}
                                    />
                                  </Grid>
                                  <Grid item xs={6} sm={3}>
                                    <GlassTextField
                                      {...register(`acreencias.${index}.tasaInteresCorriente`)}
                                      label="Tasa de Interés Corriente"
                                      fullWidth
                                      sx={{ minWidth: 250 }}
                                    />
                                  </Grid>
                                  <Grid item xs={6} sm={3}>
                                    <FormControl fullWidth>
                                      <InputLabel>Tipo de Interés Corriente</InputLabel>
                                      <Controller
                                        name={`acreencias.${index}.tipoInteresCorriente`}
                                        control={control}
                                        defaultValue=""
                                        render={({ field }) => (
                                          <Select
                                            {...field}
                                            label="Tipo de Interés Corriente"
                                            sx={selectSx}
                                          >
                                            <MenuItem value="Efectivo Anual">Efectivo Anual</MenuItem>
                                            <MenuItem value="Efectivo Mensual">Efectivo Mensual</MenuItem>
                                            <MenuItem value="Nominal Mensual">Nominal Mensual</MenuItem>
                                            <MenuItem value="Nominal Anual">Nominal Anual</MenuItem>
                                          </Select>
                                        )}
                                      />
                                    </FormControl>
                                  </Grid>
                                  <Grid item xs={12}>
                                    <Controller
                                      name={`acreencias.${index}.pagoPorLibranza`}
                                      control={control}
                                      render={({ field }) => (
                                        <FormControlLabel
                                          control={
                                            <Checkbox
                                              {...field}
                                              checked={field.value}
                                            />
                                          }
                                          label="¿El pago del crédito se está realizando mediante libranza o cualquier otro tipo de descuento por nómina?"
                                        />
                                      )}
                                    />
                                  </Grid>
                                  <Grid item xs={12}>
                                    <Controller
                                      name={`acreencias.${index}.creditoPostergado`}
                                      control={control}
                                      render={({ field }) => (
                                        <FormControlLabel
                                          control={
                                            <Checkbox
                                              {...field}
                                              checked={field.value}
                                            />
                                          }
                                          label={
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                              Condición de crédito legalmente postergado (Artículo 572A, Causal 1).
                                              <Tooltip
                                                title="(Artículo 572A, Causal 1) Deudas cuyo titular sea el cónyuge del deudor o sus parientes hasta el cuarto grado de consanguinidad, segundo de afinidad o único civil."
                                              >
                                                <InfoIcon sx={{ ml: 1, fontSize: '1rem' }} />
                                              </Tooltip>
                                            </Box>
                                          }
                                        />
                                      )}
                                    />
                                  </Grid>
                                  <Grid item xs={6} sm={4}>
                                    <Controller
                                      name={`acreencias.${index}.creditoEnMora`}
                                      control={control}
                                      render={({ field }) => (
                                        <FormControlLabel
                                          control={
                                            <Checkbox
                                              {...field}
                                              checked={field.value}
                                              onChange={(e) => {
                                                const isChecked = e.target.checked;
                                                field.onChange(isChecked);
                                                if (isChecked) {
                                                  setValue(`acreencias.${index}.moraMas90Dias`, true);
                                                  setValue(`acreencias.${index}.diasDeMora`, '');
                                                }
                                              }}
                                            />
                                          }
                                          label="¿El crédito está en mora?"
                                        />
                                      )}
                                    />
                                  </Grid>
                                  {watch(`acreencias.${index}.creditoEnMora`) && (
                                    <>
                                      {!watch(`acreencias.${index}.moraMas90Dias`) && (
                                        <Grid item xs={6} sm={4}>
                                          <Controller
                                            name={`acreencias.${index}.diasDeMora`}
                                            control={control}
                                            render={({ field, fieldState: { error } }) => (
                                              <GlassTextField
                                                {...field}
                                                label="Días de mora"
                                                type="number"
                                                fullWidth
                                                error={!!error}
                                                helperText={error?.message}
                                                onChange={(e) => {
                                                  field.onChange(e);
                                                  const dias = e.target.value;
                                                  if (dias && dias >= 0) {
                                                    const today = new Date();
                                                    today.setDate(today.getDate() - parseInt(dias, 10));
                                                    const year = today.getFullYear();
                                                    const month = String(today.getMonth() + 1).padStart(2, '0');
                                                    const day = String(today.getDate()).padStart(2, '0');
                                                    const fechaVencimientoCalculada = `${year}-${month}-${day}`;
                                                    if (getValues(`acreencias.${index}.fechaVencimiento`) !== fechaVencimientoCalculada) {
                                                      setValue(`acreencias.${index}.fechaVencimiento`, fechaVencimientoCalculada);
                                                    }
                                                  } else {
                                                    if (getValues(`acreencias.${index}.fechaVencimiento`) !== '') {
                                                      setValue(`acreencias.${index}.fechaVencimiento`, '');
                                                    }
                                                  }
                                                }}
                                              />
                                            )}
                                          />
                                        </Grid>
                                      )}
                                      <Grid item xs={12} sm={4}>
                                        <Controller
                                          name={`acreencias.${index}.moraMas90Dias`}
                                          control={control}
                                          render={({ field }) => (
                                            <FormControlLabel
                                              control={
                                                <Checkbox
                                                  {...field}
                                                  checked={field.value}
                                                  onChange={(e) => {
                                                    const isChecked = e.target.checked;
                                                    if (isChecked) {
                                                      const fechaVencimientoStr = getValues(`acreencias.${index}.fechaVencimiento`);
                                                      if (fechaVencimientoStr) {
                                                        const today = new Date();
                                                        today.setHours(0, 0, 0, 0);
                                                        const fechaVencimiento = new Date(fechaVencimientoStr);
                                                        if (!isNaN(fechaVencimiento.getTime()) && fechaVencimiento < today) {
                                                          const diffTime = Math.abs(today - fechaVencimiento);
                                                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                                          if (diffDays <= 90) {
                                                            setError(`acreencias.${index}.fechaVencimiento`, {
                                                              type: 'manual',
                                                              message: 'La fecha indica menos de 90 días de mora.'
                                                            });
                                                            return;
                                                          }
                                                        }
                                                      }
                                                      clearErrors(`acreencias.${index}.fechaVencimiento`);
                                                      clearErrors(`acreencias.${index}.diasDeMora`);
                                                      setValue(`acreencias.${index}.diasDeMora`, '');
                                                    } else {
                                                      clearErrors(`acreencias.${index}.fechaVencimiento`);
                                                    }
                                                    field.onChange(isChecked);
                                                  }}
                                                />
                                              }
                                              label="¿Mora por más de 90 días?"
                                            />
                                          )}
                                        />
                                      </Grid>
                                      <Grid item xs={6} sm={4}>
                                        <GlassTextField
                                          {...register(`acreencias.${index}.valorTotalInteresMoratorio`)}
                                          label="Valor Total Interés Moratorio"
                                          type="number"
                                          fullWidth
                                          sx={{ minWidth: 250 }}
                                        />
                                      </Grid>
                                      <Grid item xs={6} sm={4}>
                                        <GlassTextField
                                          {...register(`acreencias.${index}.tasaInteresMoratorio`)}
                                          label="Tasa de Interés Moratorio"
                                          fullWidth
                                          sx={{ minWidth: 250 }}
                                        />
                                      </Grid>
                                      <Grid item xs={6} sm={4}>
                                        <FormControl fullWidth>
                                          <InputLabel>Tipo de Interés Moratorio</InputLabel>
                                          <Controller
                                            name={`acreencias.${index}.tipoInteresMoratorio`}
                                            control={control}
                                            defaultValue=""
                                            render={({ field: selectField }) => (
                                              <Select
                                                {...selectField}
                                                label="Tipo de Interés Moratorio"
                                                sx={selectSx}
                                              >
                                                <MenuItem value="Efectivo Anual">Efectivo Anual</MenuItem>
                                                <MenuItem value="Efectivo Mensual">Efectivo Mensual</MenuItem>
                                                <MenuItem value="Nominal Mensual">Nominal Mensual</MenuItem>
                                                <MenuItem value="Nominal Anual">Nominal Anual</MenuItem>
                                              </Select>
                                            )}
                                          />
                                        </FormControl>
                                      </Grid>
                                    </>
                                  )}

                                  <Grid item xs={6} sm={6}>
                                    <GlassTextField
                                      {...register(`acreencias.${index}.fechaOtorgamiento`)}
                                      label="Fecha de Otorgamiento"
                                      type="date"
                                      InputLabelProps={{ shrink: true }}
                                      fullWidth
                                    />
                                  </Grid>
                                  <Grid item xs={6} sm={6}>
                                    <GlassTextField
                                      {...register(`acreencias.${index}.fechaVencimiento`, {
                                        onChange: (e) => {
                                          const fechaVencimientoStr = e.target.value;
                                          const acreencia = getValues(`acreencias.${index}`);
                                          if (acreencia.creditoEnMora && fechaVencimientoStr) {
                                            const today = new Date();
                                            today.setHours(0, 0, 0, 0);
                                            const fechaVencimiento = new Date(fechaVencimientoStr);
                                            if (acreencia.moraMas90Dias) {
                                              if (!isNaN(fechaVencimiento.getTime()) && fechaVencimiento < today) {
                                                const diffTime = Math.abs(today - fechaVencimiento);
                                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                                if (diffDays <= 90) {
                                                  setError(`acreencias.${index}.fechaVencimiento`, {
                                                    type: 'manual',
                                                    message: 'La fecha debe ser > 90 días.'
                                                  });
                                                } else {
                                                  clearErrors(`acreencias.${index}.fechaVencimiento`);
                                                }
                                              }
                                            } else {
                                              clearErrors(`acreencias.${index}.fechaVencimiento`);
                                              if (!isNaN(fechaVencimiento.getTime()) && fechaVencimiento < today) {
                                                const diffTime = Math.abs(today - fechaVencimiento);
                                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                                if (String(getValues(`acreencias.${index}.diasDeMora`)) !== String(diffDays)) {
                                                  setValue(`acreencias.${index}.diasDeMora`, diffDays);
                                                }
                                              } else {
                                                if (String(getValues(`acreencias.${index}.diasDeMora`)) !== '0') {
                                                  setValue(`acreencias.${index}.diasDeMora`, 0);
                                                }
                                              }
                                            }
                                          }
                                        }
                                      })}
                                      label="Fecha de Vencimiento"
                                      type="date"
                                      InputLabelProps={{ shrink: true }}
                                      fullWidth
                                      error={!!errors.acreencias?.[index]?.fechaVencimiento}
                                      helperText={errors.acreencias?.[index]?.fechaVencimiento?.message}
                                    />
                                  </Grid>

                                  <Grid item xs={12}>
                                    <Box
                                      sx={{
                                        p: 2,
                                        borderRadius: '12px',
                                        background: alpha(theme.palette.info.main, 0.05),
                                        border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                                      }}
                                    >
                                      <Stack direction="row" spacing={1} alignItems="center">
                                        <AttachMoneyIcon sx={{ color: theme.palette.info.main }} />
                                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                          Cuantía Total:
                                        </Typography>
                                        <Typography variant="h6" sx={{ color: theme.palette.info.main, fontWeight: 700 }}>
                                          {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(cuantiaTotal)}
                                        </Typography>
                                      </Stack>
                                    </Box>
                                  </Grid>
                                </Grid>
                              </Stack>
                            </Box>
                          </GlassCard>
                        </Box>
                      );
                    })}
                  </Stack>
                )}

                {/* Vista previa de Acreencias */}
                <Stack direction="row" justifyContent="flex-end">
                  <Button
                    variant="contained"
                    onClick={() => setIsAcreenciasModalOpen(true)}
                    startIcon={<AccountBalanceIcon />}
                    sx={{
                      borderRadius: '12px',
                      fontWeight: 600,
                      textTransform: 'none',
                      background: `linear-gradient(135deg, ${tabsConfig[3].color}, ${alpha(tabsConfig[3].color, 0.7)})`,
                      '&:hover': {
                        background: `linear-gradient(135deg, ${alpha(tabsConfig[3].color, 0.9)}, ${alpha(tabsConfig[3].color, 0.6)})`,
                        transform: 'translateY(-2px)',
                      },
                    }}
                  >
                    Ver Relación de Acreencias
                  </Button>
                </Stack>

                {/* Análisis de Requisitos */}
                <GlassCard
                  hover={false}
                  sx={{
                    border: `2px solid ${alpha(cumpleRequisitos ? theme.palette.success.main : theme.palette.error.main, 0.3)}`,
                    background: `linear-gradient(135deg, ${alpha(cumpleRequisitos ? theme.palette.success.main : theme.palette.error.main, 0.1)} 0%, ${alpha(cumpleRequisitos ? theme.palette.success.main : theme.palette.error.main, 0.05)} 100%)`,
                  }}
                >
                  <Box sx={{ p: 3 }}>
                    <Stack spacing={2}>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{ bgcolor: alpha(cumpleRequisitos ? theme.palette.success.main : theme.palette.error.main, 0.1) }}>
                          {cumpleRequisitos ? <VerifiedIcon sx={{ color: theme.palette.success.main }} /> : <WarningIcon sx={{ color: theme.palette.error.main }} />}
                        </Avatar>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          Análisis de Requisitos de Liquidación
                        </Typography>
                      </Stack>

                      <Divider />

                      <Grid container spacing={2}>
                        <Grid item xs={6} sm={4}>
                          <Box sx={{ textAlign: 'center', p: 2, borderRadius: '12px', background: 'rgba(255, 255, 255, 0.05)' }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Total Capital</Typography>
                            <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5 }}>
                              {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(totalCapital)}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6} sm={4}>
                          <Box sx={{ textAlign: 'center', p: 2, borderRadius: '12px', background: 'rgba(255, 255, 255, 0.05)' }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Capital en Mora (&gt;90 días)</Typography>
                            <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5 }}>
                              {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(capitalObligaciones)}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Box sx={{ textAlign: 'center', p: 2, borderRadius: '12px', background: 'rgba(255, 255, 255, 0.05)' }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>% en Mora (&gt;90 días)</Typography>
                            <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5 }}>
                              {porcentajeMora.toFixed(2)}%
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>

                      <Stack spacing={1}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          {validacionLiquidacion.alMenosUnaAcreencia ? (
                            <CheckCircleIcon sx={{ color: theme.palette.success.main, fontSize: 20 }} />
                          ) : (
                            <ErrorIcon sx={{ color: theme.palette.error.main, fontSize: 20 }} />
                          )}
                          <Typography variant="body2" sx={{ color: validacionLiquidacion.alMenosUnaAcreencia ? 'text.primary' : 'text.secondary' }}>
                            Al menos una acreencia registrada
                          </Typography>
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center">
                          {validacionLiquidacion.hayObligacionesEnMora ? (
                            <CheckCircleIcon sx={{ color: theme.palette.success.main, fontSize: 20 }} />
                          ) : (
                            <ErrorIcon sx={{ color: theme.palette.error.main, fontSize: 20 }} />
                          )}
                          <Typography variant="body2" sx={{ color: validacionLiquidacion.hayObligacionesEnMora ? 'text.primary' : 'text.secondary' }}>
                            Obligaciones en mora por más de 90 días
                          </Typography>
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center">
                          {validacionLiquidacion.capitalObligacionesEnMora ? (
                            <CheckCircleIcon sx={{ color: theme.palette.success.main, fontSize: 20 }} />
                          ) : (
                            <ErrorIcon sx={{ color: theme.palette.error.main, fontSize: 20 }} />
                          )}
                          <Typography variant="body2" sx={{ color: validacionLiquidacion.capitalObligacionesEnMora ? 'text.primary' : 'text.secondary' }}>
                            Capital en mora por más de 90 días
                          </Typography>
                        </Stack>
                      </Stack>

                      <Box
                        sx={{
                          p: 2,
                          borderRadius: '12px',
                          background: alpha(cumpleRequisitos ? theme.palette.success.main : theme.palette.error.main, 0.1),
                          textAlign: 'center',
                        }}
                      >
                        <Typography variant="h6" sx={{ color: cumpleRequisitos ? 'success.main' : 'error.main', fontWeight: 700 }}>
                          {cumpleRequisitos ? '✓ CUMPLE CON LOS REQUISITOS' : '✗ NO CUMPLE LOS REQUISITOS'}
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>
                </GlassCard>
                <Button
                  variant="contained"
                  onClick={() => handleSaveSection('acreencias', 4)}
                  disabled={isSaving}
                  startIcon={isSaving ? null : <SaveIcon />}
                  sx={{
                    mt: 2,
                    py: 1.5,
                    px: 4,
                    borderRadius: '12px',
                    fontWeight: 600,
                    textTransform: 'none',
                    background: `linear-gradient(135deg, ${tabsConfig[3].color}, ${alpha(tabsConfig[3].color, 0.7)})`,
                    '&:hover': {
                      background: `linear-gradient(135deg, ${alpha(tabsConfig[3].color, 0.9)}, ${alpha(tabsConfig[3].color, 0.6)})`,
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  {isSaving ? 'Guardando...' : 'Guardar y Continuar'}
                </Button>
              </Stack>
            </Box>
          </GlassCard>
        </TabPanel>

        <TabPanel value={tabValue} index={4}>
          <Stack spacing={3}>
            {procesosFields.map((field, index) => (
              <GlassCard key={field.id} sx={{ p: 3 }}>
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Chip avatar={<Avatar><AccountBalanceIcon /></Avatar>} label={`Proceso Judicial #${index + 1}`} />
                    <IconButton onClick={() => removeProceso(index)} size="small"><DeleteIcon /></IconButton>
                  </Stack>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}><GlassTextField {...register(`procesosJudiciales.${index}.tipoProceso`, { required: 'Campo requerido' })} label="Tipo de Proceso" fullWidth error={errors.procesosJudiciales?.[index]?.tipoProceso} helperText={errors.procesosJudiciales?.[index]?.tipoProceso?.message} /></Grid>
                    <Grid item xs={12} sm={6}><GlassTextField {...register(`procesosJudiciales.${index}.juzgado`, { required: 'Campo requerido' })} label="Juzgado / Entidad" fullWidth error={errors.procesosJudiciales?.[index]?.juzgado} helperText={errors.procesosJudiciales?.[index]?.juzgado?.message} /></Grid>
                    <Grid item xs={12} sm={6}><GlassTextField {...register(`procesosJudiciales.${index}.radicado`, { required: 'Campo requerido' })} label="Número de Radicación" fullWidth error={errors.procesosJudiciales?.[index]?.radicado} helperText={errors.procesosJudiciales?.[index]?.radicado?.message} /></Grid>
                    <Grid item xs={12} sm={6}><GlassTextField {...register(`procesosJudiciales.${index}.estado`, { required: 'Campo requerido' })} label="Estado del Proceso" fullWidth error={errors.procesosJudiciales?.[index]?.estado} helperText={errors.procesosJudiciales?.[index]?.estado?.message} /></Grid>
                    <Grid item xs={12} sm={6}><GlassTextField {...register(`procesosJudiciales.${index}.demandante`, { required: 'Campo requerido' })} label="Demandante" fullWidth error={errors.procesosJudiciales?.[index]?.demandante} helperText={errors.procesosJudiciales?.[index]?.demandante?.message} /></Grid>
                    <Grid item xs={12} sm={6}><GlassTextField {...register(`procesosJudiciales.${index}.demandado`, { required: 'Campo requerido' })} label="Demandado" fullWidth error={errors.procesosJudiciales?.[index]?.demandado} helperText={errors.procesosJudiciales?.[index]?.demandado?.message} /></Grid>
                    <Grid item xs={12} sm={6}><GlassTextField {...register(`procesosJudiciales.${index}.valor`, { valueAsNumber: true })} label="Valor ($)" type="number" fullWidth /></Grid>
                    <Grid item xs={12} sm={6}><GlassTextField {...register(`procesosJudiciales.${index}.departamento`)} label="Departamento" fullWidth /></Grid>
                    <Grid item xs={12} sm={6}><GlassTextField {...register(`procesosJudiciales.${index}.ciudad`)} label="Ciudad" fullWidth /></Grid>
                    <Grid item xs={12} sm={6}><GlassTextField {...register(`procesosJudiciales.${index}.direccionJuzgado`)} label="Dirección del Juzgado" fullWidth /></Grid>
                    <Grid item xs={12} sm={6}><GlassTextField {...register(`procesosJudiciales.${index}.emailJuzgado`, { pattern: { value: /^\S+@\S+$/i, message: 'Email inválido' } })} label="Dirección Electrónica del Juzgado" type="email" fullWidth error={errors.procesosJudiciales?.[index]?.emailJuzgado} helperText={errors.procesosJudiciales?.[index]?.emailJuzgado?.message} /></Grid>
                  </Grid>
                </Stack>
              </GlassCard>
            ))}
            <Button variant="outlined" onClick={() => appendProceso({})} startIcon={<AddIcon />}>Añadir Proceso Judicial</Button>
            <Button variant="contained" onClick={() => handleSaveSection('procesosJudiciales', 5)} disabled={isSaving} startIcon={<SaveIcon />} sx={{ mt: 2 }}>
              {isSaving ? 'Guardando...' : 'Guardar y Continuar'}
            </Button>
          </Stack>
        </TabPanel>

        <TabPanel value={tabValue} index={5}>
          <GlassCard sx={{ p: 3 }}>
            <Stack spacing={4}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{ bgcolor: alpha(tabsConfig[5].color, 0.1), color: tabsConfig[5].color }}>
                  <TrendingUpIcon />
                </Avatar>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Información Financiera y Obligaciones Alimentarias
                </Typography>
              </Stack>

              {/* Ingresos */}
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Relación de Ingresos
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <GlassTextField
                      {...register('informacionFinanciera.ingresosActividadPrincipal', { required: 'Campo requerido' })}
                      label="Ingresos Mensuales por Actividad Principal"
                      type="number"
                      fullWidth
                      error={!!errors.informacionFinanciera?.ingresosActividadPrincipal}
                      helperText={errors.informacionFinanciera?.ingresosActividadPrincipal?.message} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <GlassTextField
                      {...register('informacionFinanciera.descripcionActividadEconomica', { required: 'Campo requerido' })}
                      label="Descripción de la Actividad Económica"
                      fullWidth
                      error={!!errors.informacionFinanciera?.descripcionActividadEconomica}
                      helperText={errors.informacionFinanciera?.descripcionActividadEconomica?.message} />
                  </Grid>
                  <Grid item xs={6} sm={6}>
                    <Controller
                      name="informacionFinanciera.tieneEmpleo"
                      control={control}
                      rules={{ required: 'Campo requerido' }}
                      render={({ field }) => (
                        <FormControlLabel
                          control={
                            <Checkbox
                              {...field}
                              checked={field.value}
                            />
                          }
                          label="¿Es empleado?"
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={6} sm={6}>
                    <GlassTextField
                      {...register('informacionFinanciera.tipoEmpleo', { required: 'Campo requerido' })}
                      label="Tipo de Empleo (Formal/Informal)"
                      fullWidth
                      error={!!errors.informacionFinanciera?.tipoEmpleo}
                      helperText={errors.informacionFinanciera?.tipoEmpleo?.message} />
                  </Grid>
                  <Grid item xs={12}>
                    <GlassTextField
                      {...register('informacionFinanciera.ingresosOtrasActividades', { required: 'Campo requerido' })}
                      type="number"
                      label="Ingresos por Otras Actividades"
                      fullWidth
                      error={!!errors.informacionFinanciera?.ingresosOtrasActividades}
                      helperText={errors.informacionFinanciera?.ingresosOtrasActividades?.message || "Si no posee, escriba 'No poseo'"} />
                  </Grid>
                </Grid>
              </Box>

              {/* Gastos */}
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Relación de Gastos de Subsistencia
                </Typography>
                <Grid container spacing={2}>
                  {[
                    { name: 'alimentacion', label: 'Alimentación' },
                    { name: 'salud', label: 'Salud' },
                    { name: 'arriendo', label: 'Arriendo o Cuota Vivienda' },
                    { name: 'serviciosPublicos', label: 'Servicios Públicos' },
                    { name: 'educacion', label: 'Educación' },
                    { name: 'transporte', label: 'Transporte' },
                    { name: 'conservacionBienes', label: 'Conservación de Bienes' },
                    { name: 'cuotaLeasingHabitacional', label: 'Cuota De Leasing Habitacional' },
                    { name: 'arriendoOficina', label: 'Arriendo Oficina/consultorio' },
                    { name: 'cuotaSeguridadSocial', label: 'Cuota De Seguridad Social' },
                    { name: 'cuotaAdminPropiedadHorizontal', label: 'Cuota De Administración Propiedad Horizontal' },
                    { name: 'cuotaLeasingVehiculo', label: 'Cuota De Leasing Vehículo' },
                    { name: 'cuotaLeasingOficina', label: 'Cuota De Leasing Oficina/consultorio' },
                    { name: 'seguros', label: 'Seguros' },
                    { name: 'vestuario', label: 'Vestuario' },
                    { name: 'recreacion', label: 'Recreación' },
                    { name: 'gastosPersonasCargo', label: 'Gastos Personas a Cargo' },
                    { name: 'otros', label: 'Otros Gastos' },
                  ].map((gasto) => (
                    <Grid item xs={6} sm={4} key={gasto.name}>
                      <GlassTextField
                        {...register(`informacionFinanciera.gastosPersonales.${gasto.name}`)}
                        label={gasto.label}
                        type="number"
                        fullWidth
                        InputProps={{
                          readOnly: gasto.name === 'gastosPersonasCargo',
                        }}
                        InputLabelProps={gasto.name === 'gastosPersonasCargo' ? { shrink: true } : {}}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Box>

              {/* Obligaciones Alimentarias */}
              <Box>
                <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Obligaciones Alimentarias
                  </Typography>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      appendObligacion({ beneficiario: '', tipoIdentificacion: '', numeroIdentificacion: '', parentesco: '', cuantia: '', periodoPago: '', estadoObligacion: '', obligacionDemandada: false, paisResidencia: '', departamento: '', ciudad: '', direccion: '', emailBeneficiario: '' });
                      setTimeout(updateGastosPersonasCargo, 0);
                    }}
                    startIcon={<AddIcon />}
                    size="small"
                    sx={{
                      borderRadius: '12px',
                      borderColor: alpha(tabsConfig[5].color, 0.3),
                      color: tabsConfig[5].color,
                      '&:hover': {
                        borderColor: tabsConfig[5].color,
                        background: alpha(tabsConfig[5].color, 0.1),
                      },
                    }}
                  >
                    Agregar
                  </Button>
                </Stack>

                {obligacionesFields.length === 0 ? (
                  <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
                    <Typography variant="body2">No hay obligaciones alimentarias agregadas</Typography>
                  </Box>
                ) : (
                  <Stack spacing={2}>
                    {obligacionesFields.map((field, index) => (
                      <Box key={field.id}>
                        <GlassCard sx={{ border: `1px solid ${alpha(tabsConfig[5].color, 0.2)}` }}>
                          <Box sx={{ p: 2 }}>
                            <Stack spacing={2}>
                              <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Chip
                                  label={`Obligación #${index + 1}`}
                                  size="small"
                                  sx={{
                                    background: alpha(tabsConfig[5].color, 0.1),
                                    color: tabsConfig[5].color,
                                    fontWeight: 600,
                                  }} />
                                <IconButton
                                  onClick={() => {
                                    removeObligacion(index);
                                    setTimeout(updateGastosPersonasCargo, 0);
                                  }}
                                  size="small"
                                  sx={{
                                    color: theme.palette.error.main,
                                    '&:hover': { background: alpha(theme.palette.error.main, 0.1) },
                                  }}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Stack>

                              <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                  <GlassTextField
                                    {...register(`informacionFinanciera.obligacionesAlimentarias.${index}.beneficiario`, { required: 'Campo requerido' })}
                                    label="Beneficiario"
                                    fullWidth
                                    error={!!errors.informacionFinanciera?.obligacionesAlimentarias?.[index]?.beneficiario} />
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                  <FormControl fullWidth error={!!errors.informacionFinanciera?.obligacionesAlimentarias?.[index]?.tipoIdentificacion}>
                                    <InputLabel>Tipo de Identificación</InputLabel>
                                    <Controller
                                      name={`informacionFinanciera.obligacionesAlimentarias.${index}.tipoIdentificacion`}
                                      control={control}
                                      defaultValue=""
                                      rules={{ required: 'Campo requerido' }}
                                      render={({ field }) => (
                                        <Select
                                          {...field}
                                          sx={selectSx}
                                        >
                                          <MenuItem value="Cedula de Ciudadanía">Cedula de Ciudadanía</MenuItem>
                                          <MenuItem value="Cedula de Extranjeria">Cedula de Extranjeria</MenuItem>
                                          <MenuItem value="Numero de Identificación de Extranjero">Numero de Identificación de Extranjero</MenuItem>
                                          <MenuItem value="Pasaporte">Pasaporte</MenuItem>
                                          <MenuItem value="Registro Civil">Registro Civil</MenuItem>
                                          <MenuItem value="Tarjeta de Identidad">Tarjeta de Identidad</MenuItem>
                                        </Select>
                                      )}
                                    />
                                    {errors.informacionFinanciera?.obligacionesAlimentarias?.[index]?.tipoIdentificacion && <FormHelperText>{errors.informacionFinanciera?.obligacionesAlimentarias?.[index]?.tipoIdentificacion?.message}</FormHelperText>}
                                  </FormControl>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                  <GlassTextField
                                    {...register(`informacionFinanciera.obligacionesAlimentarias.${index}.numeroIdentificacion`, { required: 'Campo requerido' })}
                                    label="Número de Identificación"
                                    fullWidth
                                    error={!!errors.informacionFinanciera?.obligacionesAlimentarias?.[index]?.numeroIdentificacion} />
                                </Grid>
                                <Grid item xs={6} sm={4}>
                                  <GlassTextField
                                    {...register(`informacionFinanciera.obligacionesAlimentarias.${index}.parentesco`, { required: 'Campo requerido' })}
                                    label="Parentesco"
                                    fullWidth
                                    error={!!errors.informacionFinanciera?.obligacionesAlimentarias?.[index]?.parentesco} />
                                </Grid>
                                <Grid item xs={6} sm={4}>
                                  <Controller
                                    name={`informacionFinanciera.obligacionesAlimentarias.${index}.cuantia`}
                                    control={control}
                                    rules={{ required: 'Campo requerido' }}
                                    render={({ field, fieldState: { error } }) => (
                                      <GlassTextField
                                        {...field}
                                        label="Cuantía"
                                        type="number"
                                        fullWidth
                                        error={!!error}
                                        helperText={error?.message}
                                        onChange={(e) => {
                                          field.onChange(e);
                                          updateGastosPersonasCargo();
                                        }}
                                      />
                                    )}
                                  />
                                </Grid>
                                <Grid item xs={6} sm={4}>
                                  <GlassTextField
                                    {...register(`informacionFinanciera.obligacionesAlimentarias.${index}.periodoPago`, { required: 'Campo requerido' })}
                                    label="Periodo de Pago"
                                    fullWidth
                                    error={!!errors.informacionFinanciera?.obligacionesAlimentarias?.[index]?.periodoPago} />
                                </Grid>
                                <Grid item xs={12}>
                                  <GlassTextField
                                    {...register(`informacionFinanciera.obligacionesAlimentarias.${index}.estadoObligacion`, { required: 'Campo requerido' })}
                                    label="Estado de la Obligación"
                                    helperText="Ej: No demandada, En proceso, etc."
                                    fullWidth
                                    error={!!errors.informacionFinanciera?.obligacionesAlimentarias?.[index]?.estadoObligacion} />
                                </Grid>
                                <Grid item xs={12}>
                                  <FormControlLabel
                                    control={<Checkbox {...register(`informacionFinanciera.obligacionesAlimentarias.${index}.obligacionDemandada`)} />}
                                    label="¿La obligación se encuentra demandada?"
                                  />
                                </Grid>
                                <LocationSelector
                                  control={control}
                                  errors={errors}
                                  watch={watch}
                                  setValue={setValue}
                                  showCountry={true}
                                  showDepartment={true}
                                  showCity={true}
                                  countryFieldName={`informacionFinanciera.obligacionesAlimentarias.${index}.paisResidencia`}
                                  departmentFieldName={`informacionFinanciera.obligacionesAlimentarias.${index}.departamento`}
                                  cityFieldName={`informacionFinanciera.obligacionesAlimentarias.${index}.ciudad`}
                                  countryLabel="País de Residencia"
                                  departmentLabel="Departamento"
                                  cityLabel="Ciudad"
                                  countryGridProps={{ xs: 12, sm: 4 }}
                                  departmentGridProps={{ xs: 12, sm: 4 }}
                                  cityGridProps={{ xs: 12, sm: 4 }}
                                />
                                <Grid item xs={12} sm={6}>
                                  <GlassTextField
                                    {...register(`informacionFinanciera.obligacionesAlimentarias.${index}.direccion`, { required: 'Campo requerido' })}
                                    label="Dirección"
                                    fullWidth
                                    error={!!errors.informacionFinanciera?.obligacionesAlimentarias?.[index]?.direccion} />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                  <GlassTextField
                                    {...register(`informacionFinanciera.obligacionesAlimentarias.${index}.emailBeneficiario`)}
                                    label="Correo Electrónico del Beneficiario"
                                    type="email"
                                    fullWidth
                                    error={!!errors.informacionFinanciera?.obligacionesAlimentarias?.[index]?.emailBeneficiario} />
                                </Grid>
                              </Grid>
                            </Stack>
                          </Box>
                        </GlassCard>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Box>

              <FormControlLabel
                control={<Controller name="informacionFinanciera.tieneBienesEmbargables" control={control} render={({ field }) => <Checkbox {...field} checked={!!field.value} />} />}
                label="¿Posee bienes embargables?"
              />

              <Button variant="contained" onClick={() => handleSaveSection('informacionFinanciera', 6)} disabled={isSaving} startIcon={<SaveIcon />} sx={{ mt: 2 }}>
                {isSaving ? 'Guardando...' : 'Guardar y Continuar'}
              </Button>
            </Stack>
          </GlassCard>
        </TabPanel>

        <TabPanel value={tabValue} index={6}>
          <GlassCard sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Typography variant="h6">Pruebas</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Seleccione las pruebas a relacionar en el documento (las predeterminadas vienen marcadas) y/o cree pruebas adicionales.
              </Typography>
              {PRUEBAS_PREDETERMINADAS.map((texto) => (
                <FormControlLabel
                  key={texto}
                  control={
                    <Checkbox
                      checked={pruebasSeleccionadas.includes(texto)}
                      onChange={() => togglePrueba(texto)}
                    />
                  }
                  label={texto}
                />
              ))}
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                <GlassTextField
                  value={nuevaPrueba}
                  onChange={(e) => setNuevaPrueba(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); agregarPrueba(); } }}
                  label="Nueva prueba"
                  placeholder="Describa la prueba personalizada"
                  fullWidth
                />
                <Button variant="outlined" onClick={agregarPrueba} startIcon={<AddIcon />} sx={{ whiteSpace: 'nowrap' }}>
                  Agregar
                </Button>
              </Stack>
              {pruebasPersonalizadas.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  {pruebasPersonalizadas.map((texto) => (
                    <Chip
                      key={texto}
                      label={texto}
                      color="primary"
                      variant="outlined"
                      onDelete={() => quitarPrueba(texto)}
                      deleteIcon={<CloseIcon />}
                    />
                  ))}
                </Box>
              )}
            </Stack>
          </GlassCard>

          <GlassCard sx={{ p: 3, mt: 3 }}>
            <Stack spacing={2}>
              <Typography variant="h6">Anexo 3 y Anexo 6: Archivos</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Suba el inventario de bienes (Anexo 3) y la certificación laboral de ingresos (Anexo 6). Pueden ser imágenes o PDFs.
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Stack spacing={1}>
                    <Button
                      variant="outlined"
                      component="label"
                      disabled={uploadingImagenAnexo3}
                      startIcon={uploadingImagenAnexo3 ? <CircularProgress size={20} /> : (imagenAnexo3Url ? <CheckCircleIcon /> : <UploadFileIcon />)}
                      color={imagenAnexo3Url ? 'success' : 'primary'}
                    >
                      {uploadingImagenAnexo3 ? 'Subiendo...' : (imagenAnexo3Url ? 'Anexo 3 subido' : 'Subir Anexo 3 (Inventario)')}
                      <input type="file" accept="image/*,application/pdf,.pdf" hidden onChange={handleImagenAnexoChange('bienesInventarioImagen', setUploadingImagenAnexo3)} />
                    </Button>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {imagenAnexo3Name || (imagenAnexo3Url ? (esImagenAnexo3Pdf ? 'PDF cargado' : "Imagen cargada") : 'Sin archivo (Opcional)')}
                    </Typography>
                    {imagenAnexo3Url && !esImagenAnexo3Pdf && (
                      <Box
                        component="img"
                        src={imagenAnexo3Url}
                        alt="Inventario de bienes"
                        sx={{ width: '100%', maxHeight: 180, objectFit: 'contain', borderRadius: '12px', border: `1px solid ${alpha(theme.palette.divider, 0.2)}` }}
                      />
                    )}
                  </Stack>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Stack spacing={1}>
                    <Button
                      variant="outlined"
                      component="label"
                      disabled={uploadingImagenAnexo6}
                      startIcon={uploadingImagenAnexo6 ? <CircularProgress size={20} /> : (imagenAnexo6Url ? <CheckCircleIcon /> : <UploadFileIcon />)}
                      color={imagenAnexo6Url ? 'success' : 'primary'}
                    >
                      {uploadingImagenAnexo6 ? 'Subiendo...' : (imagenAnexo6Url ? 'Anexo 6 subido' : 'Subir Anexo 6 (Cert. Laboral)')}
                      <input type="file" accept="image/*,application/pdf,.pdf" hidden onChange={handleImagenAnexoChange('certificacionLaboralImagen', setUploadingImagenAnexo6)} />
                    </Button>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {imagenAnexo6Name || (imagenAnexo6Url ? (esImagenAnexo6Pdf ? 'PDF cargado' : "Imagen cargada") : 'Sin archivo (Opcional)')}
                    </Typography>
                    {imagenAnexo6Url && !esImagenAnexo6Pdf && (
                      <Box
                        component="img"
                        src={imagenAnexo6Url}
                        alt="Certificación laboral"
                        sx={{ width: '100%', maxHeight: 180, objectFit: 'contain', borderRadius: '12px', border: `1px solid ${alpha(theme.palette.divider, 0.2)}` }}
                      />
                    )}
                  </Stack>
                </Grid>
              </Grid>
            </Stack>
          </GlassCard>

          <GlassCard sx={{ p: 3, mt: 3 }}>
            <Stack spacing={2}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{ bgcolor: alpha(tabsConfig[6].color, 0.1), color: tabsConfig[6].color }}>
                  <AttachFileIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">Anexo REDAM</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Puede ser una imagen o un PDF. Se anexa como última página del documento de anexos.
                  </Typography>
                </Box>
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                <Button
                  variant="outlined"
                  component="label"
                  disabled={uploadingRedam}
                  startIcon={uploadingRedam ? <CircularProgress size={20} /> : (redamUrl ? <CheckCircleIcon /> : <UploadFileIcon />)}
                  color={redamUrl ? 'success' : 'primary'}
                >
                  {uploadingRedam ? 'Subiendo...' : (redamUrl ? 'REDAM subido' : 'Subir Anexo REDAM (imagen o PDF)')}
                  <input type="file" accept="image/*,application/pdf,.pdf" hidden onChange={handleRedamChange} />
                </Button>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {redamName || (redamUrl ? (redamTipo?.startsWith('image/') ? 'Imagen cargada' : 'PDF cargado') : 'Sin archivo (Opcional)')}
                </Typography>
                {redamUrl && (
                  <Box
                    component="img"
                    src={redamUrl}
                    alt="Anexo REDAM"
                    sx={{
                      width: '100%',
                      maxHeight: 180,
                      objectFit: 'contain',
                      borderRadius: '12px',
                      border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                      display: redamTipo?.startsWith('image/') ? 'block' : 'none',
                    }}
                  />
                )}
              </Stack>
            </Stack>
          </GlassCard>

          <GlassCard sx={{ p: 3, mt: 3 }}>
            <Stack spacing={2}>
              <Typography variant="h6">Anexos / Archivos Adjuntos</Typography>
              {anexosFields.map((field, index) => {
                const isUploadingAnexo = uploadingAnexos[index];
                return (
                  <GlassCard key={field.id} sx={{ p: 2, mt: 2 }}>
                    <Stack spacing={2}>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Controller
                          name={`anexos.${index}.url`}
                          control={control}
                          render={({ field: controllerField, fieldState }) => (
                            <>
                              <Button
                                variant="outlined"
                                component="label"
                                disabled={isUploadingAnexo}
                                startIcon={isUploadingAnexo ? <CircularProgress size={20} /> : (controllerField.value ? <CheckCircleIcon /> : <UploadFileIcon />)}
                                color={controllerField.value ? 'success' : 'primary'}
                              >
                                {isUploadingAnexo ? 'Subiendo...' : (controllerField.value ? 'Subido' : 'Seleccionar Archivo')}
                                <input type="file" hidden onChange={(e) => handleAnexoChange(e, index)} onBlur={controllerField.onBlur} />
                              </Button>
                              <Box flexGrow={1}>
                                <Typography variant="body2" noWrap sx={{ color: fieldState.error ? 'error.main' : 'inherit' }}>
                                  {watch(`anexos.${index}.name`) || 'Sin archivo (Opcional)'}
                                </Typography>
                                {fieldState.error && <FormHelperText error>{fieldState.error.message}</FormHelperText>}
                              </Box>
                            </>
                          )}
                        />
                        <IconButton onClick={() => removeAnexo(index)} disabled={isUploadingAnexo}><DeleteIcon /></IconButton>
                      </Stack>
                      <GlassTextField
                        {...register(`anexos.${index}.descripcion`)}
                        label="Descripción del Anexo (Opcional)"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        error={!!errors.anexos?.[index]?.descripcion}
                        helperText={errors.anexos?.[index]?.descripcion?.message}
                      />
                    </Stack>
                  </GlassCard>
                );
              })}
              <Button variant="outlined" onClick={() => appendAnexo({ name: '', file: null, descripcion: '', url: '' })} startIcon={<AddIcon />}>Añadir Anexo</Button>
              <Button variant="contained" onClick={() => handleSaveSection('anexos', 7)} disabled={isSaving} startIcon={<SaveIcon />} sx={{ mt: 2 }}>
                {isSaving ? 'Guardando...' : 'Guardar y Continuar'}
              </Button>
            </Stack>
          </GlassCard>
        </TabPanel>

        <TabPanel value={tabValue} index={7}>
          <GlassCard sx={{ p: 3 }}>
            <Stack spacing={3}>
              <Typography variant="h6">Firma del Apoderado</Typography>
              <FormControl component="fieldset" fullWidth>
                <RadioGroup row value={signatureSource} onChange={(e) => {
                  const newSource = e.target.value;
                  setSignatureSource(newSource);
                  setValue('firma.source', newSource);
                  setValue('firma.data', null);
                  setValue('firma.file', null);
                  setValue('firma.url', null);
                  if (sigCanvas.current) sigCanvas.current.clear();
                  setSignatureImage(null);
                }}>
                  <FormControlLabel value="draw" control={<Radio />} label="Dibujar Firma" />
                  <FormControlLabel value="upload" control={<Radio />} label="Subir Imagen de Firma" />
                </RadioGroup>
              </FormControl>

              {signatureSource === 'draw' && (
                <Stack spacing={1}>
                  <Box
                    ref={signatureContainerRef}
                    sx={{
                      border: '1px dashed grey',
                      borderRadius: '12px',
                      p: 1,
                      background: 'white',
                      width: '100%',
                      height: 200,
                      cursor: 'crosshair'
                    }}
                  >
                    <SignatureCanvas
                      ref={sigCanvas}
                      penColor='black'
                      canvasProps={{
                        width: canvasSize.width,
                        height: canvasSize.height,
                        style: { background: '#f8f8f8', borderRadius: '12px' }
                      }}
                      onEnd={() => setValue('firma.data', sigCanvas.current.getTrimmedCanvas().toDataURL('image/png'))}
                    />
                  </Box>
                  <Button
                    variant="text"
                    onClick={() => {
                      if (sigCanvas.current) {
                        sigCanvas.current.clear();
                        setValue('firma.data', null);
                      }
                    }}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    Limpiar
                  </Button>
                </Stack>
              )}

              {signatureSource === 'upload' && (
                <Box>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<UploadFileIcon />}
                  >
                    Seleccionar Archivo
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleSignatureFileUpload}
                    />
                  </Button>
                  {signatureImage && (
                    <Box mt={2}>
                      <Typography>Vista Previa:</Typography>
                      <img src={signatureImage} alt="Firma" style={{ maxWidth: '100%', maxHeight: 200, border: '1px solid #ccc' }} />
                    </Box>
                  )}
                  <Controller
                    name="firma.file"
                    control={control}
                    rules={{
                      validate: (value) => {
                        const currentUrl = watch('firma.url');
                        return signatureSource !== 'upload' || value instanceof File || currentUrl ? true : 'Debe seleccionar una imagen de firma.';
                      }
                    }}
                    render={({ fieldState }) => fieldState.error && <FormHelperText error>{fieldState.error.message}</FormHelperText>}
                  />
                </Box>
              )}

              <Button
                variant="contained"
                onClick={() => handleSaveSection('firma')}
                disabled={isSaving || savedSections.firma}
                startIcon={<SaveIcon />}
                sx={{ mt: 2 }}
              >
                {savedSections.firma ? 'Firma Guardada' : 'Guardar Firma'}
              </Button>
            </Stack>
          </GlassCard>

          <GlassCard sx={{ p: 3, mt: 3 }}>
            <Stack spacing={3}>
              <Typography variant="h6">Firma del Deudor</Typography>
              <FormControl component="fieldset" fullWidth>
                <RadioGroup row value={signatureSourceDeudor} onChange={(e) => {
                  const newSource = e.target.value;
                  setSignatureSourceDeudor(newSource);
                  setValue('firmaDeudor.source', newSource);
                  setValue('firmaDeudor.data', null);
                  setValue('firmaDeudor.file', null);
                  setValue('firmaDeudor.url', null);
                  if (sigCanvasDeudor.current) sigCanvasDeudor.current.clear();
                  setSignatureImageDeudor(null);
                }}>
                  <FormControlLabel value="draw" control={<Radio />} label="Dibujar Firma" />
                  <FormControlLabel value="upload" control={<Radio />} label="Subir Imagen de Firma" />
                </RadioGroup>
              </FormControl>

              {signatureSourceDeudor === 'draw' && (
                <Stack spacing={1}>
                  <Box
                    ref={signatureContainerDeudorRef}
                    sx={{
                      border: '1px dashed grey',
                      borderRadius: '12px',
                      p: 1,
                      background: 'white',
                      width: '100%',
                      height: 200,
                      cursor: 'crosshair'
                    }}
                  >
                    <SignatureCanvas
                      ref={sigCanvasDeudor}
                      penColor='black'
                      canvasProps={{
                        width: deudorCanvasSize.width,
                        height: deudorCanvasSize.height,
                        style: { background: '#f8f8f8', borderRadius: '12px' }
                      }}
                      onEnd={() => setValue('firmaDeudor.data', sigCanvasDeudor.current.getTrimmedCanvas().toDataURL('image/png'))}
                    />
                  </Box>
                  <Button
                    variant="text"
                    onClick={() => {
                      if (sigCanvasDeudor.current) {
                        sigCanvasDeudor.current.clear();
                        setValue('firmaDeudor.data', null);
                      }
                    }}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    Limpiar
                  </Button>
                </Stack>
              )}

              {signatureSourceDeudor === 'upload' && (
                <Box>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<UploadFileIcon />}
                  >
                    Seleccionar Archivo
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleSignatureDeudorFileUpload}
                    />
                  </Button>
                  {signatureImageDeudor && (
                    <Box mt={2}>
                      <Typography>Vista Previa:</Typography>
                      <img src={signatureImageDeudor} alt="Firma del Deudor" style={{ maxWidth: '100%', maxHeight: 200, border: '1px solid #ccc' }} />
                    </Box>
                  )}
                  <Controller
                    name="firmaDeudor.file"
                    control={control}
                    rules={{
                      validate: (value) => {
                        const currentUrl = watch('firmaDeudor.url');
                        return signatureSourceDeudor !== 'upload' || value instanceof File || currentUrl ? true : 'Debe seleccionar una imagen de firma.';
                      }
                    }}
                    render={({ fieldState }) => fieldState.error && <FormHelperText error>{fieldState.error.message}</FormHelperText>}
                  />
                </Box>
              )}

              <Button
                variant="contained"
                onClick={() => handleSaveSection('firma')}
                disabled={isSaving || savedSections.firma}
                startIcon={<SaveIcon />}
                sx={{ mt: 2 }}
              >
                {savedSections.firma ? 'Firma Guardada' : 'Guardar Firma'}
              </Button>
            </Stack>
          </GlassCard>
        </TabPanel>
      </form>

      {allSectionsSaved && (
        <GlassCard hover={false} sx={{ mt: 3 }}>
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Stack spacing={2} alignItems="center">
              <Avatar
                sx={{
                  width: 64,
                  height: 64,
                  background: `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.info.main})`,
                }}
              >
                <CreateIcon sx={{ fontSize: 32 }} />
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                ¡Formulario Completo!
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Todas las secciones han sido guardadas. Puede generar su solicitud.
              </Typography>
              <Button
                onClick={() => setConfirmModalOpen(true)}
                variant="contained"
                size="large"
                disabled={isSaving || isUploading}
                startIcon={<CreateIcon />}
                sx={{
                  py: 2,
                  px: 6,
                  borderRadius: '12px',
                  fontWeight: 700,
                  textTransform: 'none',
                  background: `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.info.main})`,
                  fontSize: '1.1rem',
                  boxShadow: `0 8px 24px ${alpha(theme.palette.success.main, 0.4)}`,
                  '&:hover': {
                    background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.9)}, ${alpha(theme.palette.info.main, 0.9)})`,
                    transform: 'translateY(-2px)',
                    boxShadow: `0 12px 32px ${alpha(theme.palette.success.main, 0.5)}`,
                  },
                }}
              >
                {isUploading ? 'Subiendo Archivos...' : 'Generar Solicitud de Liquidación'}
              </Button>
            </Stack>
          </Box>
        </GlassCard>
      )}

      <Dialog open={isConfirmModalOpen} onClose={() => setConfirmModalOpen(false)}>
        <DialogTitle>Confirmar Envío</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Está seguro de que desea generar la solicitud? Verifique que toda la información sea correcta antes de continuar.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmModalOpen(false)}>Cancelar</Button>
          <Button onClick={() => {
            setConfirmModalOpen(false);
            handleSubmit(customOnSubmit, onInvalid)();
          }} color="primary" autoFocus>
            Confirmar y Enviar
          </Button>
        </DialogActions>
      </Dialog>
      <DescriptionModal
        open={isDescriptionModalOpen}
        onClose={() => setIsDescriptionModalOpen(false)}
        onConfirm={handleDescriptionConfirm}
        defaultValue={currentFileToProcess?.name || ''}
      />

      <Dialog
        open={isAcreenciasModalOpen}
        onClose={() => setIsAcreenciasModalOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.paper, 0.9)} 100%)`,
            backdropFilter: 'blur(40px) saturate(180%)',
            border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
            borderRadius: 4,
            boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.37)}`,
            overflow: 'hidden',
          }
        }}
        BackdropProps={{
          sx: {
            backdropFilter: 'blur(8px)',
            backgroundColor: alpha(theme.palette.common.black, 0.5),
          }
        }}
      >
        <DialogTitle
          sx={{
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            background: `linear-gradient(135deg, ${alpha(tabsConfig[3].color, 0.08)} 0%, ${alpha(theme.palette.secondary.main, 0.08)} 100%)`,
            py: 3,
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar sx={{ bgcolor: alpha(tabsConfig[3].color, 0.1), color: tabsConfig[3].color }}>
                <AccountBalanceIcon />
              </Avatar>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                Relación de Acreencias
              </Typography>
            </Stack>
            <IconButton onClick={() => setIsAcreenciasModalOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Stack spacing={3}>
            {(acreenciasValues || []).length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
                <WarningIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                <Typography variant="body1">
                  No hay acreencias agregadas.
                </Typography>
              </Box>
            ) : (
              <>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: tabsConfig[3].color }}>
                    Resumen de las Acreencias
                  </Typography>
                  <TableContainer sx={{ maxHeight: 400 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell><b>Acreedores</b></TableCell>
                          <TableCell align="right"><b>Capital</b></TableCell>
                          <TableCell align="center"><b>Quórum</b></TableCell>
                          <TableCell align="right"><b>Interés Corriente</b></TableCell>
                          <TableCell align="right"><b>Interés de Mora</b></TableCell>
                          <TableCell align="center"><b>Días en Mora</b></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {acreenciasPreview.clasesConDatos.map(className => {
                          const items = acreenciasPreview.grouped[className];
                          const classCapital = items.reduce((s, a) => s + (Number(a.capital) || 0), 0);
                          const classInteresCorriente = items.reduce((s, a) => s + (Number(a.valorTotalInteresCorriente) || 0), 0);
                          const classInteresMoratorio = items.reduce((s, a) => s + (Number(a.valorTotalInteresMoratorio) || 0), 0);
                          const classPorcentaje = (acreenciasPreview.total > 0) ? `${((classCapital / acreenciasPreview.total) * 100).toFixed(2)}%` : '0.00%';
                          return (
                            <React.Fragment key={className}>
                              <TableRow>
                                <TableCell colSpan={6} sx={{ background: alpha(tabsConfig[3].color, 0.05), fontWeight: 700 }}>
                                  {className}
                                </TableCell>
                              </TableRow>
                              {items.map((a, i) => {
                                const cap = Number(a.capital) || 0;
                                const porc = (acreenciasPreview.total > 0) ? `${((cap / acreenciasPreview.total) * 100).toFixed(2)}%` : '0.00%';
                                let diasMora = '';
                                if (a.creditoEnMora) {
                                  diasMora = a.moraMas90Dias ? 'Más de 90 días' : `${a.diasDeMora || '?'} días`;
                                }
                                return (
                                  <TableRow key={i}>
                                    <TableCell>{getAcreedorNombre(a)}</TableCell>
                                    <TableCell align="right">{formatMoney(cap)}</TableCell>
                                    <TableCell align="center">{porc}</TableCell>
                                    <TableCell align="right">{formatMoney(a.valorTotalInteresCorriente)}</TableCell>
                                    <TableCell align="right">{formatMoney(a.valorTotalInteresMoratorio)}</TableCell>
                                    <TableCell align="center">{diasMora}</TableCell>
                                  </TableRow>
                                );
                              })}
                              <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>TOTAL ACREENCIAS {className}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>{formatMoney(classCapital)}</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700 }}>{classPorcentaje}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>{formatMoney(classInteresCorriente)}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>{formatMoney(classInteresMoratorio)}</TableCell>
                                <TableCell />
                              </TableRow>
                            </React.Fragment>
                          );
                        })}
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>TOTAL ACREENCIAS</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>{formatMoney(acreenciasPreview.total)}</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>100.00%</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>{formatMoney((acreenciasValues || []).reduce((s, a) => s + (Number(a.valorTotalInteresCorriente) || 0), 0))}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>{formatMoney((acreenciasValues || []).reduce((s, a) => s + (Number(a.valorTotalInteresMoratorio) || 0), 0))}</TableCell>
                          <TableCell />
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>

                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: tabsConfig[3].color }}>
                    Detalle de las Acreencias
                  </Typography>
                  <Stack spacing={2}>
                    {(acreenciasValues || []).map((a, idx) => (
                      <TableContainer key={idx}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell colSpan={2} align="center" sx={{ background: alpha(tabsConfig[3].color, 0.08), fontWeight: 700 }}>
                                Acreencia No. {idx + 1}
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {[
                              ['Nombre', getAcreedorNombre(a)],
                              ['Tipo de Documento', getAcreedorData(a)?.tipoDoc || 'No reporta'],
                              ['No. de Documento', getAcreedorData(a)?.nitCc || getAcreedorData(a)?.nit || a.documento || 'No reporta'],
                              ['Dirección de notificación judicial', getAcreedorData(a)?.direccion || a.direccion || 'No reporta'],
                              ['País', getAcreedorData(a)?.pais || 'Colombia'],
                              ['Departamento', getAcreedorData(a)?.departamento || a.departamento || 'No reporta'],
                              ['Ciudad', getAcreedorData(a)?.ciudad || a.ciudad || 'No reporta'],
                              ['Dirección de notificación electrónica', getAcreedorData(a)?.email || a.email || 'No reporta'],
                              ['Teléfono', getAcreedorData(a)?.telefono || a.telefono || 'No reporta'],
                              ['Tipo de Acreencia', a.tipoAcreencia || 'No reporta'],
                              ['Naturaleza del crédito', a.naturalezaCredito || 'No reporta'],
                              ['Crédito en condición de legalmente postergado (Artículo 572A, Causal 1)', a.creditoPostergado ? 'SI' : 'NO'],
                              ['Descripción del crédito', a.descripcionCredito || 'No reporta'],
                              ['Valor en capital', formatMoney(a.capital)],
                              ['Valor en interés corriente', Number(a.valorTotalInteresCorriente) > 0 ? formatMoney(a.valorTotalInteresCorriente) : 'Se desconoce esta información'],
                              ['Tasa de interés corriente', a.tasaInteresCorriente || 'No reporta'],
                              ['Tipo de interés corriente', a.tipoInteresCorriente || 'No reporta'],
                              ['Cuantía total de la obligación', formatMoney((Number(a.capital || 0) + Number(a.valorTotalInteresCorriente || 0) + Number(a.valorTotalInteresMoratorio || 0)))],
                              ['¿El pago del crédito se está realizando mediante libranza o cualquier otro tipo de descuento por nómina?', a.pagoPorLibranza ? 'SI' : 'NO'],
                              ['Número de días en mora', a.creditoEnMora ? (a.moraMas90Dias ? 'Más de 90 días' : `${a.diasDeMora || '?'} días`) : ''],
                              ['Más de 90 días en mora', a.moraMas90Dias ? 'SI' : 'NO'],
                              ['Valor en interés moratorio', Number(a.valorTotalInteresMoratorio) > 0 ? formatMoney(a.valorTotalInteresMoratorio) : 'Se desconoce esta información'],
                              ['Tasa de interés moratorio', a.tasaInteresMoratorio || 'No reporta'],
                              ['Tipo de interés moratorio', a.tipoInteresMoratorio || 'No reporta'],
                              ['Fecha de otorgamiento', a.fechaOtorgamiento ? `${new Date(a.fechaOtorgamiento).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}.` : 'Se desconoce esta información.'],
                              ['Fecha de vencimiento', a.fechaVencimiento ? `${new Date(a.fechaVencimiento).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}.` : 'Se desconoce esta información.'],
                            ].map((row, ri) => (
                              <TableRow key={ri}>
                                <TableCell sx={{ width: '50%', fontWeight: 600 }}>{row[0]}</TableCell>
                                <TableCell sx={{ width: '50%' }}>{row[1]}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ))}
                  </Stack>
                </Box>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
          <Button onClick={() => setIsAcreenciasModalOpen(false)} color="primary" variant="contained" sx={{ borderRadius: '12px' }}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LiquidacionForm;