import React, { useState, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { 
  TextField, Button, Typography, Box, Grid, Tabs, Tab, 
  alpha, useTheme, Stack, RadioGroup, Radio, FormControlLabel, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import {
  Person as PersonIcon,
  Business as BusinessIcon,
  Assignment as AssignmentIcon,
  Create as CreateIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import SignatureCanvas from 'react-signature-canvas';
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

const PoderForm = ({ onSubmit, isUploading }) => {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [signatureSource, setSignatureSource] = useState('draw');
  const sigCanvas = useRef({});

  // Estilo para el Select (Glassmorphism)
  const selectSx = {
    borderRadius: '12px',
    background: 'rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(10px)',
    '& .MuiOutlinedInput-notchedOutline': { border: '1px solid rgba(255, 255, 255, 0.2)' },
    '&:hover .MuiOutlinedInput-notchedOutline': { border: '1px solid rgba(255, 255, 255, 0.3)' },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { border: `2px solid ${alpha(theme.palette.primary.main, 0.5)} !important` },
  };

  const { register, handleSubmit, control, formState: { errors } } = useForm({
    defaultValues: {
      destinatario: { entidad: 'SEGUROS MUNDIAL', ciudad: 'Ciudad' },
      poderdante: { nombre: '', genero: 'masculino', cedula: '', ciudadExpedicion: '', departamentoExpedicion: '', ciudadResidencia: 'esta ciudad' },
      apoderado: { nombre: 'MANUEL RICARDO MANCERA GARCIA', cedula: '1.090.442.371', ciudadExpedicion: 'Cúcuta', tarjetaProfesional: '316.220', cargo: 'ABOGADO ESPECIALISTA' },
      siniestro: { aseguradora: 'SEGUROS MUNDIAL', poliza: '', fecha: '', tipoProceso: 'RECLAMACION DE INDEMNIZACION POR ACCIDENTE DE TRANSITO', ley: 'ley 780 del 2016' },
      firma: { source: 'draw', data: null }
    }
  });

  const customOnSubmit = async (data) => {
    if (signatureSource === 'draw' && sigCanvas.current && !sigCanvas.current.isEmpty()) {
      data.firma = { source: 'draw', data: sigCanvas.current.getTrimmedCanvas().toDataURL('image/png') };
    }

    // El encabezado (Señores) usa el nombre del abogado y su cargo/título:
    // destinatario.nombre = apoderado.nombre, destinatario.cargo = apoderado.cargo
    data.destinatario = {
      ...data.destinatario,
      nombre: data.apoderado?.nombre || '',
      cargo: data.apoderado?.cargo || '',
    };

    await onSubmit(data);
  };

  const tabsConfig = [
    { key: 'destinatario', label: 'Destinatario', icon: BusinessIcon, color: '#2196f3' },
    { key: 'partes', label: 'Partes (Poderdante/Apoderado)', icon: PersonIcon, color: '#673ab7' },
    { key: 'siniestro', label: 'Detalles Siniestro', icon: AssignmentIcon, color: '#ff5722' },
    { key: 'firma', label: 'Firma', icon: CreateIcon, color: '#795548' },
  ];

  return (
    <Box>
      <GlassCard sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, val) => setTabValue(val)} variant="scrollable" scrollButtons="auto">
          {tabsConfig.map((tab, idx) => {
            const Icon = tab.icon;
            return <Tab key={tab.key} label={<Stack alignItems="center"><Icon sx={{ color: tab.color }} /><Typography variant="caption">{tab.label}</Typography></Stack>} />
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
            <Button variant="contained" onClick={() => setTabValue(1)}>Continuar</Button>
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
              <Grid item xs={12} sm={6}><GlassTextField {...register('poderdante.nombre', { required: 'Requerido' })} label="Nombre Completo" fullWidth error={!!errors.poderdante?.nombre} /></Grid>
              <Grid item xs={12} sm={6}><GlassTextField {...register('poderdante.cedula', { required: 'Requerido' })} label="Cédula" fullWidth error={!!errors.poderdante?.cedula} /></Grid>
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
            <Button variant="contained" onClick={() => setTabValue(2)}>Continuar</Button>
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
              <Grid item xs={12} sm={6}><GlassTextField {...register('siniestro.poliza', { required: 'Requerido' })} label="Número de Póliza" fullWidth error={!!errors.siniestro?.poliza} /></Grid>
              <Grid item xs={12} sm={6}><GlassTextField {...register('siniestro.fecha', { required: 'Requerido' })} label="Fecha del Siniestro" type="date" InputLabelProps={{ shrink: true }} fullWidth error={!!errors.siniestro?.fecha} /></Grid>
            </Grid>
            <Button variant="contained" onClick={() => setTabValue(3)}>Continuar</Button>
          </Stack></Box></GlassCard>
        </TabPanel>

        {/* Tab 3: Firma y Envío */}
        <TabPanel value={tabValue} index={3}>
          <GlassCard><Box p={3}><Stack spacing={3}>
            <Typography variant="h6">Firma del Poderdante</Typography>
            <FormControl component="fieldset">
              <RadioGroup row value={signatureSource} onChange={(e) => setSignatureSource(e.target.value)}>
                <FormControlLabel value="draw" control={<Radio />} label="Dibujar Firma" />
              </RadioGroup>
            </FormControl>
            <Box sx={{ border: '1px dashed grey', borderRadius: '12px', p: 1, background: 'white' }}>
              <SignatureCanvas ref={sigCanvas} penColor='black' canvasProps={{ width: 500, height: 200, style: { background: '#f8f8f8', borderRadius: '12px' } }} />
              <Button onClick={() => sigCanvas.current.clear()}>Limpiar</Button>
            </Box>
            
            <Button type="submit" variant="contained" color="success" size="large" startIcon={<SendIcon />} disabled={isUploading}>
              {isUploading ? 'Generando...' : 'Generar Documento'}
            </Button>
          </Stack></Box></GlassCard>
        </TabPanel>
      </form>
    </Box>
  );
};
export default PoderForm;