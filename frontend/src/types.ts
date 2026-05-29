export type LightLevel = 'Bajo' | 'Medio' | 'Alto';
export type SensorType = 'humedad' | 'temperatura' | 'luz';
export type TemperatureUnit = 'C' | 'F';

export interface SensorData {
  humedad: number;
  temperatura: number;
  luz: LightLevel;
}

export interface Sensor {
  id: string;
  nombre: string;
  tipo: SensorType;
  seccionId?: string;
  activo: boolean;
}

export interface SeccionHuerto {
  id: string;
  nombre: string;
  descripcion?: string;
  sensoresAsignados: string[];
  color: string;
}

export interface Configuracion {
  tema: 'claro' | 'oscuro' | 'sistema';
  unidadTemperatura: TemperatureUnit;
  frecuenciaActualizacion: number;
  notificacionesHabilitadas: boolean;
  mostrarTodasSecciones: boolean;
}

export interface EvaluationResult {
  id: string;
  timestamp: number;
  data: SensorData;
  status: 'Óptimo' | 'Atención' | 'Alerta';
  recommendations: string[];
  summary: string;
  seccionId?: string;
  sensorId?: string;
}

export const evaluateGarden = (
  data: SensorData,
  seccionId?: string,
  sensorId?: string
): EvaluationResult => {
  const recommendations: string[] = [];
  let status: 'Óptimo' | 'Atención' | 'Alerta' = 'Óptimo';
  let summary = 'Condiciones óptimas para el huerto';

  if (data.humedad < 30) {
    recommendations.push('El huerto necesita riego');
    status = 'Alerta';
  } else if (data.humedad <= 50) {
    recommendations.push('Se recomienda riego moderado');
    if (status === 'Óptimo') status = 'Atención';
  } else {
    recommendations.push('Humedad adecuada');
  }

  if (data.temperatura > 32 && data.luz === 'Alto') {
    recommendations.push('Se recomienda aumentar sombra');
    status = 'Alerta';
  }

  if (data.luz === 'Bajo') {
    recommendations.push('Falta exposición solar');
    if (status === 'Óptimo') status = 'Atención';
  }

  if (status === 'Alerta') summary = 'Acción necesaria inmediata';
  else if (status === 'Atención') summary = 'Atención recomendada';

  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 9),
    timestamp: Date.now(),
    data,
    status,
    recommendations,
    summary,
    seccionId,
    sensorId,
  };
};
