import React, { useState, useEffect } from 'react';
import CreatableSelect from 'react-select/creatable';
import ReactSelect from "react-select";
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { 
  TextField, Button, Typography, Box, Paper, Grid, Tabs, Tab, Checkbox, 
  FormControlLabel, Tooltip, FormControl, InputLabel, Select, MenuItem, Chip, Collapse, Alert, FormHelperText,
  alpha, useTheme, Stack, Avatar, IconButton, Divider, LinearProgress, Fade, Badge, RadioGroup, Radio, Switch,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle
} from '@mui/material';
import {
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon,
  AccountBalance as AccountBalanceIcon,
  Home as HomeIcon,
  Assessment as AssessmentIcon,
  LocationCity as LocationCityIcon,
  HelpOutline as HelpOutlineIcon,
  Gavel as GavelIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Send as SendIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as AttachMoneyIcon,
  Close as CloseIcon,
  Verified as VerifiedIcon,
  Error as ErrorIcon,
  AttachFile as AttachFileIcon,
  UploadFile as UploadFileIcon,
  Create as CreateIcon
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
// HINT: You may need to install this dependency: npm install react-signature-canvas
import SignatureCanvas from 'react-signature-canvas';
import LocationSelector from './LocationSelector';
import { getAcreedores } from '../../services/acreedorService';
import { uploadFile } from '../../services/fileStorageService';

// Glassmorphism Card Component
const GlassCard = ({ children, sx = {}, hover = true, ...props }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <Paper
      elevation={0}
      onMouseEnter={() => hover && setIsHovered(true)}
      onMouseLeave={() => hover && setIsHovered(false)}
      sx={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
        },
        ...(hover && {
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
          }
        }),
        ...sx
      }}
      {...props}
    >
      {children}
    </Paper>
  );
};

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
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '& fieldset': {
            border: '1px solid rgba(255, 255, 255, 0.2)',
          },
          '&:hover': {
            background: 'rgba(255, 255, 255, 0.12)',
            transform: 'translateY(-1px)',
            '& fieldset': {
              border: '1px solid rgba(255, 255, 255, 0.3)',
            },
          },
          '&.Mui-focused': {
            background: 'rgba(255, 255, 255, 0.15)',
            '& fieldset': {
              border: `2px solid ${error ? theme.palette.error.main : alpha(theme.palette.primary.main, 0.5)} !important`,
            },
          },
          '&.Mui-error': {
            '& fieldset': {
              border: `1px solid ${alpha(theme.palette.error.main, 0.5)}`,
            },
          },
        },
        '& .MuiInputLabel-root': {
          color: 'rgba(0, 0, 0, 0.6)',
          '&.Mui-focused': {
            color: error ? theme.palette.error.main : theme.palette.primary.main,
          },
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
      {value === index && <Box sx={{ p: { xs: 2, md: 3 } }}>{children}</Box>}
    </div>
  );
}

const procesoOptions = {
  Judicial: [
    'PROCESO COBRO DE OBLIGACIONES DINERARIAS',
    'PROCESO DECLARATIVO',
    'PROCESO DE FAMILIA',
    'PROCESO DE JURISDICCIÓN COACTIVA',
    'PROCESO DE JURISDICCIÓN VOLUNTARIA',
    'PROCESO DE LIQUIDACIÓN',
    'PROCESO DE TIPO LABORAL',
    'PROCESO DE TIPO PENAL',
    'PROCESO EJECUCIÓN ESPECIAL',
    'PROCESO EJECUTIVO',
    'PROCESO EJECUTIVO DE ALIMENTOS',
    'PROCESO RESTITUCIÓN DE BIENES POR MORA EN EL PAGO DE LOS CÁNONES',
  ],
  Privado: [
    'PROCESO COBRO DE OBLIGACIONES DINERARIAS',
    'PROCESO DE JURISDICCIÓN COACTIVA',
    'PROCESO EJECUCIÓN ESPECIAL',
    'PROCESO EJECUTIVO',
    'PROCESO RESTITUCIÓN DE BIENES POR MORA EN EL PAGO DE LOS CÁNONES',
  ],
  Administrativo: [
    'PROCESO COBRO DE OBLIGACIONES DINERARIAS',
    'PROCESO DE JURISDICCIÓN COACTIVA',
    'PROCESO EJECUCIÓN ESPECIAL',
    'PROCESO EJECUTIVO',
    'PROCESO RESTITUCIÓN DE BIENES POR MORA EN EL PAGO DE LOS CÁNONES',
  ],
};

const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  try {
    // Create a date object, assuming UTC to avoid timezone issues
    const date = new Date(dateString);
    // Adjust for timezone offset to get the correct date
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(date.getTime() + userTimezoneOffset);

    const year = adjustedDate.getFullYear();
    const month = String(adjustedDate.getMonth() + 1).padStart(2, '0');
    const day = String(adjustedDate.getDate()).padStart(2, '0');
    
    if (isNaN(year) || isNaN(month) || isNaN(day)) return '';

    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error formatting date:', dateString, error);
    return '';
  }
};

// Reusable Description Modal component
const DescriptionModal = ({ open, onClose, onConfirm, defaultValue = '' }) => {
  const theme = useTheme();
  const [description, setDescription] = useState(defaultValue);

  const handleConfirm = () => {
    onConfirm(description);
    setDescription(''); // Reset description after confirming
  };

  const handleClose = () => {
    onClose();
    setDescription(''); // Reset description on close
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
            Añadir Descripción al Anexo
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
          label="Descripción"
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
        <Button onClick={handleConfirm} variant="contained" color="primary">
          Confirmar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const InsolvenciaForm = ({ onSubmit, resetToken, initialData, isUpdating }) => {
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
  const { register, control, handleSubmit, watch, setValue, getValues, trigger, formState: { errors }, reset, setError, clearErrors } = useForm({
    defaultValues: {
      deudor: {},
      sede: { departamento: '', ciudad: '', entidadPromotora: '', sedeCentro: '' },
      causas: {},
      acreencias: [],
      bienesMuebles: [],
      bienesInmuebles: [],
      sociedadConyugal: { activa: false, disuelta: false },
      informacionFinanciera: { gastosPersonales: {}, obligacionesAlimentarias: [], procesosJudiciales: [] },
      propuestaPago: { tipoNegociacion: 'texto' },
      noPoseeBienes: false,
      anexos: [],
      firma: { source: 'draw', data: null, file: null },
    }
  });

  const { fields: acreenciasFields, append: appendAcreencia, remove: removeAcreencia } = useFieldArray({ control, name: "acreencias" });
  const { fields: bienesMueblesFields, append: appendBienMueble, remove: removeBienMueble } = useFieldArray({ control, name: "bienesMuebles" });
  const { fields: bienesInmueblesFields, append: appendBienInmueble, remove: removeBienInmueble } = useFieldArray({ control, name: "bienesInmuebles" });
  const { fields: obligacionesFields, append: appendObligacion, remove: removeObligacion } = useFieldArray({ control, name: "informacionFinanciera.obligacionesAlimentarias" });
  const { fields: procesosFields, append: appendProceso, remove: removeProceso } = useFieldArray({ control, name: "informacionFinanciera.procesosJudiciales" });
  const { fields: causasFields, append: appendCausa, remove: removeCausa } = useFieldArray({ control, name: "causas.lista" });
  const { fields: anexosFields, append: appendAnexo, remove: removeAnexo } = useFieldArray({ control, name: "anexos" });

  const updateGastosPersonasCargo = () => {
    const obligaciones = getValues('informacionFinanciera.obligacionesAlimentarias');
    const totalCuantia = obligaciones?.reduce((sum, obligacion) => {
      return sum + (parseFloat(obligacion.cuantia) || 0);
    }, 0) || 0;
    setValue('informacionFinanciera.gastosPersonales.gastosPersonasCargo', totalCuantia);
  };

  const [projectionData, setProjectionData] = useState([]);
  const { data: acreedoresData, isLoading } = useQuery({ queryKey: ['acreedores'], queryFn: () => getAcreedores({ pageIndex: 0, pageSize: 1000, sorting: JSON.stringify([{ id: 'nombre', desc: false }]) }) });
  const [tabValue, setTabValue] = useState(0);
  const [validationError, setValidationError] = useState('');
  const [savedSections, setSavedSections] = useState({
    deudor: false,
    sede: false,
    causas: false,
    acreencias: false,
    bienes: false,
    financiera: false,
    propuesta: false,
    anexos: false,
    firma: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingAnexos, setUploadingAnexos] = useState({});
  const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);
  const sigCanvas = React.useRef({});

  // Watcher for firma.source to keep state in sync
  const watchedFirmaSource = watch('firma.source');
  const [signatureSource, setSignatureSource] = useState('draw');
  const [signatureImage, setSignatureImage] = useState(null);
  
  // State for Description Modal
  const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState(false);
  const [currentFileToProcess, setCurrentFileToProcess] = useState(null);
  const [currentAnexoIndex, setCurrentAnexoIndex] = useState(null);

  // Keep signatureSource state in sync with the form value
  useEffect(() => {
    if (watchedFirmaSource) {
      setSignatureSource(watchedFirmaSource);
    }
  }, [watchedFirmaSource]);

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
    
    // Clear the input field so the same file can be selected again
    e.target.value = null;
  };

  const handleDescriptionConfirm = async (description) => {
    if (!currentFileToProcess || currentAnexoIndex === null) return;
    
    setIsDescriptionModalOpen(false);
    setUploadingAnexos(prev => ({ ...prev, [currentAnexoIndex]: true }));

    try {
      console.log(`[InsolvenciaForm] GCS Upload for index ${currentAnexoIndex}, file:`, currentFileToProcess.name, 'Description:', description);
      const { fileUrl, uniqueFilename } = await uploadFile(currentFileToProcess);
      console.log(`[InsolvenciaForm] GCS Upload successful for index ${currentAnexoIndex}. URL: ${fileUrl}, Filename: ${uniqueFilename}`);
      
      setValue(`anexos.${currentAnexoIndex}.name`, uniqueFilename, { shouldValidate: true });
      setValue(`anexos.${currentAnexoIndex}.url`, fileUrl, { shouldValidate: true });
      setValue(`anexos.${currentAnexoIndex}.descripcion`, description); // Set the description
      setValue(`anexos.${currentAnexoIndex}.file`, undefined); // Clear the file object

    } catch (error) {
      console.error("Error uploading anexo:", error);
      setError(`anexos.${currentAnexoIndex}.url`, { type: 'manual', message: 'Error al subir el archivo' });
    } finally {
      setUploadingAnexos(prev => ({ ...prev, [currentAnexoIndex]: false }));
      setCurrentFileToProcess(null);
      setCurrentAnexoIndex(null);
    }
  };

  useEffect(() => {
    console.log('[InsolvenciaForm] InitialData received:', initialData);
    if (initialData) {
      const formattedData = {
        ...initialData,
        deudor: {
          ...initialData.deudor,
          fechaNacimiento: formatDateForInput(initialData.deudor?.fechaNacimiento),
          fechaGraduacion: formatDateForInput(initialData.deudor?.fechaGraduacion),
        },
        acreencias: initialData.acreencias?.map(a => ({
          ...a,
          fechaOtorgamiento: formatDateForInput(a.fechaOtorgamiento),
          fechaVencimiento: formatDateForInput(a.fechaVencimiento),
          moraMas90Dias: a.moraMas90Dias || false,
        })),
        bienesMuebles: initialData.bienesMuebles?.map(b => ({
          ...b,
          tipoBienMueble: b.tipoBienMueble || '',
          clasificacion: b.clasificacion || '',
        })),
        propuestaPago: {
          ...initialData.propuestaPago,
          fechaInicioPago: formatDateForInput(initialData.propuestaPago?.fechaInicioPago),
        },
        anexos: initialData.anexos?.map(a => ({
          ...a,
          name: a.name,
          url: a.url,
          file: undefined,
        })),
      };
      console.log('[InsolvenciaForm] Formatted data for reset:', formattedData);
      reset(formattedData);

      // Set signature state when updating
      if (initialData.firma) {
        const { source, data, url } = initialData.firma;
        setSignatureSource(source || 'draw');
        
        if (source === 'draw' && data) {
          // Use a timeout to ensure canvas is ready
          setTimeout(() => {
            if (sigCanvas.current && sigCanvas.current.fromDataURL) {
              sigCanvas.current.fromDataURL(data);
            }
          }, 200);
        } else if (source === 'upload' && url) {
          // Assuming the URL is a relative path to the backend
          const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
          setSignatureImage(`${backendUrl}${url}`);
        }
      }

      setSavedSections({
        deudor: true,
        sede: true,
        causas: true,
        acreencias: true,
        bienes: true,
        financiera: true,
        propuesta: true,
        anexos: true,
        firma: true,
      });
    }
  }, [initialData, reset]);

  const handleSaveSection = async (sectionName, nextTabIndex) => {
    setIsSaving(true);
    let fieldsToValidate = [];

    switch (sectionName) {
      case 'deudor':
        fieldsToValidate = ['deudor'];
        break;
      case 'sede':
        fieldsToValidate = ['sede'];
        break;
      case 'causas':
        fieldsToValidate = ['causas'];
        break;
      case 'acreencias':
        fieldsToValidate = ['acreencias'];
        break;
      case 'bienes':
        fieldsToValidate = [
          'bienesMuebles',
          'bienesInmuebles',
          'sociedadConyugal.activa',
          'sociedadConyugal.disuelta',
          'sociedadConyugal.nombreConyuge',
          'sociedadConyugal.tipoDocConyuge',
          'sociedadConyugal.numDocConyuge',
          'noPoseeBienes',
        ];
        break;
      case 'financiera':
        fieldsToValidate = [
          'informacionFinanciera.ingresosActividadPrincipal',
          'informacionFinanciera.descripcionActividadEconomica',
          'informacionFinanciera.tieneEmpleo',
          'informacionFinanciera.tipoEmpleo',
          'informacionFinanciera.ingresosOtrasActividades',
          'informacionFinanciera.gastosPersonales',
          'informacionFinanciera.obligacionesAlimentarias',
          'informacionFinanciera.obligacionesAlimentarias.tipoIdentificacion',
          'informacionFinanciera.procesosJudiciales',
        ];
        break;
      case 'propuesta':
        fieldsToValidate = [
          'propuestaPago.tipoNegociacion',
          'propuestaPago.plazo',
          'propuestaPago.interesEA',
          'propuestaPago.interesMensual',
          'propuestaPago.fechaInicioPago',
          'propuestaPago.diaPago',
        ];
        break;
      case 'anexos':
        fieldsToValidate = ['anexos'];
        break;
      case 'firma':
        fieldsToValidate = ['firma'];
        break;
      default:
        break;
    }

    const results = await Promise.all(fieldsToValidate.map(field => trigger(field)));
    const isValid = results.every(Boolean);

    if (isValid) {
      setValidationError('');
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate save
      setSavedSections(prev => ({ ...prev, [sectionName]: true }));
      if (nextTabIndex !== undefined) {
        setTabValue(nextTabIndex);
      }
    } else {
      const errorKeys = Object.keys(errors);
      console.log('errrorKeys', errorKeys);
      const sectionError = errorKeys.find(key => fieldsToValidate.includes(key.split('.')[0]));
      console.log('sectionError', sectionError)
      if (sectionError) {
        setValidationError(`Hay errores en la sección actual. Por favor, revise los campos marcados.`);
      } else {
        setValidationError('Ocurrió un error de validación desconocido.');
      }
    }
    setIsSaving(false);
  };

  const onInvalid = (errors) => {
    console.error('Errores de validación del formulario:', errors);
    setValidationError('El formulario tiene errores. Por favor, revise todas las pestañas y corrija los campos marcados en rojo.');
  };

  const customOnSubmit = async (data) => {
    setIsUploading(true);
    const correctedData = { ...data };

    // Manually correct the fields for 'sede' if they are objects
    if (correctedData.sede && typeof correctedData.sede.entidadPromotora === 'object' && correctedData.sede.entidadPromotora !== null) {
      correctedData.sede.entidadPromotora = correctedData.sede.entidadPromotora.value;
    }
    if (correctedData.sede && typeof correctedData.sede.sedeCentro === 'object' && correctedData.sede.sedeCentro !== null) {
      correctedData.sede.sedeCentro = correctedData.sede.sedeCentro.value;
    }

    // Process Signature File
    if (signatureSource === 'upload' && correctedData.firma?.file instanceof File) {
        try {
            const { fileUrl, uniqueFilename } = await uploadFile(correctedData.firma.file);
            correctedData.firma = {
                source: 'upload',
                name: uniqueFilename, // Store uniqueFilename as name
                url: fileUrl,
            };
        } catch (error) {
            console.error("Error uploading signature:", error);
            correctedData.firma = { ...correctedData.firma, error: "Upload failed" };
        }
    } else if (signatureSource === 'draw' && sigCanvas.current && !sigCanvas.current.isEmpty()) {
        correctedData.firma = {
            source: 'draw',
            data: sigCanvas.current.getTrimmedCanvas().toDataURL('image/png')
        };
    }

    const dataToSend = {
      ...correctedData,
      acreencias: (correctedData.acreencias || []).map(a => {
        const acreedorData = acreedoresData?.rows?.find(ac => ac._id === a.acreedor);
        return { ...a, acreedor: acreedorData };
      }),
      projectionData,
    };
    
    setIsUploading(false);
    console.log("[InsolvenciaForm] Final data being sent to parent onSubmit:", dataToSend);
    onSubmit(dataToSend);
  }

  // Watchers
  const watchedAcreencias = watch('acreencias');
  const watchedGastos = watch('informacionFinanciera.gastosPersonales');
  const watchedIngresos = watch('informacionFinanciera.ingresosActividadPrincipal');
  const watchSociedadActiva = watch('sociedadConyugal.activa');
  const tipoNegociacion = watch('propuestaPago.tipoNegociacion');
  const plazo = watch('propuestaPago.plazo');
  const interesMensual = watch('propuestaPago.interesMensual');
  const fechaInicioPago = watch('propuestaPago.fechaInicioPago');
  const diaPago = watch('propuestaPago.diaPago');


  // Cálculos
  const totalCapital = watchedAcreencias?.reduce((sum, a) => sum + (parseFloat(a.capital) || 0), 0) || 0;
  const totalMora = watchedAcreencias?.filter(a => a.creditoEnMora === true).reduce((sum, a) => sum + (parseFloat(a.valorTotalInteresMoratorio) || 0), 0) || 0;
  const capitalEnMora = watchedAcreencias?.filter(a => a.creditoEnMora === true).reduce((sum, a) => sum + (parseFloat(a.capital) || 0), 0) || 0;
  const porcentajeMora = totalCapital > 0 ? (capitalEnMora / totalCapital * 100) : 0;

  const validacionInsolvencia = {
    dosOMasObligaciones: watchedAcreencias?.length >= 2,
    hayCreditosEnMora: capitalEnMora > 0,
    pasivoEnMoraSuperior30Pct: porcentajeMora > 30,
  };
  const cumpleRequisitos = validacionInsolvencia.dosOMasObligaciones && validacionInsolvencia.hayCreditosEnMora && validacionInsolvencia.pasivoEnMoraSuperior30Pct;

  const totalGastos = Object.values(watchedGastos || {}).reduce((sum, value) => sum + (parseFloat(value) || 0), 0);
  const disponibleParaPago = (parseFloat(watchedIngresos) || 0) - totalGastos;

  useEffect(() => {
    setValue('propuestaPago.valorCuotaSugerido', disponibleParaPago > 0 ? disponibleParaPago : 0);
  }, [disponibleParaPago, setValue]);

  // Effect for Payment Projection Calculation
  useEffect(() => {
    if (tipoNegociacion === 'proyeccion') {
      const capital = totalCapital || 0;
      const term = parseInt(plazo, 10);
      const monthlyRateValue = parseFloat(interesMensual);

      if (!term || term <= 0 || isNaN(monthlyRateValue) || monthlyRateValue < 0) {
        setProjectionData([]);
        return;
      }

      const monthlyRate = monthlyRateValue / 100;
      const payment = (monthlyRate > 0)
        ? capital * (monthlyRate * Math.pow(1 + monthlyRate, term)) / (Math.pow(1 + monthlyRate, term) - 1)
        : capital / term;

      let balance = capital;
      const newProjection = [];
      const startDate = fechaInicioPago ? new Date(`${fechaInicioPago}T00:00:00`) : new Date();

      for (let i = 1; i <= term; i++) {
        const interestPayment = balance * monthlyRate;
        const principalPayment = payment - interestPayment;
        const finalBalance = balance - principalPayment;

        const paymentDate = new Date(startDate);
        paymentDate.setMonth(startDate.getMonth() + i - 1);
        paymentDate.setDate(diaPago || 1);

        newProjection.push({
          pagoNo: i,
          fecha: paymentDate.toLocaleDateString('es-CO'),
          saldoCapital: new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(balance),
          pagoCapital: new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(principalPayment),
          pagoInteres: new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(interestPayment),
          montoPago: new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(payment),
          saldoFinalCapital: new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(finalBalance > 0 ? finalBalance : 0),
        });
        balance = finalBalance;
      }
      setProjectionData(newProjection);
    } else {
      setProjectionData([]);
    }
  }, [tipoNegociacion, plazo, interesMensual, fechaInicioPago, diaPago, totalCapital, setValue]);

  useEffect(() => {
    if (resetToken) {
      reset();
      setTabValue(0);
      setValidationError('');
      setSavedSections({
        deudor: false,
        sede: false,
        causas: false,
        acreencias: false,
        bienes: false,
        financiera: false,
        propuesta: false,
        anexos: false,
        firma: false,
      });
    }
  }, [resetToken, reset]);

  const watchedBienesMuebles = watch('bienesMuebles');
  useEffect(() => {
    watchedBienesMuebles.forEach((field, index) => {
      if (field) {
        const { leasing, prenda, garantiaMobiliaria, pactoRetroventa } = field;
        if (!leasing && !prenda && !garantiaMobiliaria && !pactoRetroventa) {
          setValue(`bienesMuebles.${index}.acreedores`, {});
        }
      }
    });
  }, [watchedBienesMuebles, setValue]);

  const watchedBienesInmuebles = watch('bienesInmuebles');
  useEffect(() => {
    watchedBienesInmuebles.forEach((field, index) => {
      if (field) {
        const { leasing, prenda, garantiaMobiliaria, pactoRetroventa } = field;
        if (!leasing && !prenda && !garantiaMobiliaria && !pactoRetroventa) {
          setValue(`bienesInmuebles.${index}.acreedores`, {});
        }
      }
    });
  }, [watchedBienesInmuebles, setValue]);

  const allSectionsSaved = Object.values(savedSections).every(Boolean);
  const completionPercentage = (Object.values(savedSections).filter(Boolean).length / Object.values(savedSections).length) * 100;

  const tabsConfig = [
    { key: 'deudor', label: 'Deudor', icon: PersonIcon, color: '#2196f3' },
    { key: 'sede', label: 'Sede', icon: LocationCityIcon, color: '#673ab7' },
    { key: 'causas', label: 'Causas', icon: HelpOutlineIcon, color: '#ff5722' },
    { key: 'acreencias', label: 'Acreencias', icon: AccountBalanceIcon, color: '#f44336' },
    { key: 'bienes', label: 'Bienes', icon: HomeIcon, color: '#4caf50' },
    { key: 'financiera', label: 'Info. Financiera', icon: AssessmentIcon, color: '#ff9800' },
    { key: 'propuesta', label: 'Propuesta', icon: GavelIcon, color: '#9c27b0' },
    { key: 'anexos', label: 'Anexos', icon: AttachFileIcon, color: '#009688' },
    { key: 'firma', label: 'Firma', icon: CreateIcon, color: '#795548' },
  ];

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Header con Progress */}
      <GlassCard hover={false} sx={{ mb: 3, p: 3 }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar
                sx={{
                  width: 48,
                  height: 48,
                  background: `linear-gradient(135deg, ${theme.palette.error.main}, ${theme.palette.warning.main})`,
                }}
              >
                <GavelIcon />
              </Avatar>
              <Box>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 700,
                    background: `linear-gradient(135deg, ${theme.palette.error.main}, ${theme.palette.warning.main})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  Solicitud de Insolvencia Económica
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Persona Natural No Comerciante
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
            }}
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

      {/* Validation Error */}
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

      {/* Tabs Navigation */}
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
              '&:hover': {
                background: alpha(theme.palette.primary.main, 0.05),
              },
              '&.Mui-selected': {
                color: theme.palette.primary.main,
              },
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
                    <Badge
                      badgeContent={isSaved ? <CheckCircleIcon sx={{ fontSize: 16 }} /> : null}
                      color="success"
                    >
                      <Icon sx={{ fontSize: 24, color: isSaved ? theme.palette.success.main : tab.color }} />
                    </Badge>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      {tab.label}
                    </Typography>
                  </Stack>
                }
                sx={{
                  opacity: isDisabled ? 0.4 : 1,
                  '&.Mui-disabled': {
                    color: 'text.disabled',
                  },
                }}
              />
            );
          })}
        </Tabs>
      </GlassCard>

      <form onSubmit={handleSubmit(customOnSubmit, onInvalid)}>
        <Controller
          name="bienesMuebles"
          control={control}
          rules={{
            validate: (value) => {
              if (getValues("noPoseeBienes")) {
                return true;
              }
              return (value && value.length > 0) || "Debe agregar al menos un bien mueble si no ha marcado la opción de no poseer bienes.";
            },
          }}
          render={() => null}
        />
        {/* Tab 1: Deudor */}
        <TabPanel value={tabValue} index={0}>
          <GlassCard>
            <Box sx={{ p: 3 }}>
              <Stack spacing={3}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar sx={{ bgcolor: alpha(tabsConfig[0].color, 0.1), color: tabsConfig[0].color }}>
                    <PersonIcon />
                  </Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Datos del Deudor
                  </Typography>
                </Stack>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <GlassTextField
                      {...register('deudor.primerNombre', { required: 'Campo requerido' })}
                      label="Primer Nombre"
                      fullWidth
                      error={!!errors.deudor?.primerNombre}
                      helperText={errors.deudor?.primerNombre?.message}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <GlassTextField
                      {...register('deudor.segundoNombre')}
                      label="Segundo Nombre"
                      fullWidth
                      error={!!errors.deudor?.segundoNombre}
                      helperText={errors.deudor?.segundoNombre?.message}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <GlassTextField
                      {...register('deudor.primerApellido', { required: 'Campo requerido' })}
                      label="Primer Apellido"
                      fullWidth
                      error={!!errors.deudor?.primerApellido}
                      helperText={errors.deudor?.primerApellido?.message}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <GlassTextField
                      {...register('deudor.segundoApellido')}
                      label="Segundo Apellido"
                      fullWidth
                      error={!!errors.deudor?.segundoApellido}
                      helperText={errors.deudor?.segundoApellido?.message}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth error={!!errors.deudor?.tipoIdentificacion}>
                      <InputLabel>Tipo de Identificación</InputLabel>
                      <Controller
                        name="deudor.tipoIdentificacion"
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
                      {errors.deudor?.tipoIdentificacion && <FormHelperText>{errors.deudor?.tipoIdentificacion?.message}</FormHelperText>}
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <GlassTextField
                      {...register('deudor.cedula', { required: 'Campo requerido' })}
                      label="Número de Documento"
                      fullWidth
                      error={!!errors.deudor?.cedula}
                      helperText={errors.deudor?.cedula?.message}
                    />
                  </Grid>
                  <LocationSelector
                    control={control}
                    errors={errors}
                    watch={watch}
                    setValue={setValue}
                    showDepartment={true}
                    showCity={true}
                    departmentFieldName="deudor.departamentoExpedicion"
                    cityFieldName="deudor.ciudadExpedicion"
                    departmentGridProps={{ xs: 12, sm: 6 }}
                    cityGridProps={{ xs: 12, sm: 6 }}
                    departmentLabel="Departamento de Expedición"
                    cityLabel="Ciudad de Expedición"
                    departmentRules={{ required: 'Campo requerido' }}
                    cityRules={{ required: 'Campo requerido' }}
                  />
                  <Grid item xs={12} sm={6}>
                    <GlassTextField
                      {...register('deudor.telefono', { required: 'Campo requerido' })}
                      label="Teléfono"
                      fullWidth
                      error={!!errors.deudor?.telefono}
                      helperText={errors.deudor?.telefono?.message}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <GlassTextField
                      {...register('deudor.email', { required: 'Campo requerido' })}
                      label="Email"
                      type="email"
                      fullWidth
                      error={!!errors.deudor?.email}
                      helperText={errors.deudor?.email?.message}
                    />
                  </Grid>
                  <LocationSelector
                    control={control}
                    errors={errors}
                    watch={watch}
                    setValue={setValue}
                    showCountry={true}
                    countryFieldName="deudor.paisOrigen"
                    countryLabel="País de Origen"
                    countryGridProps={{ xs: 12, sm: 6 }}
                    countryRules={{ required: 'Campo requerido' }}
                  />
                  <Grid item xs={12} sm={6}>
                    <GlassTextField
                      {...register('deudor.fechaNacimiento', { required: 'Campo requerido' })}
                      label="Fecha de Nacimiento"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                      error={!!errors.deudor?.fechaNacimiento}
                      helperText={errors.deudor?.fechaNacimiento?.message}
                    />
                  </Grid>
                                    <Grid item xs={12} sm={6}>
                                      <FormControl fullWidth error={!!errors.deudor?.genero}>
                                        <InputLabel>Género</InputLabel>
                                        <Controller
                                          name="deudor.genero"
                                          control={control}
                                          defaultValue=""
                                          rules={{ required: 'Campo requerido' }}
                                          render={({ field }) => (
                                            <Select
                                              {...field}
                                              label="Género"
                                              sx={selectSx}
                                            >
                                              <MenuItem value="Masculino">Masculino</MenuItem>
                                              <MenuItem value="Femenino">Femenino</MenuItem>
                                              <MenuItem value="No Aplica">No Aplica</MenuItem>
                                            </Select>
                                          )}
                                        />
                                        {errors.deudor?.genero && <FormHelperText>{errors.deudor?.genero?.message}</FormHelperText>}
                                      </FormControl>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                      <FormControl fullWidth error={!!errors.deudor?.estadoCivil}>
                                        <InputLabel>Estado Civil</InputLabel>
                                        <Controller
                                          name="deudor.estadoCivil"
                                          control={control}
                                          defaultValue=""
                                          rules={{ required: 'Campo requerido' }}
                                          render={({ field }) => (
                                            <Select
                                              {...field}
                                              label="Estado Civil"
                                              sx={selectSx}
                                            >
                                              <MenuItem value="Casado(a)">Casado(a)</MenuItem>
                                              <MenuItem value="Soltero(a)">Soltero(a)</MenuItem>
                                              <MenuItem value="No Informa">No Informa</MenuItem>
                                            </Select>
                                          )}
                                        />
                                        {errors.deudor?.estadoCivil && <FormHelperText>{errors.deudor?.estadoCivil?.message}</FormHelperText>}
                                      </FormControl>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                      <FormControl fullWidth error={!!errors.deudor?.etnia}>
                                        <InputLabel>Etnia</InputLabel>
                                        <Controller
                                          name="deudor.etnia"
                                          control={control}
                                          defaultValue=""
                                          rules={{ required: 'Campo requerido' }}
                                          render={({ field }) => (
                                            <Select
                                              {...field}
                                              label="Etnia"
                                              sx={selectSx}
                                            >
                                              <MenuItem value="Ninguna">Ninguna</MenuItem>
                                              <MenuItem value="Indigena">Indigena</MenuItem>
                                              <MenuItem value="Afro">Afro</MenuItem>
                                              <MenuItem value="Room">Room</MenuItem>
                                            </Select>
                                          )}
                                        />
                                        {errors.deudor?.etnia && <FormHelperText>{errors.deudor?.etnia?.message}</FormHelperText>}
                                      </FormControl>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                      <FormControl fullWidth error={!!errors.deudor?.discapacidad}>
                                        <InputLabel>Discapacidad</InputLabel>
                                        <Controller
                                          name="deudor.discapacidad"
                                          control={control}
                                          defaultValue=""
                                          rules={{ required: 'Campo requerido' }}
                                          render={({ field }) => (
                                            <Select
                                              {...field}
                                              label="Discapacidad"
                                              sx={selectSx}
                                              MenuProps={{
                                                PaperProps: {
                                                  style: {
                                                    backgroundColor: '#ffffff',
                                                    height: 250,
                                                  },
                                                },
                                              }}
                                            >
                                              <MenuItem value="Ninguna">Ninguna</MenuItem>
                                              <MenuItem value="Física">Física</MenuItem>
                                              <MenuItem value="Sensorial">Sensorial</MenuItem>
                                              <MenuItem value="Intelectual">Intelectual</MenuItem>
                                              <MenuItem value="Psíquica">Psíquica</MenuItem>
                                              <MenuItem value="Visceral">Visceral</MenuItem>
                                              <MenuItem value="Múltiple">Múltiple</MenuItem>
                                              <MenuItem value="Otra">Otra</MenuItem>
                                            </Select>
                                          )}
                                        />
                                        {errors.deudor?.discapacidad && <FormHelperText>{errors.deudor?.discapacidad?.message}</FormHelperText>}
                                      </FormControl>
                                    </Grid>
                                    {watch('deudor.discapacidad') === 'Otra' && (
                                      <Grid item xs={12} sm={6}>
                                        <GlassTextField
                                          {...register('deudor.otraDiscapacidad', { required: 'Campo requerido' })}
                                          label="Descripción de la Discapacidad"
                                          fullWidth
                                          sx={{
                                            minWidth: 270,
                                          }}
                                          error={!!errors.deudor?.otraDiscapacidad}
                                          helperText={errors.deudor?.otraDiscapacidad?.message}
                                        />
                                      </Grid>
                                    )}
                                    <LocationSelector
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
                                      departmentRules={{ required: 'Campo requerido' }}
                                      cityRules={{ required: 'Campo requerido' }}
                                    />
                                    <Grid item xs={12} sm={6}>
                                      <GlassTextField
                                        {...register('deudor.domicilio', { required: 'Campo requerido' })}
                                        label="Domicilio (Dirección)"
                                        fullWidth
                                        sx={{ width: 250 }}
                                        error={!!errors.deudor?.domicilio}
                                        helperText={errors.deudor?.domicilio?.message}
                                      />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                      <FormControl component="fieldset" error={!!errors.deudor?.tipoPersonaNatural}>
                                        <Typography variant="subtitle1">Tipo de Persona Natural</Typography>
                                        <Controller
                                          name="deudor.tipoPersonaNatural"
                                          control={control}
                                          rules={{ required: 'Campo requerido' }}
                                          render={({ field }) => (
                                            <RadioGroup {...field} row value={field.value || ''}>
                                              <FormControlLabel value="comerciante" control={<Radio />} label="Comerciante" />
                                              <FormControlLabel value="noComerciante" control={<Radio />} label="No Comerciante" />
                                            </RadioGroup>
                                          )}
                                        />
                                        {errors.deudor?.tipoPersonaNatural && <FormHelperText>{errors.deudor?.tipoPersonaNatural?.message}</FormHelperText>}
                                      </FormControl>
                                    </Grid>
                                                      <Grid item xs={12} sm={6}>
                                                        <FormControl fullWidth error={!!errors.deudor?.nivelEscolar}>
                                                          <InputLabel>Nivel Escolar</InputLabel>
                                                          <Controller
                                                            name="deudor.nivelEscolar"
                                                            control={control}
                                                            defaultValue=""
                                                            render={({ field }) => (
                                                              <Select
                                                                {...field}
                                                                label="Nivel Escolar"
                                                                sx={selectSx}
                                                                MenuProps={{
                                                                  PaperProps: {
                                                                    style: {
                                                                      backgroundColor: '#ffffff',
                                                                      height: 250,
                                                                    },
                                                                  },
                                                                }}
                                                              >
                                                                <MenuItem value="DOCTORADO O EQUIVALENTE">DOCTORADO O EQUIVALENTE</MenuItem>
                                                                <MenuItem value="EDUCACIÓN BÁSICA PRIMARIA">EDUCACIÓN BÁSICA PRIMARIA</MenuItem>
                                                                <MenuItem value="EDUCACIÓN BÁSICA SECUNDARIA O SECUNDARIA BAJA">EDUCACIÓN BÁSICA SECUNDaria O SECUNDARIA BAJA</MenuItem>
                                                                <MenuItem value="EDUCACIÓN DE LA PRIMERA INFANCIA">EDUCACIÓN DE LA PRIMERA INFANCIA</MenuItem>
                                                                <MenuItem value="EDUCACIÓN MEDIA O SECUNDARIA ALTA">EDUCACIÓN MEDIA O SECUNDARIA ALTA</MenuItem>
                                                                <MenuItem value="EDUCACIÓN POSTSECUNDARIA NO SUPERIOR">EDUCACIÓN POSTSECUNDARIA NO SUPERIOR</MenuItem>
                                                                <MenuItem value="EDUCACIÓN TÉCNICA PROFESIONAL Y TECNOLÓGICA">EDUCACIÓN TÉCNICA PROFESIONAL Y TECNOLÓGICA</MenuItem>
                                                                <MenuItem value="ESPECIALIZACIÓN, MAESTRÍA O EQUIVALENTE">ESPECIALIZACIÓN, MAESTRÍA O EQUIVALENTE</MenuItem>
                                                                <MenuItem value="NINGUNA">NINGUNA</MenuItem>
                                                                <MenuItem value="NO INFORMA">NO INFORMA</MenuItem>
                                                                <MenuItem value="UNIVERSITARIO O EQUIVALENTE">UNIVERSITARIO O EQUIVALENTE</MenuItem>
                                                              </Select>
                                                            )}
                                                          />
                                                          {errors.deudor?.nivelEscolar && <FormHelperText>{errors.deudor?.nivelEscolar?.message}</FormHelperText>}
                                                        </FormControl>
                                                      </Grid>
                                                      <Grid item xs={12} sm={6}>
                                                        <FormControl fullWidth error={!!errors.deudor?.profesion}>
                                                          <InputLabel>Profesión</InputLabel>
                                                          <Controller
                                                            name="deudor.profesion"
                                                            control={control}
                                                            defaultValue=""
                                                            render={({ field }) => (
                                                              <Select
                                                                {...field}
                                                                label="Profesión"
                                                                sx={selectSx}
                                                                MenuProps={{
                                                                  PaperProps: {
                                                                    style: {
                                                                      backgroundColor: '#ffffff',
                                                                      height: 250,
                                                                    },
                                                                  },
                                                                }}
                                                              >
                                                                <MenuItem value="Abogado">Abogado</MenuItem>
                                                                <MenuItem value="Administrador de Empresas">Administrador de Empresas</MenuItem>
                                                                <MenuItem value="Contador Público">Contador Público</MenuItem>
                                                                <MenuItem value="Ingeniero Civil">Ingeniero Civil</MenuItem>
                                                                <MenuItem value="Ingeniero de Sistemas">Ingeniero de Sistemas</MenuItem>
                                                                <MenuItem value="Ingeniero Industrial">Ingeniero Industrial</MenuItem>
                                                                <MenuItem value="Ingeniero Electrónico">Ingeniero Electrónico</MenuItem>
                                                                <MenuItem value="Ingeniero Mecánico">Ingeniero Mecánico</MenuItem>
                                                                <MenuItem value="Arquitecto">Arquitecto</MenuItem>
                                                                <MenuItem value="Economista">Economista</MenuItem>
                                                                <MenuItem value="Psicólogo">Psicólogo</MenuItem>
                                                                <MenuItem value="Trabajador Social">Trabajador Social</MenuItem>
                                                                <MenuItem value="Comunicador Social">Comunicador Social</MenuItem>
                                                                <MenuItem value="Periodista">Periodista</MenuItem>
                                                                <MenuItem value="Docente">Docente</MenuItem>
                                                                <MenuItem value="Médico General">Médico General</MenuItem>
                                                                <MenuItem value="Enfermero / Enfermera">Enfermero / Enfermera</MenuItem>
                                                                <MenuItem value="Odontólogo">Odontólogo</MenuItem>
                                                                <MenuItem value="Fisioterapeuta">Fisioterapeuta</MenuItem>
                                                                <MenuItem value="Farmacéutico">Farmacéutico</MenuItem>
                                                                <MenuItem value="Químico">Químico</MenuItem>
                                                                <MenuItem value="Biólogo">Biólogo</MenuItem>
                                                                <MenuItem value="Veterinario">Veterinario</MenuItem>
                                                                <MenuItem value="Administrador Público">Administrador Público</MenuItem>
                                                                <MenuItem value="Tecnólogo en Gestión Empresarial">Tecnólogo en Gestión Empresarial</MenuItem>
                                                                <MenuItem value="Técnico en Sistemas">Técnico en Sistemas</MenuItem>
                                                                <MenuItem value="Técnico en Contabilidad">Técnico en Contabilidad</MenuItem>
                                                                <MenuItem value="Técnico en Recursos Humanos">Técnico en Recursos Humanos</MenuItem>
                                                                <MenuItem value="Ingeniero Ambiental">Ingeniero Ambiental</MenuItem>
                                                                <MenuItem value="Ingeniero Agrónomo">Ingeniero Agrónomo</MenuItem>
                                                                <MenuItem value="Ingeniero de Petróleos">Ingeniero de Petróleos</MenuItem>
                                                                <MenuItem value="Ingeniero Eléctrico">Ingeniero Eléctrico</MenuItem>
                                                                <MenuItem value="Diseñador Gráfico">Diseñador Gráfico</MenuItem>
                                                                <MenuItem value="Diseñador Industrial">Diseñador Industrial</MenuItem>
                                                                <MenuItem value="Publicista">Publicista</MenuItem>
                                                                <MenuItem value="Fotógrafo">Fotógrafo</MenuItem>
                                                                <MenuItem value="Chef / Cocinero Profesional">Chef / Cocinero Profesional</MenuItem>
                                                                <MenuItem value="Administrador Turístico y Hotelero">Administrador Turístico y Hotelero</MenuItem>
                                                                <MenuItem value="Guía Turístico">Guía Turístico</MenuItem>
                                                                <MenuItem value="Abogado Penalista">Abogado Penalista</MenuItem>
                                                                <MenuItem value="Abogado Laboralista">Abogado Laboralista</MenuItem>
                                                                <MenuItem value="Abogado Civilista">Abogado Civilista</MenuItem>
                                                                <MenuItem value="Notario">Notario</MenuItem>
                                                                <MenuItem value="Topógrafo">Topógrafo</MenuItem>
                                                                <MenuItem value="Geólogo">Geólogo</MenuItem>
                                                                <MenuItem value="Antropólogo">Antropólogo</MenuItem>
                                                                <MenuItem value="Sociólogo">Sociólogo</MenuItem>
                                                                <MenuItem value="Historiador">Historiador</MenuItem>
                                                                <MenuItem value="Politólogo">Politólogo</MenuItem>
                                                                <MenuItem value="Relacionista Internacional">Relacionista Internacional</MenuItem>
                                                                <MenuItem value="Administrador Financiero">Administrador Financiero</MenuItem>
                                                                <MenuItem value="Auxiliar Contable">Auxiliar Contable</MenuItem>
                                                                <MenuItem value="Auxiliar Administrativo">Auxiliar Administrativo</MenuItem>
                                                                <MenuItem value="Técnico Judicial">Técnico Judicial</MenuItem>
                                                                <MenuItem value="Perito Forense">Perito Forense</MenuItem>
                                                                <MenuItem value="Criminalista">Criminalista</MenuItem>
                                                                <MenuItem value="Grafólogo">Grafólogo</MenuItem>
                                                                <MenuItem value="Inspector de Policía">Inspector de Policía</MenuItem>
                                                                <MenuItem value="Oficial del Ejército / Policía">Oficial del Ejército / Policía</MenuItem>
                                                                <MenuItem value="Ingeniero de Software">Ingeniero de Software</MenuItem>
                                                                <MenuItem value="Desarrollador Web">Desarrollador Web</MenuItem>
                                                                <MenuItem value="Analista de Datos">Analista de Datos</MenuItem>
                                                                <MenuItem value="Diseñador de Moda">Diseñador de Moda</MenuItem>
                                                                <MenuItem value="Actor / Actriz">Actor / Actriz</MenuItem>
                                                                <MenuItem value="Músico">Músico</MenuItem>
                                                                <MenuItem value="Productor Audiovisual">Productor Audiovisual</MenuItem>
                                                                <MenuItem value="Profesor Universitario">Profesor Universitario</MenuItem>
                                                                <MenuItem value="Maestro de Educación Primaria">Maestro de Educación Primaria</MenuItem>
                                                                <MenuItem value="Abogado de Familia">Abogado de Familia</MenuItem>
                                                                <MenuItem value="Procurador / Defensor Público">Procurador / Defensor Público</MenuItem>
                                                                <MenuItem value="Otra">Otra</MenuItem>
                                                              </Select>
                                                            )}
                                                          />
                                                          {errors.deudor?.profesion && <FormHelperText>{errors.deudor?.profesion?.message}</FormHelperText>}
                                                        </FormControl>
                                                      </Grid>
                                                      <Grid item xs={12} sm={6}>
                                                        <FormControl fullWidth error={!!errors.deudor?.institucion}>
                                                          <InputLabel>Instituciones</InputLabel>
                                                          <Controller
                                                            name="deudor.institucion"
                                                            control={control}
                                                            defaultValue=""
                                                            render={({ field }) => (
                                                              <Select
                                                                {...field}
                                                                label="Instituciones"
                                                                sx={selectSx}
                                                                MenuProps={{
                                                                  PaperProps: {
                                                                    style: {
                                                                      backgroundColor: '#ffffff',
                                                                      height: 250,
                                                                    },
                                                                  },
                                                                }}
                                                              >
                                                                <MenuItem value="Universidad Nacional de Colombia">Universidad Nacional de Colombia</MenuItem>
                                                                <MenuItem value="Universidad de los Andes">Universidad de los Andes</MenuItem>
                                                                <MenuItem value="Pontificia Universidad Javeriana">Pontificia Universidad Javeriana</MenuItem>
                                                                <MenuItem value="Universidad del Rosario">Universidad del Rosario</MenuItem>
                                                                <MenuItem value="Universidad Externado de Colombia">Universidad Externado de Colombia</MenuItem>
                                                                <MenuItem value="Universidad Santo Tomás">Universidad Santo Tomás</MenuItem>
                                                                <MenuItem value="Universidad de La Sabana">Universidad de La Sabana</MenuItem>
                                                                <MenuItem value="Universidad del Norte">Universidad del Norte</MenuItem>
                                                                <MenuItem value="Universidad EAFIT">Universidad EAFIT</MenuItem>
                                                                <MenuItem value="Universidad Industrial de Santander (UIS)">Universidad Industrial de Santander (UIS)</MenuItem>
                                                                <MenuItem value="Universidad de Antioquia (UdeA)">Universidad de Antioquia (UdeA)</MenuItem>
                                                                <MenuItem value="Universidad del Valle (Univalle)">Universidad del Valle (Univalle)</MenuItem>
                                                                <MenuItem value="Universidad Tecnológica de Pereira (UTP)">Universidad Tecnológica de Pereira (UTP)</MenuItem>
                                                                <MenuItem value="Universidad de Caldas">Universidad de Caldas</MenuItem>
                                                                <MenuItem value="Universidad de Nariño">Universidad de Nariño</MenuItem>
                                                                <MenuItem value="Universidad del Tolima">Universidad del Tolima</MenuItem>
                                                                <MenuItem value="Universidad de Cartagena">Universidad de Cartagena</MenuItem>
                                                                <MenuItem value="Universidad del Magdalena">Universidad del Magdalena</MenuItem>
                                                                <MenuItem value="Universidad del Cauca">Universidad del Cauca</MenuItem>
                                                                <MenuItem value="Universidad Pedagógica Nacional">Universidad Pedagógica Nacional</MenuItem>
                                                                <MenuItem value="Universidad Militar Nueva Granada">Universidad Militar Nueva Granada</MenuItem>
                                                                <MenuItem value="Universidad Distrital Francisco José de Caldas">Universidad Distrital Francisco José de Caldas</MenuItem>
                                                                <MenuItem value="Universidad Sergio Arboleda">Universidad Sergio Arboleda</MenuItem>
                                                                <MenuItem value="Universidad de San Buenaventura">Universidad de San Buenaventura</MenuItem>
                                                                <MenuItem value="Universidad Autónoma de Bucaramanga (UNAB)">Universidad Autónoma de Bucaramanga (UNAB)</MenuItem>
                                                                <MenuItem value="Universidad Autónoma de Manizales">Universidad Autónoma de Manizales</MenuItem>
                                                                <MenuItem value="Universidad Autónoma del Caribe">Universidad Autónoma del Caribe</MenuItem>
                                                                <MenuItem value="Universidad Cooperativa de Colombia">Universidad Cooperativa de Colombia</MenuItem>
                                                                <MenuItem value="Universidad Católica de Colombia">Universidad Católica de Colombia</MenuItem>
                                                                <MenuItem value="Universidad Libre">Universidad Libre</MenuItem>
                                                                <MenuItem value="Universidad de Medellín">Universidad de Medellín</MenuItem>
                                                                <MenuItem value="Universidad Pontificia Bolivariana (UPB)">Universidad Pontificia Bolivariana (UPB)</MenuItem>
                                                                <MenuItem value="Universidad Central">Universidad Central</MenuItem>
                                                                <MenuItem value="Universidad Jorge Tadeo Lozano">Universidad Jorge Tadeo Lozano</MenuItem>
                                                                <MenuItem value="Universidad Simón Bolívar">Universidad Simón Bolívar</MenuItem>
                                                                <MenuItem value="Universidad La Gran Colombia">Universidad La Gran Colombia</MenuItem>
                                                                <MenuItem value="Universidad INCCA de Colombia">Universidad INCCA de Colombia</MenuItem>
                                                                <MenuItem value="Universidad Antonio Nariño (UAN)">Universidad Antonio Nariño (UAN)</MenuItem>
                                                                <MenuItem value="Universidad Manuela Beltrán (UMB)">Universidad Manuela Beltrán (UMB)</MenuItem>
                                                                <MenuItem value="Universidad Cooperativa de Colombia">Universidad Cooperativa de Colombia</MenuItem>
                                                                <MenuItem value="Universidad del Sinú">Universidad del Sinú</MenuItem>
                                                                <MenuItem value="Universidad de Ibagué">Universidad de Ibagué</MenuItem>
                                                                <MenuItem value="Universidad Surcolombiana">Universidad Surcolombiana</MenuItem>
                                                                <MenuItem value="Universidad Francisco de Paula Santander (UFPS)">Universidad Francisco de Paula Santander (UFPS)</MenuItem>
                                                                <MenuItem value="Universidad de Pamplona">Universidad de Pamplona</MenuItem>
                                                                <MenuItem value="Universidad Popular del Cesar (UPC)">Universidad Popular del Cesar (UPC)</MenuItem>
                                                                <MenuItem value="Universidad Tecnológica del Chocó">Universidad Tecnológica del Chocó</MenuItem>
                                                                <MenuItem value="Universidad de Cundinamarca">Universidad de Cundinamarca</MenuItem>
                                                                <MenuItem value="Universidad Mariana">Universidad Mariana</MenuItem>
                                                                <MenuItem value="Universidad Católica de Oriente">Universidad Católica de Oriente</MenuItem>
                                                                <MenuItem value="Universidad Católica Luis Amigó (Funlam)">Universidad Católica Luis Amigó (Funlam)</MenuItem>
                                                                <MenuItem value="Universidad Politécnico Grancolombiano">Universidad Politécnico Grancolombiano</MenuItem>
                                                                <MenuItem value="Politécnico Jaime Isaza Cadavid">Politécnico Jaime Isaza Cadavid</MenuItem>
                                                                <MenuItem value="Politécnico Internacional">Politécnico Internacional</MenuItem>
                                                                <MenuItem value="Politécnico Marco Fidel Suárez">Politécnico Marco Fidel Suárez</MenuItem>
                                                                <MenuItem value="Politécnico de la Costa Atlántica">Politécnico de la Costa Atlántica</MenuItem>
                                                                <MenuItem value="Fundación Universitaria Konrad Lorenz">Fundación Universitaria Konrad Lorenz</MenuItem>
                                                                <MenuItem value="Fundación Universitaria del Área Andina (Areandina)">Fundación Universitaria del Área Andina (Areandina)</MenuItem>
                                                                <MenuItem value="Fundación Universitaria Los Libertadores">Fundación Universitaria Los Libertadores</MenuItem>
                                                                <MenuItem value="Fundación Universitaria San Martín">Fundación Universitaria San Martín</MenuItem>
                                                                <MenuItem value="Fundación Universitaria Sanitas">Fundación Universitaria Sanitas</MenuItem>
                                                                <MenuItem value="Corporación Universitaria Minuto de Dios (UNIMINUTO)">Corporación Universitaria Minuto de Dios (UNIMINUTO)</MenuItem>
                                                                <MenuItem value="Corporación Universitaria Remington">Corporación Universitaria Remington</MenuItem>
                                                                <MenuItem value="Corporación Universitaria Autónoma del Cauca">Corporación Universitaria Autónoma del Cauca</MenuItem>
                                                                <MenuItem value="Corporación Universitaria Rafael Núñez">Corporación Universitaria Rafael Núñez</MenuItem>
                                                                <MenuItem value="Corporación Universitaria Americana">Corporación Universitaria Americana</MenuItem>
                                                                <MenuItem value="Corporación Universitaria de Ciencia y Desarrollo (UNICIENCIA)">Corporación Universitaria de Ciencia y Desarrollo (UNICIENCIA)</MenuItem>
                                                                <MenuItem value="Escuela Colombiana de Ingeniería Julio Garavito">Escuela Colombiana de Ingeniería Julio Garavito</MenuItem>
                                                                <MenuItem value="Escuela Naval de Cadetes “Almirante Padilla”">Escuela Naval de Cadetes “Almirante Padilla”</MenuItem>
                                                                <MenuItem value="Escuela Militar de Cadetes “José María Córdova”">Escuela Militar de Cadetes “José María Córdova”</MenuItem>
                                                                <MenuItem value="Escuela Superior de Administración Pública (ESAP)">Escuela Superior de Administración Pública (ESAP)</MenuItem>
                                                                <MenuItem value="Escuela de Administración, Finanzas y Tecnología (EAFIT)">Escuela de Administración, Finanzas y Tecnología (EAFIT)</MenuItem>
                                                                <MenuItem value="Escuela de Artes y Letras">Escuela de Artes y Letras</MenuItem>
                                                                <MenuItem value="Escuela Colombiana de Carreras Industriales (ECCI)">Escuela Colombiana de Carreras Industriales (ECCI)</MenuItem>
                                                                <MenuItem value="Servicio Nacional de Aprendizaje (SENA)">Servicio Nacional de Aprendizaje (SENA)</MenuItem>
                                                                <MenuItem value="Otra">Otra</MenuItem>
                                                              </Select>
                                                            )}
                                                          />
                                                          {errors.deudor?.institucion && <FormHelperText>{errors.deudor?.institucion?.message}</FormHelperText>}
                                                        </FormControl>
                                                      </Grid>
                                                      <Grid item xs={12} sm={6}>
                                                        <GlassTextField
                                                          {...register('deudor.entidadEmisora')}
                                                          label="Entidad Emisora del Título"
                                                          fullWidth
                                                          sx={{
                                                            minWidth: 250,
                                                          }}
                                                          error={!!errors.deudor?.entidadEmisora}
                                                          helperText={errors.deudor?.entidadEmisora?.message}
                                                        />
                                                      </Grid>
                                                      <Grid item xs={12} sm={6}>
                                                        <GlassTextField
                                                          {...register('deudor.fechaGraduacion')}
                                                          label="Fecha de Graduación"
                                                          type="date"
                                                          InputLabelProps={{ shrink: true }}
                                                          fullWidth
                                                          error={!!errors.deudor?.fechaGraduacion}
                                                          helperText={errors.deudor?.fechaGraduacion?.message}
                                                        />
                                                      </Grid>
                                                      <Grid item xs={12}>
                                                        <GlassTextField
                                                          {...register('deudor.actividadEconomica')}
                                                          label="Actividad Económica Principal"
                                                          fullWidth
                                                          sx={{
                                                            minWidth: 250,
                                                          }}
                                                          error={!!errors.deudor?.actividadEconomica}
                                                          helperText={errors.deudor?.actividadEconomica?.message}
                                                        />
                                                      </Grid>                                  </Grid>
                                  <Grid item xs={12}>
                                    <FormControl component="fieldset" error={!!errors.deudor?.procedimientosCobro}>
                                      <Typography variant="subtitle1">¿En contra de usted se han iniciado dos (2) o más procedimientos públicos o privados de cobro de obligaciones dinerarias, de ejecución especial o de restitución de bienes por mora en el pago de cánones?</Typography>
                                      <Controller
                                        name="deudor.procedimientosCobro"
                                        control={control}
                                        rules={{ required: 'Campo requerido' }}
                                        render={({ field }) => (
                                          <RadioGroup {...field} row value={field.value || ''}>
                                            <FormControlLabel value="si" control={<Radio />} label="Si" />
                                            <FormControlLabel value="no" control={<Radio />} label="No" />
                                          </RadioGroup>
                                        )}
                                      />
                                      {errors.deudor?.procedimientosCobro && <FormHelperText>{errors.deudor?.procedimientosCobro?.message}</FormHelperText>}
                                    </FormControl>
                                  </Grid>

                <Button
                  variant="contained"
                  onClick={() => handleSaveSection('deudor', 1)}
                  disabled={isSaving}
                  startIcon={isSaving ? null : <SaveIcon />}
                  sx={{
                    mt: 2,
                    py: 1.5,
                    px: 4,
                    borderRadius: '12px',
                    fontWeight: 600,
                    textTransform: 'none',
                    background: `linear-gradient(135deg, ${tabsConfig[0].color}, ${alpha(tabsConfig[0].color, 0.7)})`,
                    '&:hover': {
                      background: `linear-gradient(135deg, ${alpha(tabsConfig[0].color, 0.9)}, ${alpha(tabsConfig[0].color, 0.6)})`,
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

        {/* Tab 2: Sede */}
        <TabPanel value={tabValue} index={1}>
          <GlassCard>
            <Box sx={{ p: 3 }}>
              <Stack spacing={3}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar sx={{ bgcolor: alpha(tabsConfig[1].color, 0.1), color: tabsConfig[1].color }}>
                    <LocationCityIcon />
                  </Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Sede
                  </Typography>
                </Stack>

                <Grid container spacing={2}>
                <LocationSelector
                  control={control}
                  errors={errors}
                  watch={watch}
                  setValue={setValue}
                  showDepartment={true}
                  showCity={true}
                  departmentFieldName="sede.departamento"
                  cityFieldName="sede.ciudad"
                  departmentLabel="Departamento Sede"
                  cityLabel="Ciudad Sede"
                  departmentRules={{ required: 'Campo requerido' }}
                  cityRules={{ required: 'Campo requerido' }}
                />
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth error={!!errors.sede?.entidadPromotora}>
                      <Controller
                        name="sede.entidadPromotora"
                        control={control}
                        rules={{ required: 'Campo requerido' }}
                        render={({ field }) => (
                          <CreatableSelect
                            {...field}
                            isClearable
                            value={field.value ? { label: field.value, value: field.value } : null}
                            onChange={(option) => field.onChange(option ? option.value : '')}
                            placeholder="Seleccione o ingrese la entidad promotora"
                            styles={{
                              control: (base) => ({
                                ...base,
                                '&:hover': { borderStyle: 'none none solid none' },
                                borderStyle: 'none none solid none',
                                boxShadow: 'none',
                                background: 'transparent',
                                fontSize: '15px',
                              }),
                              menu: (provided) => ({ ...provided, zIndex: 5, fontSize: '15px' }),
                            }}
                          />
                        )}
                      />
                      {errors.sede?.entidadPromotora && <FormHelperText>{errors.sede?.entidadPromotora?.message}</FormHelperText>}
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth error={!!errors.sede?.sedeCentro}>
                      <Controller
                        name="sede.sedeCentro"
                        control={control}
                        rules={{ required: 'Campo requerido' }}
                        render={({ field }) => (
                          <CreatableSelect
                            {...field}
                            isClearable
                            value={field.value ? { label: field.value, value: field.value } : null}
                            onChange={(option) => field.onChange(option ? option.value : '')}
                            placeholder="Seleccione o ingrese la sede / centro"
                            styles={{
                              control: (base) => ({
                                ...base,
                                '&:hover': { borderStyle: 'none none solid none' },
                                borderStyle: 'none none solid none',
                                boxShadow: 'none',
                                background: 'transparent',
                                fontSize: '15px',
                              }),
                              menu: (provided) => ({ ...provided, zIndex: 5, fontSize: '15px' }),
                            }}
                          />
                        )}
                      />
                      {errors.sede?.sedeCentro && <FormHelperText>{errors.sede?.sedeCentro?.message}</FormHelperText>}
                    </FormControl>
                  </Grid>
                </Grid>

                <Button
                  variant="contained"
                  onClick={() => handleSaveSection('sede', 2)}
                  disabled={isSaving}
                  startIcon={isSaving ? null : <SaveIcon />}
                  sx={{
                    mt: 2,
                    py: 1.5,
                    px: 4,
                    borderRadius: '12px',
                    fontWeight: 600,
                    textTransform: 'none',
                    background: `linear-gradient(135deg, ${tabsConfig[1].color}, ${alpha(tabsConfig[1].color, 0.7)})`,
                    '&:hover': {
                      background: `linear-gradient(135deg, ${alpha(tabsConfig[1].color, 0.9)}, ${alpha(tabsConfig[1].color, 0.6)})`,
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

        {/* Tab 3: Causas */}
        <TabPanel value={tabValue} index={2}>
          <GlassCard>
            <Box sx={{ p: 3 }}>
              <Stack spacing={3}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar sx={{ bgcolor: alpha(tabsConfig[2].color, 0.1), color: tabsConfig[2].color }}>
                    <HelpOutlineIcon />
                  </Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Causas
                  </Typography>
                </Stack>

                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1">Localización de los hechos:</Typography>
                  </Grid>
                  <LocationSelector
                    control={control}
                    errors={errors}
                    watch={watch}
                    setValue={setValue}
                    showDepartment={true}
                    showCity={true}
                    departmentFieldName="causas.departamentoHechos"
                    cityFieldName="causas.ciudadHechos"
                    departmentLabel="Departamento de los Hechos"
                    cityLabel="Ciudad de los Hechos"
                    departmentRules={{ required: 'Campo requerido' }}
                    cityRules={{ required: 'Campo requerido' }}
                  />
                </Grid>

                <Controller
                  name="causas.lista"
                  control={control}
                  rules={{
                    validate: value => value.length > 0 || 'Debe agregar al menos una causa'
                  }}
                  render={({ field }) => (
                    <>
                      {errors.causas?.lista?.root && (
                        <FormHelperText error>{errors.causas.lista.root.message}</FormHelperText>
                      )}
                    </>
                  )}
                />

                <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Lista de Causas
                  </Typography>
                  <Button
                    variant="outlined"
                    onClick={() => appendCausa({ tipoCausa: '', descripcionCausa: '' })}
                    startIcon={<AddIcon />}
                    size="small"
                  >
                    Agregar Causa
                  </Button>
                </Stack>

                {causasFields.map((field, index) => (
                  <Box key={field.id}>
                    <GlassCard sx={{ p: 2 }}>
                      <Stack spacing={2}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Chip label={`Causa #${index + 1}`} size="small" />
                          <IconButton onClick={() => removeCausa(index)} size="small">
                            <DeleteIcon />
                          </IconButton>
                        </Stack>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <FormControl fullWidth error={!!errors.causas?.lista?.[index]?.tipoCausa}>
                              <InputLabel>Tipo de Causa</InputLabel>
                              <Controller
                                name={`causas.lista.${index}.tipoCausa`}
                                control={control}
                                defaultValue=""
                                rules={{ required: 'Campo requerido' }}
                                render={({ field }) => (
                                  <Select
                                    {...field}
                                    label="Tipo de Causa"
                                    sx={selectSx}
                                  >
                                    <MenuItem value="Calamidad Familiar">Calamidad Familiar</MenuItem>
                                    <MenuItem value="Incapacidad Física o Mental">Incapacidad Física o Mental</MenuItem>
                                    <MenuItem value="Pérdida de Empleo">Pérdida de Empleo</MenuItem>
                                    <MenuItem value="Divorcio o Separación">Divorcio o Separación</MenuItem>
                                    <MenuItem value="Inadecuados Hábitos Financieros">Inadecuados Hábitos Financieros</MenuItem>
                                    <MenuItem value="Otras">Otras</MenuItem>
                                  </Select>
                                )}
                              />
                              {errors.causas?.lista?.[index]?.tipoCausa && <FormHelperText>{errors.causas?.lista?.[index]?.tipoCausa?.message}</FormHelperText>}
                            </FormControl>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <GlassTextField
                              {...register(`causas.lista.${index}.descripcionCausa`, { required: 'Campo requerido' })}
                              label="Descripción de la Causa"
                              fullWidth
                              multiline
                              minRows={3}
                              sx={{minWidth: 500}}
                              error={!!errors.causas?.lista?.[index]?.descripcionCausa}
                              helperText={errors.causas?.lista?.[index]?.descripcionCausa?.message}
                            />
                          </Grid>
                        </Grid>
                      </Stack>
                    </GlassCard>
                  </Box>
                ))}

                <Button
                  variant="contained"
                  onClick={() => handleSaveSection('causas', 3)}
                  disabled={isSaving}
                  startIcon={isSaving ? null : <SaveIcon />}
                  sx={{
                    mt: 2,
                    py: 1.5,
                    px: 4,
                    borderRadius: '12px',
                    fontWeight: 600,
                    textTransform: 'none',
                    background: `linear-gradient(135deg, ${tabsConfig[2].color}, ${alpha(tabsConfig[2].color, 0.7)})`,
                    '&:hover': {
                      background: `linear-gradient(135deg, ${alpha(tabsConfig[2].color, 0.9)}, ${alpha(tabsConfig[2].color, 0.6)})`,
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

        {/* Tab 4: Acreencias */}
        <TabPanel value={tabValue} index={3}>
          <GlassCard>
            <Box sx={{ p: 3 }}>
              <Stack spacing={3}>
                <Controller
                  name="acreencias"
                  control={control}
                  rules={{
                    validate: value => value.length >= 2 || 'Debe agregar al menos dos acreencias'
                  }}
                  render={({ field }) => (
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
                    onClick={() => appendAcreencia({ diasDeMora: '', moraMas90Dias: false })}
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
                                            MenuProps={{
                                              PaperProps: {
                                                style: {
                                                  backgroundColor: '#ffffff',
                                                  height: 300,
                                                },
                                              },
                                            }}
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
                                      sx={
                                        {minWidth: 250,}
                                      }
                                    />
                                  </Grid>
                                  <Grid item xs={6} sm={3}>
                                    <GlassTextField
                                      {...register(`acreencias.${index}.tasaInteresCorriente`)}
                                      label="Tasa de Interés Corriente"
                                      fullWidth
                                      sx={
                                        {minWidth: 250,}
                                      }
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
                                  <Grid item xs={6} sm={3}>
                                    <Controller
                                      name={`acreencias.${index}.creditoEnMora`}
                                      control={control}
                                      render={({ field }) => (
                                        <FormControlLabel
                                          control={
                                            <Checkbox
                                              {...field}
                                              checked={field.value}
                                            />
                                          }
                                          label="¿El crédito esta en mora?"
                                        />
                                      )}
                                    />
                                  </Grid>
                                  {watch(`acreencias.${index}.creditoEnMora`) && (
                                    <>
                                      {!watch(`acreencias.${index}.moraMas90Dias`) && (
                                        <Grid item xs={12} sm={3}>
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
                                      <Grid item xs={12} sm={3}>
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
                                              label="¿Mora por mas de 90 días?"
                                            />
                                          )}
                                        />
                                      </Grid>
                                      <Grid item xs={6} sm={3}>
                                        <GlassTextField
                                          {...register(`acreencias.${index}.valorTotalInteresMoratorio`)}
                                          label="Valor Total Interés Moratorio"
                                          type="number"
                                          fullWidth
                                          sx={
                                            {minWidth: 250}
                                          }
                                        />
                                      </Grid>
                                      <Grid item xs={6} sm={3}>
                                        <GlassTextField
                                          {...register(`acreencias.${index}.tasaInteresMoratorio`)}
                                          label="Tasa de Interés Moratorio"
                                          fullWidth
                                          sx={
                                            {minWidth: 250}
                                          }
                                        />
                                      </Grid>
                                      <Grid item xs={6} sm={3}>
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
                          Análisis de Requisitos de Insolvencia
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
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Total en Mora</Typography>
                            <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5 }}>
                              {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(totalMora)}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Box sx={{ textAlign: 'center', p: 2, borderRadius: '12px', background: 'rgba(255, 255, 255, 0.05)' }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>% en Mora</Typography>
                            <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5 }}>
                              {porcentajeMora.toFixed(2)}%
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>

                      <Stack spacing={1}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          {validacionInsolvencia.dosOMasObligaciones ? (
                            <CheckCircleIcon sx={{ color: theme.palette.success.main, fontSize: 20 }} />
                          ) : (
                            <ErrorIcon sx={{ color: theme.palette.error.main, fontSize: 20 }} />
                          )}
                          <Typography variant="body2" sx={{ color: validacionInsolvencia.dosOMasObligaciones ? 'text.primary' : 'text.secondary' }}>
                            Dos o más obligaciones
                          </Typography>
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center">
                          {validacionInsolvencia.hayCreditosEnMora ? (
                            <CheckCircleIcon sx={{ color: theme.palette.success.main, fontSize: 20 }} />
                          ) : (
                            <ErrorIcon sx={{ color: theme.palette.error.main, fontSize: 20 }} />
                          )}
                          <Typography variant="body2" sx={{ color: validacionInsolvencia.hayCreditosEnMora ? 'text.primary' : 'text.secondary' }}>
                            Tiene créditos en mora
                          </Typography>
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center">
                          {validacionInsolvencia.pasivoEnMoraSuperior30Pct ? (
                            <CheckCircleIcon sx={{ color: theme.palette.success.main, fontSize: 20 }} />
                          ) : (
                            <ErrorIcon sx={{ color: theme.palette.error.main, fontSize: 20 }} />
                          )}
                          <Typography variant="body2" sx={{ color: validacionInsolvencia.pasivoEnMoraSuperior30Pct ? 'text.primary' : 'text.secondary' }}>
                            Pasivo en mora mayor al 30%
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

        {/* Tab 5: Bienes */}
        <TabPanel value={tabValue} index={4}>
            <GlassCard>
              <Box sx={{ p: 3 }}>
                <Stack spacing={3}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar sx={{ bgcolor: alpha(tabsConfig[4].color, 0.1), color: tabsConfig[4].color }}>
                      <HomeIcon />
                    </Avatar>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      Bienes y Sociedad Conyugal
                    </Typography>
                  </Stack>

                  {/* Declaración de no poseer bienes */}
                  <GlassCard hover={false} sx={{ border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}` }}>
                    <Box sx={{ p: 2 }}>
                      <FormControlLabel
                        control={<Controller
                          name="noPoseeBienes"
                          control={control}
                          render={({ field }) => (
                            <Checkbox
                              {...field}
                              checked={field.value}
                              sx={{
                                color: theme.palette.warning.main,
                                '&.Mui-checked': {
                                  color: theme.palette.warning.main,
                                },
                              }} />
                          )} />}
                        label={<Typography variant="body2" sx={{ fontWeight: 500 }}>
                          Manifiesto bajo la gravedad de juramento que no poseo bienes sujetos a registro
                        </Typography>} />
                    </Box>
                  </GlassCard>

                  {/* Bienes Muebles */}
                  <Box>
                    <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Bienes Muebles
                      </Typography>
                      <Button
                        variant="outlined"
                        onClick={() => appendBienMueble({})}
                        startIcon={<AddIcon />}
                        size="small"
                        sx={{
                          borderRadius: '12px',
                          borderColor: alpha(tabsConfig[4].color, 0.3),
                          color: tabsConfig[4].color,
                          '&:hover': {
                            borderColor: tabsConfig[4].color,
                            background: alpha(tabsConfig[4].color, 0.1),
                          },
                        }}
                      >
                        Agregar
                      </Button>
                    </Stack>

                    {errors.bienesMuebles && (
                      <Alert severity="error" sx={{ mb: 2 }}>
                        {errors.bienesMuebles.root?.message || errors.bienesMuebles.message}
                      </Alert>
                    )}

                    {bienesMueblesFields.length === 0 ? (
                      <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
                        <Typography variant="body2">No hay bienes muebles agregados</Typography>
                      </Box>
                    ) : (
                      <Stack spacing={2}>
                        {bienesMueblesFields.map((field, index) => (
                          <Box key={field.id}>
                            <GlassCard sx={{ border: `1px solid ${alpha(tabsConfig[4].color, 0.2)}` }}>
                              <Box sx={{ p: 2 }}>
                                <Stack spacing={2}>
                                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Chip
                                      label={`Bien Mueble #${index + 1}`}
                                      size="small"
                                      sx={{
                                        background: alpha(tabsConfig[4].color, 0.1),
                                        color: tabsConfig[4].color,
                                        fontWeight: 600,
                                      }} />
                                    <IconButton
                                      onClick={() => removeBienMueble(index)}
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
                                      <FormControl fullWidth>
                                        <InputLabel>Tipo de Bien Mueble</InputLabel>
                                        <Controller
                                          name={`bienesMuebles.${index}.tipoBienMueble`}
                                          control={control}
                                          defaultValue=""
                                          render={({ field }) => (
                                            <Select
                                              {...field}
                                              label="Tipo de Bien Mueble"
                                              sx={selectSx}
                                              onChange={(e) => {
                                                field.onChange(e);
                                                if (e.target.value === 'Vehículos') {
                                                  setValue(`bienesMuebles.${index}.clasificacion`, 'Vehiculo');
                                                } else {
                                                  setValue(`bienesMuebles.${index}.clasificacion`, '');
                                                }
                                              }}
                                            >
                                              <MenuItem value="Vehículos">Vehículos</MenuItem>
                                              <MenuItem value="Otros Muebles">Otros Muebles</MenuItem>
                                            </Select>
                                          )}
                                        />
                                      </FormControl>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <FormControl fullWidth>
                                          <InputLabel>Clasificación</InputLabel>
                                          <Controller
                                            name={`bienesMuebles.${index}.clasificacion`}
                                            control={control}
                                            defaultValue=""
                                            render={({ field }) => (
                                              <Select
                                                {...field}
                                                label="Clasificación"
                                                sx={selectSx}
                                                disabled={watch(`bienesMuebles.${index}.tipoBienMueble`) === 'Vehículos'}
                                              >
                                                <MenuItem value="Vehiculo">Vehiculo</MenuItem>
                                                <MenuItem value="Equipos Electrónicos">Equipos Electrónicos</MenuItem>
                                                <MenuItem value="Joyas">Joyas</MenuItem>
                                                <MenuItem value="Obras de Arte">Obras de Arte</MenuItem>
                                                <MenuItem value="Artículos de Recreación">Artículos de Recreación</MenuItem>
                                                <MenuItem value="Accesorios">Accesorios</MenuItem>
                                                <MenuItem value="Prendas de Vestir">Prendas de Vestir</MenuItem>
                                                <MenuItem value="Semovientes">Semovientes</MenuItem>
                                                <MenuItem value="Muebles y Enseres">Muebles y Enseres</MenuItem>
                                                <MenuItem value="Otros">Otros</MenuItem>
                                              </Select>
                                            )}
                                          />
                                        </FormControl>
                                      </Grid>
                                    <Grid item xs={12}>
                                      <GlassTextField
                                        {...register(`bienesMuebles.${index}.descripcion`, { required: 'Campo requerido' })}
                                        label="Descripción"
                                        fullWidth
                                        error={!!errors.bienesMuebles?.[index]?.descripcion}
                                        helperText={errors.bienesMuebles?.[index]?.descripcion?.message} />
                                    </Grid>
                                    <Grid item xs={6} sm={4}>
                                      <GlassTextField
                                        {...register(`bienesMuebles.${index}.marca`, { required: 'Campo requerido' })}
                                        label="Marca"
                                        fullWidth
                                        error={!!errors.bienesMuebles?.[index]?.marca} />
                                    </Grid>
                                    {watch(`bienesMuebles.${index}.tipoBienMueble`) === 'Vehículos' && (
                                      <>
                                        <Grid item xs={6} sm={4}>
                                          <GlassTextField
                                            {...register(`bienesMuebles.${index}.modelo`, { required: 'Campo requerido' })}
                                            label="Modelo"
                                            fullWidth
                                            error={!!errors.bienesMuebles?.[index]?.modelo} />
                                        </Grid>
                                        <Grid item xs={6} sm={4}>
                                          <GlassTextField
                                            {...register(`bienesMuebles.${index}.placa`, { required: 'Campo requerido' })}
                                            label="Placa"
                                            fullWidth
                                            error={!!errors.bienesMuebles?.[index]?.placa} />
                                        </Grid>
                                        <Grid item xs={6} sm={4}>
                                          <GlassTextField
                                            {...register(`bienesMuebles.${index}.tarjetaPropiedad`, { required: 'Campo requerido' })}
                                            label="Tarjeta de Propiedad"
                                            fullWidth
                                            error={!!errors.bienesMuebles?.[index]?.tarjetaPropiedad} />
                                        </Grid>
                                        <Grid item xs={6} sm={4}>
                                          <GlassTextField
                                            {...register(`bienesMuebles.${index}.oficinaTransito`, { required: 'Campo requerido' })}
                                            label="Oficina de Tránsito"
                                            fullWidth
                                            error={!!errors.bienesMuebles?.[index]?.oficinaTransito} />
                                        </Grid>
                                      </>
                                    )}
                                    <Grid item xs={6} sm={4}>
                                      <GlassTextField
                                        {...register(`bienesMuebles.${index}.avaluoComercial`, { required: 'Campo requerido' })}
                                        label="Avalúo Comercial Estimado"
                                        type="number"
                                        fullWidth
                                        sx={{ minWidth: 250, }}
                                        error={!!errors.bienesMuebles?.[index]?.avaluoComercial} />
                                    </Grid>
                                    <Grid item xs={12}>
                                      <Typography variant="subtitle1">Afectaciones, Gravámenes y Medidas Cautelares:</Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                      <FormControl fullWidth>
                                        <InputLabel>Tipo de Complemento</InputLabel>
                                        <Controller
                                          name={`bienesMuebles.${index}.tipoComplemento`}
                                          control={control}
                                          defaultValue=""
                                          render={({ field }) => (
                                            <Select
                                              {...field}
                                              label="Tipo de Complemento"
                                              sx={selectSx}
                                            >
                                              <MenuItem value="Afectación">Afectación</MenuItem>
                                              <MenuItem value="Gravámen">Gravámen</MenuItem>
                                              <MenuItem value="Medida cautelar">Medida cautelar</MenuItem>
                                            </Select>
                                          )}
                                        />
                                      </FormControl>
                                    </Grid>
                                    {watch(`bienesMuebles.${index}.tipoComplemento`) && (
                                      <Grid item xs={12} sm={6}>
                                        <FormControl fullWidth>
                                          <InputLabel>Categoría</InputLabel>
                                          <Controller
                                            name={`bienesMuebles.${index}.categoria`}
                                            control={control}
                                            defaultValue=""
                                            render={({ field }) => (
                                              <Select
                                                {...field}
                                                label="Categoría"
                                                sx={selectSx}
                                              >
                                                {watch(`bienesMuebles.${index}.tipoComplemento`) === 'Afectación' && [
                                                  <MenuItem value="Anticresis">Anticresis</MenuItem>,
                                                  <MenuItem value="Arriendo">Arriendo</MenuItem>,
                                                  <MenuItem value="Patrimonio Familiar">Patrimonio Familiar</MenuItem>,
                                                  <MenuItem value="Servidumbre">Servidumbre</MenuItem>,
                                                  <MenuItem value="Uso y habitación">Uso y habitación</MenuItem>,
                                                  <MenuItem value="Usufructo">Usufructo</MenuItem>,
                                                  <MenuItem value="Vivienda Familiar">Vivienda Familiar</MenuItem>
                                                ]}
                                                {watch(`bienesMuebles.${index}.tipoComplemento`) === 'Gravámen' && [
                                                  <MenuItem value="Hipotecario">Hipotecario</MenuItem>,
                                                  <MenuItem value="Prenda">Prenda</MenuItem>,
                                                  <MenuItem value="Propiedad Fiduciaria">Propiedad Fiduciaria</MenuItem>
                                                ]}
                                                {watch(`bienesMuebles.${index}.tipoComplemento`) === 'Medida cautelar' && [
                                                  <MenuItem value="Embargo">Embargo</MenuItem>,
                                                  <MenuItem value="Secuestro">Secuestro</MenuItem>
                                                ]}
                                              </Select>
                                            )}
                                          />
                                        </FormControl>
                                      </Grid>
                                    )}
                                    <Grid item xs={12}>
                                      <GlassTextField
                                        {...register(`bienesMuebles.${index}.descripcionComplemento`)}
                                        label="Descripción del Complemento"
                                        fullWidth
                                        multiline
                                        rows={2}
                                      />
                                    </Grid>
                                    <Grid item xs={12}>
                                      <GlassCard>
                                        <Box sx={{ p: 2 }}>
                                          <Stack spacing={1}>
                                            <Typography variant="subtitle1">Garantías</Typography>
                                            <FormControlLabel
                                              control={<Switch {...register(`bienesMuebles.${index}.leasing`)} />} 
                                              label="Leasing"
                                            />
                                            <FormControlLabel
                                              control={<Switch {...register(`bienesMuebles.${index}.prenda`)} />} 
                                              label="Prenda"
                                            />
                                            <FormControlLabel
                                              control={<Switch {...register(`bienesMuebles.${index}.garantiaMobiliaria`)} />} 
                                              label="Garantía Mobiliaria"
                                            />
                                            <FormControlLabel
                                              control={<Switch {...register(`bienesMuebles.${index}.pactoRetroventa`)} />} 
                                              label="Pacto Retroventa"
                                            />
                                            {(watch(`bienesMuebles.${index}.leasing`) || watch(`bienesMuebles.${index}.prenda`) || watch(`bienesMuebles.${index}.garantiaMobiliaria`) || watch(`bienesMuebles.${index}.pactoRetroventa`)) && (
                                              <Box>
                                                <Typography variant="subtitle1" sx={{ mt: 2 }}>Acreedores</Typography>
                                                {acreedoresData?.rows
                                                  .filter(acreedor => watchedAcreencias.some(a => a.acreedor === acreedor._id))
                                                  .map((acreedor) => (
                                                    <FormControlLabel
                                                      key={acreedor._id}
                                                      control={<Checkbox {...register(`bienesMuebles.${index}.acreedores.${acreedor._id}`)} />} 
                                                      label={acreedor.nombre}
                                                    />
                                                  ))}
                                              </Box>
                                            )}
                                          </Stack>
                                        </Box>
                                      </GlassCard>
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

                  {/* Bienes Inmuebles */}
                  <Box>
                    <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Bienes Inmuebles
                      </Typography>
                      <Button
                        variant="outlined"
                        onClick={() => appendBienInmueble({})}
                        startIcon={<AddIcon />}
                        size="small"
                        sx={{
                          borderRadius: '12px',
                          borderColor: alpha(tabsConfig[4].color, 0.3),
                          color: tabsConfig[4].color,
                          '&:hover': {
                            borderColor: tabsConfig[4].color,
                            background: alpha(tabsConfig[4].color, 0.1),
                          },
                        }}
                      >
                        Agregar
                      </Button>
                    </Stack>

                    {bienesInmueblesFields.length === 0 ? (
                      <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
                        <Typography variant="body2">No hay bienes inmuebles agregados</Typography>
                      </Box>
                    ) : (
                      <Stack spacing={2}>
                        {bienesInmueblesFields.map((field, index) => (
                          <Box key={field.id}>
                            <GlassCard sx={{ border: `1px solid ${alpha(tabsConfig[4].color, 0.2)}` }}>
                              <Box sx={{ p: 2 }}>
                                <Stack spacing={2}>
                                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Chip
                                      label={`Bien Inmueble #${index + 1}`}
                                      size="small"
                                      sx={{
                                        background: alpha(tabsConfig[4].color, 0.1),
                                        color: tabsConfig[4].color,
                                        fontWeight: 600,
                                      }} />
                                    <IconButton
                                      onClick={() => removeBienInmueble(index)}
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
                                    <Grid item xs={12}>
                                      <GlassTextField
                                        {...register(`bienesInmuebles.${index}.descripcion`, { required: 'Campo requerido' })}
                                        label="Descripción"
                                        multiline
                                        rows={3}
                                        fullWidth
                                        error={!!errors.bienesInmuebles?.[index]?.descripcion} />
                                    </Grid>
                                    <Grid item xs={6} sm={4}>
                                      <GlassTextField
                                        {...register(`bienesInmuebles.${index}.matricula`, { required: 'Campo requerido' })}
                                        label="Matrícula Inmobiliaria"
                                        fullWidth
                                        error={!!errors.bienesInmuebles?.[index]?.matricula} />
                                    </Grid>
                                    <Grid item xs={6} sm={4}>
                                      <GlassTextField
                                        {...register(`bienesInmuebles.${index}.escrituraPublica`)}
                                        label="Escritura Pública"
                                        fullWidth
                                      />
                                    </Grid>
                                    <Grid item xs={6} sm={4}>
                                      <GlassTextField
                                        {...register(`bienesInmuebles.${index}.avaluoCatastral`)}
                                        label="Avalúo Catastral"
                                        type="number"
                                        fullWidth
                                      />
                                    </Grid>
                                    <Grid item xs={6} sm={4}>
                                      <GlassTextField
                                        {...register(`bienesInmuebles.${index}.direccion`, { required: 'Campo requerido' })}
                                        label="Dirección"
                                        fullWidth
                                        error={!!errors.bienesInmuebles?.[index]?.direccion} />
                                    </Grid>
                                    <LocationSelector
                                      control={control}
                                      errors={errors}
                                      watch={watch}
                                      setValue={setValue}
                                      showCountry={true}
                                      showDepartment={true}
                                      showCity={true}
                                      countryFieldName={`bienesInmuebles.${index}.pais`}
                                      departmentFieldName={`bienesInmuebles.${index}.departamento`}
                                      cityFieldName={`bienesInmuebles.${index}.ciudad`}
                                      countryLabel="País"
                                      departmentLabel="Departamento"
                                      cityLabel="Ciudad"
                                      countryGridProps={{ xs: 12, sm: 4 }}
                                      departmentGridProps={{ xs: 12, sm: 4 }}
                                      cityGridProps={{ xs: 12, sm: 4 }}
                                    />
                                    <Grid item xs={6} sm={4}>
                                      <GlassTextField
                                        {...register(`bienesInmuebles.${index}.porcentajeParticipacion`, { required: 'Campo requerido', valueAsNumber: true, max: { value: 100, message: 'El porcentaje no puede ser mayor a 100' } })}
                                        label="% de Participación"
                                        fullWidth
                                        error={!!errors.bienesInmuebles?.[index]?.porcentajeParticipacion} />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                      <GlassTextField
                                        {...register(`bienesInmuebles.${index}.avaluoComercial`, { required: 'Campo requerido' })}
                                        label="Avalúo Comercial Estimado"
                                        type="number"
                                        fullWidth
                                        sx={{ minWidth: 250, }}
                                        error={!!errors.bienesInmuebles?.[index]?.avaluoComercial} />
                                    </Grid>
                                    <Grid item xs={12}>
                                      <FormControlLabel
                                        control={<Checkbox {...register(`bienesInmuebles.${index}.afectadoViviendaFamiliar`)} />}
                                        label="Afectado a Vivienda Familiar" />
                                    </Grid>
                                    <Grid item xs={12}>
                                      <Typography variant="subtitle1">Afectaciones, Gravámenes y Medidas Cautelares:</Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                      <FormControl fullWidth>
                                        <InputLabel>Tipo de Complemento</InputLabel>
                                        <Controller
                                          name={`bienesInmuebles.${index}.tipoComplemento`}
                                          control={control}
                                          defaultValue=""
                                          render={({ field }) => (
                                            <Select
                                              {...field}
                                              label="Tipo de Complemento"
                                              sx={selectSx}
                                            >
                                              <MenuItem value="Afectación">Afectación</MenuItem>
                                              <MenuItem value="Gravámen">Gravámen</MenuItem>
                                              <MenuItem value="Medida cautelar">Medida cautelar</MenuItem>
                                            </Select>
                                          )}
                                        />
                                      </FormControl>
                                    </Grid>
                                    {watch(`bienesInmuebles.${index}.tipoComplemento`) && (
                                      <Grid item xs={12} sm={6}>
                                        <FormControl fullWidth>
                                          <InputLabel>Categoría</InputLabel>
                                          <Controller
                                            name={`bienesInmuebles.${index}.categoria`}
                                            control={control}
                                            defaultValue=""
                                            render={({ field }) => (
                                              <Select
                                                {...field}
                                                label="Categoría"
                                                sx={selectSx}
                                              >
                                                {watch(`bienesInmuebles.${index}.tipoComplemento`) === 'Afectación' && [
                                                  <MenuItem value="Anticresis">Anticresis</MenuItem>,
                                                  <MenuItem value="Arriendo">Arriendo</MenuItem>,
                                                  <MenuItem value="Patrimonio Familiar">Patrimonio Familiar</MenuItem>,
                                                  <MenuItem value="Servidumbre">Servidumbre</MenuItem>,
                                                  <MenuItem value="Uso y habitación">Uso y habitación</MenuItem>,
                                                  <MenuItem value="Usufructo">Usufructo</MenuItem>,
                                                  <MenuItem value="Vivienda Familiar">Vivienda Familiar</MenuItem>
                                                ]}
                                                {watch(`bienesInmuebles.${index}.tipoComplemento`) === 'Gravámen' && [
                                                  <MenuItem value="Hipotecario">Hipotecario</MenuItem>,
                                                  <MenuItem value="Prenda">Prenda</MenuItem>,
                                                  <MenuItem value="Propiedad Fiduciaria">Propiedad Fiduciaria</MenuItem>
                                                ]}
                                                {watch(`bienesInmuebles.${index}.tipoComplemento`) === 'Medida cautelar' && [
                                                  <MenuItem value="Embargo">Embargo</MenuItem>,
                                                  <MenuItem value="Secuestro">Secuestro</MenuItem>
                                                ]}
                                              </Select>
                                            )}
                                          />
                                        </FormControl>
                                      </Grid>
                                    )}
                                    <Grid item xs={12}>
                                      <GlassTextField
                                        {...register(`bienesInmuebles.${index}.descripcionComplemento`)}
                                        label="Descripción del Complemento"
                                        fullWidth
                                        multiline
                                        rows={2}
                                      />
                                    </Grid>
                                    <Grid item xs={12}>
                                      <GlassCard>
                                        <Box sx={{ p: 2 }}>
                                          <Stack spacing={1}>
                                            <Typography variant="subtitle1">Garantías</Typography>
                                            <FormControlLabel
                                              control={<Switch {...register(`bienesInmuebles.${index}.leasing`)} />} 
                                              label="Leasing"
                                            />
                                            <FormControlLabel
                                              control={<Switch {...register(`bienesInmuebles.${index}.prenda`)} />} 
                                              label="Prenda"
                                            />
                                            <FormControlLabel
                                              control={<Switch {...register(`bienesInmuebles.${index}.garantiaMobiliaria`)} />} 
                                              label="Garantía Mobiliaria"
                                            />
                                            <FormControlLabel
                                              control={<Switch {...register(`bienesInmuebles.${index}.pactoRetroventa`)} />} 
                                              label="Pacto Retroventa"
                                            />
                                            {(watch(`bienesInmuebles.${index}.leasing`) || watch(`bienesInmuebles.${index}.prenda`) || watch(`bienesInmuebles.${index}.garantiaMobiliaria`) || watch(`bienesInmuebles.${index}.pactoRetroventa`)) && (
                                              <Box>
                                                <Typography variant="subtitle1" sx={{ mt: 2 }}>Acreedores</Typography>
                                                {acreedoresData?.rows
                                                  .filter(acreedor => watchedAcreencias.some(a => a.acreedor === acreedor._id))
                                                  .map((acreedor) => (
                                                    <FormControlLabel
                                                      key={acreedor._id}
                                                      control={<Checkbox {...register(`bienesInmuebles.${index}.acreedores.${acreedor._id}`)} />} 
                                                      label={acreedor.nombre}
                                                    />
                                                  ))}
                                              </Box>
                                            )}
                                          </Stack>
                                        </Box>
                                      </GlassCard>
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

                  {/* Sociedad Conyugal */}
                  <GlassCard hover={false} sx={{ border: `1px solid ${alpha(theme.palette.info.main, 0.2)}` }}>
                    <Box sx={{ p: 3 }}>
                      <Stack spacing={2}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          Información sobre Sociedad Conyugal o Patrimonial
                        </Typography>

                        <FormControlLabel
                          control={<Controller
                            name="sociedadConyugal.activa"
                            control={control}
                            render={({ field }) => <Checkbox {...field} checked={field.value} />} />}
                          label="Tengo o he tenido sociedad conyugal o patrimonial vigente" />
                        <FormControlLabel
                          control={<Controller
                            name="sociedadConyugal.disuelta"
                            control={control}
                            render={({ field }) => <Checkbox {...field} checked={field.value} />} />}
                          label="La sociedad conyugal o patrimonial está disuelta pero no liquidada" />

                        {watchSociedadActiva && (
                          <Fade in={watchSociedadActiva}>
                            <Box>
                              <Divider sx={{ my: 2 }} />
                              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                                Datos del Cónyuge
                              </Typography>
                              <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                  <GlassTextField
                                    {...register('sociedadConyugal.nombreConyuge', { required: watchSociedadActiva })}
                                    label="Nombres y Apellidos del Cónyuge"
                                    fullWidth
                                    sx={{ minWidth: 300 }}
                                    error={!!errors.sociedadConyugal?.nombreConyuge} />
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                  <FormControl fullWidth error={!!errors.sociedadConyugal?.tipoDocConyuge}>
                                    <InputLabel>Tipo de Documento</InputLabel>
                                    <Controller
                                      name="sociedadConyugal.tipoDocConyuge"
                                      control={control}
                                      defaultValue=""
                                      rules={{ required: watchSociedadActiva ? 'Campo requerido' : false }}
                                      render={({ field }) => (
                                        <Select
                                          {...field}
                                          label="Tipo de Documento"
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
                                    {errors.sociedadConyugal?.tipoDocConyuge && <FormHelperText>{errors.sociedadConyugal?.tipoDocConyuge?.message}</FormHelperText>}
                                  </FormControl>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                  <GlassTextField
                                    {...register('sociedadConyugal.numDocConyuge', { required: watchSociedadActiva })}
                                    label="Número de Documento"
                                    fullWidth
                                    error={!!errors.sociedadConyugal?.numDocConyuge} />
                                </Grid>
                              </Grid>
                            </Box>
                          </Fade>
                        )}
                      </Stack>
                    </Box>
                  </GlassCard>

                  <Button
                    variant="contained"
                    onClick={() => handleSaveSection('bienes', 5)}
                    disabled={isSaving}
                    startIcon={isSaving ? null : <SaveIcon />}
                    sx={{
                      mt: 2,
                      py: 1.5,
                      px: 4,
                      borderRadius: '12px',
                      fontWeight: 600,
                      textTransform: 'none',
                      background: `linear-gradient(135deg, ${tabsConfig[4].color}, ${alpha(tabsConfig[4].color, 0.7)})`,
                      '&:hover': {
                        background: `linear-gradient(135deg, ${alpha(tabsConfig[4].color, 0.9)}, ${alpha(tabsConfig[4].color, 0.6)})`,
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

        {/* Tab 6: Info. Financiera */}
        <TabPanel value={tabValue} index={5}>
              <GlassCard>
                <Box sx={{ p: 3 }}>
                  <Stack spacing={4}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar sx={{ bgcolor: alpha(tabsConfig[5].color, 0.1), color: tabsConfig[5].color }}>
                        <AssessmentIcon />
                      </Avatar>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Información Financiera y Procesos
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
                            sx={{ minWidth: 350}}
                            error={!!errors.informacionFinanciera?.ingresosActividadPrincipal}
                            helperText={errors.informacionFinanciera?.ingresosActividadPrincipal?.message} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <GlassTextField
                            {...register('informacionFinanciera.descripcionActividadEconomica', { required: 'Campo requerido' })}
                            label="Descripción de la Actividad Económica"
                            sx={{ minWidth: 350, }}
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
                            sx={{ minWidth: 300, }}
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
                            sx={{ minWidth: 270, }}
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
                                          sx={{ minWidth: 250, }}
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

                    {/* Procesos Judiciales */}
                    <Box>
                      <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          Procesos Judiciales, Administrativos o Privados
                        </Typography>
                        <Button
                          variant="outlined"
                          onClick={() => appendProceso({})}
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

                      {procesosFields.length === 0 ? (
                        <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
                          <Typography variant="body2">No hay procesos judiciales agregados</Typography>
                        </Box>
                      ) : (
                        <Stack spacing={2}>
                          {procesosFields.map((field, index) => {
                            const tipoProceso = watch(`informacionFinanciera.procesosJudiciales.${index}.tipoProceso`);
                            return (
                              <Box key={field.id}>
                                <GlassCard sx={{ border: `1px solid ${alpha(tabsConfig[5].color, 0.2)}` }}>
                                  <Box sx={{ p: 2 }}>
                                    <Stack spacing={2}>
                                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Chip
                                          label={`Proceso #${index + 1}`}
                                          size="small"
                                          sx={{
                                            background: alpha(tabsConfig[5].color, 0.1),
                                            color: tabsConfig[5].color,
                                            fontWeight: 600,
                                          }} />
                                        <IconButton
                                          onClick={() => removeProceso(index)}
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
                                          <FormControl fullWidth>
                                            <InputLabel>Tipo de Proceso</InputLabel>
                                            <Controller
                                              name={`informacionFinanciera.procesosJudiciales.${index}.tipoProceso`}
                                              control={control}
                                              defaultValue=""
                                              rules={{ required: 'Campo requerido' }}
                                              render={({ field }) => (
                                                <Select
                                                  {...field}
                                                  label="Tipo de Proceso"
                                                  sx={selectSx}
                                                >
                                                  <MenuItem value="Judicial">Judicial</MenuItem>
                                                  <MenuItem value="Privado">Privado</MenuItem>
                                                  <MenuItem value="Administrativo">Administrativo</MenuItem>
                                                </Select>
                                              )}
                                            />
                                          </FormControl>
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                          <FormControl fullWidth>
                                            <InputLabel>Proceso</InputLabel>
                                            <Controller
                                              name={`informacionFinanciera.procesosJudiciales.${index}.proceso`}
                                              control={control}
                                              defaultValue=""
                                              rules={{ required: 'Campo requerido' }}
                                              render={({ field }) => (
                                                <Select
                                                  {...field}
                                                  label="Proceso"
                                                  sx={selectSx}
                                                  disabled={!tipoProceso}
                                                >
                                                  {tipoProceso && procesoOptions[tipoProceso] && procesoOptions[tipoProceso].map(option => (
                                                    <MenuItem key={option} value={option}>{option}</MenuItem>
                                                  ))}
                                                </Select>
                                              )}
                                            />
                                          </FormControl>
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                          <GlassTextField
                                            {...register(`informacionFinanciera.procesosJudiciales.${index}.demandante`)}
                                            label="Demandante"
                                            fullWidth
                                          />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                          <GlassTextField
                                            {...register(`informacionFinanciera.procesosJudiciales.${index}.demandado`)}
                                            label="Demandado"
                                            fullWidth
                                          />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                          <GlassTextField
                                            {...register(`informacionFinanciera.procesosJudiciales.${index}.valor`)}
                                            label="Valor"
                                            type="number"
                                            fullWidth
                                          />
                                        </Grid>
                                        <Grid item xs={12}>
                                          <GlassTextField
                                            {...register(`informacionFinanciera.procesosJudiciales.${index}.juzgado`)}
                                            label="Juzgado"
                                            fullWidth
                                            error={!!errors.informacionFinanciera?.procesosJudiciales?.[index]?.juzgado} />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                          <GlassTextField
                                            {...register(`informacionFinanciera.procesosJudiciales.${index}.emailJuzgado`)}
                                            label="Correo electrónico del Juzgado"
                                            fullWidth
                                            type="email"
                                            error={!!errors.informacionFinanciera?.procesosJudiciales?.[index]?.emailJuzgado} />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                          <GlassTextField
                                            {...register(`informacionFinanciera.procesosJudiciales.${index}.radicado`)}
                                            label="No. de radicado"
                                            fullWidth
                                            error={!!errors.informacionFinanciera?.procesosJudiciales?.[index]?.radicado} />
                                        </Grid>
                                        <LocationSelector
                                          control={control}
                                          errors={errors}
                                          watch={watch}
                                          setValue={setValue}
                                          showCountry={true}
                                          showDepartment={true}
                                          showCity={true}
                                          countryFieldName={`informacionFinanciera.procesosJudiciales.${index}.pais`}
                                          departmentFieldName={`informacionFinanciera.procesosJudiciales.${index}.departamento`}
                                          cityFieldName={`informacionFinanciera.procesosJudiciales.${index}.ciudad`}
                                          countryLabel="País"
                                          departmentLabel="Departamento"
                                          cityLabel="Ciudad"
                                        />
                                        <Grid item xs={12}>
                                          <GlassTextField
                                            {...register(`informacionFinanciera.procesosJudiciales.${index}.direccionJuzgado`)}
                                            label="Dirección del Juzgado"
                                            fullWidth
                                            error={!!errors.informacionFinanciera?.procesosJudiciales?.[index]?.direccionJuzgado} />
                                        </Grid>
                                        <Grid item xs={12}>
                                          <FormControl fullWidth>
                                            <InputLabel>Estado del Proceso</InputLabel>
                                            <Controller
                                              name={`informacionFinanciera.procesosJudiciales.${index}.estadoProceso`}
                                              control={control}
                                              defaultValue=""
                                              rules={{ required: 'Campo requerido' }}
                                              render={({ field }) => (
                                                <Select
                                                  {...field}
                                                  label="Estado del Proceso"
                                                  sx={selectSx}
                                                >
                                                  <MenuItem value="Admitido">Admitido</MenuItem>
                                                  <MenuItem value="Con Sentencia">Con Sentencia</MenuItem>
                                                  <MenuItem value="En Ejecución">En Ejecución</MenuItem>
                                                </Select>
                                              )}
                                            />
                                          </FormControl>
                                        </Grid>
                                      </Grid>
                                    </Stack>
                                  </Box>
                                </GlassCard>
                              </Box>
                            )}
                          )}
                        </Stack>
                      )}
                    </Box>

                    <Button
                      variant="contained"
                      onClick={() => handleSaveSection('financiera', 6)}
                      disabled={isSaving}
                      startIcon={isSaving ? null : <SaveIcon />}
                      sx={{
                        mt: 2,
                        py: 1.5,
                        px: 4,
                        borderRadius: '12px',
                        fontWeight: 600,
                        textTransform: 'none',
                        background: `linear-gradient(135deg, ${tabsConfig[5].color}, ${alpha(tabsConfig[5].color, 0.7)})`,
                        '&:hover': {
                          background: `linear-gradient(135deg, ${alpha(tabsConfig[5].color, 0.9)}, ${alpha(tabsConfig[5].color, 0.6)})`,
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

        {/* Tab 7: Propuesta de Pago */}
        <TabPanel value={tabValue} index={6}>
          <GlassCard>
            <Box sx={{ p: 3 }}>
              <Stack spacing={3}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar sx={{ bgcolor: alpha(tabsConfig[6].color, 0.1), color: tabsConfig[6].color }}>
                    <GavelIcon />
                  </Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Propuesta de Pago a los Acreedores
                  </Typography>
                </Stack>

                {/* Análisis Financiero */}
                <GlassCard
                  hover={false}
                  sx={{
                    border: `2px solid ${alpha(theme.palette.info.main, 0.3)}`,
                    background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.1)} 100%)`,
                  }}
                >
                  <Box sx={{ p: 3 }}>
                    <Stack spacing={2}>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{ bgcolor: alpha(theme.palette.info.main, 0.1) }}>
                          <TrendingUpIcon sx={{ color: theme.palette.info.main }} />
                        </Avatar>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          Análisis Financiero
                        </Typography>
                      </Stack>

                      <Divider />

                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                          <Box
                            sx={{
                              p: 2,
                              borderRadius: '12px',
                              background: alpha(theme.palette.success.main, 0.05),
                              border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                              textAlign: 'center',
                            }}
                          >
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                              Total Ingresos
                            </Typography>
                            <Typography variant="h5" sx={{ color: theme.palette.success.main, fontWeight: 700, mt: 1 }}>
                              {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(parseFloat(watchedIngresos || 0))}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Box
                            sx={{
                              p: 2,
                              borderRadius: '12px',
                              background: alpha(theme.palette.error.main, 0.05),
                              border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                              textAlign: 'center',
                            }}
                          >
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                              Total Gastos
                            </Typography>
                            <Typography variant="h5" sx={{ color: theme.palette.error.main, fontWeight: 700, mt: 1 }}>
                              {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(totalGastos)}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Box
                            sx={{
                              p: 2,
                              borderRadius: '12px',
                              background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.1)} 100%)`,
                              border: `2px solid ${alpha(theme.palette.info.main, 0.3)}`,
                              textAlign: 'center',
                            }}
                          >
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                              Capacidad de Pago
                            </Typography>
                            <Typography variant="h5" sx={{ color: theme.palette.info.main, fontWeight: 700, mt: 1 }}>
                              {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(disponibleParaPago)}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </Stack>
                  </Box>
                </GlassCard>

                {/* Propuesta de Pago */}
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Tipo de Negociación</InputLabel>
                      <Controller
                        name="propuestaPago.tipoNegociacion"
                        control={control}
                        defaultValue="texto"
                        render={({ field }) => (
                          <Select
                            {...field}
                            label="Tipo de Negociación"
                            sx={selectSx}
                          >
                            <MenuItem value="texto">Plasmar negociación mediante texto</MenuItem>
                            <MenuItem value="proyeccion">Realizar proyección de pagos</MenuItem>
                          </Select>
                        )}
                      />
                    </FormControl>
                  </Grid>

                  {tipoNegociacion === 'texto' ? (
                    <Grid item xs={12}>
                      <GlassTextField
                        {...register('propuestaPago.descripcion', { required: tipoNegociacion === 'texto' ? 'Campo requerido' : false })}
                        label="Descripción detallada de la propuesta de pago"
                        multiline
                        minRows={3}
                        sx={{minWidth: 500}}
                        fullWidth
                        error={!!errors.propuestaPago?.descripcion}
                        helperText={errors.propuestaPago?.descripcion?.message || "Explique cómo propone pagar a sus acreedores"}
                      />
                    </Grid>
                  ) : (
                   <>

                    {/* Fila 1: 4 campos en una línea */}
                      <Grid item xs={12} sm={6} md={3}>
                        <GlassTextField
                          {...register('propuestaPago.plazo', { required: true, valueAsNumber: true })}
                          label="Plazo (en meses)"
                          type="number"
                          fullWidth
                          error={!!errors.propuestaPago?.plazo}
                        />
                      </Grid>
                       <Grid item xs={12} sm={6} md={3}>
                        <FormControl fullWidth>
                          <InputLabel>Forma de Pago</InputLabel>
                          <Controller
                            name="propuestaPago.formaPago"
                            control={control}
                            defaultValue="CuotaFija"
                            render={({ field }) => (
                              <Select {...field} label="Forma de Pago" sx={selectSx}>
                                <MenuItem value="CuotaFija">Cuota Fija Mensual</MenuItem>
                              </Select>
                            )}
                          />
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Controller
                          name="propuestaPago.interesEA"
                          control={control}
                          rules={{ required: 'Campo requerido' }}
                          render={({ field, fieldState: { error } }) => (
                            <GlassTextField
                              {...field}
                              label="Interés E.A. (%)"
                              type="number"
                              fullWidth
                              error={!!error}
                              helperText={error?.message}
                              InputLabelProps={{ shrink: true }}
                              onChange={(e) => {
                                field.onChange(e);
                                const eaRate = parseFloat(e.target.value);
                                if (!isNaN(eaRate)) {
                                  const monthlyRateValue = ((Math.pow(1 + eaRate / 100, 1 / 12) - 1) * 100);
                                  const currentMonthlyRate = parseFloat(getValues('propuestaPago.interesMensual'));
                                  if (isNaN(currentMonthlyRate) || Math.abs(currentMonthlyRate - monthlyRateValue) > 1e-9) {
                                    setValue('propuestaPago.interesMensual', monthlyRateValue);
                                  }
                                } else {
                                  setValue('propuestaPago.interesMensual', '');
                                }
                              }}
                            />
                          )}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Controller
                          name="propuestaPago.interesMensual"
                          control={control}
                          rules={{ required: 'Campo requerido' }}
                          render={({ field, fieldState: { error } }) => (
                            <GlassTextField
                              {...field}
                              label="Interés N.M (%)"
                              type="number"
                              fullWidth
                              InputLabelProps={{ shrink: true }}
                              error={!!error}
                              helperText={error?.message}
                              onChange={(e) => {
                                field.onChange(e);
                                const monthlyRateValue = parseFloat(e.target.value);
                                if (!isNaN(monthlyRateValue)) {
                                  const eaRate = ((Math.pow(1 + monthlyRateValue / 100, 12) - 1) * 100);
                                  const currentEaRate = parseFloat(getValues('propuestaPago.interesEA'));
                                  if (isNaN(currentEaRate) || Math.abs(currentEaRate - eaRate) > 1e-9) {
                                    setValue('propuestaPago.interesEA', eaRate);
                                  }
                                } else {
                                  setValue('propuestaPago.interesEA', '');
                                }
                              }}
                            />
                          )}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <GlassTextField
                          {...register('propuestaPago.fechaInicioPago', { required: true })}
                          label="Fecha de Inicio de Pago"
                          type="date"
                          InputLabelProps={{ shrink: true }}
                          fullWidth
                          error={!!errors.propuestaPago?.fechaInicioPago}
                        />
                      </Grid>

  <Grid item xs={12} sm={6}>
    <FormControl fullWidth>
      <InputLabel>Día de Pago en el Mes</InputLabel>
      <Controller
        name="propuestaPago.diaPago"
        control={control}
        defaultValue={1}
        render={({ field }) => (
          <Select {...field} label="Día de Pago en el Mes" sx={selectSx}>
            {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
              <MenuItem key={day} value={day}>{day}</MenuItem>
            ))}
          </Select>
        )}
      />
    </FormControl>
  </Grid>

  {/* Descripción Adicional - Ancho completo pero más compacta */}
  <Grid item xs={12}>
    <GlassTextField
      {...register('propuestaPago.descripcionProyeccion')}
      label="Descripción Adicional (Opcional)"
      placeholder="Agregue información complementaria sobre la propuesta de pago..."
      multiline
      minRows={3}
      sx={{minWidth: 500}}
      fullWidth
    />
  </Grid>

  {/* Tabla de Proyección */}
  <Grid item xs={12} mt={1}>
    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
      Proyección de Pagos
    </Typography>
    {projectionData.length > 0 ? (
      <TableContainer component={GlassCard} sx={{ p: 0, background: 'rgba(255, 255, 255, 0.05)' }}>
        <Table size="small" aria-label="payment projection table">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>#</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Fecha</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="right">Saldo Capital</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="right">Pago Capital</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="right">Pago Interés</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="right">Monto de Pago</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="right">Saldo Final</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {projectionData.map((row) => (
              <TableRow key={row.pagoNo} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                <TableCell component="th" scope="row">{row.pagoNo}</TableCell>
                <TableCell>{row.fecha}</TableCell>
                <TableCell align="right">{row.saldoCapital}</TableCell>
                <TableCell align="right">{row.pagoCapital}</TableCell>
                <TableCell align="right">{row.pagoInteres}</TableCell>
                <TableCell align="right">{row.montoPago}</TableCell>
                <TableCell align="right">{row.saldoFinalCapital}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    ) : (
      <GlassCard hover={false} sx={{ p: 3, border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}` }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <InfoIcon color="warning"/>
          <Typography variant="body2" color="text.secondary">
            Ingrese el total del capital en la pestaña de <strong>Acreencias</strong>, y complete los campos de <strong>Plazo</strong> e <strong>Interés</strong> para generar la proyección de pagos.
          </Typography>
        </Stack>
      </GlassCard>
    )}
  </Grid>
</>
                  )}
                </Grid>

                <Button
                  variant="contained"
                  onClick={() => handleSaveSection('propuesta', 7)}
                  disabled={isSaving}
                  startIcon={isSaving ? null : <SaveIcon />}
                  sx={{
                    mt: 2,
                    py: 1.5,
                    px: 4,
                    borderRadius: '12px',
                    fontWeight: 600,
                    textTransform: 'none',
                    background: `linear-gradient(135deg, ${tabsConfig[6].color}, ${alpha(tabsConfig[6].color, 0.7)})`,
                    '&:hover': {
                      background: `linear-gradient(135deg, ${alpha(tabsConfig[6].color, 0.9)}, ${alpha(tabsConfig[6].color, 0.6)})`,
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  {isSaving ? 'Guardando...' : 'Guardar Sección'}
                </Button>
              </Stack>
            </Box>
          </GlassCard>
        </TabPanel>

        <TabPanel value={tabValue} index={7}>
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
                                            rules={{ required: 'Debe seleccionar y subir un archivo.' }}
                                            render={({ field: controllerField, fieldState }) => (
                                                <>
                                                    <Button
                                                        variant="outlined"
                                                        component="label"
                                                        disabled={isUploadingAnexo}
                                                        startIcon={isUploadingAnexo ? <CircularProgress size={20} /> : (controllerField.value ? <CheckCircleIcon /> : <UploadFileIcon />)}
                                                        color={controllerField.value ? 'success' : (fieldState.error ? 'error' : 'primary')}
                                                    >
                                                        {isUploadingAnexo ? 'Subiendo...' : (controllerField.value ? 'Subido' : 'Seleccionar Archivo')}
                                                        <input type="file" hidden onChange={(e) => handleAnexoChange(e, index)} onBlur={controllerField.onBlur} />
                                                    </Button>
                                                    <Box flexGrow={1}>
                                                        <Typography variant="body2" noWrap sx={{ color: fieldState.error ? 'error.main' : 'inherit' }}>
                                                            {watch(`anexos.${index}.name`) || 'Ningún archivo seleccionado'}
                                                        </Typography>
                                                        {fieldState.error && <FormHelperText error>{fieldState.error.message}</FormHelperText>}
                                                    </Box>
                                                </>
                                            )}
                                        />
                                        <IconButton onClick={() => removeAnexo(index)} disabled={isUploadingAnexo}><DeleteIcon /></IconButton>
                                    </Stack>
                                    <GlassTextField
                                        {...register(`anexos.${index}.descripcion`, { required: 'La descripción es requerida' })}
                                        label="Descripción del Anexo"
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
                    <Button variant="contained" onClick={() => handleSaveSection('anexos', 8)} disabled={isSaving} startIcon={<SaveIcon />} sx={{ mt: 2 }}>
                      {isSaving ? 'Guardando...' : 'Guardar y Continuar'}
                    </Button>
                </Stack>
            </GlassCard>
        </TabPanel>

        {/* Tab 9: Firma */}
        <TabPanel value={tabValue} index={8}>
          <GlassCard>
            <Box sx={{ p: 3 }}>
              <Stack spacing={3}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar sx={{ bgcolor: alpha(tabsConfig[8].color, 0.1), color: tabsConfig[8].color }}>
                    <CreateIcon />
                  </Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Firma del Deudor
                  </Typography>
                </Stack>

                <FormControl component="fieldset">
                  <RadioGroup row value={signatureSource} onChange={(e) => setSignatureSource(e.target.value)}>
                    <FormControlLabel value="draw" control={<Radio />} label="Dibujar Firma" />
                    <FormControlLabel value="upload" control={<Radio />} label="Subir Imagen de Firma" />
                  </RadioGroup>
                </FormControl>

                {signatureSource === 'draw' && (
                  <Box sx={{ border: '1px dashed grey', borderRadius: '12px', p: 1, background: 'white' }}>
                    <SignatureCanvas
                      ref={sigCanvas}
                      penColor='black'
                      canvasProps={{
                        width: 500,
                        height: 200,
                        style: { background: '#f8f8f8', borderRadius: '12px' }
                      }}
                    />
                    <Button onClick={() => sigCanvas.current.clear()}>Limpiar</Button>
                  </Box>
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
                  </Box>
                )}

                <Button
                  variant="contained"
                  onClick={() => handleSaveSection('firma')}
                  disabled={isSaving}
                  startIcon={isSaving ? null : <SaveIcon />}
                  sx={{
                    mt: 2,
                    py: 1.5,
                    px: 4,
                    borderRadius: '12px',
                    fontWeight: 600,
                    textTransform: 'none',
                    background: `linear-gradient(135deg, ${tabsConfig[8].color}, ${alpha(tabsConfig[8].color, 0.7)})`,
                    '&:hover': {
                      background: `linear-gradient(135deg, ${alpha(tabsConfig[8].color, 0.9)}, ${alpha(tabsConfig[8].color, 0.6)})`,
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  {isSaving ? 'Guardando...' : 'Guardar Sección'}
                </Button>
              </Stack>
            </Box>
          </GlassCard>
        </TabPanel>

        {/* Submit Button */}
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
                    <SendIcon sx={{ fontSize: 32 }} />
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
                    disabled={isUploading || isUpdating}
                    startIcon={<SendIcon />}
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
                    {isUploading ? 'Subiendo Archivos...' : (isUpdating ? 'Actualizando...' : (initialData ? 'Actualizar Solicitud' : 'Generar Solicitud'))}
                  </Button>
                </Stack>
              </Box>
            </GlassCard>
        )}
      </form>

              <Dialog
                open={isConfirmModalOpen}
                onClose={() => setConfirmModalOpen(false)}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
                sx={{ 
                  '& .MuiDialog-paper': {
                    borderRadius: '16px', 
                    border: '1px solid rgba(255, 255, 255, 0.2)', 
                    background: 'rgba(255,255,255,0.8)', 
                    backdropFilter: 'blur(10px)'
                  }
                }}
              >
                <DialogTitle id="alert-dialog-title" sx={{ fontWeight: 700 }}>
                  {"⚠️ Atención: Verificación de Datos Requerida ⚠️"}
                </DialogTitle>
                <DialogContent>
                  <DialogContentText id="alert-dialog-description" component="div">
                    <Typography variant="body1" gutterBottom>
                      Antes de continuar, te recordamos que cada selección y dato diligenciado en los formularios y pestañas (Créditos Principales y Créditos Postergados) afectan directamente la proyección que se plasmará en el documento.
                    </Typography>
                    <Typography variant="body1" gutterBottom>Por favor, asegúrate de:</Typography>
                    <Box component="ul" sx={{ pl: 2 }}>
                      <li><Typography variant="body2">Revisar que la información ingresada corresponda correctamente a las condiciones del crédito que deseas proyectar.</Typography></li>
                      <li><Typography variant="body2">Confirmar que los montos, plazos, tasas y condiciones reflejan correctamente lo acordado o planificado.</Typography></li>
                      <li><Typography variant="body2">Haber completado todos los campos obligatorios (categoría, capital, fecha de inicio, forma de pago, plazo, intereses, etc.).</Typography></li>
                    </Box>
                    <Typography variant="body1" sx={{ mt: 2, fontWeight: 500 }}>
                    ➡️ Al continuar, confirmás que la proyección generada corresponde a la información que diligencias y que verificaste todos los campos y formularios.
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                    Si necesitas modificar algo, hazlo antes de proceder para evitar errores en la proyección que se plasmará en el documento.
                    </Typography>
                  </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ p: '16px 24px' }}>
                  <Button onClick={() => setConfirmModalOpen(false)} sx={{ borderRadius: '12px' }}>Cancelar</Button>
                  <Button 
                    onClick={() => { setConfirmModalOpen(false); handleSubmit(customOnSubmit, onInvalid)(); }} 
                    autoFocus 
                    variant="contained" 
                    sx={{ borderRadius: '12px' }}
                    disabled={isUploading || isUpdating}
                  >
                    {isUploading ? 'Subiendo...' : (isUpdating ? 'Actualizando...' : (initialData ? 'Confirmar Actualización' : 'Confirmar'))}
                  </Button>
                </DialogActions>
              </Dialog>
              <DescriptionModal
                open={isDescriptionModalOpen}
                onClose={() => setIsDescriptionModalOpen(false)}
                onConfirm={handleDescriptionConfirm}
                defaultValue={currentFileToProcess?.name || ''} // Optional: pre-fill with filename
              />
          </Box>
        );
      };
export default InsolvenciaForm;
