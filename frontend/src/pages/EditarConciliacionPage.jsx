import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getConciliacionById, updateConciliacion } from '../services/conciliacionService';
import ConciliacionUnificadaForm from '../components/forms/ConciliacionUnificadaForm';
import { Container, CircularProgress, Alert, Typography, Box } from '@mui/material';

const EditarConciliacionPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: solicitud, isLoading, isError, error } = useQuery({
    queryKey: ['conciliacion', id],
    queryFn: async () => {
      console.log(`[EditarConciliacionPage] Fetching conciliacion with ID: ${id}`);
      const data = await getConciliacionById(id);
      console.log('[EditarConciliacionPage] Received conciliacion data:', data);
      return data;
    },
    enabled: !!id,
  });

  const { mutate: update, isLoading: isUpdating } = useMutation({
    mutationFn: (solicitudData) => {
      console.log('[EditarConciliacionPage] Updating conciliacion with data:', solicitudData);
      return updateConciliacion(id, solicitudData);
    },
    onSuccess: () => {
      console.log('[EditarConciliacionPage] Conciliacion updated successfully.');
      queryClient.invalidateQueries(['solicitudes']); // This should be updated to a new query key if it exists
      queryClient.invalidateQueries(['conciliacion', id]);
      navigate('/admin');
    },
    onError: (error) => {
      console.error('[EditarConciliacionPage] Error actualizando la solicitud de conciliación:', error);
    },
  });

  const handleSubmit = (data) => {
    console.log("[EditarConciliacionPage] Data received from form:", data);
    // Si se retomó un borrador, al confirmar el envío se marca como completa.
    if (solicitud?.estado === 'borrador') {
      update({ ...data, estado: 'completa' });
    } else {
      update(data);
    }
  };

  if (isLoading) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (isError) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 4 }}>
          <Typography>Error al cargar la solicitud: {error.message}</Typography>
        </Alert>
      </Container>
    );
  }

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Editar Solicitud de Conciliación
      </Typography>
      {solicitud && (
        <ConciliacionUnificadaForm
          onSubmit={handleSubmit}
          initialData={solicitud}
          isUpdating={isUpdating}
        />
      )}
    </Container>
  );
};

export default EditarConciliacionPage;
