import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createAcreedor, getAcreedor, updateAcreedor } from '../services/acreedorService';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  TextField, Button, Typography, Box, FormControl, InputLabel, Select, MenuItem, IconButton, 
  CardContent, Avatar, Container, Stack, 
  InputAdornment, Chip, Fade, Slide, Grow, Alert, CircularProgress, Stepper, Step, 
  StepLabel, useTheme, alpha, Tooltip
} from '@mui/material';
import {
  ArrowBack, Person as PersonIcon,
  Badge as BadgeIcon, LocationOn as LocationIcon, Email as EmailIcon,
  Phone as PhoneIcon, Home as HomeIcon,
  Save as SaveIcon, Edit as EditIcon, Add as AddIcon, CheckCircle,
  Error as ErrorIcon
} from '@mui/icons-material';

import GlassCard from '../components/common/GlassCard';
import LocationSelector from '../components/forms/LocationSelector';

// Enhanced Text Field Component
const EnhancedTextField = ({ icon: Icon, field, ...props }) => {
  const theme = useTheme();
  
  return (
    <TextField
      {...field}
      {...props}
      InputProps={{
        startAdornment: Icon && (
          <InputAdornment position="start">
            <Icon color="action" />
          </InputAdornment>
        ),
        ...props.InputProps,
      }}
      sx={{
        '& .MuiOutlinedInput-root': {
          borderRadius: 3,
          transition: 'all 0.3s ease',
          '&:hover': {
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: alpha(theme.palette.primary.main, 0.5),
            }
          },
          '&.Mui-focused': {
            transform: 'translateY(-2px)',
            boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.15)}`,
          },
          '&.Mui-error': {
            '&.Mui-focused': {
              boxShadow: `0 8px 24px ${alpha(theme.palette.error.main, 0.15)}`,
            }
          }
        },
        '& .MuiFormLabel-root': {
          fontWeight: 600,
        },
        ...props.sx,
      }}
    />
  );
};

// Enhanced Select Component
const EnhancedSelect = ({ icon: Icon, children, ...props }) => {
  const theme = useTheme();
  
  return (
    <FormControl 
      fullWidth 
      margin="normal" 
      error={!!props.error}
      sx={{
        '& .MuiOutlinedInput-root': {
          borderRadius: 3,
          transition: 'all 0.3s ease',
          '&:hover': {
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: alpha(theme.palette.primary.main, 0.5),
            }
          },
          '&.Mui-focused': {
            transform: 'translateY(-2px)',
            boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.15)}`,
          }
        },
        '& .MuiFormLabel-root': {
          fontWeight: 600,
        }
      }}
    >
      <InputLabel id={`${props.name}-label`}>{props.label}</InputLabel>
      <Controller
        name={props.name}
        control={props.control}
        defaultValue=""
        rules={props.rules}
        render={({ field }) => (
          <Select
            {...field}
            labelId={`${props.name}-label`}
            label={props.label}
            startAdornment={Icon && (
              <InputAdornment position="start">
                <Icon color="action" />
              </InputAdornment>
            )}
          >
            {children}
          </Select>
        )}
      />
      {props.error && (
        <Typography color="error" variant="caption" sx={{ mt: 1, ml: 2 }}>
          {props.errorMessage}
        </Typography>
      )}
    </FormControl>
  );
};

// Form Steps Configuration
const formSteps = [
  { 
    label: 'Información Personal', 
    icon: PersonIcon,
    fields: ['nombre', 'tipoDoc', 'nitCc']
  },
  { 
    label: 'Información de Contacto', 
    icon: EmailIcon,
    fields: ['email', 'telefono', 'direccion']
  },
  { 
    label: 'Ubicación', 
    icon: LocationIcon,
    fields: ['pais', 'departamento', 'ciudad'] // These fields are now handled by LocationSelector
  }
];

// Main Component
const AcreedorFormPage = () => {
  const theme = useTheme();
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [activeStep, setActiveStep] = useState(0);
  const [formSubmitted, setFormSubmitted] = useState(false);
  
  const { register, handleSubmit, setValue, control, formState: { errors }, trigger, getValues, watch } = useForm({
    mode: 'onTouched'
  });

  // Query for existing acreedor data
  const { data: acreedor, isLoading, isError } = useQuery({
    queryKey: ['acreedor', id],
    queryFn: () => getAcreedor(id),
    enabled: !!id,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createAcreedor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acreedores'] });
      setFormSubmitted(true);
      setTimeout(() => {
        navigate('/acreedores');
      }, 2000);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data) => updateAcreedor(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acreedores'] });
      setFormSubmitted(true);
      setTimeout(() => {
        navigate('/acreedores');
      }, 2000);
    },
  });

  // Effect to populate form with existing data
  useEffect(() => {
    if (acreedor) {
      setValue('nombre', acreedor.nombre?.trim() || '');
      setValue('tipoDoc', acreedor.tipoDoc?.trim() || '');
      setValue('nitCc', acreedor.nitCc?.trim() || '');
      setValue('direccion', acreedor.direccion?.trim() || '');
      setValue('email', acreedor.email?.trim() || '');
      setValue('telefono', acreedor.telefono?.trim() || '');
      setValue('pais', acreedor.pais?.trim() || '');
      setValue('departamento', acreedor.departamento?.trim() || '');
      setValue('ciudad', acreedor.ciudad?.trim() || '');
    }
  }, [acreedor, setValue]);

  // Form submission handler
  const onSubmit = (data) => {
    if (id) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  // Step navigation handlers
  const handleNext = async () => {
    const currentStepFields = formSteps[activeStep].fields;
    const isStepValid = await trigger(currentStepFields);
    
    if (isStepValid) {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleStepClick = async (stepIndex) => {
    if (stepIndex < activeStep) {
      setActiveStep(stepIndex);
    } else if (stepIndex === activeStep + 1) {
      await handleNext();
    }
  };

  // Get form data for step validation
  const isStepCompleted = (stepIndex) => {
    const stepFields = formSteps[stepIndex].fields;
    const values = getValues();
    return stepFields.every(field => values[field] && !errors[field]);
  };

  // Loading state
  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Stack alignItems="center" spacing={3}>
          <CircularProgress size={60} thickness={4} />
          <Typography variant="h6" color="text.secondary">
            Cargando información del acreedor...
          </Typography>
        </Stack>
      </Container>
    );
  }

  // Error state
  if (isError) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert 
          severity="error" 
          sx={{ 
            borderRadius: 3,
            bgcolor: alpha(theme.palette.error.main, 0.1),
            border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`
          }}
          action={
            <Button 
              color="error" 
              size="small" 
              onClick={() => navigate('/acreedores')}
            >
              Volver a la Lista
            </Button>
          }
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
            Error al cargar los datos
          </Typography>
          <Typography variant="body2">
            No se pudo cargar la información del acreedor.
          </Typography>
        </Alert>
      </Container>
    );
  }

  return (
    <Box 
      sx={{ 
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, ${alpha(theme.palette.secondary.main, 0.02)} 100%)`,
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(circle at 20% 50%, ${alpha(theme.palette.primary.main, 0.05)} 0%, transparent 50%), radial-gradient(circle at 80% 20%, ${alpha(theme.palette.secondary.main, 0.05)} 0%, transparent 50%)`,
          pointerEvents: 'none',
          zIndex: 0,
        }
      }}
    >
      <Container maxWidth="md" sx={{ py: 4, position: 'relative', zIndex: 1 }}>
        <Stack spacing={4}>
          {/* Enhanced Header */}
          <Slide in={true} direction="down" timeout={600}>
            <GlassCard hover={false}>
              <CardContent sx={{ p: 4 }}>
                <Stack direction="row" alignItems="center" spacing={3}>
                  <Tooltip title="Volver a la lista">
                    <IconButton 
                      component={Link} 
                      to="/acreedores"
                      sx={{
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        color: theme.palette.primary.main,
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.2),
                          transform: 'scale(1.1)',
                        },
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <ArrowBack />
                    </IconButton>
                  </Tooltip>
                  
                  <Avatar 
                    sx={{ 
                      width: 64, 
                      height: 64, 
                      bgcolor: alpha(id ? theme.palette.warning.main : theme.palette.success.main, 0.1),
                      color: id ? theme.palette.warning.main : theme.palette.success.main,
                      border: `3px solid ${alpha(id ? theme.palette.warning.main : theme.palette.success.main, 0.2)}`
                    }}
                  >
                    {id ? <EditIcon sx={{ fontSize: 32 }} /> : <AddIcon sx={{ fontSize: 32 }} />}
                  </Avatar>
                  
                  <Box sx={{ flex: 1 }}>
                    <Typography 
                      variant="h4" 
                      component="h1" 
                      sx={{ 
                        fontWeight: 800,
                        background: `linear-gradient(135deg, ${id ? theme.palette.warning.main : theme.palette.success.main} 0%, ${theme.palette.primary.main} 100%)`,
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        color: 'transparent',
                        mb: 0.5,
                        fontFamily: '"Inter", "Roboto", sans-serif'
                      }}
                    >
                      {id ? 'Editar Acreedor' : 'Nuevo Acreedor'}
                    </Typography>
                    <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
                      {id ? 'Modifica la información del acreedor existente' : 'Registra un nuevo acreedor en el sistema'}
                    </Typography>
                    {id && acreedor && (
                      <Chip 
                        label={`ID: ${acreedor._id?.slice(-6)}`}
                        size="small"
                        sx={{ 
                          mt: 1,
                          bgcolor: alpha(theme.palette.info.main, 0.1),
                          color: theme.palette.info.main,
                          fontWeight: 600,
                          fontFamily: 'monospace'
                        }}
                      />
                    )}
                  </Box>
                </Stack>
              </CardContent>
            </GlassCard>
          </Slide>

          {/* Enhanced Stepper */}
          <Fade in={true} timeout={800}>
            <GlassCard>
              <CardContent sx={{ p: 3 }}>
                <Stepper 
                  activeStep={activeStep} 
                  alternativeLabel
                  sx={{
                    '& .MuiStepLabel-root': {
                      cursor: 'pointer',
                    },
                    '& .MuiStepIcon-root': {
                      fontSize: '2rem',
                      '&.Mui-completed': {
                        color: theme.palette.success.main,
                      },
                      '&.Mui-active': {
                        color: theme.palette.primary.main,
                      }
                    },
                    '& .MuiStepConnector-line': {
                      borderTopWidth: 3,
                      borderRadius: 1,
                    }
                  }}
                >
                  {formSteps.map((step, index) => (
                    <Step key={step.label} completed={isStepCompleted(index)}>
                      <StepLabel 
                        onClick={() => handleStepClick(index)}
                        StepIconComponent={() => (
                          <Avatar
                            sx={{
                              bgcolor: index === activeStep 
                                ? theme.palette.primary.main 
                                : isStepCompleted(index)
                                ? theme.palette.success.main
                                : alpha(theme.palette.grey[400], 0.3),
                              color: 'white',
                              width: 48,
                              height: 48,
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                transform: 'scale(1.1)',
                              }
                            }}
                          >
                            {isStepCompleted(index) ? (
                              <CheckCircle />
                            ) : (
                              <step.icon />
                            )}
                          </Avatar>
                        )}
                      >
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 1 }}>
                          {step.label}
                        </Typography>
                      </StepLabel>
                    </Step>
                  ))}
                </Stepper>
              </CardContent>
            </GlassCard>
          </Fade>

          {/* Enhanced Form */}
          <Grow in={true} timeout={1000}>
            <GlassCard>
              <CardContent sx={{ p: 4 }}>
                <form onSubmit={handleSubmit(onSubmit)}>
                  {/* Step 1: Personal Information */}
                  {activeStep === 0 && (
                    <Fade in={activeStep === 0} timeout={300}>
                      <Stack spacing={3}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                          Información Personal
                        </Typography>
                        
                        <EnhancedTextField
                          field={{...register('nombre', { required: 'Nombre es requerido' })}}
                          label="Nombre Completo o Razón Social"
                          fullWidth
                          margin="normal"
                          error={!!errors.nombre}
                          helperText={errors.nombre?.message}
                          icon={PersonIcon}
                        />

                        <EnhancedSelect
                          name="tipoDoc"
                          control={control}
                          label="Tipo de Documento"
                          error={!!errors.tipoDoc}
                          errorMessage={errors.tipoDoc?.message}
                          rules={{ required: 'Tipo de documento es requerido' }}
                          icon={BadgeIcon}
                        >
                          <MenuItem value="Cédula de Ciudadanía">Cédula de Ciudadanía</MenuItem>
                          <MenuItem value="NIT">NIT</MenuItem>
                          <MenuItem value="Cédula de Extranjería">Cédula de Extranjería</MenuItem>
                          <MenuItem value="Pasaporte">Pasaporte</MenuItem>
                        </EnhancedSelect>

                        <EnhancedTextField
                          field={{...register('nitCc', { required: 'No. de Documento es requerido' })}}
                          label="No. de Documento"
                          fullWidth
                          margin="normal"
                          error={!!errors.nitCc}
                          helperText={errors.nitCc?.message}
                          icon={BadgeIcon}
                        />
                      </Stack>
                    </Fade>
                  )}

                  {/* Step 2: Contact Information */}
                  {activeStep === 1 && (
                    <Fade in={activeStep === 1} timeout={300}>
                      <Stack spacing={3}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                          Información de Contacto
                        </Typography>

                        <EnhancedTextField
                          field={{...register('email', { 
                            required: 'Email es requerido',
                            pattern: {
                              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                              message: 'Email inválido'
                            }
                          })}}
                          label="Email"
                          type="email"
                          fullWidth
                          margin="normal"
                          error={!!errors.email}
                          helperText={errors.email?.message}
                          icon={EmailIcon}
                        />

                        <EnhancedTextField
                          field={{...register('telefono', { required: 'Teléfono es requerido' })}}
                          label="Teléfono"
                          fullWidth
                          margin="normal"
                          error={!!errors.telefono}
                          helperText={errors.telefono?.message}
                          icon={PhoneIcon}
                        />

                        <EnhancedTextField
                          field={{...register('direccion', { required: 'Dirección es requerida' })}}
                          label="Dirección"
                          fullWidth
                          margin="normal"
                          error={!!errors.direccion}
                          helperText={errors.direccion?.message}
                          icon={HomeIcon}
                          multiline
                          rows={2}
                        />
                      </Stack>
                    </Fade>
                  )}

                  {/* Step 3: Location */}
                  {activeStep === 2 && (
                    <Fade in={activeStep === 2} timeout={300}>
                      <Stack spacing={3}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                          Ubicación
                        </Typography>

                        <LocationSelector
                          control={control}
                          errors={errors}
                          watch={watch}
                          setValue={setValue}
                          showCountry={true}
                          showDepartment={true}
                          showCity={true}
                          countryRules={{ required: 'País es requerido' }}
                          departmentRules={{ required: 'Departamento es requerido' }}
                          cityRules={{ required: 'Ciudad es requerida' }}
                        />
                      </Stack>
                    </Fade>
                  )}

                  {/* Navigation Buttons */}
                  <Box sx={{ mt: 4, pt: 3, borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                    <Stack direction="row" spacing={2} justifyContent="space-between">
                      <Button
                        disabled={activeStep === 0}
                        onClick={handleBack}
                        variant="outlined"
                        sx={{
                          borderRadius: 3,
                          textTransform: 'none',
                          fontWeight: 600,
                          px: 4
                        }}
                      >
                        Anterior
                      </Button>

                      {activeStep === formSteps.length - 1 ? (
                        <Button
                          type="button"
                          onClick={handleSubmit(onSubmit)}
                          variant="contained"
                          disabled={createMutation.isLoading || updateMutation.isLoading}
                          startIcon={
                            (createMutation.isLoading || updateMutation.isLoading) ? (
                              <CircularProgress size={20} />
                            ) : (
                              <SaveIcon />
                            )
                          }
                          sx={{
                            borderRadius: 3,
                            textTransform: 'none',
                            fontWeight: 600,
                            px: 4,
                            background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.primary.main} 100%)`,
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: theme.shadows[8],
                            },
                            transition: 'all 0.3s ease'
                          }}
                        >
                          {createMutation.isLoading || updateMutation.isLoading 
                            ? 'Guardando...' 
                            : id ? 'Actualizar Acreedor' : 'Crear Acreedor'
                          }
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          onClick={handleNext}
                          variant="contained"
                          sx={{
                            borderRadius: 3,
                            textTransform: 'none',
                            fontWeight: 600,
                            px: 4
                          }}
                        >
                          Siguiente
                        </Button>
                      )}
                    </Stack>
                  </Box>
                </form>
              </CardContent>
            </GlassCard>
          </Grow>

          {/* Error Messages */}
          {(createMutation.isError || updateMutation.isError) && (
            <Slide in={true} direction="up" timeout={300}>
              <Alert 
                severity="error" 
                sx={{ 
                  borderRadius: 3,
                  bgcolor: alpha(theme.palette.error.main, 0.1),
                  border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`
                }}
                icon={<ErrorIcon />}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Error al {id ? 'actualizar' : 'crear'} el acreedor
                </Typography>
                <Typography variant="body2">
                  {createMutation.error?.message || updateMutation.error?.message || 'Ha ocurrido un error inesperado'}
                </Typography>
              </Alert>
            </Slide>
          )}
        </Stack>
      </Container>

      {/* Success Modal/Toast */}
      {formSubmitted && (
        <Slide in={formSubmitted} direction="up" timeout={300}>
          <Alert 
            severity="success" 
            sx={{ 
              borderRadius: 3,
              bgcolor: alpha(theme.palette.success.main, 0.1),
              border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: 1000,
              minWidth: 400,
            }}
            icon={<CheckCircle />}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
              ¡Acreedor {id ? 'actualizado' : 'creado'} exitosamente!
            </Typography>
            <Typography variant="body2">
              Redirigiendo a la lista de acreedores...
            </Typography>
          </Alert>
        </Slide>
      )}
    </Box>
  );
};

export default AcreedorFormPage;