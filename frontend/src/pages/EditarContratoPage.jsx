import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getContratoById, actualizarContrato, downloadContratoDocument } from '../services/contratoService';
import ContratoForm from '../components/forms/ContratoForm';
import { Container, CircularProgress, Alert, Typography, Box, Stack } from '@mui/material';
import { showSuccess, handleAxiosError } from '../utils/alert';

const EditarContratoPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: contrato, isLoading, isError, error } = useQuery({
    queryKey: ['contrato', id],
    queryFn: async () => {
      console.log(`[EditarContratoPage] Fetching contrato with ID: ${id}`);
      const data = await getContratoById(id);
      return data;
    },
    enabled: !!id,
  });

  const { mutate: update, isLoading: isUpdating } = useMutation({
    mutationFn: (contratoData) => {
      console.log('[EditarContratoPage] Updating contrato with data:', contratoData);
      return actualizarContrato(id, contratoData);
    },
    onSuccess: async () => {
      console.log('[EditarContratoPage] Contrato updated successfully.');
      queryClient.invalidateQueries(['adminContratos']);
      queryClient.invalidateQueries(['contrato', id]);

      try {
        await downloadContratoDocument(id);
        showSuccess('¡Éxito! El contrato fue actualizado y se descargó el PDF actualizado.');
      } catch (err) {
        handleAxiosError(err, 'El contrato fue actualizado, pero no se pudo descargar el PDF.');
      }

      navigate('/admin');
    },
    onError: (updateError) => {
      console.error('[EditarContratoPage] Error actualizando el contrato:', updateError);
      handleAxiosError(updateError, 'No se pudo actualizar el contrato. Intente de nuevo.');
    },
  });

  const handleSubmit = (data) => {
    console.log('[EditarContratoPage] Data received from form:', data);
    // Si se retomó un borrador, al confirmar el envío se marca como completa.
    if (contrato?.estado === 'borrador') {
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
          <Typography>Error al cargar el contrato: {error?.message || 'Inténtelo de nuevo.'}</Typography>
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
            Editar Contrato de Servicios
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Actualice los datos del contrato y genere nuevamente el documento PDF.
          </Typography>
        </Box>
        {contrato && (
          <ContratoForm
            onSubmit={handleSubmit}
            initialData={contrato}
            isUpdating={isUpdating}
          />
        )}
      </Stack>
    </Container>
  );
};

export default EditarContratoPage;