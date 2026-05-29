// En producción (Vercel), VITE_API_URL apunta al backend de Render.
// En desarrollo local, el proxy de Vite redirige /api → localhost:3002.
const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}`
  : '/api';

const handle = async (res: Response) => {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

// --- Evaluaciones ---
export const getEvaluaciones = () =>
  fetch(`${BASE_URL}/evaluaciones`).then(handle);

export const addEvaluacion = (evaluacion: object) =>
  fetch(`${BASE_URL}/evaluaciones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(evaluacion),
  }).then(handle);

export const deleteEvaluacion = async (id: string) => {
  const res = await fetch(`${BASE_URL}/evaluaciones/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Error al eliminar evaluación');
};

// --- Secciones ---
export const getSecciones = () =>
  fetch(`${BASE_URL}/secciones`).then(handle);

export const addSeccion = (seccion: object) =>
  fetch(`${BASE_URL}/secciones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(seccion),
  }).then(handle);

export const updateSeccion = (id: string, seccion: object) =>
  fetch(`${BASE_URL}/secciones/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(seccion),
  }).then(handle);

export const deleteSeccion = async (id: string) => {
  const res = await fetch(`${BASE_URL}/secciones/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Error al eliminar sección');
};

// --- Sensores ---
export const getSensores = () =>
  fetch(`${BASE_URL}/sensores`).then(handle);

export const addSensor = (sensor: object) =>
  fetch(`${BASE_URL}/sensores`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sensor),
  }).then(handle);

export const updateSensor = (id: string, sensor: object) =>
  fetch(`${BASE_URL}/sensores/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sensor),
  }).then(handle);

export const deleteSensor = async (id: string) => {
  const res = await fetch(`${BASE_URL}/sensores/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Error al eliminar sensor');
};
