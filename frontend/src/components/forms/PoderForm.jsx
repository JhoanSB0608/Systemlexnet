import React, { useState, useRef, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  TextField, Button, Typography, Box, Grid, Tabs, Tab,
  alpha, useTheme, Stack, RadioGroup, Radio, FormControlLabel, FormControl, InputLabel, Select, MenuItem,
  Badge, Chip, LinearProgress,
} from '@mui/material';
import {
  Person as PersonIcon,
  Business as BusinessIcon,
  Assignment as AssignmentIcon,
  Create as CreateIcon,
  Send as SendIcon,
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
  UploadFile as UploadFileIcon,
  CloudDone as CloudDoneIcon,
  CloudUpload as CloudUploadIcon,
  Restore as RestoreIcon,
  TrendingUp as TrendingUpIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import SignatureCanvas from 'react-signature-canvas';
import { uploadFile } from '../../services/fileStorageService';
import { useDebounce } from '../../hooks/useDebounce';
import { useBorradorAutosave } from '../../hooks/useBorradorAutosave';
import borradorService, { TIPO_PODER } from '../../services/borradorService';
import GlassCard from '../common/GlassCard';

// Custom Input Field with Glassmorphism
const GlassTextField = React.forwardRef(({ error, ...props }, ref) => {
  const theme = useTheme();
  return (
    <TextField
      {...props}
      inputRef={ref}
      error={error}
      sx={{
        '& .MuiOutlinedInput-root': {
          borderRadius: '12px',
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(10px)',
          transition: 'all 0.3s ease',
          '& fieldset': { border: '1px solid rgba(255, 255, 255, 0.2)' },
          '&:hover': {
            background: 'rgba(255, 255, 255, 0.12)',
            '& fieldset': { border: '1px solid rgba(255, 255, 255, 0.3)' },
          },
          '&.Mui-focused': {
            background: 'rgba(255, 255, 255, 0.15)',
            '& fieldset': { border: `2px solid ${error ? theme.palette.error.main : alpha(theme.palette.primary.main, 0.5)} !important` },
          },
        },
        ...props.sx
      }}
    />
  );
});

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return <div role="tabpanel" hidden={value !== index} {...other}>{value === index && <Box sx={{ p: 3 }}>{children}</Box>}</div>;
}

// Editor de firma reutilizable: dibujar en un canvas o subir una imagen.
const SignatureEditor = ({ label, source, onSourceChange, onFileChange, image, canvasRef, onEnd }) => {
  return (
    <Stack spacing={3}>
      <Typography variant="h6">{label}</Typography>
      <FormControl component="fieldset">
        <RadioGroup row value={source} onChange={(e) => onSourceChange(e.target.value)}>
          <FormControlLabel value="draw" control={<Radio />} label="Dibujar Firma" />
          <FormControlLabel value="upload" control={<Radio />} label="Subir Imagen de Firma" />
        </RadioGroup>
      </FormControl>

      {source === 'draw' ? (
        <Box sx={{ border: '1px dashed grey', borderRadius: '12px', p: 1, background: 'white' }}>
          <SignatureCanvas
            ref={canvasRef}
            penColor='black'
            canvasProps={{ width: 500, height: 200, style: { background: '#f8f8f8', borderRadius: '12px' } }}
            onEnd={onEnd}
          />
          <Button onClick={() => canvasRef.current?.clear()}>Limpiar</Button>
        </Box>
      ) : (
        <Box>
          <Button variant="outlined" component="label" startIcon={<UploadFileIcon />}>
            Seleccionar Archivo
            <input type="file" hidden accept="image/*" onChange={onFileChange} />
          </Button>
          {image && (
            <Box mt={2}>
              <Typography>Vista Previa:</Typography>
              <img src={image} alt="Firma" style={{ maxWidth: '100%', maxHeight: 200, border: '1px solid #ccc' }} />
            </Box>
          )}
        </Box>
      )}
    </Stack>
  );
};

// Formatea una fecha (string/Date) al formato yyyy-MM-dd que espera <input type="date">.
const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  // Si ya viene en formato yyyy-MM-dd (valor nativo del input date), usarlo directo.
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
  try {
    const date = new Date(dateString);
    const adjusted = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
    const year = adjusted.getFullYear();
    const month = String(adjusted.getMonth() + 1).padStart(2, '0');
    const day = String(adjusted.getDate()).padStart(2, '0');
    if (isNaN(year) || isNaN(month) || isNaN(day)) return '';
    return `${year}-${month}-${day}`;
  } catch (e) {
    return '';
  }
};

// Prepara los datos de un poder guardado/borrador para el form de react-hook-form.
const buildFormattedData = (initialData) => ({
  ...initialData,
  destinatario: { ...(initialData.destinatario || {}) },
  poderdante: { ...(initialData.poderdante || {}), genero: initialData.poderdante?.genero || 'masculino' },
  apoderado: { ...(initialData.apoderado || {}) },
  siniestro: { ...(initialData.siniestro || {}), fecha: formatDateForInput(initialData.siniestro?.fecha) },
  firma: {
    source: initialData.firma?.source || 'draw',
    data: initialData.firma?.data || null,
    name: initialData.firma?.name || '',
    url: initialData.firma?.url || '',
    file: null,
  },
  firmaApoderado: {
    source: initialData.firmaApoderado?.source || 'draw',
    data: initialData.firmaApoderado?.data || null,
    name: initialData.firmaApoderado?.name || '',
    url: initialData.firmaApoderado?.url || '',
    file: null,
  },
});

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

const PoderForm = ({ onSubmit, isUploading, initialData, isUpdating }) => {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [signatureSource, setSignatureSource] = useState('draw');
  const [signatureImage, setSignatureImage] = useState(null);
  const [signatureSourceApo, setSignatureSourceApo] = useState('draw');
  const [signatureImageApo, setSignatureImageApo] = useState(null);
  const [savedSections, setSavedSections] = useState({
    destinatario: false,
    partes: false,
    siniestro: false,
    firmaPoderdante: false,
    firmaApoderado: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [isRestoringDraft, setIsRestoringDraft] = useState(false);
  const [borradorUpdatedAt, setBorradorUpdatedAt] = useState(null);
  const sigCanvas = useRef({});
  const sigCanvasApo = useRef({});

  const selectSx = {
    borderRadius: '12px',
    background: 'rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(10px)',
    '& .MuiOutlinedInput-notchedOutline': { border: '1px solid rgba(255, 255, 255, 0.2)' },
    '&:hover .MuiOutlinedInput-notchedOutline': { border: '1px solid rgba(255, 255, 255, 0.3)' },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { border: `2px solid ${alpha(theme.palette.primary.main, 0.5)} !important` },
  };

  const { register, handleSubmit, control, watch, setValue, getValues, trigger, reset, formState: { errors } } = useForm({
    defaultValues: {
      destinatario: { entidad: 'SEGUROS MUNDIAL', ciudad: 'Giron' },
      poderdante: { nombre: '', genero: 'masculino', cedula: '', ciudadExpedicion: '', departamentoExpedicion: '', ciudadResidencia: 'esta ciudad' },
      apoderado: { nombre: 'MANUEL RICARDO MANCERA GARCIA', cedula: '1.090.442.371', ciudadExpedicion: 'Cúcuta', tarjetaProfesional: '316.220', cargo: 'ABOGADO ESPECIALISTA' },
      siniestro: { aseguradora: 'SEGUROS MUNDIAL', poliza: '', fecha: '', tipoProceso: 'RECLAMACION DE INDEMNIZACION POR ACCIDENTE DE TRANSITO', ley: 'ley 780 del 2016' },
      firma: { source: 'draw', data: null, file: null },
      firmaApoderado: { source: 'draw', data: null, file: null }
    }
  });

  // ============ GUARDADO PARCIAL / AUTO-SAVE ============
  const tipoSolicitud = TIPO_PODER;
  const esEdicion = !!initialData;
  const esBorrador = esEdicion && initialData.estado === 'borrador';
  const autosaveEnabled = !esEdicion || esBorrador;
  const restoredRef = useRef(false); // evita auto-guardar antes de restaurar/montar el form

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

  const watchedFirmaSource = watch('firma.source');
  const watchedFirmaApoSource = watch('firmaApoderado.source');

  // Mantener signatureSource en sync con el valor del formulario
  useEffect(() => {
    if (watchedFirmaSource) {
      setSignatureSource(watchedFirmaSource);
    }
  }, [watchedFirmaSource]);

  useEffect(() => {
    if (watchedFirmaApoSource) {
      setSignatureSourceApo(watchedFirmaApoSource);
    }
  }, [watchedFirmaApoSource]);

  const changeSignatureSource = (path, setSource, setImage, canvasRef) => (newSource) => {
    setSource(newSource);
    setValue(`${path}.source`, newSource);
    setValue(`${path}.data`, null);
    setValue(`${path}.file`, null);
    setValue(`${path}.url`, null);
    if (canvasRef.current) canvasRef.current.clear();
    setImage(null);
  };

  const handleSignatureFileUpload = (path, setImage) => (e) => {
    const file = e.target.files[0];
    if (file) {
      setValue(`${path}.file`, file);
      setValue(`${path}.url`, '');
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result);
        if (typeof reader.result === 'string' && /^data:image\//i.test(reader.result)) {
          setValue(`${path}.data`, reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Restauración: modo edición o reanudación de un borrador guardado.
  useEffect(() => {
    if (restoredRef.current) return;
    let cancelled = false;
    const finish = () => {
      if (!cancelled) restoredRef.current = true;
    };

    // Modo edición (documento o borrador existente)
    if (initialData) {
      const formattedData = buildFormattedData(initialData);
      reset(formattedData);

      if (initialData.firma) {
        const { source, data, url } = initialData.firma;
        setSignatureSource(source || 'draw');
        setSignatureImage(null);

        if (source === 'draw' && data) {
          setTimeout(() => {
            if (sigCanvas.current && sigCanvas.current.fromDataURL) {
              sigCanvas.current.fromDataURL(data);
            }
          }, 200);
        } else if (source === 'upload') {
          if (data && /^data:image\//i.test(data)) {
            setSignatureImage(data);
          } else if (url) {
            const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
            setSignatureImage(`${backendUrl}${url}`);
          }
        }
      }

      if (initialData.firmaApoderado) {
        const { source, data, url } = initialData.firmaApoderado;
        setSignatureSourceApo(source || 'draw');
        setSignatureImageApo(null);

        if (source === 'draw' && data) {
          setTimeout(() => {
            if (sigCanvasApo.current && sigCanvasApo.current.fromDataURL) {
              sigCanvasApo.current.fromDataURL(data);
            }
          }, 200);
        } else if (source === 'upload') {
          if (data && /^data:image\//i.test(data)) {
            setSignatureImageApo(data);
          } else if (url) {
            const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
            setSignatureImageApo(`${backendUrl}${url}`);
          }
        }
      }

      if (esBorrador && initialData.seccionesGuardadas) {
        const secciones = { ...initialData.seccionesGuardadas };
        if (secciones.firma !== undefined && secciones.firmaPoderdante === undefined) {
          secciones.firmaPoderdante = secciones.firma;
        }
        setSavedSections((prev) => ({ ...prev, ...secciones }));
        setBorradorUpdatedAt(initialData.updatedAt || null);
        setIsRestoringDraft(true);
      } else {
        setSavedSections({ destinatario: true, partes: true, siniestro: true, firmaPoderdante: true, firmaApoderado: true });
      }
      finish();
      return () => { cancelled = true; };
    }

    // Modo creación: reanudar el borrador en localStorage para este tipo
    if (autosaveEnabled && borradorId) {
      (async () => {
        try {
          const draf = await borradorService.obtenerBorrador(borradorId, tipoSolicitud);
          if (cancelled) return;
          reset(buildFormattedData(draf));
          if (draf.firma) {
            const { source, data, url } = draf.firma;
            setSignatureSource(source || 'draw');
            if (source === 'draw' && data) {
              setTimeout(() => {
                if (sigCanvas.current && sigCanvas.current.fromDataURL) {
                  sigCanvas.current.fromDataURL(data);
                }
              }, 200);
            } else if (source === 'upload') {
              if (data && /^data:image\//i.test(data)) {
                setSignatureImage(data);
              } else if (url) {
                const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
                setSignatureImage(`${backendUrl}${url}`);
              }
            }
          }
          if (draf.firmaApoderado) {
            const { source, data, url } = draf.firmaApoderado;
            setSignatureSourceApo(source || 'draw');
            if (source === 'draw' && data) {
              setTimeout(() => {
                if (sigCanvasApo.current && sigCanvasApo.current.fromDataURL) {
                  sigCanvasApo.current.fromDataURL(data);
                }
              }, 200);
            } else if (source === 'upload') {
              if (data && /^data:image\//i.test(data)) {
                setSignatureImageApo(data);
              } else if (url) {
                const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
                setSignatureImageApo(`${backendUrl}${url}`);
              }
            }
          }
          if (draf.seccionesGuardadas) {
            const secciones = { ...draf.seccionesGuardadas };
            if (secciones.firma !== undefined && secciones.firmaPoderdante === undefined) {
              secciones.firmaPoderdante = secciones.firma;
            }
            setSavedSections((prev) => ({ ...prev, ...secciones }));
          }
          setBorradorUpdatedAt(draf.updatedAt || null);
          setIsRestoringDraft(true);
        } catch (error) {
          console.error('[PoderForm] No se pudo reanudar el borrador:', error);
          if (!cancelled) clearBorrador();
        } finally {
          finish();
        }
      })();
      return () => { cancelled = true; };
    }

    // Creación limpia sin borrador previo
    const t = setTimeout(finish, 1200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData, autosaveEnabled, borradorId, reset, tipoSolicitud, clearBorrador]);

  // Auto-guardado progresivo (debounced): persiste los cambios tras ~3s sin actividad.
  const watchedAll = watch();
  const debouncedWatchedAll = useDebounce(watchedAll, 3000);
  useEffect(() => {
    if (!autosaveEnabled) return;
    if (!restoredRef.current) return;
    if (isUploading) return;
    if (!borradorId) return; // No crear un borrador solo por entrar al formulario: debe guardarse al menos una sección.
    try {
      requestSave(buildAutosavePayload());
    } catch (e) {
      console.warn('[PoderForm] Error al encolar auto-guardado:', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedWatchedAll, borradorId]);

  const handleSaveSection = async (sectionName, nextTabIndex) => {
    setIsSaving(true);
    let fieldsToValidate = [];

    switch (sectionName) {
      case 'destinatario':
        fieldsToValidate = ['destinatario.entidad', 'destinatario.ciudad'];
        break;
      case 'partes':
        fieldsToValidate = ['poderdante.nombre', 'poderdante.cedula', 'apoderado.nombre'];
        break;
      case 'siniestro':
        fieldsToValidate = ['siniestro.poliza', 'siniestro.fecha'];
        break;
      case 'firmaPoderdante':
        fieldsToValidate = ['firma'];
        break;
      case 'firmaApoderado':
        fieldsToValidate = ['firmaApoderado'];
        break;
      default:
        break;
    }

    const results = await Promise.all(fieldsToValidate.map(field => trigger(field)));
    const isValid = results.every(Boolean);

    if (isValid) {
      setValidationError('');
      if (autosaveEnabled) {
        requestSave(buildAutosavePayload({ [sectionName]: true }));
        await flushSave();
      } else {
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate save
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

  const customOnSubmit = async (data) => {
    // Asegurar que todo el guardado parcial pendiente se haya persistido
    if (autosaveEnabled) {
      try {
        await flushSave();
      } catch (e) {
        console.warn('[PoderForm] No se pudo vaciar la cola de auto-guardado:', e);
      }
    }

    const dataToSend = { ...data };

    // El encabezado (Señores) usa el nombre del abogado y su cargo/título:
    // destinatario.nombre = apoderado.nombre, destinatario.cargo = apoderado.cargo
    dataToSend.destinatario = {
      ...dataToSend.destinatario,
      nombre: dataToSend.apoderado?.nombre || '',
      cargo: dataToSend.apoderado?.cargo || '',
    };

    // Procesa una firma (dibujada o subida) devolviendo el payload a persistir.
    // El base64 (data) siempre se incluye, sin depender de que la subida a GCS tenga éxito.
    const processFirma = async ({ label, source, file, current, imageData, canvasRef }) => {
      const dataURL = imageData && /^data:image\//i.test(imageData) ? imageData : null;
      if (source === 'upload') {
        let name = current?.name || '';
        let url = current?.url || '';
        if (file instanceof File) {
          try {
            const { fileUrl, uniqueFilename } = await uploadFile(file);
            name = uniqueFilename;
            url = fileUrl;
          } catch (error) {
            console.error(`Error uploading ${label} signature:`, error);
          }
        }
        return { source: 'upload', name, url, data: dataURL || current?.data || null };
      }
      if (source === 'draw') {
        if (canvasRef.current && !canvasRef.current.isEmpty()) {
          return {
            source: 'draw',
            name: '',
            url: '',
            data: canvasRef.current.getTrimmedCanvas().toDataURL('image/png'),
          };
        }
        return { source: 'draw', name: '', url: '', data: current?.data || null };
      }
      return null;
    };

    dataToSend.firma = await processFirma({
      label: 'poderdante',
      source: signatureSource,
      file: dataToSend.firma?.file,
      current: dataToSend.firma,
      imageData: signatureImage,
      canvasRef: sigCanvas,
    }) || null;
    dataToSend.firmaApoderado = await processFirma({
      label: 'apoderado',
      source: signatureSourceApo,
      file: dataToSend.firmaApoderado?.file,
      current: dataToSend.firmaApoderado,
      imageData: signatureImageApo,
      canvasRef: sigCanvasApo,
    }) || null;

    // Si es un borrador en progreso, el submit final debe actualizarlo (marcándolo como completa)
    if (autosaveEnabled && borradorId) {
      dataToSend._borradorId = borradorId;
      dataToSend.estado = 'completa';
    }

    await onSubmit(dataToSend);

    if (autosaveEnabled) {
      clearBorrador();
    }
  };

  const completionPercentage = (Object.values(savedSections).filter(Boolean).length / Object.values(savedSections).length) * 100;

  const tabsConfig = [
    { key: 'destinatario', label: 'Destinatario', icon: BusinessIcon, color: '#2196f3' },
    { key: 'partes', label: 'Partes (Poderdante/Apoderado)', icon: PersonIcon, color: '#673ab7' },
    { key: 'siniestro', label: 'Detalles Siniestro', icon: AssignmentIcon, color: '#ff5722' },
    { key: 'firmaPoderdante', label: 'Firma Poderdante', icon: CreateIcon, color: '#795548' },
    { key: 'firmaApoderado', label: 'Firma Apoderado', icon: CreateIcon, color: '#00897b' },
  ];

  return (
    <Box>
      {/* Header con Progress */}
      <GlassCard hover={false} sx={{ mb: 3, p: 3 }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {initialData ? 'Editar Poder' : 'Generar Poder'}
              </Typography>
            </Stack>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
              {isRestoringDraft && (
                <Chip
                  icon={<RestoreIcon />}
                  label={borradorUpdatedAt
                    ? `Borrador del ${new Date(borradorUpdatedAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}`
                    : 'Borrador en curso'}
                  sx={{ background: alpha(theme.palette.info.main, 0.12), color: theme.palette.info.main, fontWeight: 700 }}
                />
              )}
              {autosaveEnabled && saveStatus === 'saving' && (
                <Chip icon={<CloudUploadIcon />} label="Guardando..." sx={{ background: alpha(theme.palette.warning.main, 0.12), color: theme.palette.warning.main, fontWeight: 600 }} />
              )}
              {autosaveEnabled && saveStatus === 'saved' && (
                <Chip
                  icon={<CloudDoneIcon />}
                  label={lastSavedAt ? `Guardado ${lastSavedAt.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}` : 'Guardado'}
                  sx={{ background: alpha(theme.palette.success.main, 0.12), color: theme.palette.success.main, fontWeight: 600 }}
                />
              )}
              {autosaveEnabled && saveStatus === 'error' && (
                <Chip icon={<ErrorIcon />} label="Error al guardar (se reintentará)" sx={{ background: alpha(theme.palette.error.main, 0.12), color: theme.palette.error.main, fontWeight: 600 }} />
              )}
            </Box>
          </Stack>
          <Chip
            icon={<TrendingUpIcon />}
            label={`${completionPercentage.toFixed(0)}% Completado`}
            sx={{ background: alpha(theme.palette.success.main, 0.1), color: theme.palette.success.main, fontWeight: 600, px: 2, py: 2.5 }}
          />
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

      {validationError && (
        <GlassCard hover={false} sx={{ mb: 3, border: `1px solid ${alpha(theme.palette.error.main, 0.4)}` }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ p: 2 }}>
            <ErrorIcon sx={{ color: theme.palette.error.main }} />
            <Typography variant="body2" color="error">{validationError}</Typography>
          </Stack>
        </GlassCard>
      )}

      <GlassCard sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(e, val) => setTabValue(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
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
                  <Stack alignItems="center">
                    <Badge badgeContent={isSaved ? <CheckCircleIcon sx={{ fontSize: 16 }} /> : null} color="success">
                      <Icon sx={{ color: isSaved ? theme.palette.success.main : tab.color }} />
                    </Badge>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>{tab.label}</Typography>
                  </Stack>
                }
                sx={{ opacity: isDisabled ? 0.4 : 1 }}
              />
            );
          })}
        </Tabs>
      </GlassCard>

      <form onSubmit={handleSubmit(customOnSubmit)}>
        {/* Tab 0: Destinatario */}
        <TabPanel value={tabValue} index={0}>
          <GlassCard><Box p={3}><Stack spacing={3}>
            <Typography variant="h6">Datos del Destinatario (Señores)</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}><GlassTextField {...register('destinatario.entidad')} label="Entidad" fullWidth /></Grid>
              <Grid item xs={12} sm={6}><GlassTextField {...register('destinatario.ciudad')} label="Ciudad" fullWidth /></Grid>
            </Grid>
            <Button variant="contained" onClick={() => handleSaveSection('destinatario', 1)} disabled={isSaving} startIcon={isSaving ? null : <SaveIcon />}>
              {isSaving ? 'Guardando...' : 'Guardar y Continuar'}
            </Button>
          </Stack></Box></GlassCard>
        </TabPanel>

        {/* Tab 1: Partes */}
        <TabPanel value={tabValue} index={1}>
          <GlassCard><Box p={3}><Stack spacing={3}>
            <Typography variant="h6">Datos del Poderdante</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Género</InputLabel>
                  <Controller
                    name="poderdante.genero"
                    control={control}
                    render={({ field }) => (
                      <Select {...field} label="Género" sx={selectSx}>
                        <MenuItem value="masculino">Masculino</MenuItem>
                        <MenuItem value="femenino">Femenino</MenuItem>
                      </Select>
                    )}
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}><GlassTextField {...register('poderdante.nombre', { required: 'Requerido' })} label="Nombre Completo" fullWidth error={!!errors.poderdante?.nombre} helperText={errors.poderdante?.nombre?.message} /></Grid>
              <Grid item xs={12} sm={6}><GlassTextField {...register('poderdante.cedula', { required: 'Requerido' })} label="Cédula" fullWidth error={!!errors.poderdante?.cedula} helperText={errors.poderdante?.cedula?.message} /></Grid>
              <Grid item xs={12} sm={6}><GlassTextField {...register('poderdante.ciudadExpedicion')} label="Ciudad de Expedición (Ej: Giron)" fullWidth /></Grid>
              <Grid item xs={12} sm={6}><GlassTextField {...register('poderdante.departamentoExpedicion')} label="Depto. Expedición (Ej: Santander)" fullWidth /></Grid>
            </Grid>

            <Typography variant="h6" sx={{ mt: 2 }}>Datos del Apoderado (Pre-llenados)</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}><GlassTextField {...register('apoderado.cargo')} label="Cargo / Título" fullWidth /></Grid>
              <Grid item xs={12} sm={6}><GlassTextField {...register('apoderado.nombre')} label="Nombre Abogado" fullWidth /></Grid>
              <Grid item xs={12} sm={6}><GlassTextField {...register('apoderado.cedula')} label="Cédula Abogado" fullWidth /></Grid>
              <Grid item xs={12} sm={6}><GlassTextField {...register('apoderado.tarjetaProfesional')} label="Tarjeta Profesional" fullWidth /></Grid>
              <Grid item xs={12} sm={6}><GlassTextField {...register('apoderado.ciudadExpedicion')} label="Expedición Cédula Abogado" fullWidth /></Grid>
            </Grid>
            <Button variant="contained" onClick={() => handleSaveSection('partes', 2)} disabled={isSaving} startIcon={isSaving ? null : <SaveIcon />}>
              {isSaving ? 'Guardando...' : 'Guardar y Continuar'}
            </Button>
          </Stack></Box></GlassCard>
        </TabPanel>

        {/* Tab 2: Siniestro */}
        <TabPanel value={tabValue} index={2}>
          <GlassCard><Box p={3}><Stack spacing={3}>
            <Typography variant="h6">Detalles del Siniestro y Póliza</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Tipo de Reclamación</InputLabel>
                  <Controller
                    name="siniestro.tipoProceso"
                    control={control}
                    render={({ field }) => (
                      <Select {...field} label="Tipo de Reclamación" sx={selectSx}>
                        <MenuItem value="RECLAMACION DE INDEMNIZACION POR ACCIDENTE DE TRANSITO">
                          Indemnización por Accidente de Tránsito
                        </MenuItem>
                        <MenuItem value="RECLAMACION DE INDEMNIZACION POR MUERTE EN ACCIDENTE DE TRANSITO">
                          Indemnización por Muerte en Accidente de Tránsito
                        </MenuItem>
                      </Select>
                    )}
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}><GlassTextField {...register('siniestro.aseguradora')} label="Aseguradora (Ej: SEGUROS MUNDIAL)" fullWidth /></Grid>
              <Grid item xs={12} sm={6}><GlassTextField {...register('siniestro.poliza', { required: 'Requerido' })} label="Número de Póliza" fullWidth error={!!errors.siniestro?.poliza} helperText={errors.siniestro?.poliza?.message} /></Grid>
              <Grid item xs={12} sm={6}><GlassTextField {...register('siniestro.fecha', { required: 'Requerido' })} label="Fecha del Siniestro" type="date" InputLabelProps={{ shrink: true }} fullWidth error={!!errors.siniestro?.fecha} helperText={errors.siniestro?.fecha?.message} /></Grid>
            </Grid>
            <Button variant="contained" onClick={() => handleSaveSection('siniestro', 3)} disabled={isSaving} startIcon={isSaving ? null : <SaveIcon />}>
              {isSaving ? 'Guardando...' : 'Guardar y Continuar'}
            </Button>
          </Stack></Box></GlassCard>
        </TabPanel>

        {/* Tab 3: Firma del Poderdante */}
        <TabPanel value={tabValue} index={3}>
          <GlassCard><Box p={3}>
            <SignatureEditor
              label="Firma del Poderdante"
              source={signatureSource}
              onSourceChange={changeSignatureSource('firma', setSignatureSource, setSignatureImage, sigCanvas)}
              onFileChange={handleSignatureFileUpload('firma', setSignatureImage)}
              image={signatureImage}
              canvasRef={sigCanvas}
              onEnd={() => setValue('firma.data', sigCanvas.current ? sigCanvas.current.getTrimmedCanvas().toDataURL('image/png') : null)}
            />
            <Box mt={3}><Button variant="contained" onClick={() => handleSaveSection('firmaPoderdante', 4)} disabled={isSaving} startIcon={isSaving ? null : <SaveIcon />}>
              {isSaving ? 'Guardando...' : 'Guardar y Continuar'}
            </Button></Box>
          </Box></GlassCard>
        </TabPanel>

        {/* Tab 4: Firma del Apoderado y Envío */}
        <TabPanel value={tabValue} index={4}>
          <GlassCard><Box p={3}><Stack spacing={3}>
            <SignatureEditor
              label="Firma del Apoderado"
              source={signatureSourceApo}
              onSourceChange={changeSignatureSource('firmaApoderado', setSignatureSourceApo, setSignatureImageApo, sigCanvasApo)}
              onFileChange={handleSignatureFileUpload('firmaApoderado', setSignatureImageApo)}
              image={signatureImageApo}
              canvasRef={sigCanvasApo}
              onEnd={() => setValue('firmaApoderado.data', sigCanvasApo.current ? sigCanvasApo.current.getTrimmedCanvas().toDataURL('image/png') : null)}
            />
            <Button variant="contained" onClick={() => handleSaveSection('firmaApoderado')} disabled={isSaving} startIcon={isSaving ? null : <SaveIcon />}>
              {isSaving ? 'Guardando...' : 'Guardar Firma'}
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="success"
              size="large"
              startIcon={<SendIcon />}
              disabled={isUploading || isUpdating}
            >
              {isUploading ? 'Generando...' : (isUpdating ? 'Actualizando...' : (initialData ? 'Actualizar Poder y Descargar' : 'Generar Documento'))}
            </Button>
          </Stack></Box></GlassCard>
        </TabPanel>
      </form>
    </Box>
  );
};
export default PoderForm;