import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  TextField, Button, Typography, Box, Grid, Tabs, Tab,
  alpha, useTheme, Stack, RadioGroup, Radio, FormControlLabel, FormControl,
  Badge, Chip, LinearProgress,
} from '@mui/material';
import {
  Person as PersonIcon,
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
import borradorService, { TIPO_CONTRATO } from '../../services/borradorService';
import GlassCard from '../common/GlassCard';

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

const formatDateForInput = (dateString) => {
  if (!dateString) return '';
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

const buildFormattedData = (initialData) => ({
  ...initialData,
  comitente: { ...(initialData.comitente || {}) },
  abogado: { ...(initialData.abogado || {}) },
  siniestro: { ...(initialData.siniestro || {}), fecha: formatDateForInput(initialData.siniestro?.fecha) },
  ciudadFirma: initialData.ciudadFirma || '',
  fechaFirma: formatDateForInput(initialData.fechaFirma),
  firma: {
    source: initialData.firma?.source || 'draw',
    data: initialData.firma?.data || null,
    name: initialData.firma?.name || '',
    url: initialData.firma?.url || '',
    file: null,
  },
  firmaContractual: {
    source: initialData.firmaContractual?.source || 'draw',
    data: initialData.firmaContractual?.data || null,
    name: initialData.firmaContractual?.name || '',
    url: initialData.firmaContractual?.url || '',
    file: null,
  },
});

const sanitizeBorradorPayload = (data) => {
  return JSON.parse(
    JSON.stringify(data, (key, value) => {
      if (key === 'file') return undefined;
      if (typeof File !== 'undefined' && value instanceof File) return undefined;
      return value;
    })
  );
};

const ContratoForm = ({ onSubmit, isUploading, initialData, isUpdating }) => {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [signatureSource, setSignatureSource] = useState('draw');
  const [signatureImage, setSignatureImage] = useState(null);
  const [signatureSourceApo, setSignatureSourceApo] = useState('draw');
  const [signatureImageApo, setSignatureImageApo] = useState(null);
  const [savedSections, setSavedSections] = useState({
    partes: false,
    siniestro: false,
    firmaComitente: false,
    firmaContractual: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [isRestoringDraft, setIsRestoringDraft] = useState(false);
  const [borradorUpdatedAt, setBorradorUpdatedAt] = useState(null);
  const sigCanvas = useRef({});
  const sigCanvasApo = useRef({});

  const { register, handleSubmit, watch, setValue, getValues, trigger, reset, formState: { errors } } = useForm({
    defaultValues: {
      comitente: { nombre: '', cedula: '', ciudad: '' },
      abogado: { nombre: 'MANUEL RICARDO MANCERA GARCIA', cedula: '1.090.442.371', tarjetaProfesional: '316.220' },
      siniestro: { fecha: '', victimaNombre: '', porcentaje: '', porcentajeLetras: '' },
      ciudadFirma: 'Cúcuta',
      fechaFirma: '',
      firma: { source: 'draw', data: null, file: null },
      firmaContractual: { source: 'draw', data: null, file: null },
    }
  });

  // ============ GUARDADO PARCIAL / AUTO-SAVE ============
  const tipoSolicitud = TIPO_CONTRATO;
  const esEdicion = !!initialData;
  const esBorrador = esEdicion && initialData.estado === 'borrador';
  const autosaveEnabled = !esEdicion || esBorrador;
  const restoredRef = useRef(false);

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
  const watchedFirmaApoSource = watch('firmaContractual.source');

  useEffect(() => {
    if (watchedFirmaSource) setSignatureSource(watchedFirmaSource);
  }, [watchedFirmaSource]);

  useEffect(() => {
    if (watchedFirmaApoSource) setSignatureSourceApo(watchedFirmaApoSource);
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

  const restoreFirma = (sigInfo, { setSource, setImage, canvasRef }) => {
    if (!sigInfo) return;
    const { source, data, url } = sigInfo;
    setSource(source || 'draw');
    setImage(null);
    if (source === 'draw' && data) {
      setTimeout(() => {
        if (canvasRef.current && canvasRef.current.fromDataURL) {
          canvasRef.current.fromDataURL(data);
        }
      }, 200);
    } else if (source === 'upload') {
      if (data && /^data:image\//i.test(data)) {
        setImage(data);
      } else if (url) {
        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
        setImage(`${backendUrl}${url}`);
      }
    }
  };

  useEffect(() => {
    if (restoredRef.current) return;
    let cancelled = false;
    const finish = () => {
      if (!cancelled) restoredRef.current = true;
    };

    if (initialData) {
      const formattedData = buildFormattedData(initialData);
      reset(formattedData);
      restoreFirma(initialData.firma, { setSource: setSignatureSource, setImage: setSignatureImage, canvasRef: sigCanvas });
      restoreFirma(initialData.firmaContractual, { setSource: setSignatureSourceApo, setImage: setSignatureImageApo, canvasRef: sigCanvasApo });

      if (esBorrador && initialData.seccionesGuardadas) {
        setSavedSections((prev) => ({ ...prev, ...initialData.seccionesGuardadas }));
        setBorradorUpdatedAt(initialData.updatedAt || null);
        setIsRestoringDraft(true);
      } else {
        setSavedSections({ partes: true, siniestro: true, firmaComitente: true, firmaContractual: true });
      }
      finish();
      return () => { cancelled = true; };
    }

    if (autosaveEnabled && borradorId) {
      (async () => {
        try {
          const draf = await borradorService.obtenerBorrador(borradorId, tipoSolicitud);
          if (cancelled) return;
          reset(buildFormattedData(draf));
          restoreFirma(draf.firma, { setSource: setSignatureSource, setImage: setSignatureImage, canvasRef: sigCanvas });
          restoreFirma(draf.firmaContractual, { setSource: setSignatureSourceApo, setImage: setSignatureImageApo, canvasRef: sigCanvasApo });
          if (draf.seccionesGuardadas) {
            setSavedSections((prev) => ({ ...prev, ...draf.seccionesGuardadas }));
          }
          setBorradorUpdatedAt(draf.updatedAt || null);
          setIsRestoringDraft(true);
        } catch (error) {
          console.error('[ContratoForm] No se pudo reanudar el borrador:', error);
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
  }, [initialData, autosaveEnabled, borradorId, reset, tipoSolicitud, clearBorrador]);

  const watchedAll = watch();
  const debouncedWatchedAll = useDebounce(watchedAll, 3000);
  useEffect(() => {
    if (!autosaveEnabled) return;
    if (!restoredRef.current) return;
    if (isUploading) return;
    if (!borradorId) return;
    try {
      requestSave(buildAutosavePayload());
    } catch (e) {
      console.warn('[ContratoForm] Error al encolar auto-guardado:', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedWatchedAll, borradorId]);

  const handleSaveSection = async (sectionName, nextTabIndex) => {
    setIsSaving(true);
    let fieldsToValidate = [];

    switch (sectionName) {
      case 'partes':
        fieldsToValidate = ['comitente.nombre', 'comitente.cedula', 'abogado.nombre'];
        break;
      case 'siniestro':
        fieldsToValidate = ['siniestro.fecha', 'siniestro.porcentaje'];
        break;
      case 'firmaComitente':
        fieldsToValidate = ['firma'];
        break;
      case 'firmaContractual':
        fieldsToValidate = ['firmaContractual'];
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

  const customOnSubmit = async (data) => {
    if (autosaveEnabled) {
      try {
        await flushSave();
      } catch (e) {
        console.warn('[ContratoForm] No se pudo vaciar la cola de auto-guardado:', e);
      }
    }

    const dataToSend = { ...data };

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
      label: 'comitente',
      source: signatureSource,
      file: dataToSend.firma?.file,
      current: dataToSend.firma,
      imageData: signatureImage,
      canvasRef: sigCanvas,
    }) || null;
    dataToSend.firmaContractual = await processFirma({
      label: 'contractual',
      source: signatureSourceApo,
      file: dataToSend.firmaContractual?.file,
      current: dataToSend.firmaContractual,
      imageData: signatureImageApo,
      canvasRef: sigCanvasApo,
    }) || null;

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
    { key: 'partes', label: 'Partes (Comitente/Abogado)', icon: PersonIcon, color: '#673ab7' },
    { key: 'siniestro', label: 'Siniestro y Honorarios', icon: AssignmentIcon, color: '#ff5722' },
    { key: 'firmaComitente', label: 'Firma Comitente', icon: CreateIcon, color: '#795548' },
    { key: 'firmaContractual', label: 'Firma Abogado', icon: CreateIcon, color: '#00897b' },
  ];

  return (
    <Box>
      <GlassCard hover={false} sx={{ mb: 3, p: 3 }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {initialData ? 'Editar Contrato de Servicios' : 'Generar Contrato de Servicios'}
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
        {/* Tab 0: Partes */}
        <TabPanel value={tabValue} index={0}>
          <GlassCard><Box p={3}><Stack spacing={3}>
            <Typography variant="h6">Datos del Comitente (Cliente)</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}><GlassTextField {...register('comitente.nombre', { required: 'Requerido' })} label="Nombre Completo" fullWidth error={!!errors.comitente?.nombre} helperText={errors.comitente?.nombre?.message} /></Grid>
              <Grid item xs={12} sm={6}><GlassTextField {...register('comitente.cedula', { required: 'Requerido' })} label="Cédula" fullWidth error={!!errors.comitente?.cedula} helperText={errors.comitente?.cedula?.message} /></Grid>
              <Grid item xs={12} sm={6}><GlassTextField {...register('comitente.ciudad')} label="Ciudad de Domicilio (Ej: Cúcuta)" fullWidth /></Grid>
            </Grid>

            <Typography variant="h6" sx={{ mt: 2 }}>Datos del Abogado (Pre-llenados)</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}><GlassTextField {...register('abogado.nombre', { required: 'Requerido' })} label="Nombre Abogado" fullWidth error={!!errors.abogado?.nombre} helperText={errors.abogado?.nombre?.message} /></Grid>
              <Grid item xs={12} sm={6}><GlassTextField {...register('abogado.cedula')} label="Cédula Abogado" fullWidth /></Grid>
              <Grid item xs={12} sm={6}><GlassTextField {...register('abogado.tarjetaProfesional')} label="Tarjeta Profesional" fullWidth /></Grid>
            </Grid>

            <Typography variant="h6" sx={{ mt: 2 }}>Lugar y Fecha de Firma</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}><GlassTextField {...register('ciudadFirma')} label="Ciudad de Firma" fullWidth /></Grid>
              <Grid item xs={12} sm={6}><GlassTextField {...register('fechaFirma')} label="Fecha de Firma" type="date" InputLabelProps={{ shrink: true }} fullWidth /></Grid>
            </Grid>
            <Button variant="contained" onClick={() => handleSaveSection('partes', 1)} disabled={isSaving} startIcon={isSaving ? null : <SaveIcon />}>
              {isSaving ? 'Guardando...' : 'Guardar y Continuar'}
            </Button>
          </Stack></Box></GlassCard>
        </TabPanel>

        {/* Tab 1: Siniestro y Honorarios */}
        <TabPanel value={tabValue} index={1}>
          <GlassCard><Box p={3}><Stack spacing={3}>
            <Typography variant="h6">Siniestro y Honorarios</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}><GlassTextField {...register('siniestro.fecha', { required: 'Requerido' })} label="Fecha del Accidente" type="date" InputLabelProps={{ shrink: true }} fullWidth error={!!errors.siniestro?.fecha} helperText={errors.siniestro?.fecha?.message} /></Grid>
              <Grid item xs={12} sm={6}><GlassTextField {...register('siniestro.victimaNombre')} label="Nombre de la Víctima (si no se digita, se usa el comitente)" fullWidth /></Grid>
              <Grid item xs={12} sm={6}><GlassTextField {...register('siniestro.porcentaje', { required: 'Requerido' })} label="Porcentaje de Honores (Ej: 25)" fullWidth error={!!errors.siniestro?.porcentaje} helperText={errors.siniestro?.porcentaje?.message} /></Grid>
              <Grid item xs={12} sm={6}><GlassTextField {...register('siniestro.porcentajeLetras')} label="Porcentaje en Letras (Ej: veinticinco)" fullWidth /></Grid>
            </Grid>
            <Button variant="contained" onClick={() => handleSaveSection('siniestro', 2)} disabled={isSaving} startIcon={isSaving ? null : <SaveIcon />}>
              {isSaving ? 'Guardando...' : 'Guardar y Continuar'}
            </Button>
          </Stack></Box></GlassCard>
        </TabPanel>

        {/* Tab 2: Firma del Comitente */}
        <TabPanel value={tabValue} index={2}>
          <GlassCard><Box p={3}>
            <SignatureEditor
              label="Firma del Comitente"
              source={signatureSource}
              onSourceChange={changeSignatureSource('firma', setSignatureSource, setSignatureImage, sigCanvas)}
              onFileChange={handleSignatureFileUpload('firma', setSignatureImage)}
              image={signatureImage}
              canvasRef={sigCanvas}
              onEnd={() => setValue('firma.data', sigCanvas.current ? sigCanvas.current.getTrimmedCanvas().toDataURL('image/png') : null)}
            />
            <Box mt={3}><Button variant="contained" onClick={() => handleSaveSection('firmaComitente', 3)} disabled={isSaving} startIcon={isSaving ? null : <SaveIcon />}>
              {isSaving ? 'Guardando...' : 'Guardar y Continuar'}
            </Button></Box>
          </Box></GlassCard>
        </TabPanel>

        {/* Tab 3: Firma del Abogado y Envío */}
        <TabPanel value={tabValue} index={3}>
          <GlassCard><Box p={3}><Stack spacing={3}>
            <SignatureEditor
              label="Firma del Abogado (EL CONTRACTUAL)"
              source={signatureSourceApo}
              onSourceChange={changeSignatureSource('firmaContractual', setSignatureSourceApo, setSignatureImageApo, sigCanvasApo)}
              onFileChange={handleSignatureFileUpload('firmaContractual', setSignatureImageApo)}
              image={signatureImageApo}
              canvasRef={sigCanvasApo}
              onEnd={() => setValue('firmaContractual.data', sigCanvasApo.current ? sigCanvasApo.current.getTrimmedCanvas().toDataURL('image/png') : null)}
            />
            <Button variant="contained" onClick={() => handleSaveSection('firmaContractual')} disabled={isSaving} startIcon={isSaving ? null : <SaveIcon />}>
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
              {isUploading ? 'Generando...' : (isUpdating ? 'Actualizando...' : (initialData ? 'Actualizar y Descargar' : 'Generar Documento'))}
            </Button>
          </Stack></Box></GlassCard>
        </TabPanel>
      </form>
    </Box>
  );
};
export default ContratoForm;