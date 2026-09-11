import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import {
  TextField, Button, Typography, Box, Grid, Tabs, Tab, Checkbox,
  FormControlLabel, FormControl, InputLabel, Select, MenuItem, FormHelperText,
  alpha, useTheme, Stack, Avatar, IconButton, Chip, LinearProgress, Collapse,
  Alert, Badge, RadioGroup, Radio, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, CircularProgress
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
  AccountBalanceWallet as AccountBalanceWalletIcon
} from '@mui/icons-material';
import SignatureCanvas from 'react-signature-canvas';
import LocationSelector from './LocationSelector';
import { uploadFile } from '../../services/fileStorageService';
import { useDebounce } from '../../hooks/useDebounce';
import { useBorradorAutosave } from '../../hooks/useBorradorAutosave';
import borradorService, { TIPO_LIQUIDACION } from '../../services/borradorService';
import GlassCard from '../common/GlassCard';

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

const GlassSelect = ({ control, name, label, options, rules, error, ...props }) => {
    const theme = useTheme();
    return (
        <FormControl fullWidth error={!!error}>
            <InputLabel>{label}</InputLabel>
            <Controller
                name={name}
                control={control}
                rules={rules}
                defaultValue=""
                render={({ field }) => (
                    <Select
                        {...field}
                        label={label}
                        sx={{
                            minWidth: 300,
                            borderRadius: '12px',
                            background: 'rgba(255, 255, 255, 0.08)',
                            backdropFilter: 'blur(10px)',
                            '.MuiOutlinedInput-notchedOutline': { border: '1px solid rgba(255, 255, 255, 0.2)' },
                            '&:hover .MuiOutlinedInput-notchedOutline': { border: '1px solid rgba(255, 255, 255, 0.3)' },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { border: `2px solid ${error ? theme.palette.error.main : alpha(theme.palette.primary.main, 0.5)} !important` },
                        }}
                        {...props}
                    >
                        {options.map(option => (
                            <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                        ))}
                    </Select>
                )}
            />
            {error && <FormHelperText>{error.message}</FormHelperText>}
        </FormControl>
    );
};

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
  })),
  procesosJudiciales: initialData.procesosJudiciales?.map((p) => ({
    ...p,
    valor: p.valor ?? '',
  })),
  informacionFinanciera: initialData.informacionFinanciera || {},
  anexos: initialData.anexos?.map((a) => ({
    ...a,
    name: a.name,
    url: a.url,
    file: undefined,
  })),
});

const LiquidacionForm = ({ onSubmit, resetToken, initialData, isUpdating }) => {
  const theme = useTheme();
  const { register, control, handleSubmit, watch, setValue, getValues, trigger, formState: { errors }, reset, setError } = useForm({
    defaultValues: {
      sede: { departamento: '', ciudad: '', juzgado: '' },
      deudor: {
        primerNombre: '', segundoNombre: '', primerApellido: '', segundoApellido: '',
        cedula: '', departamentoExpedicion: '', ciudadExpedicion: '', direccion: '',
        email: '', telefono: '', departamento: '', ciudad: '', noComerciante: true,
        sociedadConyugalActiva: false, nombreConyuge: '', cedulaConyuge: '', ciudadExpedicionConyuge: '',
      },
      apoderado: { nombreCompleto: '', cedula: '', ciudadExpedicion: '', tp: '', direccion: '', email: '', telefono: '' },
      acreencias: [],
      procesosJudiciales: [],
      informacionFinanciera: {
        cuantiaTotal: '', numeroObligaciones: '', numeroAcreedores: '', porcentajePasivo: '',
        ingresosMensuales: '', entidadEmpleadora: '', cargoEmpleo: '', gastosMensuales: '',
        capacidadPago: '', tieneBienesEmbargables: false,
      },
      anexos: [],
      firma: { source: 'draw', data: null, file: null },
    }
  });

  const { fields: acreenciasFields, append: appendAcreencia, remove: removeAcreencia } = useFieldArray({ control, name: 'acreencias', rules: { minLength: { value: 1, message: 'Debe agregar al menos una obligación / acreencia' } } });
  const { fields: procesosFields, append: appendProceso, remove: removeProceso } = useFieldArray({ control, name: 'procesosJudiciales' });
  const { fields: anexosFields, append: appendAnexo, remove: removeAnexo } = useFieldArray({ control, name: 'anexos' });

  const [tabValue, setTabValue] = useState(0);
  const [validationError, setValidationError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingAnexos, setUploadingAnexos] = useState({});
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

  const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState(false);
  const [currentFileToProcess, setCurrentFileToProcess] = useState(null);
  const [currentAnexoIndex, setCurrentAnexoIndex] = useState(null);

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
      case 'firma': fieldsToValidate = ['firma']; break;
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
        const gcsUrl = await uploadFile(dataToSend.firma.file);
        dataToSend.firma = {
          source: 'upload',
          name: dataToSend.firma.file.name,
          url: gcsUrl,
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
    { key: 'acreencias', label: 'Obligaciones', icon: ReceiptIcon, color: '#ff5722' },
    { key: 'procesosJudiciales', label: 'Procesos', icon: AccountBalanceIcon, color: '#f44336' },
    { key: 'informacionFinanciera', label: 'Financiera', icon: TrendingUpIcon, color: '#4caf50' },
    { key: 'anexos', label: 'Anexos', icon: AttachFileIcon, color: '#009688' },
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
          <Stack spacing={3}>
            {acreenciasFields.map((field, index) => (
              <GlassCard key={field.id} sx={{ p: 3 }}>
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Chip avatar={<Avatar><ReceiptIcon /></Avatar>} label={`Obligación / Acreencia #${index + 1}`} />
                    <IconButton onClick={() => removeAcreencia(index)} size="small"><DeleteIcon /></IconButton>
                  </Stack>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}><GlassTextField {...register(`acreencias.${index}.nombreAcreedor`, { required: 'Campo requerido' })} label="Nombre del Acreedor" fullWidth error={errors.acreencias?.[index]?.nombreAcreedor} helperText={errors.acreencias?.[index]?.nombreAcreedor?.message} /></Grid>
                    <Grid item xs={12} sm={6}><GlassSelect control={control} name={`acreencias.${index}.tipoAcreedor`} label="Tipo de Acreedor" options={[
                      { value: 'Entidad Financiera', label: 'Entidad Financiera' },
                      { value: 'Entidad Cooperativa', label: 'Entidad Cooperativa' },
                      { value: 'Comerciante', label: 'Comerciante' },
                      { value: 'Persona Natural', label: 'Persona Natural' },
                      { value: 'Entidad Pública', label: 'Entidad Pública' },
                      { value: 'Fondo de Empleados', label: 'Fondo de Empleados' },
                      { value: 'Otro', label: 'Otro' },
                    ]} rules={{ required: 'Campo requerido' }} error={errors.acreencias?.[index]?.tipoAcreedor} /></Grid>
                    <Grid item xs={12} sm={6}><GlassTextField {...register(`acreencias.${index}.naturaleza`, { required: 'Campo requerido' })} label="Naturaleza de la Obligación" fullWidth error={errors.acreencias?.[index]?.naturaleza} helperText={errors.acreencias?.[index]?.naturaleza?.message} /></Grid>
                    <Grid item xs={12} sm={6}><GlassTextField {...register(`acreencias.${index}.capital`, { required: 'Campo requerido', valueAsNumber: true })} label="Capital ($)" type="number" fullWidth error={errors.acreencias?.[index]?.capital} helperText={errors.acreencias?.[index]?.capital?.message} /></Grid>
                  </Grid>
                </Stack>
              </GlassCard>
            ))}
            <Button variant="outlined" onClick={() => appendAcreencia({})} startIcon={<AddIcon />}>Añadir Obligación / Acreencia</Button>
            {errors.acreencias?.root && <FormHelperText error>{errors.acreencias.root.message}</FormHelperText>}
            {acreenciasFields.length > 0 && (
              <Chip
                icon={<AccountBalanceWalletIcon />}
                label={`Total Capital: $ ${totalAcreencias.toLocaleString('es-CO')}`}
                sx={{
                  background: alpha(theme.palette.info.main, 0.1),
                  color: theme.palette.info.main,
                  fontWeight: 700,
                  alignSelf: 'flex-start',
                  fontSize: '1rem',
                }}
              />
            )}
            <Button variant="contained" onClick={() => handleSaveSection('acreencias', 4)} disabled={isSaving} startIcon={<SaveIcon />} sx={{ mt: 2 }}>
              {isSaving ? 'Guardando...' : 'Guardar y Continuar'}
            </Button>
          </Stack>
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
            <Stack spacing={3}>
              <Typography variant="h6">Información Financiera</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}><GlassTextField {...register('informacionFinanciera.cuantiaTotal', { valueAsNumber: true })} label="Cuantía Total (si no se diligenció, se calcula de las obligaciones)" type="number" fullWidth error={!!errors.informacionFinanciera?.cuantiaTotal} helperText={errors.informacionFinanciera?.cuantiaTotal?.message} /></Grid>
                <Grid item xs={12} sm={6}><GlassTextField {...register('informacionFinanciera.numeroObligaciones', { required: 'Campo requerido', valueAsNumber: true })} label="Número de Obligaciones" type="number" fullWidth error={!!errors.informacionFinanciera?.numeroObligaciones} helperText={errors.informacionFinanciera?.numeroObligaciones?.message} /></Grid>
                <Grid item xs={12} sm={6}><GlassTextField {...register('informacionFinanciera.numeroAcreedores', { required: 'Campo requerido', valueAsNumber: true })} label="Número de Acreedores" type="number" fullWidth error={!!errors.informacionFinanciera?.numeroAcreedores} helperText={errors.informacionFinanciera?.numeroAcreedores?.message} /></Grid>
                <Grid item xs={12} sm={6}><GlassTextField {...register('informacionFinanciera.porcentajePasivo', { required: 'Campo requerido', valueAsNumber: true })} label="Porcentaje del Pasivo (%)" type="number" fullWidth error={!!errors.informacionFinanciera?.porcentajePasivo} helperText={errors.informacionFinanciera?.porcentajePasivo?.message} /></Grid>
                <Grid item xs={12} sm={6}><GlassTextField {...register('informacionFinanciera.ingresosMensuales', { required: 'Campo requerido', valueAsNumber: true })} label="Ingresos Mensuales ($)" type="number" fullWidth error={!!errors.informacionFinanciera?.ingresosMensuales} helperText={errors.informacionFinanciera?.ingresosMensuales?.message} /></Grid>
                <Grid item xs={12} sm={6}><GlassTextField {...register('informacionFinanciera.entidadEmpleadora', { required: 'Campo requerido' })} label="Entidad Empleadora" fullWidth error={!!errors.informacionFinanciera?.entidadEmpleadora} helperText={errors.informacionFinanciera?.entidadEmpleadora?.message} /></Grid>
                <Grid item xs={12} sm={6}><GlassTextField {...register('informacionFinanciera.cargoEmpleo', { required: 'Campo requerido' })} label="Cargo en la Entidad" fullWidth error={!!errors.informacionFinanciera?.cargoEmpleo} helperText={errors.informacionFinanciera?.cargoEmpleo?.message} /></Grid>
                <Grid item xs={12} sm={6}><GlassTextField {...register('informacionFinanciera.gastosMensuales', { required: 'Campo requerido', valueAsNumber: true })} label="Gastos Mensuales ($)" type="number" fullWidth error={!!errors.informacionFinanciera?.gastosMensuales} helperText={errors.informacionFinanciera?.gastosMensuales?.message} /></Grid>
                <Grid item xs={12} sm={6}><GlassTextField {...register('informacionFinanciera.capacidadPago', { required: 'Campo requerido', valueAsNumber: true })} label="Capacidad de Pago Mensual ($)" type="number" fullWidth error={!!errors.informacionFinanciera?.capacidadPago} helperText={errors.informacionFinanciera?.capacidadPago?.message} /></Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={<Controller name="informacionFinanciera.tieneBienesEmbargables" control={control} render={({ field }) => <Checkbox {...field} checked={!!field.value} />} />}
                    label="¿Posee bienes embargables?"
                  />
                </Grid>
              </Grid>
              <Button variant="contained" onClick={() => handleSaveSection('informacionFinanciera', 6)} disabled={isSaving} startIcon={<SaveIcon />} sx={{ mt: 2 }}>
                {isSaving ? 'Guardando...' : 'Guardar y Continuar'}
              </Button>
            </Stack>
          </GlassCard>
        </TabPanel>

        <TabPanel value={tabValue} index={6}>
          <GlassCard sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Typography variant="h6">Pruebas y Anexos</Typography>
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
    </Box>
  );
};

export default LiquidacionForm;