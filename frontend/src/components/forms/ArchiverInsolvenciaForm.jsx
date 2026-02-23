import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { 
  TextField, Button, Typography, Grid, FormControl, InputLabel, Select, MenuItem,
  FormHelperText, useTheme, alpha, Stack, Avatar,
} from '@mui/material';
import {
  Gavel as GavelIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import LocationSelector from './LocationSelector';
import GlassCard from '../common/GlassCard'; // Importing from common location
import { ArchiverAnexosSection } from '../common/ArchiverAnexosSection'; // Importing from common location

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

const GlassSelect = ({ control, name, label, options, rules, error, ...props }) => {
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
      border: `2px solid ${error ? theme.palette.error.main : alpha(theme.palette.primary.main, 0.5)} !important`,
    },
    '&:hover': {
        background: 'rgba(255, 255, 255, 0.12)',
    },
    '&.Mui-focused': {
        background: 'rgba(255, 255, 255, 0.15)',
    },
  };
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
                      sx={selectSx}
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

const ArchiverInsolvenciaForm = ({ onSubmit, archiverEntryId, initialData, onUploadSuccess }) => {
  const theme = useTheme();
  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      deudor: {
        nombreCompleto: '',
        tipoIdentificacion: '',
        numeroIdentificacion: '',
        telefono: '',
        email: '',
        pais: '',
        departamento: '',
        ciudad: '',
        domicilio: '',
      },
      anexos: [],
    }
  });

  React.useEffect(() => {
    if (initialData) {
      setValue('deudor.nombreCompleto', initialData.deudor.nombreCompleto);
      setValue('deudor.tipoIdentificacion', initialData.deudor.tipoIdentificacion);
      setValue('deudor.numeroIdentificacion', initialData.deudor.numeroIdentificacion);
      setValue('deudor.telefono', initialData.deudor.telefono);
      setValue('deudor.email', initialData.deudor.email);
      setValue('deudor.pais', initialData.deudor.pais);
      setValue('deudor.departamento', initialData.deudor.departamento);
      setValue('deudor.ciudad', initialData.deudor.ciudad);
      setValue('deudor.domicilio', initialData.deudor.domicilio);
    }
  }, [initialData, setValue]);

  const onSubmitForm = (data) => {
    onSubmit({
      tipoSolicitud: 'Solicitud de Insolvencia Económica',
      insolvenciaData: {
        deudor: data.deudor,
        // Annexes are handled by ArchiverAnexosSection directly, not passed here initially
        anexos: [], 
      },
    });
  };

  return (
    <GlassCard sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar sx={{ bgcolor: alpha(theme.palette.error.main, 0.1), color: theme.palette.error.main }}>
            <GavelIcon />
          </Avatar>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Datos del Deudor (Insolvencia)
          </Typography>
        </Stack>
        <Grid container spacing={2}>
          <Grid item xs={12}><GlassTextField {...register('deudor.nombreCompleto', { required: 'Nombre completo del deudor es requerido' })} label="Nombre Completo del Deudor" fullWidth error={!!errors.deudor?.nombreCompleto} helperText={errors.deudor?.nombreCompleto?.message} /></Grid>
          <Grid item xs={12} sm={6}>
            <GlassSelect
              control={control}
              name="deudor.tipoIdentificacion"
              label="Tipo de Identificación"
              options={[
                { value: 'CÉDULA DE CIUDADANÍA', label: 'CÉDULA DE CIUDADANÍA' },
                { value: 'CÉDULA DE EXTRANJERÍA', label: 'CÉDULA DE EXTRANJERÍA' },
                { value: 'NIT', label: 'NIT' },
                { value: 'PASAPORTE', label: 'PASAPORTE' }
              ]}
              rules={{ required: 'Campo requerido' }}
              error={errors.deudor?.tipoIdentificacion}
            />
          </Grid>
          <Grid item xs={12} sm={6}><GlassTextField {...register('deudor.numeroIdentificacion', { required: 'Número de identificación es requerido' })} label="Número de Identificación" fullWidth error={!!errors.deudor?.numeroIdentificacion} helperText={errors.deudor?.numeroIdentificacion?.message} /></Grid>
          <Grid item xs={12} sm={6}><GlassTextField {...register('deudor.telefono', { required: 'Teléfono es requerido' })} label="Teléfono" fullWidth error={!!errors.deudor?.telefono} helperText={errors.deudor?.telefono?.message} /></Grid>
          <Grid item xs={12} sm={6}><GlassTextField {...register('deudor.email', { required: 'Email es requerido', pattern: { value: /^\S+@\S+$/i, message: "Email inválido" } })} label="Email" type="email" fullWidth error={!!errors.deudor?.email} helperText={errors.deudor?.email?.message} /></Grid>
          <LocationSelector
            control={control}
            errors={errors}
            watch={watch}
            setValue={setValue}
            showCountry={true}
            countryFieldName="deudor.pais"
            countryLabel="País"
            countryGridProps={{ xs: 12, sm: 4 }}
            countryRules={{ required: 'Campo requerido' }}
            showDepartment={true}
            departmentFieldName="deudor.departamento"
            departmentLabel="Departamento"
            departmentGridProps={{ xs: 12, sm: 4 }}
            departmentRules={{ required: 'Campo requerido' }}
            showCity={true}
            cityFieldName="deudor.ciudad"
            cityLabel="Ciudad"
            cityGridProps={{ xs: 12, sm: 4 }}
            cityRules={{ required: 'Campo requerido' }}
          />
          <Grid item xs={12}><GlassTextField {...register('deudor.domicilio', { required: 'Dirección es requerida' })} label="Dirección" fullWidth error={!!errors.deudor?.domicilio} helperText={errors.deudor?.domicilio?.message} /></Grid>
        </Grid>

        <Button
          variant="contained"
          onClick={handleSubmit(onSubmitForm)}
          startIcon={<SaveIcon />}
          sx={{ mt: 2 }}
        >
          Guardar Solicitud
        </Button>

        <Typography variant="h6" sx={{ fontWeight: 700, mt: 4 }}>Anexos/Documentos</Typography>
        <ArchiverAnexosSection anexos={initialData?.anexos || []} archiverEntryId={archiverEntryId} onUploadSuccess={onUploadSuccess} />
      </Stack>
    </GlassCard>
  );
};

export default ArchiverInsolvenciaForm;
