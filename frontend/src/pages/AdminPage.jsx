import React, { useState, useMemo, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getAdminStats, getAdminSolicitudes, uploadAnexo } from '../services/adminService';
import { downloadSolicitudDocument } from '../services/solicitudService';
import { downloadConciliacionDocument } from '../services/conciliacionService';
import { downloadFile, uploadFile as fileStorageServiceUploadFile } from '../services/fileStorageService';
import { toast } from 'react-toastify';
import { handleAxiosError } from '../utils/alert';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  flexRender,
} from '@tanstack/react-table';
import { 
  Box, Grid, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Tabs, Tab, CircularProgress, Alert, Stack, IconButton, TablePagination, TextField, useTheme,
  alpha, CardContent, Avatar, Container, Tooltip, Chip, Fade, Grow, Slide, Button,
  InputAdornment, Badge, Divider, Dialog, DialogTitle, DialogContent, List, ListItem, ListItemText, ListItemIcon, Accordion, AccordionSummary, AccordionDetails,
} from '@mui/material';
import {
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer, Area, AreaChart, Sector, Brush
} from 'recharts';
import { useDebounce } from '../hooks/useDebounce';
import {
    ArrowUpward, ArrowDownward, People as PeopleIcon, Assignment as AssignmentIcon,
    Category as CategoryIcon, TrendingUp as TrendingUpIcon, PictureAsPdf, Description as DescriptionIcon,
    Dashboard as DashboardIcon, History as HistoryIcon, Group as GroupIcon,
    Search, FilterList, Refresh, Analytics, Timeline, Edit as EditIcon, ExpandMore as ExpandMoreIcon,
    Close as CloseIcon, CloudUpload as CloudUploadIcon, Download as DownloadIcon, KeyboardArrowDown, KeyboardArrowUp, Person, Folder, Handshake, Gavel, Balance, AttachMoney, FamilyRestroom, FoodBank, HomeWork, DirectionsCar, FactCheck,
    LocalHospital, School, Receipt, Shield, Home, Business, Security, ShoppingCart, SportsEsports, Wc, Event, Today
} from '@mui/icons-material';
// --- Enhanced Dashboard Components ---

import GlassCard from '../components/common/GlassCard';

const AnimatedMetricCard = ({ title, value, subtitle, icon: IconComponent, color, trend, index }) => {
  const theme = useTheme();
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), index * 100);
    return () => clearTimeout(timer);
  }, [index]);

  return (
    <Grow in={animated} timeout={600} style={{ transformOrigin: 'center top' }}>
      <div>
        <GlassCard>
          <CardContent sx={{ p: 3, position: 'relative' }}>
            {/* Animated background gradient */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '80px',
                height: '80px',
                background: `radial-gradient(circle, ${alpha(color, 0.1)} 0%, transparent 70%)`,
                borderRadius: '50%',
                transform: 'translate(30%, -30%)',
              }}
            />
            
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
              <Avatar 
                sx={{ 
                  bgcolor: alpha(color, 0.15),
                  color: color,
                  width: 56, 
                  height: 56,
                  boxShadow: `0 8px 24px ${alpha(color, 0.2)}`,
                  border: `2px solid ${alpha(color, 0.1)}`,
                }}
              >
                <IconComponent sx={{ fontSize: 28 }} />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {title}
                </Typography>
                {trend && (
                  <Chip 
                    icon={<TrendingUpIcon />} 
                    label={`+${trend}%`} 
                    size="small" 
                    sx={{ 
                      bgcolor: alpha(theme.palette.success.main, 0.1),
                      color: theme.palette.success.main,
                      fontWeight: 600
                    }} 
                  />
                )}
              </Box>
            </Stack>

            <Typography 
              variant="h3" 
              sx={{ 
                fontWeight: 800, 
                background: `linear-gradient(135deg, ${color} 0%, ${alpha(color, 0.7)} 100%)`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                mb: 1,
                fontFamily: '"Inter", "Roboto", sans-serif'
              }}
            >
              {animated ? value?.toLocaleString() : '0'}
            </Typography>

            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                {subtitle}
              </Typography>
            )}
          </CardContent>
        </GlassCard>
      </div>
    </Grow>
  );
};

const InteractiveChartContainer = ({ title, subtitle, children, color, icon: IconComponent, actions }) => {
    const theme = useTheme();
    return (
      <GlassCard sx={{ position: 'relative', overflow: 'hidden' }}>
        <Box
          sx={{
            position: 'absolute',
            top: '-50%',
            left: '-50%',
            width: '200%',
            height: '200%',
            background: `radial-gradient(circle, ${alpha(color, 0.15)} 0%, transparent 40%)`,
            animation: 'glow 5s ease-in-out infinite',
            '@keyframes glow': {
              '0%': { transform: 'scale(0.8)', opacity: 0.8 },
              '50%': { transform: 'scale(1)', opacity: 1 },
              '100%': { transform: 'scale(0.8)', opacity: 0.8 },
            },
            zIndex: 0,
          }}
        />
        <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Avatar sx={{ bgcolor: alpha(color, 0.1), color: color, width: 40, height: 40 }}>
                <IconComponent />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                  {title}
                </Typography>
                {subtitle && (
                  <Typography variant="body2" color="text.secondary">
                    {subtitle}
                  </Typography>
                )}
              </Box>
            </Stack>
            {actions && (
              <Stack direction="row" spacing={1}>
                {actions}
              </Stack>
            )}
          </Stack>
          <Box>
            {children}
          </Box>
        </CardContent>
      </GlassCard>
    );
};

const CyclingTypeCard = ({ types, color, icon: IconComponent, index }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [show, setShow] = useState(true);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), index * 100);
    return () => clearTimeout(timer);
  }, [index]);

  useEffect(() => {
    if (!types || types.length <= 1) return;
    const intervalId = setInterval(() => {
      setShow(false);
      setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % Math.min(types.length, 3));
        setShow(true);
      }, 400);
    }, 4000);
    return () => clearInterval(intervalId);
  }, [types]);

  if (!types || types.length === 0) {
    return <AnimatedMetricCard title="Top Tipo Solicitud" value={0} subtitle="N/A" color={color} icon={IconComponent} index={index} />;
  }

  const currentType = types[currentIndex];
  const rank = ["Top Tipo", "2º Tipo", "3er Tipo"][currentIndex];

  return (
    <Grow in={animated} timeout={600} style={{ transformOrigin: 'center top' }}>
      <div>
        <GlassCard>
          <CardContent sx={{ p: 3, position: 'relative', minHeight: '197px' }}>
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '80px',
                height: '80px',
                background: `radial-gradient(circle, ${alpha(color, 0.1)} 0%, transparent 70%)`,
                borderRadius: '50%',
                transform: 'translate(30%, -30%)',
              }}
            />
            <Fade in={show} timeout={300}>
              <Box>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                  <Avatar 
                    sx={{ 
                      bgcolor: alpha(color, 0.15),
                      color: color,
                      width: 56, 
                      height: 56,
                      boxShadow: `0 8px 24px ${alpha(color, 0.2)}`,
                      border: `2px solid ${alpha(color, 0.1)}`,
                    }}
                  >
                    <IconComponent sx={{ fontSize: 28 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {rank}
                    </Typography>
                  </Box>
                </Stack>

                <Typography 
                  variant="h3" 
                  sx={{ 
                    fontWeight: 800, 
                    background: `linear-gradient(135deg, ${color} 0%, ${alpha(color, 0.7)} 100%)`,
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    color: 'transparent',
                    mb: 1,
                    fontFamily: '"Inter", "Roboto", sans-serif'
                  }}
                >
                  {currentType.count.toLocaleString()}
                </Typography>

                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500,  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {currentType._id}
                </Typography>
              </Box>
            </Fade>
          </CardContent>
        </GlassCard>
      </div>
    </Grow>
  );
};


const EnhancedDashboard = ({ stats }) => {
  const theme = useTheme();

  const metrics = [
    {
      title: "Usuarios Totales",
      value: stats.totalUsuarios,
      icon: PeopleIcon,
      color: theme.palette.primary.main,
    },
    {
      title: "Solicitudes Totales",
      value: stats.totalSolicitudes,
      icon: AssignmentIcon,
      color: theme.palette.secondary.main,
    },
    {
      title: "Acreedores Totales",
      value: stats.totalAcreedores,
      icon: GroupIcon,
      color: theme.palette.warning.main,
    },
  ];

  return (
    <Stack spacing={4}>
      {/* Animated Metrics Row */}
      <Grid container spacing={3}>
        {metrics.map((metric, index) => (
          <Grid item xs={12} sm={6} lg={3} key={metric.title}>
            <AnimatedMetricCard {...metric} index={index} />
          </Grid>
        ))}
        <Grid item xs={12} sm={6} lg={3}>
          <CyclingTypeCard types={stats.solicitudesPorTipo} color={theme.palette.success.main} icon={CategoryIcon} index={2} />
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <InteractiveChartContainer 
            title="Tendencias Temporales" 
            subtitle="Evolución mensual de solicitudes"
            color={theme.palette.primary.main}
            icon={Timeline}
          >
            <EnhancedAreaChart data={stats.solicitudesPorMes} />
          </InteractiveChartContainer>
        </Grid>

        <Grid item xs={12} lg={4}>
          <InteractiveChartContainer 
            title="Distribución Global" 
            subtitle="Tipos de solicitudes"
            color={theme.palette.info.main}
            icon={Analytics}
          >
            <EnhancedPieChart data={stats.solicitudesPorTipo} />
          </InteractiveChartContainer>
        </Grid>
      </Grid>
    </Stack>
  );
};

const EnhancedPieChart = ({ data }) => {
    const theme = useTheme();
    const [activeIndex, setActiveIndex] = useState(null);

    const COLORS = [
        theme.palette.primary.main, 
        theme.palette.secondary.main, 
        theme.palette.success.main, 
        theme.palette.warning.main, 
        theme.palette.info.main,
        theme.palette.error.main
    ];

    const onPieEnter = (_, index) => {
        setActiveIndex(index);
    };

    const onPieLeave = () => {
        setActiveIndex(null);
    };
    
    const total = data.reduce((sum, entry) => sum + entry.count, 0);

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const percent = ((payload[0].value / total) * 100).toFixed(2);
            return (
                <Paper 
                    sx={{ 
                        p: 2, 
                        background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.paper, 0.8)} 100%)`,
                        backdropFilter: 'blur(10px)',
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                        borderRadius: 2,
                        boxShadow: theme.shadows[8]
                    }}
                >
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {payload[0].name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {payload[0].value} solicitudes ({percent}%)
                    </Typography>
                </Paper>
            );
        }
        return null;
    };
    
    const renderActiveShape = (props) => {
        const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
        const color = COLORS[activeIndex % COLORS.length];
        return (
            <g>
                <Sector
                    cx={cx}
                    cy={cy}
                    innerRadius={innerRadius}
                    outerRadius={outerRadius + 8}
                    startAngle={startAngle}
                    endAngle={endAngle}
                    fill={fill}
                    style={{ filter: `drop-shadow(0 4px 8px ${alpha(color, 0.5)})` }}
                />
            </g>
        );
    };

    return (
        <ResponsiveContainer width="100%" height={350}>
            <PieChart>
                 <defs>
                    {COLORS.map((color, index) => (
                        <linearGradient key={index} id={`gradient-${index}`} x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={0.9}/>
                            <stop offset="100%" stopColor={color} stopOpacity={0.6}/>
                        </linearGradient>
                    ))}
                </defs>
                <Pie 
                    data={data} 
                    dataKey="count" 
                    nameKey="_id" 
                    cx="50%" 
                    cy="50%" 
                    innerRadius="60%"
                    outerRadius="80%"
                    paddingAngle={5}
                    activeIndex={activeIndex}
                    activeShape={renderActiveShape}
                    onMouseEnter={onPieEnter}
                    onMouseLeave={onPieLeave}
                >
                    {data.map((entry, index) => (
                        <Cell 
                            key={`cell-${index}`} 
                            fill={`url(#gradient-${index % COLORS.length})`}
                            stroke={theme.palette.background.paper}
                            strokeWidth={2}
                        />
                    ))}
                </Pie>
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend 
                    iconType="circle"
                    formatter={(value) => <span>{value}</span>}
                />
            </PieChart>
        </ResponsiveContainer>
    );
};

const EnhancedAreaChart = ({ data }) => {
    const theme = useTheme();
    const chartData = data.map(item => ({ 
        name: `${item._id.month}/${item._id.year}`, 
        Solicitudes: item.count,
    }));

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <Paper 
                    sx={{ 
                        p: 2, 
                        background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.paper, 0.8)} 100%)`,
                        backdropFilter: 'blur(10px)',
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                        borderRadius: 2,
                        boxShadow: theme.shadows[8]
                    }}
                >
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        {label}
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: theme.palette.primary.main }} />
                        <Typography variant="body2">
                            {payload[0].value} solicitudes
                        </Typography>
                    </Stack>
                </Paper>
            );
        }
        return null;
    };

    return (
        <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="solicitudesAreaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.4}/>
                        <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0}/>
                    </linearGradient>
                    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="0" dy="5" stdDeviation="10" floodColor={alpha(theme.palette.primary.main, 0.3)}/>
                    </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.1)} vertical={false} />
                <XAxis 
                    dataKey="name" 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fontSize: 12, fontWeight: 500, fill: theme.palette.text.secondary }}
                    padding={{ left: 20, right: 20 }}
                />
                <YAxis 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fontSize: 12, fontWeight: 500, fill: theme.palette.text.secondary }}
                    tickFormatter={(value) => new Intl.NumberFormat('es-CO', { notation: 'compact', compactDisplay: 'short' }).format(value)}
                    allowDecimals={false}
                    width={40}
                />
                <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: theme.palette.primary.main, strokeWidth: 1, strokeDasharray: '3 3' }} />
                <Area 
                    type="monotone" 
                    dataKey="Solicitudes" 
                    stroke={theme.palette.primary.main}
                    strokeWidth={3}
                    fill="url(#solicitudesAreaGradient)"
                    filter="url(#shadow)"
                    animationDuration={1500}
                />
                <Brush dataKey="name" height={30} stroke={theme.palette.primary.main} fill={alpha(theme.palette.background.paper, 0.5)} tickFormatter={() => ''} />
            </AreaChart>
        </ResponsiveContainer>
    );
};

const GlassModal = ({ open, onClose, title, children, maxWidth = "md" }) => {
  const theme = useTheme();
  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth={maxWidth} 
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
            {title}
          </Typography>
          <IconButton 
            onClick={onClose}
            sx={{
              bgcolor: alpha(theme.palette.error.main, 0.1),
              '&:hover': {
                bgcolor: alpha(theme.palette.error.main, 0.2),
                transform: 'rotate(90deg)',
              },
              transition: 'all 0.3s ease',
            }}
          >
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent 
        sx={{ 
          py: 3,
          background: `linear-gradient(to bottom, ${alpha(theme.palette.background.default, 0.3)} 0%, transparent 100%)`,
        }}
      >
        {children}
      </DialogContent>
    </Dialog>
  );
};

const DetailItem = ({ label, value, icon: Icon }) => {
  const theme = useTheme();
  return (
    <Grid item xs={12} sm={6}>
      <Box 
        sx={{ 
          p: 2, 
          borderRadius: 2,
          background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.4)} 0%, ${alpha(theme.palette.background.paper, 0.1)} 100%)`,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.15)}`,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
          }
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          {Icon && (
            <Avatar 
              sx={{ 
                width: 32, 
                height: 32, 
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main
              }}
            >
              <Icon sx={{ fontSize: 18 }} />
            </Avatar>
          )}
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {label}
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 700, mt: 0.5 }}>
              {value || 'N/A'}
            </Typography>
          </Box>
        </Stack>
      </Box>
    </Grid>
  );
};

const DeudorModal = ({ open, onClose, deudor }) => {
  if (!deudor) return null;
  return (
    <GlassModal open={open} onClose={onClose} title="Información del Deudor" maxWidth="lg">
      <Stack spacing={3}>
        <Box 
          sx={{ 
            p: 3, 
            borderRadius: 3,
            background: `linear-gradient(135deg, ${alpha('#1976d2', 0.1)} 0%, ${alpha('#9c27b0', 0.1)} 100%)`,
            border: `1px solid ${alpha('#1976d2', 0.2)}`,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <Avatar 
              sx={{ 
                width: 64, 
                height: 64, 
                bgcolor: alpha('#1976d2', 0.2),
                fontSize: '1.5rem',
                fontWeight: 800,
              }}
            >
              {deudor.nombreCompleto?.charAt(0) || 'D'}
            </Avatar>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                {deudor.nombreCompleto}
              </Typography>
              <Chip 
                label={`${deudor.tipoIdentificacion} - ${deudor.cedula}`}
                size="small"
                sx={{ mt: 1 }}
              />
            </Box>
          </Stack>
        </Box>

        <Grid container spacing={2}>
          <DetailItem label="Lugar de Expedición" value={`${deudor.ciudadExpedicion}, ${deudor.departamentoExpedicion}`} icon={Person} />
          <DetailItem label="Teléfono" value={deudor.telefono} icon={Person} />
          <DetailItem label="Email" value={deudor.email} icon={Person} />
          <DetailItem label="País de Origen" value={deudor.paisOrigen} icon={Person} />
          <DetailItem label="Fecha de Nacimiento" value={new Date(deudor.fechaNacimiento).toLocaleDateString()} icon={Person} />
          <DetailItem label="Género" value={deudor.genero} icon={Person} />
          <DetailItem label="Estado Civil" value={deudor.estadoCivil} icon={Person} />
          <DetailItem label="Etnia" value={deudor.etnia} icon={Person} />
          <DetailItem label="Discapacidad" value={deudor.discapacidad} icon={Person} />
          <DetailItem label="Domicilio" value={`${deudor.domicilio}, ${deudor.ciudad}, ${deudor.departamento}`} icon={Person} />
          <DetailItem label="Tipo Persona" value={deudor.tipoPersonaNatural} icon={Person} />
        </Grid>
      </Stack>
    </GlassModal>
  );
};


const AcreedoresModal = ({ open, onClose, acreedores }) => {
  const theme = useTheme();
  if (!acreedores) return null;
  return (
    <GlassModal open={open} onClose={onClose} title="Acreedores" maxWidth="lg">
      <TableContainer 
        sx={{ 
          borderRadius: 3,
          background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.4)} 0%, ${alpha(theme.palette.background.paper, 0.1)} 100%)`,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
              <TableCell sx={{ fontWeight: 700, borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.1)}` }}>Nombre del Acreedor</TableCell>
              <TableCell sx={{ fontWeight: 700, borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.1)}` }}>Documento</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.1)}` }}>Capital</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {acreedores.map((item, index) => (
              <TableRow 
                key={index}
                sx={{
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.03),
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                <TableCell>{item.acreedor?.nombreCompleto || 'N/A'}</TableCell>
                <TableCell>{`${item.acreedor?.tipoIdentificacion || ''} - ${item.acreedor?.numeroIdentificacion || ''}`}</TableCell>
                <TableCell align="right">
                  <Chip 
                    label={`$${item.capital?.toLocaleString() || 0}`}
                    color="success"
                    size="small"
                    sx={{ fontWeight: 700 }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </GlassModal>
  );
};

const InvolucradosModal = ({ open, onClose, involucrados, title }) => {
  const theme = useTheme();
  if (!involucrados) return null;
  return (
    <GlassModal open={open} onClose={onClose} title={title} maxWidth="lg">
      <Stack spacing={3}>
        {involucrados.map((p, index) => (
          <Box 
            key={index} 
            sx={{ 
              p: 3, 
              borderRadius: 3,
              background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.6)} 0%, ${alpha(theme.palette.background.paper, 0.3)} 100%)`,
              border: `1px solid ${alpha(theme.palette.divider, 0.15)}`,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateX(8px)',
                boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.2)}`,
              }
            }}
          >
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
              <Avatar 
                sx={{ 
                  width: 56, 
                  height: 56, 
                  bgcolor: alpha(theme.palette.secondary.main, 0.15),
                  color: theme.palette.secondary.main,
                  fontWeight: 800,
                  fontSize: '1.25rem',
                }}
              >
                {p.primerNombre?.charAt(0)}{p.primerApellido?.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  {`${p.primerNombre} ${p.segundoNombre || ''} ${p.primerApellido} ${p.segundoApellido || ''}`}
                </Typography>
                <Chip 
                  label={p.tipoInvolucrado}
                  size="small"
                  color="primary"
                  sx={{ mt: 0.5 }}
                />
              </Box>
            </Stack>
            <Grid container spacing={2}>
              <DetailItem label="Identificación" value={`${p.tipoIdentificacion} ${p.numeroIdentificacion}`} />
              <DetailItem label="Lugar de Expedición" value={`${p.ciudadExpedicion}, ${p.departamentoExpedicion}`} />
              <DetailItem label="Teléfono" value={p.telefono} />
              <DetailItem label="Email" value={p.email} />
              <DetailItem label="País de Origen" value={p.paisOrigen} />
              <DetailItem label="Fecha de Nacimiento" value={new Date(p.fechaNacimiento).toLocaleDateString()} />
              <DetailItem label="Género" value={p.genero} />
              <DetailItem label="Estado Civil" value={p.estadoCivil} />
              <DetailItem label="Domicilio" value={`${p.domicilio}, ${p.ciudad}, ${p.departamento}`} />
            </Grid>
          </Box>
        ))}
      </Stack>
    </GlassModal>
  );
};

const AnexosSection = ({ anexos, solicitudId, tipoSolicitud, onUploadSuccess }) => {
  const theme = useTheme();
  const fileInputRef = React.useRef(null);
  const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState(false);
  const [currentFileToUpload, setCurrentFileToUpload] = useState(null);

  const { mutate: uploadFileToBackend, isLoading: isUploadingToBackend } = useMutation({
    mutationFn: (data) => uploadAnexo(data.id, data.tipo, data.filename, data.fileUrl, data.description),
    onSuccess: () => {
        toast.success("Archivo subido con éxito");
        onUploadSuccess();
    },
    onError: (error) => {
        handleAxiosError(error);
    }
  });

  const handleFileSelect = (event) => {
      const file = event.target.files[0];
      if (file) {
          setCurrentFileToUpload(file);
          setIsDescriptionModalOpen(true);
      }
      // Reset the input value so the same file can be selected again
      event.target.value = null;
  };

  const handleDescriptionConfirm = async (description) => {
    setIsDescriptionModalOpen(false);
    if (!currentFileToUpload) return;

    try {
        console.log('AnexosSection: Starting file upload to GCS for:', currentFileToUpload.name, 'with description:', description);
        const { fileUrl, uniqueFilename } = await fileStorageServiceUploadFile(currentFileToUpload);
        console.log('AnexosSection: GCS upload successful. fileUrl:', fileUrl, 'uniqueFilename:', uniqueFilename);
        uploadFileToBackend({ 
            id: solicitudId, 
            tipo: tipoSolicitud.startsWith('Solicitud de Insolvencia') ? 'insolvencia' : 'conciliacion', 
            filename: uniqueFilename,
            fileUrl: fileUrl,
            description: description, // Pass the description
            size: currentFileToUpload.size, // Pass the file size
        });
    } catch (error) {
        handleAxiosError(error, "Error al subir archivo a Google Cloud Storage.");
    } finally {
        setCurrentFileToUpload(null);
    }
  };

  const handleDownload = async (anexo) => {
    console.log('AnexosSection: handleDownload triggered for anexo:', anexo);
    if (!anexo.name) { // Corrected from anexo.filename to anexo.name
        toast.error("Nombre del archivo no encontrado.");
        return;
    }
    try {
      await downloadFile(anexo.name); // Corrected from anexo.filename to anexo.name
      toast.success(`Iniciando descarga de ${anexo.name}...`);
    } catch (error) {
      toast.error(`Error al descargar el archivo: ${error.message}`);
    }
  }

  return (
    <Box>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      <Button
        startIcon={<CloudUploadIcon />}
        variant="contained"
        onClick={() => fileInputRef.current.click()}
        disabled={isUploadingToBackend}
        sx={{ 
          mb: 3,
          borderRadius: 3,
          textTransform: 'none',
          fontWeight: 600,
          py: 1.5,
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
          boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.3)}`,
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
          },
          transition: 'all 0.3s ease',
        }}
      >
        {isUploadingToBackend ? 'Subiendo...' : 'Subir Documento'}
      </Button>
      <List>
        {anexos?.map((anexo, index) => (
          <ListItem 
            key={index}
            sx={{
              mb: 1,
              borderRadius: 2,
              background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.4)} 0%, ${alpha(theme.palette.background.paper, 0.1)} 100%)`,
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              '&:hover': {
                border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                transform: 'translateX(4px)',
              },
              transition: 'all 0.3s ease',
            }}
            secondaryAction={
              <IconButton 
                edge="end" 
                onClick={() => handleDownload(anexo)}
                sx={{
                  bgcolor: alpha(theme.palette.success.main, 0.1),
                  '&:hover': {
                    bgcolor: alpha(theme.palette.success.main, 0.2),
                    transform: 'scale(1.1)',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                <DownloadIcon />
              </IconButton>
            }
          >
            <ListItemIcon>
              <Avatar sx={{ bgcolor: alpha(theme.palette.info.main, 0.1), color: theme.palette.info.main }}>
                <DescriptionIcon />
              </Avatar>
            </ListItemIcon>
            <ListItemText 
              primary={<Typography sx={{ fontWeight: 600 }}>{anexo.name}</Typography>}
              secondary={anexo.descripcion || `${(anexo.size / 1024).toFixed(2)} KB`} 
            />
          </ListItem>
        ))}
      </List>
      <DescriptionModal
        open={isDescriptionModalOpen}
        onClose={() => setIsDescriptionModalOpen(false)}
        onConfirm={handleDescriptionConfirm}
        defaultValue={currentFileToUpload?.name || ''} // Optional: pre-fill with filename
      />
    </Box>
  );
};

const GlassAccordion = ({ title, icon: Icon, children, defaultExpanded = false }) => {
  const theme = useTheme();
  return (
    <Accordion 
      defaultExpanded={defaultExpanded}
      sx={{
        background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.5)} 0%, ${alpha(theme.palette.background.paper, 0.2)} 100%)`,
        backdropFilter: 'blur(20px)',
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        borderRadius: '12px !important',
        mb: 2,
        '&:before': { display: 'none' },
        boxShadow: `0 4px 16px ${alpha(theme.palette.common.black, 0.08)}`,
        transition: 'all 0.3s ease',
        '&:hover': {
          border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
          transform: 'translateY(-2px)',
          boxShadow: `0 8px 24px ${alpha(theme.palette.common.black, 0.12)}`,
        }
      }}
    >
      <AccordionSummary 
        expandIcon={<ExpandMoreIcon />}
        sx={{
          borderRadius: '12px',
          '&.Mui-expanded': {
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          }
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          {Icon && (
            <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main, width: 36, height: 36 }}>
              <Icon sx={{ fontSize: 20 }} />
            </Avatar>
          )}
          <Typography sx={{ fontWeight: 700, fontSize: '1.1rem' }}>{title}</Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 2 }}>
        {children}
      </AccordionDetails>
    </Accordion>
  );
};

const InsolvenciaDetails = ({ solicitud, onUploadSuccess }) => {
  const theme = useTheme();
  const gastos = solicitud.informacionFinanciera?.gastosPersonales || {};

  const gastosConfig = {
    alimentacion: { label: 'Alimentación', icon: FoodBank },
    salud: { label: 'Salud', icon: LocalHospital },
    arriendo: { label: 'Arriendo', icon: Home },
    serviciosPublicos: { label: 'Servicios Públicos', icon: Receipt },
    educacion: { label: 'Educación', icon: School },
    transporte: { label: 'Transporte', icon: DirectionsCar },
    conservacionBienes: { label: 'Conservación de Bienes', icon: Shield },
    cuotaLeasingHabitacional: { label: 'Leasing Habitacional', icon: HomeWork },
    arriendoOficina: { label: 'Arriendo Oficina', icon: Business },
    cuotaSeguridadSocial: { label: 'Seguridad Social', icon: Security },
    cuotaAdminPropiedadHorizontal: { label: 'Admin. Prop. Horizontal', icon: HomeWork },
    cuotaLeasingVehiculo: { label: 'Leasing Vehículo', icon: DirectionsCar },
    cuotaLeasingOficina: { label: 'Leasing Oficina', icon: Business },
    seguros: { label: 'Seguros', icon: Shield },
    vestuario: { label: 'Vestuario', icon: ShoppingCart },
    recreacion: { label: 'Recreación', icon: SportsEsports },
    gastosPersonasCargo: { label: 'Personas a Cargo', icon: Wc },
    gastosProcedimientoInsolvencia: { label: 'Gastos del Procedimiento', icon: Gavel },
    otros: { label: 'Otros', icon: AttachMoney }
  };

  const totalGastos = Object.values(gastos).reduce((sum, value) => sum + (Number(value) || 0), 0);
  
  return (
    <Box sx={{ p: 3 }}>
      <GlassAccordion title="Causas" icon={Gavel} defaultExpanded>
        <Stack spacing={2}>
          {solicitud.causas?.lista.map((c, i) => (
            <Box 
              key={i}
              sx={{ 
                p: 2, 
                borderRadius: 2,
                background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.05)} 0%, transparent 100%)`,
                border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: theme.palette.info.main, mb: 1 }}>
                {c.tipoCausa}
              </Typography>
              <Typography variant="body2">{c.descripcionCausa}</Typography>
            </Box>
          ))}
        </Stack>
      </GlassAccordion>

      <GlassAccordion title="Bienes Muebles" icon={DirectionsCar}>
        <Stack spacing={2}>
          {solicitud.bienesMuebles?.map((b, i) => (
            <Box 
              key={i}
              sx={{ 
                p: 2, 
                borderRadius: 2,
                background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.05)} 0%, transparent 100%)`,
                border: `1px solid ${alpha(theme.palette.success.main, 0.1)}`,
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>{b.clasificacion} - {b.descripcion}</Typography>
                  <Typography variant="body2" color="text.secondary">Marca: {b.marca}</Typography>
                </Box>
                <Chip 
                  label={`$${b.avaluoComercial?.toLocaleString()}`}
                  color="success"
                  sx={{ fontWeight: 700 }}
                />
              </Stack>
            </Box>
          ))}
        </Stack>
      </GlassAccordion>

      <GlassAccordion title="Bienes Inmuebles" icon={HomeWork}>
        <Stack spacing={2}>
          {solicitud.bienesInmuebles?.map((b, i) => (
            <Box 
              key={i}
              sx={{ 
                p: 2, 
                borderRadius: 2,
                background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.05)} 0%, transparent 100%)`,
                border: `1px solid ${alpha(theme.palette.warning.main, 0.1)}`,
              }}
            >
              <Typography sx={{ fontWeight: 700 }}>{b.descripcion}</Typography>
              <Typography variant="body2" color="text.secondary">Matrícula: {b.matriculaInmobiliaria}</Typography>
            </Box>
          ))}
        </Stack>
      </GlassAccordion>

      <GlassAccordion title="Procesos Judiciales" icon={Balance}>
        <Stack spacing={2}>
          {solicitud.informacionFinanciera?.procesosJudiciales?.map((p, i) => (
            <Box 
              key={i}
              sx={{ 
                p: 2, 
                borderRadius: 2,
                background: `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.05)} 0%, transparent 100%)`,
                border: `1px solid ${alpha(theme.palette.error.main, 0.1)}`,
              }}
            >
              <Typography sx={{ fontWeight: 700 }}>{p.tipoProceso}</Typography>
              <Typography variant="body2">vs {p.demandado}</Typography>
            </Box>
          ))}
        </Stack>
      </GlassAccordion>

      <GlassAccordion title="Obligaciones Alimentarias" icon={FamilyRestroom}>
        <Stack spacing={2}>
          {solicitud.informacionFinanciera?.obligacionesAlimentarias?.map((o, i) => (
            <Box 
              key={i}
              sx={{ 
                p: 2, 
                borderRadius: 2,
                background: `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.05)} 0%, transparent 100%)`,
                border: `1px solid ${alpha(theme.palette.secondary.main, 0.1)}`,
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography sx={{ fontWeight: 700 }}>{o.beneficiario}</Typography>
                <Chip 
                  label={`$${o.cuantia?.toLocaleString()}`}
                  color="secondary"
                  sx={{ fontWeight: 700 }}
                />
              </Stack>
            </Box>
          ))}
        </Stack>
      </GlassAccordion>

      <GlassAccordion title={`Gastos de Subsistencia (Total: $${totalGastos.toLocaleString()})`} icon={FoodBank}>
        <Grid container spacing={2}>
            <Grid item xs={12}>
                <GlassCard sx={{ 
                    background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.15)} 0%, ${alpha(theme.palette.info.main, 0.15)} 100%)`,
                    border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                    textAlign: 'center'
                }}>
                    <CardContent>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.secondary' }}>Total de Gastos Mensuales</Typography>
                        <Typography variant="h4" sx={{ fontWeight: 800, color: theme.palette.success.dark }}>
                            ${totalGastos.toLocaleString()}
                        </Typography>
                    </CardContent>
                </GlassCard>
            </Grid>
          {Object.entries(gastos).map(([key, value]) => 
            value != null && !key.startsWith('_') && (
              <DetailItem 
                key={key} 
                label={gastosConfig[key]?.label || key}
                value={`$${Number(value).toLocaleString()}`}
                icon={gastosConfig[key]?.icon}
              />
            )
          )}
        </Grid>
      </GlassAccordion>

      <GlassAccordion title="Propuesta de Pago" icon={AttachMoney}>
        <Grid container spacing={2}>
            <DetailItem label="Tipo de Negociación" value={solicitud.propuestaPago?.tipoNegociacion} icon={Handshake}/>
            <DetailItem label="Forma de Pago" value={solicitud.propuestaPago?.formaPago} icon={Receipt} />
            <DetailItem label="Plazo (meses)" value={solicitud.propuestaPago?.plazo} icon={Timeline}/>
            <DetailItem label="Interés E.A." value={`${solicitud.propuestaPago?.interesEA || 0}%`} icon={TrendingUpIcon}/>
            <DetailItem label="Fecha de Inicio" value={solicitud.propuestaPago?.fechaInicioPago ? new Date(solicitud.propuestaPago.fechaInicioPago).toLocaleDateString('es-CO') : 'N/A'} icon={Event}/>
            <DetailItem label="Día de Pago" value={solicitud.propuestaPago?.diaPago} icon={Today}/>
        </Grid>
        
        {(solicitud.propuestaPago?.descripcion || solicitud.propuestaPago?.descripcionProyeccion) && (
            <Box sx={{ mt: 2, p: 2, borderRadius: 2, background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.05)} 0%, transparent 100%)`, border: `1px solid ${alpha(theme.palette.info.main, 0.1)}` }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: theme.palette.info.main, mb: 1 }}>
                    Descripción de la propuesta
                </Typography>
                <Typography variant="body2">
                    {solicitud.propuestaPago.descripcion || solicitud.propuestaPago.descripcionProyeccion}
                </Typography>
            </Box>
        )}

        {solicitud.propuestaPago?.tipoNegociacion === 'proyeccion' && solicitud.projectionData && solicitud.projectionData.length > 0 && (
            <Box sx={{ mt: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Tabla de Proyección de Pagos</Typography>
                <TableContainer component={Paper} sx={{
                    borderRadius: 2,
                    background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.6)} 0%, ${alpha(theme.palette.background.paper, 0.3)} 100%)`,
                    border: `1px solid ${alpha(theme.palette.divider, 0.15)}`,
                }}>
                    <Table size="small">
                        <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>#</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Fecha</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Monto Pago</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Capital</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Interés</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Saldo Capital</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {solicitud.projectionData.map((row) => (
                                <TableRow key={row.pagoNo} sx={{ '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.03) } }}>
                                    <TableCell>{row.pagoNo}</TableCell>
                                    <TableCell>{row.fecha}</TableCell>
                                    <TableCell align="right">{row.montoPago}</TableCell>
                                    <TableCell align="right">{row.pagoCapital}</TableCell>
                                    <TableCell align="right">{row.pagoInteres}</TableCell>
                                    <TableCell align="right">{row.saldoFinalCapital}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        )}
      </GlassAccordion>

      <GlassAccordion title="Documentos/Anexos" icon={Folder} defaultExpanded>
        <AnexosSection 
          anexos={solicitud.anexos} 
          solicitudId={solicitud._id} 
          tipoSolicitud={solicitud.tipoSolicitud} 
          onUploadSuccess={onUploadSuccess} 
        />
      </GlassAccordion>
    </Box>
  );
};

const ConciliacionDetails = ({ solicitud, onUploadSuccess }) => {
  const theme = useTheme();
  return (
    <Box sx={{ p: 3 }}>
      <GlassAccordion title="Hechos" icon={FactCheck} defaultExpanded>
        <Stack spacing={2}>
          {solicitud.hechos?.map((h, i) => (
            <Box 
              key={i}
              sx={{ 
                p: 2, 
                borderRadius: 2,
                background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.05)} 0%, transparent 100%)`,
                border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
              }}
            >
              <Typography dangerouslySetInnerHTML={{ __html: h.descripcion }} />
            </Box>
          ))}
        </Stack>
      </GlassAccordion>

      <GlassAccordion title="Pretensiones" icon={Handshake} defaultExpanded>
        <Stack spacing={2}>
          {solicitud.pretensiones?.map((p, i) => (
            <Box 
              key={i}
              sx={{ 
                p: 2, 
                borderRadius: 2,
                background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.05)} 0%, transparent 100%)`,
                border: `1px solid ${alpha(theme.palette.success.main, 0.1)}`,
              }}
            >
              <Typography dangerouslySetInnerHTML={{ __html: p.descripcion }} />
            </Box>
          ))}
        </Stack>
      </GlassAccordion>

      <GlassAccordion title="Documentos/Anexos" icon={Folder} defaultExpanded>
        <AnexosSection 
          anexos={solicitud.anexos} 
          solicitudId={solicitud._id} 
          tipoSolicitud={solicitud.tipoSolicitud} 
          onUploadSuccess={onUploadSuccess} 
        />
      </GlassAccordion>
    </Box>
  )
};

const EnhancedTable = ({ table, isLoading, solicitudesData, navigate, onDownload, onOpenModal, onUploadSuccess }) => {
  const theme = useTheme();

  return (
    <GlassCard>
      <TableContainer sx={{ borderRadius: 3 }}>
        <Table>
          <TableHead>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableCell 
                    key={header.id} 
                    onClick={header.column.getToggleSortingHandler()}
                    colSpan={header.colSpan}
                    sx={{ 
                      py: 2,
                      bgcolor: alpha(theme.palette.primary.main, 0.02),
                      borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                      cursor: header.column.getCanSort() ? 'pointer' : 'default',
                      '&:hover': header.column.getCanSort() ? {
                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                      } : {}
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </Typography>
                      {header.column.getCanSort() && (
                        <Box sx={{ 
                          display: 'flex', 
                          flexDirection: 'column',
                          opacity: header.column.getIsSorted() ? 1 : 0.3,
                          transition: 'opacity 0.2s ease'
                        }}>
                          {{ 
                            asc: <ArrowUpward fontSize="small" sx={{ color: theme.palette.primary.main }} />, 
                            desc: <ArrowDownward fontSize="small" sx={{ color: theme.palette.primary.main }} /> 
                          }[header.column.getIsSorted()] ?? 
                          <Stack spacing={-0.5}>
                            <ArrowUpward fontSize="small" />
                            <ArrowDownward fontSize="small" />
                          </Stack>
                          }
                        </Box>
                      )}
                    </Stack>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={table.getHeaderGroups()[0].headers.length} align="center" sx={{ py: 8 }}>
                  <Stack alignItems="center" spacing={2}>
                    <CircularProgress size={40} thickness={4} />
                    <Typography variant="body2" color="text.secondary">
                      Cargando datos...
                    </Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={table.getHeaderGroups()[0].headers.length} align="center" sx={{ py: 8 }}>
                  <Stack alignItems="center" spacing={2}>
                    <AssignmentIcon sx={{ fontSize: 48, color: theme.palette.text.disabled }} />
                    <Typography variant="h6" color="text.secondary">
                      No se encontraron registros
                    </Typography>
                    <Typography variant="body2" color="text.disabled">
                      Intenta ajustar los filtros de búsqueda
                    </Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <Fragment key={row.id}>
                    <TableRow 
                      sx={{ 
                        '& > td': { borderBottom: 'unset' },
                        '&:hover': { 
                          bgcolor: alpha(theme.palette.primary.main, 0.02),
                        },
                      }}
                    >
                    {row.getVisibleCells().map(cell => (
                      <TableCell 
                        key={cell.id}
                        sx={{ 
                          py: 2,
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                    </TableRow>
                    {row.getIsExpanded() && (
                        <TableRow>
                            <TableCell colSpan={row.getVisibleCells().length} sx={{ p: 0 }}>
                                {row.original.tipoSolicitud.startsWith('Solicitud de Insolvencia') ?
                                    <InsolvenciaDetails solicitud={row.original} onUploadSuccess={onUploadSuccess} /> :
                                    <ConciliacionDetails solicitud={row.original} onUploadSuccess={onUploadSuccess} />
                                }
                            </TableCell>
                        </TableRow>
                    )}
                </Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Enhanced Pagination */}
      <Divider />
      <TablePagination
          component="div"
          count={solicitudesData?.totalRows ?? 0}
          page={table.getState().pagination.pageIndex}
          onPageChange={(e, newPage) => table.setPageIndex(newPage)}
          rowsPerPage={table.getState().pagination.pageSize}
          onRowsPerPageChange={(e) => table.setPageSize(parseInt(e.target.value, 10))}
          rowsPerPageOptions={[5, 10, 20, 50]}
          labelRowsPerPage="Filas por página:"
          labelDisplayedRows={({ from, to, count }) => 
            `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
          }
          sx={{
            borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
            '& .MuiTablePagination-actions': {
              '& button': {
                borderRadius: 2,
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                }
              }
            }
          }}
        />
    </GlassCard>
  );
};

function TabPanel(props) {
  const { children, value, index } = props;
  return (
    <div hidden={value !== index}>
      {value === index && (
        <Fade in={value === index} timeout={300}>
          <Box sx={{ pt: 3 }}>
            {children}
          </Box>
        </Fade>
      )}
    </div>
  );
}

const DescriptionModal = ({ open, onClose, onConfirm, defaultValue = '' }) => {
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
    <GlassModal open={open} onClose={handleClose} title="Añadir Descripción al Anexo">
      <Stack spacing={2}>
        <Typography>Por favor, ingrese una breve descripción para el documento que está a punto de subir.</Typography>
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
        <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ pt: 2 }}>
          <Button onClick={handleClose} color="inherit">
            Cancelar
          </Button>
          <Button onClick={handleConfirm} variant="contained" color="primary">
            Confirmar
          </Button>
        </Stack>
      </Stack>
    </GlassModal>
  );
};

// --- Main Component ---
const AdminPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [tabIndex, setTabIndex] = useState(1);
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [localFilters, setLocalFilters] = useState({ tipoSolicitud: '', user: '' });
  const [refreshKey] = useState(0);
  const debouncedLocalFilters = useDebounce(localFilters, 500);
  const [expanded, setExpanded] = useState({});

  const [modalState, setModalState] = useState({
      open: false,
      type: null, // 'deudor', 'acreedores', 'convocantes', 'convocados'
      data: null
  });


  const handleOpenModal = (type, data) => setModalState({ open: true, type, data });
  const handleCloseModal = () => setModalState({ open: false, type: null, data: null });

  const handleDownload = async (solicitudId, tipoSolicitud, format, anexo = null) => {
    const toastId = toast.loading(`Descargando documento ${format.toUpperCase()}, por favor espere...`);
    try {
      if (tipoSolicitud === 'Solicitud de Conciliación Unificada') {
        await downloadConciliacionDocument(solicitudId, format, anexo);
      } else {
        await downloadSolicitudDocument(solicitudId, format, anexo);
      }
      toast.update(toastId, { 
        render: "¡Descarga Completada!", 
        type: "success", 
        isLoading: false, 
        autoClose: 5000 
      });
    } catch (error) {
      toast.dismiss(toastId);
      handleAxiosError(error, `Error al descargar el documento ${format.toUpperCase()}.`);
    }
  };

  useEffect(() => {
    const filters = Object.entries(debouncedLocalFilters)
      .filter(([, value]) => value !== '')
      .map(([id, value]) => ({ id, value }));
    setColumnFilters(filters);
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }, [debouncedLocalFilters]);

  const { data: stats, isLoading: isLoadingStats, isError: isErrorStats, refetch: refetchStats } = useQuery({ 
    queryKey: ['adminStats', refreshKey], 
    queryFn: getAdminStats,
    staleTime: 30000,
  });

  const queryKey = useMemo(() => 
    ['adminSolicitudes', pagination, columnFilters, sorting, refreshKey], 
    [pagination, columnFilters, sorting, refreshKey]
  );

  const { 
    data: solicitudesData, 
    isLoading: isLoadingSolicitudes, 
    isError: isErrorSolicitudes,
    refetch: refetchSolicitudes,
  } = useQuery({ 
    queryKey: queryKey, 
    queryFn: async () => {
      const data = await getAdminSolicitudes({ 
        pageIndex: pagination.pageIndex, 
        pageSize: pagination.pageSize, 
        filters: JSON.stringify(columnFilters), 
        sorting: JSON.stringify(sorting) 
      });
      return data;
    },
    enabled: tabIndex === 1,
    keepPreviousData: true,
    staleTime: 10000,
  });

  const onUploadSuccess = () => {
    refetchSolicitudes();
  };


  const columns = useMemo(() => [
    {
        id: 'expander',
        header: () => null,
        cell: ({ row }) => (
            <IconButton size="small" onClick={() => row.toggleExpanded()}>
                {row.getIsExpanded() ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
            </IconButton>
        ),
    },
    { 
      accessorKey: 'createdAt', 
      header: 'Fecha', 
      cell: ({ getValue }) => new Date(getValue()).toLocaleDateString()
    },
    { 
      accessorKey: 'user.name', 
      header: 'Usuario', 
      cell: ({ getValue }) => (
        <Stack direction="row" alignItems="center" spacing={1}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
            {(getValue() || 'N')[0]}
          </Avatar>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {getValue() || 'N/A'}
          </Typography>
        </Stack>
      )
    },
    { 
      accessorKey: 'tipoSolicitud', 
      header: 'Tipo',
      cell: ({ getValue }) => {
        const isI = getValue().startsWith("Solicitud de Insolvencia");
        return <Chip label={isI ? "Insolvencia" : "Conciliación"} size="small" color={isI ? "error" : "primary"}/>
      }
    },
    {
        id: 'deudor',
        header: 'Deudor/a',
        cell: ({ row }) => {
            const { original } = row;
            if (original.tipoSolicitud.startsWith('Solicitud de Insolvencia')) {
                return <Button onClick={() => handleOpenModal('deudor', original.deudor)}>{original.deudor?.nombreCompleto}</Button>
            }
            return null;
        }
    },
    {
        id: 'acreedores',
        header: 'Acreedores',
        cell: ({ row }) => {
            const { original } = row;
            if (original.tipoSolicitud.startsWith('Solicitud de Insolvencia')) {
                return (
                    <IconButton onClick={() => handleOpenModal('acreedores', original.acreencias)}>
                        <GroupIcon />
                    </IconButton>
                );
            }
            return null;
        }
    },
    {
        id: 'convocantes',
        header: 'Convocantes',
        cell: ({ row }) => {
            const { original } = row;
            if (original.tipoSolicitud.startsWith('Solicitud de Conciliación')) {
                return (
                    <IconButton onClick={() => handleOpenModal('convocantes', original.convocantes)}>
                        <PeopleIcon />
                    </IconButton>
                );
            }
            return null;
        }
    },
    {
        id: 'convocados',
        header: 'Convocados',
        cell: ({ row }) => {
            const { original } = row;
            if (original.tipoSolicitud.startsWith('Solicitud de Conciliación')) {
                return (
                    <IconButton onClick={() => handleOpenModal('convocados', original.convocados)}>
                        <PeopleIcon />
                    </IconButton>
                );
            }
            return null;
        }
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => {
        const { original } = row;
        return (
            <Stack direction="row" spacing={1}>
                {original.tipoSolicitud.startsWith('Solicitud de Insolvencia') && (
                    <Tooltip title="Editar Solicitud de Insolvencia">
                        <IconButton onClick={() => navigate(`/admin/editar-solicitud/${original._id}`)}><EditIcon /></IconButton>
                    </Tooltip>
                )}
                {original.tipoSolicitud.startsWith('Solicitud de Conciliación') && (
                    <Tooltip title="Editar Solicitud de Conciliación">
                        <IconButton onClick={() => navigate(`/admin/editar-conciliacion/${original._id}`)}><EditIcon /></IconButton>
                    </Tooltip>
                )}
                <Tooltip title="Descargar PDF">
                    <IconButton onClick={() => handleDownload(original._id, original.tipoSolicitud, 'pdf')}><PictureAsPdf /></IconButton>
                </Tooltip>
                <Tooltip title="Descargar DOCX">
                    <IconButton onClick={() => handleDownload(original._id, original.tipoSolicitud, 'docx')}><DescriptionIcon /></IconButton>
                </Tooltip>
            </Stack>
        )
      }
    },
  ], [theme, navigate]);

  const table = useReactTable({
    data: solicitudesData?.rows ?? [],
    columns,
    pageCount: solicitudesData?.pageCount ?? -1,
    state: { pagination, sorting, columnFilters, expanded },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
  });

  const handleTabChange = (event, newValue) => setTabIndex(newValue);
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setLocalFilters(prev => ({...prev, [name]: value}));
  };

  const handleRefresh = () => {
    if (tabIndex === 0) {
      refetchStats();
    }
    if (tabIndex === 1) {
      refetchSolicitudes();
    }
  };

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
      <Container maxWidth="xl" sx={{ py: 4, position: 'relative', zIndex: 1 }}>
        <Stack spacing={4}>
          {/* Enhanced Header */}
          <Slide in={true} direction="down" timeout={600}>
            <GlassCard hover={false} sx={{ mb: 2 }}>
              <CardContent sx={{ p: 4 }}>
                <Grid container alignItems="center" justifyContent="space-between">
                  <Grid item>
                    <Stack direction="row" alignItems="center" spacing={3}>
                      <Avatar 
                        sx={{ 
                          width: 64, 
                          height: 64, 
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          color: theme.palette.primary.main,
                          border: `3px solid ${alpha(theme.palette.primary.main, 0.2)}`
                        }}
                      >
                        <DashboardIcon sx={{ fontSize: 32 }} />
                      </Avatar>
                      <Box>
                        <Typography 
                          variant="h4" 
                          component="h1" 
                          sx={{ 
                            fontWeight: 800,
                            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            color: 'transparent',
                            mb: 0.5,
                            fontFamily: '"Inter", "Roboto", sans-serif'
                          }}
                        >
                          Panel de Control Administrativo
                        </Typography>
                        <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
                          Gestión inteligente de solicitudes y análisis en tiempo real
                        </Typography>
                      </Box>
                    </Stack>
                  </Grid>
                  <Grid item>
                    <Stack direction="row" spacing={2}>
                      <Button
                        variant="outlined"
                        startIcon={<Refresh />}
                        onClick={handleRefresh}
                        sx={{
                          borderRadius: 3,
                          textTransform: 'none',
                          fontWeight: 600,
                          borderColor: alpha(theme.palette.primary.main, 0.3),
                          '&:hover': {
                            borderColor: theme.palette.primary.main,
                            bgcolor: alpha(theme.palette.primary.main, 0.05),
                            transform: 'translateY(-2px)',
                          },
                          transition: 'all 0.3s ease'
                        }}
                      >
                        Actualizar
                      </Button>
                    </Stack>
                  </Grid>
                </Grid>
              </CardContent>
            </GlassCard>
          </Slide>

          {/* Enhanced Tabs */}
          <GlassCard hover={false}>
            <Tabs 
              value={tabIndex} 
              onChange={handleTabChange} 
              variant="fullWidth"
              sx={{ 
                px: 2,
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '1rem',
                  minHeight: 64,
                  borderRadius: 3,
                  margin: '8px 4px',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    transform: 'translateY(-2px)',
                  },
                  '&.Mui-selected': {
                    bgcolor: alpha(theme.palette.primary.main, 0.12),
                    color: theme.palette.primary.main,
                  }
                },
                '& .MuiTabs-indicator': {
                  height: 3,
                  borderRadius: 3,
                  background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                }
              }}
            >
              <Tab 
                icon={<DashboardIcon />} 
                iconPosition="start" 
                label="Dashboard" 
              />
              <Tab 
                icon={
                  <Badge 
                    badgeContent={solicitudesData?.totalRows || 0} 
                    color="secondary"
                    max={999}
                  >
                    <HistoryIcon />
                  </Badge>
                } 
                iconPosition="start" 
                label="Historial Detallado" 
              />
            </Tabs>
          </GlassCard>

          {/* Tab Content */}
          <TabPanel value={tabIndex} index={0}>
            {isLoadingStats && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <Stack alignItems="center" spacing={2}>
                  <CircularProgress size={60} thickness={4} />
                  <Typography variant="h6" color="text.secondary">
                    Cargando estadísticas...
                  </Typography>
                </Stack>
              </Box>
            )}
            {isErrorStats && (
              <Alert 
                severity="error" 
                sx={{ 
                  borderRadius: 3,
                  bgcolor: alpha(theme.palette.error.main, 0.1),
                  border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`
                }}
              >
                Error al cargar las estadísticas. Intenta actualizar la página.
              </Alert>
            )}
            {stats && <EnhancedDashboard stats={stats} />}
          </TabPanel>

          <TabPanel value={tabIndex} index={1}>
            <Stack spacing={3}>
              {/* Enhanced Filters */}
              <GlassCard>
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Avatar sx={{ bgcolor: alpha(theme.palette.info.main, 0.1), color: theme.palette.info.main }}>
                        <FilterList />
                      </Avatar>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Filtros Avanzados
                      </Typography>
                    </Stack>
                    <Chip 
                      label={`${solicitudesData?.totalRows || 0} registros`}
                      color="primary"
                      variant="outlined"
                    />
                  </Stack>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <TextField 
                        name="user" 
                        label="Buscar por Usuario" 
                        value={localFilters.user} 
                        onChange={handleFilterChange} 
                        variant="outlined" 
                        fullWidth
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Search color="action" />
                            </InputAdornment>
                          ),
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
                            }
                          }
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField 
                        name="tipoSolicitud" 
                        label="Buscar por Tipo de Solicitud" 
                        value={localFilters.tipoSolicitud} 
                        onChange={handleFilterChange} 
                        variant="outlined" 
                        fullWidth
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <CategoryIcon color="action" />
                            </InputAdornment>
                          ),
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
                            }
                          }
                        }}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </GlassCard>

              {/* Enhanced Table */}
              <EnhancedTable 
                table={table} 
                isLoading={isLoadingSolicitudes} 
                solicitudesData={solicitudesData}
                navigate={navigate}
                onDownload={handleDownload}
                onOpenModal={handleOpenModal}
                onUploadSuccess={onUploadSuccess}
              />

              {isErrorSolicitudes && (
                <Alert 
                  severity="error"
                  sx={{ 
                    borderRadius: 3,
                    bgcolor: alpha(theme.palette.error.main, 0.1),
                    border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`
                  }}
                >
                  Error al cargar las solicitudes. Verifica tu conexión e intenta nuevamente.
                </Alert>
              )}
            </Stack>
          </TabPanel>
        </Stack>
        <DeudorModal open={modalState.type === 'deudor'} onClose={handleCloseModal} deudor={modalState.type === 'deudor' ? modalState.data : null} />
        <AcreedoresModal open={modalState.type === 'acreedores'} onClose={handleCloseModal} acreedores={modalState.type === 'acreedores' ? modalState.data : []} />
        <InvolucradosModal open={modalState.type === 'convocantes'} onClose={handleCloseModal} involucrados={modalState.type === 'convocantes' ? modalState.data : []} title="Convocantes" />
        <InvolucradosModal open={modalState.type === 'convocados'} onClose={handleCloseModal} involucrados={modalState.type === 'convocados' ? modalState.data : []} title="Convocados" />
      </Container>
    </Box>
  );
};

export default AdminPage;
