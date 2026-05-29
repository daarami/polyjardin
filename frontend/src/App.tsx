import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Leaf, Activity, Cpu, Bell, Settings, Home, Droplets, Thermometer,
  Sun, CheckCircle2, Cloud, CloudSun, History, Filter, Layers, Zap,
  AlertTriangle, Plus, Trash2, Edit, Save, X, MapPin, Gauge,
  Sunset, Sparkles, Clock, ArrowLeft,
} from 'lucide-react';
import {
  SensorData, EvaluationResult, evaluateGarden, LightLevel,
  Sensor, SeccionHuerto, Configuracion, SensorType,
} from './types';
import {
  getEvaluaciones, addEvaluacion, deleteEvaluacion,
  getSecciones, addSeccion, updateSeccion, deleteSeccion,
  getSensores, addSensor, deleteSensor,
} from './Api';

// ─── Constants ───────────────────────────────────────────────────────────────
const SECTION_COLORS = [
  'bg-green-500', 'bg-blue-500', 'bg-purple-500', 'bg-orange-500',
  'bg-pink-500', 'bg-indigo-500', 'bg-yellow-500', 'bg-teal-500',
];

const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try { return crypto.randomUUID(); } catch { /* fallback below */ }
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
};

type View = 'welcome' | 'dashboard' | 'simulator' | 'recommendations' | 'history' | 'settings';

// ─── Shared UI primitives ────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: EvaluationResult['status'] }) => {
  const cfg = {
    Óptimo:   { bg: 'bg-primary/10 border-primary/30 text-primary', dot: 'bg-primary' },
    Atención: { bg: 'bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
    Alerta:   { bg: 'bg-red-100 border-red-300 text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-400', dot: 'bg-red-500' },
  }[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full animate-pulse-dot ${cfg.dot}`} />
      {status}
    </span>
  );
};

const SensorIcon = ({ tipo, className = 'w-4 h-4' }: { tipo: SensorType; className?: string }) => {
  if (tipo === 'humedad') return <Droplets className={className} />;
  if (tipo === 'temperatura') return <Thermometer className={className} />;
  return <Sun className={className} />;
};

const EmptyState = ({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center gap-3 px-6">
    <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
      {icon}
    </div>
    <p className="font-semibold text-slate-700 dark:text-slate-300">{title}</p>
    <p className="text-sm text-slate-400 max-w-xs leading-relaxed">{desc}</p>
  </div>
);

const Card = ({ className = '', children }: { className?: string; children: React.ReactNode }) => (
  <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm ${className}`}>
    {children}
  </div>
);

// ─── Welcome View ─────────────────────────────────────────────────────────────

const WelcomeView = ({ onStart }: { onStart: () => void }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="flex flex-col flex-1 justify-center items-center px-6 py-8 min-h-[100dvh]"
  >
    {/* Logo */}
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 120, damping: 18, delay: 0.1 }}
      className="relative mb-10"
    >
      <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl scale-150" />
      <div className="absolute w-full h-full border-2 border-dashed border-primary/20 rounded-full animate-spin-slow" />
      <div className="relative w-52 h-52 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-white dark:border-slate-700 overflow-hidden transform rotate-[-3deg] hover:rotate-0 transition-transform duration-500">
        <img
          src="/images/polijardin.png"
          alt="PoliJardín"
          className="w-full h-full object-cover"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Leaf className="w-20 h-20 text-primary opacity-20" />
        </div>
      </div>
    </motion.div>

    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.25 }}
      className="text-center mb-8"
    >
      <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-3">
        Jardín <span className="text-primary">Polinizador</span>
        <br />Inteligente
      </h1>
      <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed max-w-xs mx-auto">
        Monitorea temperatura, humedad y luz solar de tu jardín en tiempo real.
      </p>
    </motion.div>

    {/* Feature pills */}
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.35 }}
      className="flex flex-wrap gap-2 justify-center mb-10"
    >
      {['Sensores IoT', 'Historial', 'Alertas', 'Secciones'].map((f) => (
        <span key={f} className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
          {f}
        </span>
      ))}
    </motion.div>

    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.45 }}
      className="w-full max-w-sm"
    >
      <button
        onClick={onStart}
        className="w-full flex items-center justify-center gap-3 h-14 px-8 bg-primary text-white text-base font-bold rounded-2xl shadow-lg shadow-primary/30 active:scale-95 transition-transform"
      >
        <Activity className="w-5 h-5" />
        Iniciar monitoreo
      </button>
      <p className="text-center text-xs text-slate-400 mt-4">
        Los datos efímeros se reinician al recargar el servidor.
      </p>
    </motion.div>
  </motion.div>
);

// ─── Dashboard View ───────────────────────────────────────────────────────────

const MetricCard = ({
  icon, label, value, unit, barPct, barColor, badge, badgeColor,
}: {
  icon: React.ReactNode; label: string; value: string | number;
  unit: string; barPct: number; barColor: string;
  badge: string; badgeColor: string;
}) => (
  <Card className="p-5 flex flex-col gap-3">
    <div className="flex items-center justify-between">
      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">{icon}</div>
      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badgeColor}`}>{badge}</span>
    </div>
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-0.5">{label}</p>
      <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
        {value}<span className="text-sm font-normal text-slate-400 ml-1">{unit}</span>
      </p>
    </div>
    <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(barPct, 100)}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className={`h-full rounded-full ${barColor}`}
      />
    </div>
  </Card>
);

const DashboardView = ({
  lastResult, onSimulate, secciones, seccionSeleccionada, onSeleccionarSeccion, history,
}: {
  lastResult: EvaluationResult | null;
  onSimulate: () => void;
  secciones: SeccionHuerto[];
  seccionSeleccionada: string | null;
  onSeleccionarSeccion: (id: string | null) => void;
  history: EvaluationResult[];
}) => {
  const data = lastResult?.data ?? { humedad: 65, temperatura: 24, luz: 'Alto' as LightLevel };
  const status = lastResult?.status ?? 'Óptimo';
  const summary = lastResult?.summary ?? 'El huerto tiene los niveles adecuados para los polinizadores.';
  const totalRegistros = history.length;
  const optimalCount = history.filter(h => h.status === 'Óptimo').length;
  const optimoPct = totalRegistros > 0 ? Math.round((optimalCount / totalRegistros) * 100) : 0;

  const statusCfg = {
    Óptimo:   { bg: 'bg-primary/8 border-primary/20', icon: <CheckCircle2 className="w-6 h-6 text-primary" />, text: 'text-primary', label: 'Todo en orden' },
    Atención: { bg: 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800', icon: <Zap className="w-6 h-6 text-amber-500" />, text: 'text-amber-700 dark:text-amber-400', label: 'Requiere atención' },
    Alerta:   { bg: 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800', icon: <AlertTriangle className="w-6 h-6 text-red-500" />, text: 'text-red-700 dark:text-red-400', label: 'Alerta crítica' },
  }[status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex-1 p-4 space-y-4 max-w-2xl mx-auto w-full pb-28 overflow-y-auto"
    >
      {/* Header row */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Estado del Jardín</h2>
          <p className="text-sm text-slate-400">
            {seccionSeleccionada
              ? `Sección: ${secciones.find(s => s.id === seccionSeleccionada)?.nombre}`
              : 'Todas las secciones'}
          </p>
        </div>
        {secciones.length > 0 && (
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={seccionSeleccionada || ''}
              onChange={(e) => onSeleccionarSeccion(e.target.value || null)}
              className="text-sm bg-transparent focus:outline-none text-slate-700 dark:text-slate-300"
            >
              <option value="">Todas</option>
              {secciones.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Status card */}
      <div className={`rounded-2xl border p-4 flex items-center gap-4 ${statusCfg.bg}`}>
        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm">{statusCfg.icon}</div>
        <div className="flex-1 min-w-0">
          <p className={`font-bold ${statusCfg.text}`}>{statusCfg.label}</p>
          <p className="text-sm text-slate-600 dark:text-slate-400 truncate">{summary}</p>
        </div>
        <button
          onClick={onSimulate}
          className="shrink-0 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 active:scale-95 transition-all"
        >
          Simular
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Óptimo', value: `${optimoPct}%`, icon: <CheckCircle2 className="w-4 h-4 text-primary" /> },
          { label: 'Registros', value: totalRegistros, icon: <History className="w-4 h-4 text-blue-500" /> },
          { label: 'Secciones', value: secciones.length, icon: <Layers className="w-4 h-4 text-purple-500" /> },
        ].map((s) => (
          <Card key={s.label} className="p-3 text-center">
            <div className="flex justify-center mb-1">{s.icon}</div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{s.value}</p>
            <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Sensor metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricCard
          icon={<Droplets className="w-5 h-5 text-blue-500" />}
          label="Humedad del suelo"
          value={data.humedad}
          unit="%"
          barPct={data.humedad}
          barColor="bg-blue-400"
          badge={data.humedad > 50 ? 'Óptimo' : 'Bajo'}
          badgeColor={data.humedad > 50 ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'}
        />
        <MetricCard
          icon={<Thermometer className="w-5 h-5 text-orange-500" />}
          label="Temperatura"
          value={data.temperatura}
          unit="°C"
          barPct={(data.temperatura / 50) * 100}
          barColor="bg-orange-400"
          badge={data.temperatura <= 32 ? 'Estable' : 'Alto'}
          badgeColor={data.temperatura <= 32 ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'}
        />
        <MetricCard
          icon={<Sun className="w-5 h-5 text-yellow-500" />}
          label="Exposición solar"
          value={data.luz === 'Alto' ? '8.2' : data.luz === 'Medio' ? '4.5' : '1.2'}
          unit="UV"
          barPct={data.luz === 'Alto' ? 82 : data.luz === 'Medio' ? 45 : 12}
          barColor="bg-yellow-400"
          badge={data.luz}
          badgeColor={data.luz === 'Alto' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'}
        />
      </div>

      {/* Ideal conditions */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-primary">Rangos ideales para polinizadores</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: <Droplets className="w-4 h-4 text-blue-500" />, val: '50–70%', lbl: 'Humedad' },
            { icon: <Thermometer className="w-4 h-4 text-orange-500" />, val: '20–28°C', lbl: 'Temperatura' },
            { icon: <Sun className="w-4 h-4 text-yellow-500" />, val: 'Alto', lbl: 'Luz solar' },
          ].map((item) => (
            <div key={item.lbl} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-center">
              <div className="flex justify-center mb-1">{item.icon}</div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{item.val}</p>
              <p className="text-[10px] text-slate-400">{item.lbl}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Tip */}
      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex gap-3">
        <Sparkles className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
          <span className="font-bold">¿Sabías que?</span> Las abejas polinizan 1 de cada 3 alimentos que consumimos. Un jardín saludable puede aumentar la polinización hasta un 70%.
        </p>
      </div>

      {/* Recent activity */}
      {history.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Clock className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Actividad reciente</h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {history.slice(0, 3).map((r) => (
              <div key={r.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${r.status === 'Óptimo' ? 'bg-primary' : r.status === 'Atención' ? 'bg-amber-400' : 'bg-red-500'}`} />
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{r.status}</p>
                    <p className="text-xs text-slate-400">{r.data.humedad}% hum · {r.data.temperatura}°C</p>
                  </div>
                </div>
                <span className="text-xs text-slate-400">
                  {new Date(r.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </motion.div>
  );
};

// ─── Simulator View ───────────────────────────────────────────────────────────

const SimulatorView = ({
  onEvaluate, secciones, seccionSeleccionada, onSeleccionarSeccion,
}: {
  onEvaluate: (data: SensorData, seccionId?: string) => Promise<void>;
  secciones: SeccionHuerto[];
  seccionSeleccionada: string | null;
  onSeleccionarSeccion: (id: string | null) => void;
}) => {
  const [humedad, setHumedad] = useState(65);
  const [temperatura, setTemperatura] = useState(24);
  const [luz, setLuz] = useState<LightLevel>('Alto');
  const [loading, setLoading] = useState(false);

  const handleEvaluate = async () => {
    setLoading(true);
    await onEvaluate({ humedad, temperatura, luz }, seccionSeleccionada || undefined);
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex-1 p-4 space-y-5 max-w-lg mx-auto w-full pb-28 overflow-y-auto"
    >
      <div className="pt-2">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Ingresar Datos</h2>
        <p className="text-sm text-slate-400">Registra las condiciones actuales del jardín.</p>
      </div>

      {secciones.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-primary" />
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Sección del jardín</label>
          </div>
          <select
            value={seccionSeleccionada || ''}
            onChange={(e) => onSeleccionarSeccion(e.target.value || null)}
            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
          >
            <option value="">Sin sección específica</option>
            {secciones.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </Card>
      )}

      {/* Humedad */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Droplets className="w-5 h-5 text-blue-500" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">Humedad del suelo</span>
          </div>
          <span className="text-2xl font-bold text-primary">{humedad}<span className="text-sm font-normal text-slate-400">%</span></span>
        </div>
        <input
          type="range" min="0" max="100" value={humedad}
          onChange={(e) => setHumedad(+e.target.value)}
          className="w-full h-2 bg-blue-100 dark:bg-blue-900/30 rounded-full accent-blue-500 cursor-pointer"
        />
        <div className="flex justify-between text-xs text-slate-400">
          <span>Seco (0%)</span><span>Saturado (100%)</span>
        </div>
      </Card>

      {/* Temperatura */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Thermometer className="w-5 h-5 text-orange-500" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">Temperatura</span>
          </div>
          <span className="text-2xl font-bold text-primary">{temperatura}<span className="text-sm font-normal text-slate-400">°C</span></span>
        </div>
        <input
          type="range" min="0" max="50" value={temperatura}
          onChange={(e) => setTemperatura(+e.target.value)}
          className="w-full h-2 bg-orange-100 dark:bg-orange-900/30 rounded-full accent-orange-500 cursor-pointer"
        />
        <div className="flex justify-between text-xs text-slate-400">
          <span>Frío (0°C)</span><span>Caliente (50°C)</span>
        </div>
      </Card>

      {/* Luz */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Sun className="w-5 h-5 text-yellow-500" />
          <span className="font-semibold text-slate-800 dark:text-slate-200">Nivel de luz solar</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {(['Bajo', 'Medio', 'Alto'] as LightLevel[]).map((level) => (
            <button
              key={level}
              onClick={() => setLuz(level)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all active:scale-95 ${
                luz === level
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
              }`}
            >
              {level === 'Bajo' ? <Cloud className="w-7 h-7" /> : level === 'Medio' ? <CloudSun className="w-7 h-7" /> : <Sun className="w-7 h-7" />}
              <span className="text-sm font-bold">{level}</span>
            </button>
          ))}
        </div>
      </Card>

      <button
        onClick={handleEvaluate}
        disabled={loading}
        className="w-full bg-primary text-white py-5 rounded-2xl text-base font-bold shadow-lg shadow-primary/25 hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        ) : (
          <CheckCircle2 className="w-5 h-5" />
        )}
        {loading ? 'Evaluando...' : 'Evaluar condiciones'}
      </button>
    </motion.div>
  );
};

// ─── Recommendations View ─────────────────────────────────────────────────────

const RecommendationsView = ({ result, onBack }: { result: EvaluationResult; onBack: () => void }) => {
  const recConfig = (rec: string) => {
    if (rec.includes('riego') && rec.includes('necesita')) return { icon: <Droplets className="w-6 h-6" />, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800' };
    if (rec.includes('riego')) return { icon: <Droplets className="w-6 h-6" />, color: 'text-primary', bg: 'bg-primary/5 border-primary/20' };
    if (rec.includes('sombra')) return { icon: <Sunset className="w-6 h-6" />, color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-900/10 border-teal-200 dark:border-teal-800' };
    if (rec.includes('solar') || rec.includes('exposición')) return { icon: <Sun className="w-6 h-6" />, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800' };
    return { icon: <CheckCircle2 className="w-6 h-6" />, color: 'text-primary', bg: 'bg-primary/5 border-primary/20' };
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 p-4 space-y-4 max-w-lg mx-auto w-full pb-28 overflow-y-auto"
    >
      <div className="pt-2">
        <div className="flex items-center gap-2 mb-1">
          <StatusBadge status={result.status} />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-2">Recomendaciones</h2>
        <p className="text-sm text-slate-400">Basado en la evaluación más reciente.</p>
      </div>

      <div className="space-y-3">
        {result.recommendations.map((rec, idx) => {
          const cfg = recConfig(rec);
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.08 }}
              className={`flex items-start gap-4 p-4 rounded-2xl border ${cfg.bg}`}
            >
              <div className={`shrink-0 mt-0.5 ${cfg.color}`}>{cfg.icon}</div>
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{rec}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  {rec.includes('riego')
                    ? 'La humedad del suelo es clave para tus flores polinizadoras.'
                    : rec.includes('sombra')
                    ? 'Protege los brotes jóvenes del calor extremo.'
                    : 'Asegúrate de que las plantas reciban luz suficiente.'}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <Card className="p-4 flex gap-3">
        <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic">
          Las abejas prefieren flores azules, moradas y amarillas. Tu jardín está diseñado para atraerlas.
        </p>
      </Card>

      <button
        onClick={onBack}
        className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
      >
        Volver al inicio
      </button>
    </motion.div>
  );
};

// ─── History View ─────────────────────────────────────────────────────────────

const HistoryView = ({
  history, secciones, onDelete, onEdit,
}: {
  history: EvaluationResult[];
  secciones: SeccionHuerto[];
  onDelete: (id: string) => Promise<void>;
  onEdit: (item: EvaluationResult, newData: Partial<SensorData>) => Promise<void>;
}) => {
  const [filtroSeccion, setFiltroSeccion] = useState('');
  const [modalItem, setModalItem] = useState<EvaluationResult | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editHumedad, setEditHumedad] = useState(0);
  const [editTemp, setEditTemp] = useState(0);
  const [editLuz, setEditLuz] = useState<LightLevel>('Medio');

  const filtered = filtroSeccion ? history.filter(h => h.seccionId === filtroSeccion) : history;

  const openModal = (item: EvaluationResult) => {
    setModalItem(item);
    setEditMode(false);
    setEditHumedad(item.data.humedad);
    setEditTemp(item.data.temperatura);
    setEditLuz(item.data.luz);
  };

  const handleDelete = async () => {
    if (!modalItem || !confirm('¿Eliminar este registro?')) return;
    await onDelete(modalItem.id);
    setModalItem(null);
  };

  const handleEdit = async () => {
    if (!modalItem) return;
    await onEdit(modalItem, { humedad: editHumedad, temperatura: editTemp, luz: editLuz });
    setModalItem(null);
    setEditMode(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 p-4 space-y-4 max-w-2xl mx-auto w-full pb-28 overflow-y-auto"
    >
      <div className="flex items-center justify-between pt-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Historial</h2>
          <p className="text-sm text-slate-400">{filtered.length} registros</p>
        </div>
        {secciones.length > 0 && (
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filtroSeccion}
              onChange={(e) => setFiltroSeccion(e.target.value)}
              className="text-sm bg-transparent focus:outline-none text-slate-700 dark:text-slate-300"
            >
              <option value="">Todas</option>
              {secciones.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<History className="w-8 h-8" />}
          title="Sin registros"
          desc={filtroSeccion ? 'No hay evaluaciones para esta sección.' : 'Usa el simulador para crear tu primer registro.'}
        />
      ) : (
        <AnimatePresence>
          {filtered.map((item, idx) => {
            const seccion = item.seccionId ? secciones.find(s => s.id === item.seccionId) : null;
            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                onClick={() => openModal(item)}
                className="w-full text-left rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden hover:border-primary/40 active:scale-[0.99] transition-all shadow-sm"
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-slate-400">
                        {new Date(item.timestamp).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      <p className="font-bold text-slate-800 dark:text-slate-200">
                        {new Date(item.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {seccion && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${seccion.color} text-white`}>
                          <MapPin className="w-3 h-3" />
                          {seccion.nombre}
                        </span>
                      )}
                      <StatusBadge status={item.status} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {[
                      { icon: <Droplets className="w-4 h-4 text-blue-400" />, val: `${item.data.humedad}%`, lbl: 'Humedad' },
                      { icon: <Thermometer className="w-4 h-4 text-orange-400" />, val: `${item.data.temperatura}°C`, lbl: 'Temp' },
                      { icon: <Sun className="w-4 h-4 text-yellow-400" />, val: item.data.luz, lbl: 'Sol' },
                    ].map((m) => (
                      <div key={m.lbl} className="flex flex-col items-center gap-0.5">
                        {m.icon}
                        <span className="text-xs text-slate-400">{m.lbl}</span>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{m.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {modalItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) { setModalItem(null); setEditMode(false); } }}
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
              className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className={`p-5 flex items-center justify-between ${
                modalItem.status === 'Óptimo' ? 'bg-primary/8' :
                modalItem.status === 'Atención' ? 'bg-amber-50 dark:bg-amber-900/10' : 'bg-red-50 dark:bg-red-900/10'
              }`}>
                <div>
                  <StatusBadge status={modalItem.status} />
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-2">
                    {new Date(modalItem.timestamp).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                  <p className="text-sm text-slate-400">
                    {new Date(modalItem.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <button onClick={() => { setModalItem(null); setEditMode(false); }}
                  className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {editMode ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-semibold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                          <Droplets className="w-4 h-4 text-blue-500" /> Humedad
                        </label>
                        <span className="text-sm font-bold text-primary">{editHumedad}%</span>
                      </div>
                      <input type="range" min="0" max="100" value={editHumedad}
                        onChange={e => setEditHumedad(+e.target.value)}
                        className="w-full h-2 accent-primary" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-semibold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                          <Thermometer className="w-4 h-4 text-orange-500" /> Temperatura
                        </label>
                        <span className="text-sm font-bold text-primary">{editTemp}°C</span>
                      </div>
                      <input type="range" min="0" max="50" value={editTemp}
                        onChange={e => setEditTemp(+e.target.value)}
                        className="w-full h-2 accent-primary" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                        <Sun className="w-4 h-4 text-yellow-500" /> Luz solar
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['Bajo', 'Medio', 'Alto'] as LightLevel[]).map(l => (
                          <button key={l} onClick={() => setEditLuz(l)}
                            className={`py-2 rounded-xl text-sm font-semibold border-2 transition-all ${editLuz === l ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { bg: 'bg-blue-50 dark:bg-blue-900/20', icon: <Droplets className="w-5 h-5 text-blue-500" />, val: `${modalItem.data.humedad}%`, lbl: 'Humedad' },
                        { bg: 'bg-orange-50 dark:bg-orange-900/20', icon: <Thermometer className="w-5 h-5 text-orange-500" />, val: `${modalItem.data.temperatura}°C`, lbl: 'Temp' },
                        { bg: 'bg-yellow-50 dark:bg-yellow-900/20', icon: <Sun className="w-5 h-5 text-yellow-500" />, val: modalItem.data.luz, lbl: 'Luz' },
                      ].map((m) => (
                        <div key={m.lbl} className={`${m.bg} rounded-xl p-3 text-center`}>
                          <div className="flex justify-center mb-1">{m.icon}</div>
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{m.val}</p>
                          <p className="text-[10px] text-slate-400">{m.lbl}</p>
                        </div>
                      ))}
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Recomendaciones</p>
                      <ul className="space-y-1.5">
                        {modalItem.recommendations.map((r, i) => (
                          <li key={i} className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  {editMode ? (
                    <>
                      <button onClick={() => setEditMode(false)}
                        className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800">
                        Cancelar
                      </button>
                      <button onClick={handleEdit}
                        className="flex-1 py-3 rounded-xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2">
                        <Save className="w-4 h-4" /> Guardar
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={handleDelete}
                        className="flex-1 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 font-semibold text-sm flex items-center justify-center gap-2 border border-red-200 dark:border-red-900/30">
                        <Trash2 className="w-4 h-4" /> Eliminar
                      </button>
                      <button onClick={() => setEditMode(true)}
                        className="flex-1 py-3 rounded-xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2">
                        <Edit className="w-4 h-4" /> Editar
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Settings View ────────────────────────────────────────────────────────────

const SettingsView = ({
  sensores, secciones, configuracion, setConfiguracion,
  onAddSeccion, onDeleteSeccion, onAddSensor, onDeleteSensor, onAssignSensor,
}: {
  sensores: Sensor[];
  secciones: SeccionHuerto[];
  configuracion: Configuracion;
  setConfiguracion: React.Dispatch<React.SetStateAction<Configuracion>>;
  onAddSeccion: (nombre: string, desc: string) => Promise<void>;
  onDeleteSeccion: (id: string) => Promise<void>;
  onAddSensor: (nombre: string, tipo: SensorType) => Promise<void>;
  onDeleteSensor: (id: string) => Promise<void>;
  onAssignSensor: (seccionId: string, sensorId: string, assigned: boolean) => Promise<void>;
  setSensores?: React.Dispatch<React.SetStateAction<Sensor[]>>;
  setSecciones?: React.Dispatch<React.SetStateAction<SeccionHuerto[]>>;
}) => {
  const [activeTab, setActiveTab] = useState<'secciones' | 'sensores' | 'config'>('secciones');
  const [newSeccionNombre, setNewSeccionNombre] = useState('');
  const [newSeccionDesc, setNewSeccionDesc] = useState('');
  const [newSensorNombre, setNewSensorNombre] = useState('');
  const [newSensorTipo, setNewSensorTipo] = useState<SensorType>('humedad');

  const handleAddSeccion = async () => {
    if (!newSeccionNombre.trim()) return;
    await onAddSeccion(newSeccionNombre.trim(), newSeccionDesc.trim());
    setNewSeccionNombre('');
    setNewSeccionDesc('');
  };

  const handleAddSensor = async () => {
    if (!newSensorNombre.trim()) return;
    await onAddSensor(newSensorNombre.trim(), newSensorTipo);
    setNewSensorNombre('');
  };

  const tabs = [
    { id: 'secciones' as const, label: 'Secciones', icon: <Layers className="w-4 h-4" /> },
    { id: 'sensores' as const, label: 'Sensores', icon: <Gauge className="w-4 h-4" /> },
    { id: 'config' as const, label: 'Ajustes', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 p-4 space-y-4 max-w-2xl mx-auto w-full pb-28 overflow-y-auto"
    >
      <div className="pt-2">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Configuración</h2>
        <p className="text-sm text-slate-400">Gestiona secciones, sensores y preferencias.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Tab: Secciones */}
        {activeTab === 'secciones' && (
          <motion.div key="secciones" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
            <Card className="p-4 space-y-3">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" /> Nueva sección
              </h3>
              <input
                type="text" placeholder="Nombre de la sección" value={newSeccionNombre}
                onChange={(e) => setNewSeccionNombre(e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
              />
              <input
                type="text" placeholder="Descripción (opcional)" value={newSeccionDesc}
                onChange={(e) => setNewSeccionDesc(e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
              />
              <button
                onClick={handleAddSeccion} disabled={!newSeccionNombre.trim()}
                className="w-full py-3 bg-primary text-white rounded-xl font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
              >
                <Plus className="w-4 h-4" /> Agregar sección
              </button>
            </Card>

            {secciones.length === 0 ? (
              <EmptyState icon={<Layers className="w-8 h-8" />} title="Sin secciones" desc="Crea tu primera sección del jardín para organizar el monitoreo." />
            ) : (
              secciones.map((seccion) => (
                <Card key={seccion.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${seccion.color}`} />
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-200">{seccion.nombre}</h4>
                        {seccion.descripcion && <p className="text-sm text-slate-400">{seccion.descripcion}</p>}
                      </div>
                    </div>
                    <button onClick={() => onDeleteSeccion(seccion.id)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-xs text-slate-400 font-medium mb-2">Sensores disponibles:</p>
                    <div className="flex flex-wrap gap-2">
                      {sensores.length === 0 ? (
                        <span className="text-xs text-slate-400">No hay sensores registrados</span>
                      ) : sensores.map((sensor) => {
                        const isAssigned = seccion.sensoresAsignados.includes(sensor.id);
                        return (
                          <button
                            key={sensor.id}
                            onClick={() => onAssignSensor(seccion.id, sensor.id, !isAssigned)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                              isAssigned ? `${seccion.color} text-white` : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            <SensorIcon tipo={sensor.tipo} className="w-3 h-3" />
                            {sensor.nombre}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </motion.div>
        )}

        {/* Tab: Sensores */}
        {activeTab === 'sensores' && (
          <motion.div key="sensores" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
            <Card className="p-4 space-y-3">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" /> Nuevo sensor
              </h3>
              <input
                type="text" placeholder="Nombre del sensor" value={newSensorNombre}
                onChange={(e) => setNewSensorNombre(e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
              />
              <div className="grid grid-cols-3 gap-2">
                {(['humedad', 'temperatura', 'luz'] as SensorType[]).map((tipo) => (
                  <button
                    key={tipo}
                    onClick={() => setNewSensorTipo(tipo)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                      newSensorTipo === tipo ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 dark:border-slate-700 text-slate-500'
                    }`}
                  >
                    <SensorIcon tipo={tipo} className="w-5 h-5" />
                    <span className="text-xs font-semibold capitalize">{tipo}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={handleAddSensor} disabled={!newSensorNombre.trim()}
                className="w-full py-3 bg-primary text-white rounded-xl font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
              >
                <Plus className="w-4 h-4" /> Agregar sensor
              </button>
            </Card>

            {sensores.length === 0 ? (
              <EmptyState icon={<Cpu className="w-8 h-8" />} title="Sin sensores" desc="Añade tu primer sensor para comenzar a registrar datos del jardín." />
            ) : (
              <div className="space-y-2">
                {sensores.map((sensor) => (
                  <Card key={sensor.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${sensor.tipo === 'humedad' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-500' : sensor.tipo === 'temperatura' ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-500' : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-500'}`}>
                        <SensorIcon tipo={sensor.tipo} className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{sensor.nombre}</p>
                        <p className="text-xs text-slate-400 capitalize">{sensor.tipo}</p>
                      </div>
                    </div>
                    <button onClick={() => onDeleteSensor(sensor.id)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </Card>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Tab: Config */}
        {activeTab === 'config' && (
          <motion.div key="config" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <Card className="divide-y divide-slate-100 dark:divide-slate-800">
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">Notificaciones</p>
                  <p className="text-xs text-slate-400">Alertas de condiciones críticas</p>
                </div>
                <button
                  onClick={() => setConfiguracion(c => ({ ...c, notificacionesHabilitadas: !c.notificacionesHabilitadas }))}
                  className={`relative w-12 h-6 rounded-full transition-colors ${configuracion.notificacionesHabilitadas ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${configuracion.notificacionesHabilitadas ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">Unidad de temperatura</p>
                  <p className="text-xs text-slate-400">Celsius o Fahrenheit</p>
                </div>
                <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  {(['C', 'F'] as const).map((u) => (
                    <button
                      key={u}
                      onClick={() => setConfiguracion(c => ({ ...c, unidadTemperatura: u }))}
                      className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${configuracion.unidadTemperatura === u ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-400'}`}
                    >
                      °{u}
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex gap-3">
              <Bell className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                Los datos se almacenan en el servidor de Render. Al reiniciarse el servicio, los datos efímeros se pierden — esto es esperado en el plan gratuito.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Root App ─────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: Configuracion = {
  tema: 'sistema',
  unidadTemperatura: 'C',
  frecuenciaActualizacion: 5,
  notificacionesHabilitadas: true,
  mostrarTodasSecciones: true,
};

export default function App() {
  const [view, setView] = useState<View>('welcome');
  const [lastResult, setLastResult] = useState<EvaluationResult | null>(null);
  const [history, setHistory] = useState<EvaluationResult[]>([]);
  const [secciones, setSecciones] = useState<SeccionHuerto[]>([]);
  const [sensores, setSensores] = useState<Sensor[]>([]);
  const [configuracion, setConfiguracion] = useState<Configuracion>(DEFAULT_CONFIG);
  const [seccionSeleccionada, setSeccionSeleccionada] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data from backend
  useEffect(() => {
    const load = async () => {
      try {
        const [evs, secs, sens] = await Promise.all([
          getEvaluaciones(),
          getSecciones(),
          getSensores(),
        ]);
        setHistory(evs.reverse());
        setLastResult(evs[0] ?? null);
        setSecciones(secs);
        setSensores(sens);
      } catch {
        setError('No se pudo conectar con el servidor. Verifica que el backend esté activo.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleEvaluate = useCallback(async (data: SensorData, seccionId?: string) => {
    const result = evaluateGarden(data, seccionId);
    try {
      const saved = await addEvaluacion(result);
      setHistory(prev => [saved, ...prev]);
      setLastResult(saved);
      setView('recommendations');
    } catch {
      alert('No se pudo guardar la evaluación. El servidor puede estar inactivo.');
    }
  }, []);

  const handleDeleteEvaluacion = useCallback(async (id: string) => {
    await deleteEvaluacion(id);
    setHistory(prev => prev.filter(h => h.id !== id));
    if (lastResult?.id === id) setLastResult(null);
  }, [lastResult]);

  const handleEditEvaluacion = useCallback(async (item: EvaluationResult, newData: Partial<SensorData>) => {
    const merged: SensorData = { ...item.data, ...newData };
    const newResult = evaluateGarden(merged, item.seccionId, item.sensorId);
    const updated: EvaluationResult = { ...newResult, id: item.id, timestamp: item.timestamp, seccionId: item.seccionId, sensorId: item.sensorId };
    await deleteEvaluacion(item.id);
    await addEvaluacion(updated);
    setHistory(prev => prev.map(h => h.id === item.id ? updated : h));
    if (lastResult?.id === item.id) setLastResult(updated);
  }, [lastResult]);

  const handleAddSeccion = useCallback(async (nombre: string, desc: string) => {
    const color = SECTION_COLORS[secciones.length % SECTION_COLORS.length];
    const nueva = await addSeccion({ id: generateId(), nombre, descripcion: desc, sensoresAsignados: [], color });
    setSecciones(prev => [...prev, nueva]);
  }, [secciones.length]);

  const handleDeleteSeccion = useCallback(async (id: string) => {
    if (!confirm('¿Eliminar esta sección?')) return;
    await deleteSeccion(id);
    setSecciones(prev => prev.filter(s => s.id !== id));
  }, []);

  const handleAddSensor = useCallback(async (nombre: string, tipo: SensorType) => {
    const nuevo = await addSensor({ id: generateId(), nombre, tipo, activo: true });
    setSensores(prev => [...prev, nuevo]);
  }, []);

  const handleDeleteSensor = useCallback(async (id: string) => {
    if (!confirm('¿Eliminar este sensor?')) return;
    await deleteSensor(id);
    setSensores(prev => prev.filter(s => s.id !== id));
  }, []);

  const handleAssignSensor = useCallback(async (seccionId: string, sensorId: string, assigned: boolean) => {
    const seccion = secciones.find(s => s.id === seccionId);
    if (!seccion) return;
    const nuevosAsignados = assigned
      ? [...new Set([...seccion.sensoresAsignados, sensorId])]
      : seccion.sensoresAsignados.filter(id => id !== sensorId);
    const actualizada = await updateSeccion(seccionId, { sensoresAsignados: nuevosAsignados });
    setSecciones(prev => prev.map(s => s.id === seccionId ? actualizada : s));
  }, [secciones]);

  const navItems = [
    { id: 'dashboard' as const, label: 'Inicio', icon: <Home className="w-5 h-5" /> },
    { id: 'simulator' as const, label: 'Datos', icon: <Cpu className="w-5 h-5" /> },
    { id: 'history' as const, label: 'Historial', icon: <History className="w-5 h-5" /> },
    { id: 'settings' as const, label: 'Ajustes', icon: <Settings className="w-5 h-5" /> },
  ];

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-background-light dark:bg-background-dark font-display flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-slate-400 font-medium">Conectando con el servidor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 min-h-[100dvh] flex flex-col">
      {/* Header */}
      {view !== 'welcome' && (
        <header className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            {(view === 'recommendations') && (
              <button onClick={() => setView('dashboard')} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <ArrowLeft className="w-5 h-5 text-primary" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary/10 rounded-lg overflow-hidden flex items-center justify-center">
                <img src="/images/polijardin.png" alt="PoliJardín" className="w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                <Leaf className="w-4 h-4 text-primary" />
              </div>
              <span className="text-base font-bold tracking-tight">PoliJardín</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {error && (
              <span className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-lg border border-red-200 dark:border-red-900">
                Sin servidor
              </span>
            )}
            <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative">
              <Bell className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              {history.some(h => h.status === 'Alerta') && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>
          </div>
        </header>
      )}

      {/* Error banner */}
      {error && view !== 'welcome' && (
        <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-4 py-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <AnimatePresence mode="wait">
          {view === 'welcome' && (
            <WelcomeView key="welcome" onStart={() => setView('dashboard')} />
          )}
          {view === 'dashboard' && (
            <DashboardView key="dashboard" lastResult={lastResult} onSimulate={() => setView('simulator')}
              secciones={secciones} seccionSeleccionada={seccionSeleccionada}
              onSeleccionarSeccion={setSeccionSeleccionada} history={history} />
          )}
          {view === 'simulator' && (
            <SimulatorView key="simulator" onEvaluate={handleEvaluate}
              secciones={secciones} seccionSeleccionada={seccionSeleccionada}
              onSeleccionarSeccion={setSeccionSeleccionada} />
          )}
          {view === 'recommendations' && lastResult && (
            <RecommendationsView key="recommendations" result={lastResult} onBack={() => setView('dashboard')} />
          )}
          {view === 'history' && (
            <HistoryView key="history" history={history} secciones={secciones}
              onDelete={handleDeleteEvaluacion} onEdit={handleEditEvaluacion} />
          )}
          {view === 'settings' && (
            <SettingsView key="settings" sensores={sensores} secciones={secciones}
              configuracion={configuracion} setConfiguracion={setConfiguracion}
              onAddSeccion={handleAddSeccion} onDeleteSeccion={handleDeleteSeccion}
              onAddSensor={handleAddSensor} onDeleteSensor={handleDeleteSensor}
              onAssignSensor={handleAssignSensor} />
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Nav */}
      {view !== 'welcome' && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-100 dark:border-slate-800 flex px-2 pb-safe pt-2">
          {navItems.map((item) => {
            const active = view === item.id || (item.id === 'dashboard' && view === 'recommendations');
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-1 transition-all ${active ? 'text-primary' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
              >
                <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-primary/10' : ''}`}>
                  {item.icon}
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider">{item.label}</p>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
