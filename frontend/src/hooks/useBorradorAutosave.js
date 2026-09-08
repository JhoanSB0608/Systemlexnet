import { useState, useRef, useCallback, useEffect } from 'react';
import borradorService, { TIPO_CONCILIACION } from '../services/borradorService';

const localStorageKey = (tipoSolicitud) =>
  `systemlex_borrador_${tipoSolicitud === TIPO_CONCILIACION ? 'conciliacion' : 'insolvencia'}`;

/**
 * Hook para el guardado parcial (auto-save) por secciones de la solicitud.
 *
 * - Crea/actualiza un borrador en la base de datos de forma progresiva.
 * - Serializa los guardados: nunca lanza dos peticiones en paralelo y encola
 *   el último dato pendiente (no se pierde información).
 * - Persiste el id del borrador en localStorage para poder retomarlo tras
 *   recargar la página.
 *
 * @param {object} options
 * @param {string} options.tipoSolicitud  Tipo de solicitud (insolvencia o conciliación).
 * @param {boolean} options.enabled       Si el auto-save está activo (creación o edición de borrador).
 * @param {string} [options.borradorId]   Id de un borrador ya existente (edición/retomar).
 * @param {function} [options.onSaved]    Callback al terminar un guardado exitoso (recibe el doc guardado).
 * @param {function} [options.onError]    Callback en caso de error de guardado.
 */
export const useBorradorAutosave = ({
  tipoSolicitud,
  enabled = true,
  borradorId: externalId = null,
  onSaved,
  onError,
}) => {
  const [borradorId, setBorradorId] = useState(externalId);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved | error
  const [lastSavedAt, setLastSavedAt] = useState(null);

  const borradorIdRef = useRef(externalId);

  useEffect(() => {
    borradorIdRef.current = externalId;
    setBorradorId(externalId);
  }, [externalId]);

  // Cola de guardado: el último dato solicitado se guarda en cuanto no haya una petición en curso
  const pendingDataRef = useRef(null);
  const savingRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      setSaveStatus('idle');
      return;
    }
    // Recuperar id de borrador almacenado (para reanudar tras recargar la página)
    if (!borradorIdRef.current) {
      try {
        const stored = localStorage.getItem(localStorageKey(tipoSolicitud));
        if (stored) {
          borradorIdRef.current = stored;
          setBorradorId(stored);
        }
      } catch {
        // ignore
      }
    }
  }, [enabled, tipoSolicitud]);

  const processQueue = useCallback(async () => {
    if (!enabled || savingRef.current) return;

    while (pendingDataRef.current !== null) {
      const data = pendingDataRef.current;
      pendingDataRef.current = null;
      savingRef.current = true;
      setSaveStatus('saving');

      try {
        let saved;
        if (borradorIdRef.current) {
          saved = await borradorService.actualizarBorrador(borradorIdRef.current, data);
        } else {
          saved = await borradorService.guardarBorrador(data, tipoSolicitud);
        }

        if (!borradorIdRef.current) {
          borradorIdRef.current = saved._id;
          setBorradorId(saved._id);
          try {
            localStorage.setItem(localStorageKey(tipoSolicitud), saved._id);
          } catch {
            // ignore
          }
        }

        setSaveStatus('saved');
        const now = new Date();
        setLastSavedAt(now);
        if (onSaved) onSaved(saved, now);
      } catch (error) {
        setSaveStatus('error');
        // Re-encolar el dato pendiente para reintentar en el siguiente guardado
        pendingDataRef.current = data;
        if (onError) onError(error);
        console.error('[useBorradorAutosave] Error al guardar el borrador:', error);
      } finally {
        savingRef.current = false;
      }
    }
  }, [enabled, tipoSolicitud, onSaved, onError]);

  // Solicitud de guardado (encola y procesa)
  const requestSave = useCallback(
    (data) => {
      if (!enabled) return;
      pendingDataRef.current = data;
      // Procesar de forma asíncrona para no bloquear el render
      setTimeout(() => processQueue(), 0);
    },
    [enabled, processQueue]
  );

  // Fuerza el guardado del último dato pendiente y espera a que termine.
  // Útil antes del submit final.
  const flushSave = useCallback(async () => {
    if (!enabled) return;
    await processQueue();
    // Si quedó pendiente (por ejemplo si se re-encoló tras error), reintentar una vez
    if (pendingDataRef.current !== null) {
      await processQueue();
    }
  }, [enabled, processQueue]);

  // Elimina la referencia local del borrador tras completar la solicitud.
  const clearBorrador = useCallback(() => {
    pendingDataRef.current = null;
    borradorIdRef.current = null;
    setBorradorId(null);
    setSaveStatus('idle');
    setLastSavedAt(null);
    try {
      localStorage.removeItem(localStorageKey(tipoSolicitud));
    } catch {
      // ignore
    }
  }, [tipoSolicitud]);

  return {
    borradorId,
    saveStatus,
    lastSavedAt,
    requestSave,
    flushSave,
    clearBorrador,
  };
};

export default useBorradorAutosave;