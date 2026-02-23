import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAcreedores, deleteAcreedor } from '../services/acreedorService';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button,
  Typography, Box, TextField, Stack, CircularProgress, Alert, IconButton, TablePagination,
  CardContent, Avatar, Container, Tooltip, Chip, Fade, Grow, Slide, Grid,
  InputAdornment, Dialog, DialogTitle, DialogContent, DialogActions, useTheme, alpha,
  Divider
} from '@mui/material';
import { Link } from 'react-router-dom';
import { useDebounce } from '../hooks/useDebounce';
import {
  Edit, Delete, ArrowUpward, ArrowDownward, Add, Search, FilterList,
  Person as PersonIcon, Business as BusinessIcon, Email as EmailIcon,
  LocationOn as LocationIcon, Badge as BadgeIcon, Refresh, GetApp,
  Warning, CheckCircle
} from '@mui/icons-material';
import * as XLSX from 'xlsx';

import GlassCard from '../components/common/GlassCard';

// Delete Confirmation Dialog Component
const DeleteConfirmDialog = ({ open, acreedor, onClose, onConfirm, isDeleting }) => {
  const theme = useTheme();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.paper, 0.8)} 100%)`,
          backdropFilter: 'blur(20px)',
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Avatar sx={{ bgcolor: alpha(theme.palette.error.main, 0.1), color: theme.palette.error.main }}>
            <Warning />
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Confirmar Eliminación
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Esta acción no se puede deshacer
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Alert 
          severity="warning" 
          sx={{ 
            mb: 2,
            borderRadius: 2,
            bgcolor: alpha(theme.palette.warning.main, 0.1),
            border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`
          }}
        >
          ¿Estás seguro de que quieres eliminar al acreedor{' '}
          <strong>{acreedor?.nombre}</strong>?
        </Alert>
        <Typography variant="body2" color="text.secondary">
          Se eliminarán todos los datos asociados a este acreedor permanentemente.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button 
          onClick={onClose}
          variant="outlined"
          sx={{ borderRadius: 2 }}
        >
          Cancelar
        </Button>
        <Button 
          onClick={onConfirm}
          variant="contained"
          color="error"
          disabled={isDeleting}
          startIcon={isDeleting ? <CircularProgress size={16} /> : <Delete />}
          sx={{ borderRadius: 2 }}
        >
          {isDeleting ? 'Eliminando...' : 'Eliminar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Main Component
const AcreedoresListPage = () => {
  const theme = useTheme();
  const queryClient = useQueryClient();

  // State management
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [localFilters, setLocalFilters] = useState({ nombre: '', nitCc: '', ciudad: '' });
  const [refreshKey, setRefreshKey] = useState(0);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, acreedor: null });
  
  const debouncedLocalFilters = useDebounce(localFilters, 500);

  // Effect for filter management
  useEffect(() => {
    const filters = Object.entries(debouncedLocalFilters)
      .filter(([, value]) => value !== '')
      .map(([id, value]) => ({ id, value }));
    setColumnFilters(filters);
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }, [debouncedLocalFilters]);

  // Query key memoization
  const queryKey = useMemo(
    () => ['acreedores', pagination, columnFilters, sorting, refreshKey],
    [pagination, columnFilters, sorting, refreshKey]
  );

  // Data fetching
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKey,
    queryFn: () => getAcreedores({
      pageIndex: pagination.pageIndex,
      pageSize: pagination.pageSize,
      filters: JSON.stringify(columnFilters),
      sorting: JSON.stringify(sorting),
    }),
    keepPreviousData: true,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteAcreedor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acreedores'] });
      setDeleteDialog({ open: false, acreedor: null });
    },
  });

  // Effect to auto-hide success alert
  useEffect(() => {
    if (deleteMutation.isSuccess) {
      const timer = setTimeout(() => {
        deleteMutation.reset();
      }, 3000); // 3 seconds
      return () => clearTimeout(timer);
    }
  }, [deleteMutation, deleteMutation.isSuccess, deleteMutation.reset]);

  // Utility functions
  const getDocTypeInfo = useCallback((tipoDoc) => {
    const types = {
      'CC': { label: 'C.C', color: theme.palette.primary.main, icon: PersonIcon },
      'NIT': { label: 'NIT', color: theme.palette.secondary.main, icon: BusinessIcon },
      'CE': { label: 'C.E', color: theme.palette.info.main, icon: BadgeIcon },
      'default': { label: tipoDoc, color: theme.palette.grey[600], icon: BadgeIcon }
    };
    return types[tipoDoc] || types.default;
  }, [theme.palette.primary.main, theme.palette.secondary.main, theme.palette.info.main, theme.palette.grey]);

  // Table columns definition
  const columns = useMemo(() => [
    { 
      accessorKey: 'nombre', 
      header: 'Acreedor',
      cell: ({ getValue, row }) => (
        <Stack direction="row" alignItems="center" spacing={2}>
          <Avatar 
            sx={{ 
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.main,
              width: 40,
              height: 40,
              fontWeight: 600
            }}
          >
            {getValue()?.charAt(0)?.toUpperCase() || 'A'}
          </Avatar>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
              {getValue() || 'Sin nombre'}
            </Typography>
          </Box>
        </Stack>
      )
    },
    { 
      accessorKey: 'tipoDoc', 
      header: 'Tipo Doc.',
      cell: ({ getValue }) => {
        const docInfo = getDocTypeInfo(getValue());
        return (
          <Chip 
            icon={<docInfo.icon />}
            label={docInfo.label}
            size="small"
            sx={{ 
              bgcolor: alpha(docInfo.color, 0.1),
              color: docInfo.color,
              fontWeight: 600,
              borderRadius: 2
            }}
          />
        );
      }
    },
    { 
      accessorKey: 'nitCc', 
      header: 'No. Documento',
      cell: ({ getValue }) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
          {getValue() || 'N/A'}
        </Typography>
      )
    },
    { 
      accessorKey: 'ciudad', 
      header: 'Ciudad',
      cell: ({ getValue }) => (
        <Stack direction="row" alignItems="center" spacing={1}>
          <LocationIcon 
            fontSize="small" 
            sx={{ color: theme.palette.info.main }} 
          />
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {getValue() || 'No especificada'}
          </Typography>
        </Stack>
      )
    },
    { 
      accessorKey: 'email', 
      header: 'Email',
      cell: ({ getValue }) => (
        <Stack direction="row" alignItems="center" spacing={1}>
          <EmailIcon 
            fontSize="small" 
            sx={{ color: theme.palette.secondary.main }} 
          />
          <Typography 
            variant="body2" 
            sx={{ 
              fontWeight: 500,
              maxWidth: 200,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {getValue() || 'Sin email'}
          </Typography>
        </Stack>
      )
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => (
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Tooltip title="Editar acreedor">
            <IconButton
              component={Link}
              to={`/acreedores/editar/${row.original._id}`}
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
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar acreedor">
            <IconButton
              onClick={() => setDeleteDialog({ open: true, acreedor: row.original })}
              disabled={deleteMutation.isLoading}
              sx={{
                bgcolor: alpha(theme.palette.error.main, 0.1),
                color: theme.palette.error.main,
                '&:hover': {
                  bgcolor: alpha(theme.palette.error.main, 0.2),
                  transform: 'scale(1.1)',
                },
                '&:disabled': {
                  bgcolor: alpha(theme.palette.grey[400], 0.1),
                  color: theme.palette.grey[400],
                },
                transition: 'all 0.2s ease'
              }}
            >
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ], [theme.palette.primary.main, theme.palette.info.main, 
    theme.palette.secondary.main, theme.palette.error.main, 
    theme.palette.grey, getDocTypeInfo, deleteMutation.isLoading]);

  // Table configuration
  const table = useReactTable({
    data: data?.rows ?? [],
    columns,
    pageCount: data?.pageCount ?? -1,
    state: {
      pagination,
      sorting,
      columnFilters,
    },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
  });

  // Event handlers
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setLocalFilters(prev => ({...prev, [name]: value}));
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const clearFilters = () => {
    setLocalFilters({ nombre: '', nitCc: '', ciudad: '' });
  };

  const handleDeleteConfirm = () => {
    if (deleteDialog.acreedor) {
      deleteMutation.mutate(deleteDialog.acreedor._id);
    }
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const allData = await getAcreedores({
        pageIndex: 0,
        pageSize: data?.totalRows || 1000,
        filters: JSON.stringify(columnFilters),
        sorting: JSON.stringify(sorting),
      });

      if (allData && allData.rows) {
        const dataToExport = allData.rows.map(acreedor => ({
          'Nombre o Razón Social': acreedor.nombre,
          'Tipo de Documento': acreedor.tipoDoc,
          'No. de Documento': acreedor.nitCc,
          'Email': acreedor.email,
          'Teléfono': acreedor.telefono,
          'Dirección': acreedor.direccion,
          'País': acreedor.pais,
          'Departamento': acreedor.departamento,
          'Ciudad': acreedor.ciudad,
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Acreedores');
        
        const cols = Object.keys(dataToExport[0] || {}).map(key => ({
          wch: key.length > 20 ? key.length : 20
        }));
        worksheet['!cols'] = cols;

        XLSX.writeFile(workbook, 'Lista_Acreedores.xlsx');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
    } finally {
      setIsExporting(false);
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
            <GlassCard hover={false}>
              <CardContent sx={{ p: 4 }}>
                <Grid container alignItems="center" justifyContent="space-between">
                  <Grid item xs={12} md={8}>
                    <Stack direction="row" alignItems="center" spacing={3}>
                      <Avatar 
                        sx={{ 
                          width: 64, 
                          height: 64, 
                          bgcolor: alpha(theme.palette.secondary.main, 0.1),
                          color: theme.palette.secondary.main,
                          border: `3px solid ${alpha(theme.palette.secondary.main, 0.2)}`
                        }}
                      >
                        <PersonIcon sx={{ fontSize: 32 }} />
                      </Avatar>
                      <Box>
                        <Typography 
                          variant="h4" 
                          component="h1" 
                          sx={{ 
                            fontWeight: 800,
                            background: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.primary.main} 100%)`,
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            color: 'transparent',
                            mb: 0.5,
                            fontFamily: '"Inter", "Roboto", sans-serif'
                          }}
                        >
                          Gestión de Acreedores
                        </Typography>
                        <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
                          Administra y consulta la información de todos los acreedores
                        </Typography>
                        <Chip 
                          label={`${data?.totalRows || 0} acreedores registrados`}
                          size="small"
                          sx={{ 
                            mt: 1,
                            bgcolor: alpha(theme.palette.info.main, 0.1),
                            color: theme.palette.info.main,
                            fontWeight: 600
                          }}
                        />
                      </Box>
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Stack direction="row" spacing={2} justifyContent={{ xs: 'flex-start', md: 'flex-end' }} sx={{ mt: { xs: 2, md: 0 } }}>
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
                      <Button
                        variant="contained"
                        component={Link}
                        to="/acreedores/nuevo"
                        startIcon={<Add />}
                        sx={{
                          borderRadius: 3,
                          textTransform: 'none',
                          fontWeight: 600,
                          background: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.primary.main} 100%)`,
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: theme.shadows[8],
                          },
                          transition: 'all 0.3s ease'
                        }}
                      >
                        Nuevo Acreedor
                      </Button>
                    </Stack>
                  </Grid>
                </Grid>
              </CardContent>
            </GlassCard>
          </Slide>

          {/* Enhanced Filters */}
          <Fade in={true} timeout={800}>
            <GlassCard>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar sx={{ bgcolor: alpha(theme.palette.info.main, 0.1), color: theme.palette.info.main }}>
                      <FilterList />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Filtros de Búsqueda
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Encuentra acreedores específicos usando los filtros
                      </Typography>
                    </Box>
                  </Stack>
                  <Button
                    variant="text"
                    onClick={clearFilters}
                    sx={{ 
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600
                    }}
                  >
                    Limpiar Filtros
                  </Button>
                </Stack>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <TextField 
                      name="nombre" 
                      label="Buscar por Nombre" 
                      value={localFilters.nombre} 
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
                  <Grid item xs={12} md={4}>
                    <TextField 
                      name="nitCc" 
                      label="Buscar por No. Documento" 
                      value={localFilters.nitCc} 
                      onChange={handleFilterChange} 
                      variant="outlined" 
                      fullWidth
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <BadgeIcon color="action" />
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
                  <Grid item xs={12} md={4}>
                    <TextField 
                      name="ciudad" 
                      label="Buscar por Ciudad" 
                      value={localFilters.ciudad} 
                      onChange={handleFilterChange} 
                      variant="outlined" 
                      fullWidth
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <LocationIcon color="action" />
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

                {/* Filter Summary */}
                {(localFilters.nombre || localFilters.nitCc || localFilters.ciudad) && (
                  <Box sx={{ mt: 3, pt: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                      Filtros activos:
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {localFilters.nombre && (
                        <Chip 
                          label={`Nombre: ${localFilters.nombre}`}
                          size="small"
                          onDelete={() => setLocalFilters(prev => ({ ...prev, nombre: '' }))}
                          sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}
                        />
                      )}
                      {localFilters.nitCc && (
                        <Chip 
                          label={`Documento: ${localFilters.nitCc}`}
                          size="small"
                          onDelete={() => setLocalFilters(prev => ({ ...prev, nitCc: '' }))}
                          sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.1) }}
                        />
                      )}
                      {localFilters.ciudad && (
                        <Chip 
                          label={`Ciudad: ${localFilters.ciudad}`}
                          size="small"
                          onDelete={() => setLocalFilters(prev => ({ ...prev, ciudad: '' }))}
                          sx={{ bgcolor: alpha(theme.palette.info.main, 0.1) }}
                        />
                      )}
                    </Stack>
                  </Box>
                )}
              </CardContent>
            </GlassCard>
          </Fade>

          {/* Error Alert */}
          {isError && (
            <Fade in={isError} timeout={300}>
              <Alert 
                severity="error"
                sx={{ 
                  borderRadius: 3,
                  bgcolor: alpha(theme.palette.error.main, 0.1),
                  border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                  '& .MuiAlert-icon': {
                    fontSize: '1.5rem'
                  }
                }}
                action={
                  <Button 
                    color="error" 
                    size="small" 
                    onClick={handleRefresh}
                    startIcon={<Refresh />}
                    sx={{ textTransform: 'none' }}
                  >
                    Reintentar
                  </Button>
                }
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Error al cargar los datos
                </Typography>
                <Typography variant="body2">
                  No se pudieron cargar los acreedores. Verifica tu conexión e intenta nuevamente.
                </Typography>
              </Alert>
            </Fade>
          )}

          {/* Enhanced Table */}
          <Grow in={true} timeout={1000}>
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
                        <TableCell colSpan={columns.length} align="center" sx={{ py: 8 }}>
                          <Stack alignItems="center" spacing={2}>
                            <CircularProgress size={40} thickness={4} />
                            <Typography variant="body2" color="text.secondary">
                              Cargando acreedores...
                            </Typography>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ) : table.getRowModel().rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={columns.length} align="center" sx={{ py: 8 }}>
                          <Stack alignItems="center" spacing={2}>
                            <PersonIcon sx={{ fontSize: 48, color: theme.palette.text.disabled }} />
                            <Typography variant="h6" color="text.secondary">
                              No se encontraron acreedores
                            </Typography>
                            <Typography variant="body2" color="text.disabled">
                              Intenta ajustar los filtros de búsqueda o agrega un nuevo acreedor
                            </Typography>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ) : (
                      table.getRowModel().rows.map((row) => (
                        <TableRow 
                          key={row.id} 
                          sx={{ 
                            '&:hover': { 
                              bgcolor: alpha(theme.palette.primary.main, 0.02),
                              transform: 'scale(1.001)',
                            },
                            '&:last-child td': { border: 0 },
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {row.getVisibleCells().map(cell => (
                            <TableCell 
                              key={cell.id}
                              sx={{ 
                                py: 2,
                                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`
                              }}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Enhanced Pagination */}
              <Divider />
              <Box sx={{ p: 2, bgcolor: alpha(theme.palette.background.default, 0.3) }}>
                <TablePagination
                  component="div"
                  count={data?.totalRows ?? 0}
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
              </Box>
            </GlassCard>
          </Grow>

          {/* Statistics Summary */}
          <Fade in={!!data} timeout={1200}>
            <GlassCard hover={false}>
              <CardContent sx={{ p: 3 }}>
                <Grid container spacing={3} alignItems="center">
                  <Grid item xs={12} md={8}>
                    <Stack direction="row" alignItems="center" spacing={3}>
                      <Avatar 
                        sx={{ 
                          bgcolor: alpha(theme.palette.success.main, 0.1),
                          color: theme.palette.success.main,
                          width: 48,
                          height: 48
                        }}
                      >
                        <BusinessIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                          Resumen de Acreedores
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Total de {data?.totalRows || 0} acreedores registrados en el sistema
                        </Typography>
                      </Box>
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Stack direction="row" spacing={2} justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
                      <Button
                        variant="outlined"
                        startIcon={isExporting ? <CircularProgress size={16} /> : <GetApp />}
                        onClick={handleExport}
                        disabled={isExporting || isLoading}
                        sx={{
                          borderRadius: 3,
                          textTransform: 'none',
                          fontWeight: 600,
                        }}
                      >
                        {isExporting ? 'Exportando...' : 'Exportar Lista'}
                      </Button>
                    </Stack>
                  </Grid>
                </Grid>
              </CardContent>
            </GlassCard>
          </Fade>

          {/* Success Message for Mutations */}
          {deleteMutation.isSuccess && (
            <Slide in={deleteMutation.isSuccess} direction="up" timeout={300}>
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
                  minWidth: 300,
                }}
                onClose={() => deleteMutation.reset()}
                icon={<CheckCircle />}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Acreedor eliminado exitosamente
                </Typography>
              </Alert>
            </Slide>
          )}
        </Stack>
      </Container>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialog.open}
        acreedor={deleteDialog.acreedor}
        onClose={() => setDeleteDialog({ open: false, acreedor: null })}
        onConfirm={handleDeleteConfirm}
        isDeleting={deleteMutation.isLoading}
      />
    </Box>
  );
};

export default AcreedoresListPage;