import React, { useState } from 'react';
import {
  Button, Typography, Box, Stack, Avatar, IconButton, CircularProgress, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, useTheme, alpha, List, Paper
} from '@mui/material';
import {
  Description as DescriptionIcon,
  Close as CloseIcon,
  UploadFile as UploadFileIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { uploadFile, downloadFile } from '../../services/fileStorageService';
import { showSuccess, handleAxiosError } from '../../utils/alert';
import { toast } from 'react-toastify';
import { uploadArchiverAnexo } from '../../services/archiverService';

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

const GlassCard = ({ children, sx = {}, hover = true, ...props }) => { // Re-defining GlassCard for self-containment
  const [, setIsHovered] = useState(false);

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

export const ArchiverAnexosSection = ({ anexos, archiverEntryId, onUploadSuccess }) => {
  const theme = useTheme();
  const fileInputRef = React.useRef(null);
  const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState(false);
  const [currentFileToUpload, setCurrentFileToUpload] = useState(null);
  const [uploadingAnexo, setUploadingAnexo] = useState(false);

  const handleFileSelect = (event) => {
      const file = event.target.files[0];
      if (file) {
          setCurrentFileToUpload(file);
          setIsDescriptionModalOpen(true);
      }
      event.target.value = null;
  };

  const handleDescriptionConfirm = async (description) => {
    setIsDescriptionModalOpen(false);
    if (!description && !currentFileToUpload) return;
    if (!archiverEntryId) return;

    setUploadingAnexo(true);
    try {
        let fileUrl = '';
        let uniqueFilename = '';
        let fileSize = 0;

        if (currentFileToUpload) {
            const uploadResult = await uploadFile(currentFileToUpload);
            fileUrl = uploadResult.fileUrl;
            uniqueFilename = uploadResult.uniqueFilename;
            fileSize = currentFileToUpload.size;
        }

        const payload = {
            name: uniqueFilename || 'Nota de Texto',
            url: fileUrl,
            descripcion: description,
            size: fileSize,
        };

        await uploadArchiverAnexo(archiverEntryId, payload);

        showSuccess("Información guardada con éxito");
        onUploadSuccess();
    } catch (error) {
        handleAxiosError(error, "Error al subir la información.");
    } finally {
        setUploadingAnexo(false);
        setCurrentFileToUpload(null);
    }
  };

  const handleDownload = async (anexo) => {
    if (!anexo.url) {
        toast.info("Este anexo es solo una nota de texto.");
        return;
    }
    if (!anexo.name) {
        toast.error("Nombre del archivo no encontrado.");
        return;
    }
    const toastId = toast.loading(`Descargando ${anexo.name}, por favor espere...`);
    try {
      await downloadFile(anexo.name);
      toast.update(toastId, { 
        render: "¡Descarga Completada!", 
        type: "success", 
        isLoading: false, 
        autoClose: 5000 
      });
    } catch (error) {
      toast.dismiss(toastId);
      handleAxiosError(error, `Error al descargar el archivo: ${error.message}`);
    }
  };

  return (
    <Box>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Button
          startIcon={uploadingAnexo && currentFileToUpload ? <CircularProgress size={20} /> : <UploadFileIcon />}
          variant="contained"
          onClick={() => fileInputRef.current.click()}
          disabled={uploadingAnexo || !archiverEntryId}
          sx={{ 
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
          {uploadingAnexo && currentFileToUpload ? 'Subiendo...' : 'Subir Documento'}
        </Button>
        <Button
          startIcon={uploadingAnexo && !currentFileToUpload ? <CircularProgress size={20} /> : <DescriptionIcon />}
          variant="outlined"
          onClick={() => setIsDescriptionModalOpen(true)}
          disabled={uploadingAnexo || !archiverEntryId}
          sx={{ 
            borderRadius: 3,
            textTransform: 'none',
            fontWeight: 600,
            py: 1.5,
          }}
        >
          {uploadingAnexo && !currentFileToUpload ? 'Guardando...' : 'Añadir Nota / Descripción'}
        </Button>
      </Stack>
      <Typography variant="caption" display="block" sx={{ mb: 2, color: theme.palette.text.secondary }}>
        {archiverEntryId ? '' : 'Guarde el formulario para poder subir anexos.'}
      </Typography>
      
      <List>
        {anexos?.map((anexo, index) => (
          <GlassCard
            key={index}
            hover={false}
            sx={{
              p: 1.5,
              background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.4)} 0%, ${alpha(theme.palette.background.paper, 0.1)} 100%)`,
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Avatar sx={{ bgcolor: alpha(theme.palette.info.main, 0.1), color: theme.palette.info.main, width: 36, height: 36 }}>
                  <DescriptionIcon sx={{ fontSize: 20 }} />
                </Avatar>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{anexo.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{anexo.descripcion} - {anexo.size ? `${(anexo.size / 1024).toFixed(2)} KB` : 'N/A KB'}</Typography>
                </Box>
              </Stack>
              <IconButton 
                edge="end" 
                onClick={() => handleDownload(anexo)}
                sx={{
                  bgcolor: alpha(theme.palette.success.main, 0.1),
                  color: theme.palette.success.main,
                  '&:hover': {
                    bgcolor: alpha(theme.palette.success.main, 0.2),
                    transform: 'scale(1.1)',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                <DownloadIcon />
              </IconButton>
            </Stack>
          </GlassCard>
        ))}
      </List>
      <DescriptionModal
        open={isDescriptionModalOpen}
        onClose={() => setIsDescriptionModalOpen(false)}
        onConfirm={handleDescriptionConfirm}
        defaultValue={currentFileToUpload?.name || ''}
      />
    </Box>
  );
};
