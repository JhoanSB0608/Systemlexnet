import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPoderById, actualizarPoder, downloadPoderDocument } from '../services/poderService';
import PoderForm from '../components/forms/PoderForm';
import { Container, CircularProgress, Alert, Typography, Box, Stack } from '@mui/material';
import { showSuccess, handleAxiosError } from '../utils/alert';

const EditarPoderPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: poder, isLoading, isError, error } = useQuery({
    queryKey: ['poder', id],
    queryFn: async () => {
      console.log(`[EditarPoderPage] Fetching poder with ID: ${id}`);
      const data = await getPoderById(id);
      return data;
    },
    enabled: !!id,
  });

  const { mutate: update, isLoading: isUpdating } = useMutation({
    mutationFn: (poderData) => {
      console.log('[EditarPoderPage] Updating poder with data:', poderData);
      return actualizarPoder(id, poderData);
    },
    onSuccess: async () => {
      console.log('[EditarPoderPage] Poder updated successfully.');
      queryClient.invalidateQueries(['adminPoderes']);
      queryClient.invalidateQueries(['poder', id]);

      try {
        await downloadPoderDocument(id);
        showSuccess('¡Éxito! El poder fue actualizado y se descargó el PDF actualizado.');
      } catch (err) {
        handleAxiosError(err, 'El poder fue actualizado, pero no se pudo descargar el PDF.');
      }

      navigate('/admin');
    },
    onError: (updateError) => {
      console.error('[EditarPoderPage] Error actualizando el poder:', updateError);
      handleAxiosError(updateError, 'No se pudo actualizar el poder. Intente de nuevo.');
    },
  });

  const handleSubmit = (data) => {
    console.log('[EditarPoderPage] Data received from form:', data);
    // Si se retomó un borrador, al confirmar el envío se marca como completa.
    if (poder?.estado === 'borrador') {
      update({ ...data, estado: 'completa' });
    } else {
      update(data);
    }
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (isError) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error" sx={{ mt: 4 }}>
          <Typography>Error al cargar el poder: {error?.message || 'Inténtelo de nuevo.'}</Typography>
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
            Editar Poder
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Actualice los datos del poder y genere nuevamente el documento PDF.
          </Typography>
        </Box>
        {poder && (
          <PoderForm
            onSubmit={handleSubmit}
            initialData={poder}
            isUpdating={isUpdating}
          />
        )}
      </Stack>
    </Container>
  );
};

export default EditarPoderPage;