import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLiquidacionById, updateLiquidacion } from '../services/liquidacionService';
import LiquidacionForm from '../components/forms/LiquidacionForm';
import { Container, CircularProgress, Alert, Typography, Box } from '@mui/material';

const EditarLiquidacionPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: solicitud, isLoading, isError, error } = useQuery({
    queryKey: ['liquidacion', id],
    queryFn: async () => {
      console.log(`[EditarLiquidacionPage] Fetching liquidacion with ID: ${id}`);
      const data = await getLiquidacionById(id);
      console.log('[EditarLiquidacionPage] Received liquidacion data:', data);
      return data;
    },
    enabled: !!id,
  });

  const { mutate: update, isLoading: isUpdating } = useMutation({
    mutationFn: (solicitudData) => {
      console.log('[EditarLiquidacionPage] Updating liquidacion with data:', solicitudData);
      return updateLiquidacion(id, solicitudData);
    },
    onSuccess: () => {
      console.log('[EditarLiquidacionPage] Liquidacion updated successfully.');
      queryClient.invalidateQueries(['solicitudes']);
      queryClient.invalidateQueries(['liquidacion', id]);
      navigate('/admin');
    },
    onError: (error) => {
      console.error('[EditarLiquidacionPage] Error actualizando la solicitud de liquidación:', error);
    },
  });

  const handleSubmit = (data) => {
    console.log('[EditarLiquidacionPage] Data received from form:', data);
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
        Editar Solicitud de Liquidación Patrimonial
      </Typography>
      {solicitud && (
        <LiquidacionForm
          onSubmit={handleSubmit}
          initialData={solicitud}
          isUpdating={isUpdating}
        />
      )}
    </Container>
  );
};

export default EditarLiquidacionPage;