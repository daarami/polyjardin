import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'motion/react';
import {
  Leaf, Activity, Cpu, Bell, Settings, Home, Droplets, Thermometer,
  Sun, CheckCircle2, Cloud, CloudSun, History, Filter, Layers, Zap,
  AlertTriangle, Plus, Trash2, Edit, Save, X, MapPin, Gauge,
  Sunset, Sparkles, Clock, ArrowLeft, BellOff, BellRing,
  BarChart2, BookOpen, Map, TrendingUp, TrendingDown, Minus,
  Wind, Flower2, Bug, Eye, ChevronRight, Star, Info,
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
    try { return crypto.randomUUID(); } catch { }
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
};

type View = 'welcome' | 'dashboard' | 'simulator' | 'recommendations' | 'history' | 'settings' | 'stats' | 'guide' | 'map';

// ─── Animated Counter ─────────────────────────────────────────────────────────
const AnimatedNumber = ({ value, decimals = 0 }: { value: number; decimals?: number }) => {
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, v => v.toFixed(decimals));
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    const controls = animate(motionVal, value, { duration: 1, ease: 'easeOut' });
    const unsub = rounded.on('change', v => setDisplay(v));
    return () => { controls.stop(); unsub(); };
  }, [value]);

  return <span>{display}</span>;
};

// ─── Shared UI primitives ────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: EvaluationResult['status'] }) => {
  const cfg = {
    Óptimo: { bg: 'bg-primary/10 border-primary/30 text-primary', dot: 'bg-primary' },
    Atención: { bg: 'bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
    Alerta: { bg: 'bg-red-100 border-red-300 text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-400', dot: 'bg-red-500' },
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

// ─── Organic background blob ──────────────────────────────────────────────────
const OrganicBlob = ({ className }: { className?: string }) => (
  <div className={`pointer-events-none absolute rounded-full blur-3xl opacity-[0.07] ${className}`} />
);

// ─── Sparkline mini chart ─────────────────────────────────────────────────────
const Sparkline = ({ data, color = '#66a423', height = 40 }: { data: number[]; color?: string; height?: number }) => {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 100;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={`0,${height} ${pts} ${w},${height}`} fill={color} fillOpacity="0.12" stroke="none" />
    </svg>
  );
};

// ─── Notifications Panel ──────────────────────────────────────────────────────

const NotificationsPanel = ({
  history, secciones, onClose, onMarkAllRead, unreadIds,
}: {
  history: EvaluationResult[];
  secciones: SeccionHuerto[];
  onClose: () => void;
  onMarkAllRead: () => void;
  unreadIds: Set<string>;
}) => {
  const alerts = history.filter(h => h.status === 'Alerta' || h.status === 'Atención');
  const unreadCount = alerts.filter(a => unreadIds.has(a.id)).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex justify-end"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative w-full max-w-sm h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <BellRing className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-slate-900 dark:text-white">Notificaciones</h2>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button onClick={onMarkAllRead} className="text-xs text-primary font-semibold hover:opacity-70 transition-opacity">
                Marcar leídas
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <BellOff className="w-8 h-8 text-slate-300" />
              </div>
              <p className="font-semibold text-slate-600 dark:text-slate-400">Sin alertas</p>
              <p className="text-sm text-slate-400 leading-relaxed">Todas las condiciones están en óptimas condiciones.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {alerts.map((item) => {
                const seccion = item.seccionId ? secciones.find(s => s.id === item.seccionId) : null;
                const isUnread = unreadIds.has(item.id);
                const isAlerta = item.status === 'Alerta';
                return (
                  <motion.div key={item.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                    className={`px-5 py-4 relative ${isUnread ? 'bg-slate-50 dark:bg-slate-800/50' : ''}`}>
                    {isUnread && <span className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />}
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 p-2 rounded-xl shrink-0 ${isAlerta ? 'bg-red-100 dark:bg-red-900/20 text-red-500' : 'bg-amber-100 dark:bg-amber-900/20 text-amber-500'}`}>
                        {isAlerta ? <AlertTriangle className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <StatusBadge status={item.status} />
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {new Date(item.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                          {item.recommendations.join(' · ')}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] text-slate-400">
                            {new Date(item.timestamp).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                          </span>
                          {seccion && (
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${seccion.color} text-white`}>
                              <MapPin className="w-2.5 h-2.5" />{seccion.nombre}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
        {alerts.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <p className="text-xs text-slate-400 text-center">
              {alerts.filter(a => a.status === 'Alerta').length} alertas críticas · {alerts.filter(a => a.status === 'Atención').length} avisos
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

// ─── Welcome View ─────────────────────────────────────────────────────────────

const WelcomeView = ({ onStart }: { onStart: () => void }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="flex flex-col flex-1 justify-center items-center px-6 py-8 min-h-[100dvh] relative overflow-hidden"
  >
    {/* Organic background blobs */}
    <OrganicBlob className="w-96 h-96 bg-primary -top-24 -left-24" />
    <OrganicBlob className="w-72 h-72 bg-emerald-400 bottom-0 right-0" />
    <OrganicBlob className="w-48 h-48 bg-lime-300 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 120, damping: 18, delay: 0.1 }}
      className="relative mb-10"
    >
      <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl scale-150" />
      <div className="absolute w-full h-full border-2 border-dashed border-primary/20 rounded-full animate-spin-slow" />
      <div className="relative w-52 h-52 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-white dark:border-slate-700 overflow-hidden transform rotate-[-3deg] hover:rotate-0 transition-transform duration-500">
        <img src="/images/polijardin.png" alt="PoliJardín" className="w-full h-full object-cover"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <Leaf className="w-20 h-20 text-primary opacity-20" />
        </div>
      </div>
    </motion.div>

    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }} className="text-center mb-8">
      <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-3">
        Jardín <span className="text-primary">Polinizador</span><br />Inteligente
      </h1>
      <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed max-w-xs mx-auto">
        Monitorea temperatura, humedad y luz solar de tu jardín en tiempo real.
      </p>
    </motion.div>

    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35 }} className="flex flex-wrap gap-2 justify-center mb-10">
      {['Sensores IoT', 'Historial', 'Alertas', 'Secciones', 'Estadísticas', 'Guía', 'Mapa'].map((f, i) => (
        <motion.span key={f} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 + i * 0.05 }}
          className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
          {f}
        </motion.span>
      ))}
    </motion.div>

    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.45 }} className="w-full max-w-sm">
      <button onClick={onStart}
        className="w-full flex items-center justify-center gap-3 h-14 px-8 bg-primary text-white text-base font-bold rounded-2xl shadow-lg shadow-primary/30 active:scale-95 transition-transform">
        <Activity className="w-5 h-5" />
        Iniciar monitoreo
      </button>
      <p className="text-center text-xs text-slate-400 mt-4">Los datos efímeros se reinician al recargar el servidor.</p>
    </motion.div>
  </motion.div>
);

// ─── Dashboard View ───────────────────────────────────────────────────────────

const MetricCard = ({ icon, label, value, unit, barPct, barColor, badge, badgeColor }: {
  icon: React.ReactNode; label: string; value: string | number;
  unit: string; barPct: number; barColor: string; badge: string; badgeColor: string;
}) => (
  <Card className="p-5 flex flex-col gap-3 relative overflow-hidden">
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

const DashboardView = ({ lastResult, onSimulate, secciones, seccionSeleccionada, onSeleccionarSeccion, history }: {
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
    Óptimo: { bg: 'bg-primary/8 border-primary/20', icon: <CheckCircle2 className="w-6 h-6 text-primary" />, text: 'text-primary', label: 'Todo en orden' },
    Atención: { bg: 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800', icon: <Zap className="w-6 h-6 text-amber-500" />, text: 'text-amber-700 dark:text-amber-400', label: 'Requiere atención' },
    Alerta: { bg: 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800', icon: <AlertTriangle className="w-6 h-6 text-red-500" />, text: 'text-red-700 dark:text-red-400', label: 'Alerta crítica' },
  }[status];

  // Last 7 humidity values for sparkline
  const humSparkline = history.slice(0, 7).reverse().map(h => h.data.humedad);
  const tempSparkline = history.slice(0, 7).reverse().map(h => h.data.temperatura);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="flex-1 p-4 space-y-4 max-w-2xl mx-auto w-full pb-28 overflow-y-auto relative">

      <OrganicBlob className="w-64 h-64 bg-primary -top-10 -right-20" />

      <div className="flex items-center justify-between pt-2 relative">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Estado del Jardín</h2>
          <p className="text-sm text-slate-400">
            {seccionSeleccionada ? `Sección: ${secciones.find(s => s.id === seccionSeleccionada)?.nombre}` : 'Todas las secciones'}
          </p>
        </div>
        {secciones.length > 0 && (
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select value={seccionSeleccionada || ''} onChange={(e) => onSeleccionarSeccion(e.target.value || null)}
              className="text-sm bg-transparent focus:outline-none text-slate-700 dark:text-slate-300">
              <option value="">Todas</option>
              {secciones.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className={`rounded-2xl border p-4 flex items-center gap-4 ${statusCfg.bg}`}>
        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm">{statusCfg.icon}</div>
        <div className="flex-1 min-w-0">
          <p className={`font-bold ${statusCfg.text}`}>{statusCfg.label}</p>
          <p className="text-sm text-slate-600 dark:text-slate-400 truncate">{summary}</p>
        </div>
        <button onClick={onSimulate}
          className="shrink-0 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 active:scale-95 transition-all">
          Simular
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Óptimo', value: optimoPct, unit: '%', icon: <CheckCircle2 className="w-4 h-4 text-primary" /> },
          { label: 'Registros', value: totalRegistros, unit: '', icon: <History className="w-4 h-4 text-blue-500" /> },
          { label: 'Secciones', value: secciones.length, unit: '', icon: <Layers className="w-4 h-4 text-purple-500" /> },
        ].map((s) => (
          <Card key={s.label} className="p-3 text-center">
            <div className="flex justify-center mb-1">{s.icon}</div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              <AnimatedNumber value={s.value} />{s.unit}
            </p>
            <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Metric cards with sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4 flex flex-col gap-2 overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20"><Droplets className="w-4 h-4 text-blue-500" /></div>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Humedad</span>
            </div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${data.humedad > 50 ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'}`}>
              {data.humedad > 50 ? 'Óptimo' : 'Bajo'}
            </span>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{data.humedad}<span className="text-sm font-normal text-slate-400 ml-0.5">%</span></p>
          {humSparkline.length >= 2 && <Sparkline data={humSparkline} color="#3b82f6" height={36} />}
        </Card>

        <Card className="p-4 flex flex-col gap-2 overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-900/20"><Thermometer className="w-4 h-4 text-orange-500" /></div>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Temperatura</span>
            </div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${data.temperatura <= 32 ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
              {data.temperatura <= 32 ? 'Estable' : 'Alto'}
            </span>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{data.temperatura}<span className="text-sm font-normal text-slate-400 ml-0.5">°C</span></p>
          {tempSparkline.length >= 2 && <Sparkline data={tempSparkline} color="#f97316" height={36} />}
        </Card>

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

      {/* Ideal ranges */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-primary">Rangos ideales para polinizadores</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: <Droplets className="w-4 h-4 text-blue-500" />, val: '50–70%', lbl: 'Humedad', ok: data.humedad >= 50 && data.humedad <= 70 },
            { icon: <Thermometer className="w-4 h-4 text-orange-500" />, val: '20–28°C', lbl: 'Temperatura', ok: data.temperatura >= 20 && data.temperatura <= 28 },
            { icon: <Sun className="w-4 h-4 text-yellow-500" />, val: 'Alto', lbl: 'Luz solar', ok: data.luz === 'Alto' },
          ].map((item) => (
            <div key={item.lbl} className={`rounded-xl p-3 text-center border ${item.ok ? 'bg-primary/5 border-primary/20' : 'bg-slate-50 dark:bg-slate-800 border-transparent'}`}>
              <div className="flex justify-center mb-1">{item.icon}</div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{item.val}</p>
              <p className="text-[10px] text-slate-400">{item.lbl}</p>
              {item.ok && <CheckCircle2 className="w-3 h-3 text-primary mx-auto mt-1" />}
            </div>
          ))}
        </div>
      </Card>

      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex gap-3">
        <Sparkles className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
          <span className="font-bold">¿Sabías que?</span> Las abejas polinizan 1 de cada 3 alimentos que consumimos. Un jardín saludable puede aumentar la polinización hasta un 70%.
        </p>
      </div>

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

const SimulatorView = ({ onEvaluate, secciones, seccionSeleccionada, onSeleccionarSeccion }: {
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

  const presets: { label: string; icon: React.ReactNode; h: number; t: number; l: LightLevel }[] = [
    { label: 'Primavera ideal', icon: <Flower2 className="w-4 h-4" />, h: 62, t: 22, l: 'Alto' },
    { label: 'Verano seco', icon: <Sun className="w-4 h-4" />, h: 30, t: 38, l: 'Alto' },
    { label: 'Día nublado', icon: <Cloud className="w-4 h-4" />, h: 75, t: 18, l: 'Bajo' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="flex-1 p-4 space-y-5 max-w-lg mx-auto w-full pb-28 overflow-y-auto">
      <div className="pt-2">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Ingresar Datos</h2>
        <p className="text-sm text-slate-400">Registra las condiciones actuales del jardín.</p>
      </div>

      {/* Quick presets */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
        {presets.map((p) => (
          <button key={p.label} onClick={() => { setHumedad(p.h); setTemperatura(p.t); setLuz(p.l); }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap hover:border-primary/50 hover:text-primary transition-all active:scale-95 shrink-0">
            <span className="text-primary">{p.icon}</span>{p.label}
          </button>
        ))}
      </div>

      {secciones.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-primary" />
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Sección del jardín</label>
          </div>
          <select value={seccionSeleccionada || ''} onChange={(e) => onSeleccionarSeccion(e.target.value || null)}
            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm">
            <option value="">Sin sección específica</option>
            {secciones.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </Card>
      )}

      {/* Live preview badge */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-primary/5 border border-primary/15 rounded-2xl">
        <Eye className="w-4 h-4 text-primary shrink-0" />
        <span className="text-xs text-primary font-semibold">Vista previa: </span>
        <StatusBadge status={
          (humedad < 30 || humedad > 85 || temperatura > 35 || temperatura < 10) ? 'Alerta' :
          (humedad < 50 || temperatura > 28 || luz === 'Bajo') ? 'Atención' : 'Óptimo'
        } />
      </div>

      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Droplets className="w-5 h-5 text-blue-500" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">Humedad del suelo</span>
          </div>
          <span className="text-2xl font-bold text-primary">{humedad}<span className="text-sm font-normal text-slate-400">%</span></span>
        </div>
        <input type="range" min="0" max="100" value={humedad}
          onChange={(e) => setHumedad(+e.target.value)}
          className="w-full h-2 bg-blue-100 dark:bg-blue-900/30 rounded-full accent-blue-500 cursor-pointer" />
        <div className="flex justify-between text-xs text-slate-400">
          <span>Seco (0%)</span><span>Saturado (100%)</span>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Thermometer className="w-5 h-5 text-orange-500" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">Temperatura</span>
          </div>
          <span className="text-2xl font-bold text-primary">{temperatura}<span className="text-sm font-normal text-slate-400">°C</span></span>
        </div>
        <input type="range" min="0" max="50" value={temperatura}
          onChange={(e) => setTemperatura(+e.target.value)}
          className="w-full h-2 bg-orange-100 dark:bg-orange-900/30 rounded-full accent-orange-500 cursor-pointer" />
        <div className="flex justify-between text-xs text-slate-400">
          <span>Frío (0°C)</span><span>Caliente (50°C)</span>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Sun className="w-5 h-5 text-yellow-500" />
          <span className="font-semibold text-slate-800 dark:text-slate-200">Nivel de luz solar</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {(['Bajo', 'Medio', 'Alto'] as LightLevel[]).map((level) => (
            <button key={level} onClick={() => setLuz(level)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all active:scale-95 ${
                luz === level ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
              }`}>
              {level === 'Bajo' ? <Cloud className="w-7 h-7" /> : level === 'Medio' ? <CloudSun className="w-7 h-7" /> : <Sun className="w-7 h-7" />}
              <span className="text-sm font-bold">{level}</span>
            </button>
          ))}
        </div>
      </Card>

      <button onClick={handleEvaluate} disabled={loading}
        className="w-full bg-primary text-white py-5 rounded-2xl text-base font-bold shadow-lg shadow-primary/25 hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed">
        {loading ? <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
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
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
      className="flex-1 p-4 space-y-4 max-w-lg mx-auto w-full pb-28 overflow-y-auto">
      <div className="pt-2">
        <div className="flex items-center gap-2 mb-1"><StatusBadge status={result.status} /></div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-2">Recomendaciones</h2>
        <p className="text-sm text-slate-400">Basado en la evaluación más reciente.</p>
      </div>
      <div className="space-y-3">
        {result.recommendations.map((rec, idx) => {
          const cfg = recConfig(rec);
          return (
            <motion.div key={idx} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.08 }}
              className={`flex items-start gap-4 p-4 rounded-2xl border ${cfg.bg}`}>
              <div className={`shrink-0 mt-0.5 ${cfg.color}`}>{cfg.icon}</div>
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{rec}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  {rec.includes('riego') ? 'La humedad del suelo es clave para tus flores polinizadoras.'
                    : rec.includes('sombra') ? 'Protege los brotes jóvenes del calor extremo.'
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
      <button onClick={onBack}
        className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all">
        Volver al inicio
      </button>
    </motion.div>
  );
};

// ─── History View ─────────────────────────────────────────────────────────────

const HistoryView = ({ history, secciones, onDelete, onEdit }: {
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
    setModalItem(item); setEditMode(false);
    setEditHumedad(item.data.humedad); setEditTemp(item.data.temperatura); setEditLuz(item.data.luz);
  };

  const handleDelete = async () => {
    if (!modalItem || !confirm('¿Eliminar este registro?')) return;
    await onDelete(modalItem.id); setModalItem(null);
  };

  const handleEdit = async () => {
    if (!modalItem) return;
    await onEdit(modalItem, { humedad: editHumedad, temperatura: editTemp, luz: editLuz });
    setModalItem(null); setEditMode(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="flex-1 p-4 space-y-4 max-w-2xl mx-auto w-full pb-28 overflow-y-auto">
      <div className="flex items-center justify-between pt-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Historial</h2>
          <p className="text-sm text-slate-400">{filtered.length} registros</p>
        </div>
        {secciones.length > 0 && (
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select value={filtroSeccion} onChange={(e) => setFiltroSeccion(e.target.value)}
              className="text-sm bg-transparent focus:outline-none text-slate-700 dark:text-slate-300">
              <option value="">Todas</option>
              {secciones.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<History className="w-8 h-8" />} title="Sin registros"
          desc={filtroSeccion ? 'No hay evaluaciones para esta sección.' : 'Usa el simulador para crear tu primer registro.'} />
      ) : (
        <AnimatePresence>
          {filtered.map((item, idx) => {
            const seccion = item.seccionId ? secciones.find(s => s.id === item.seccionId) : null;
            return (
              <motion.button key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                onClick={() => openModal(item)}
                className="w-full text-left rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden hover:border-primary/40 active:scale-[0.99] transition-all shadow-sm">
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
                          <MapPin className="w-3 h-3" />{seccion.nombre}
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

      <AnimatePresence>
        {modalItem && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) { setModalItem(null); setEditMode(false); } }}>
            <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
              className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
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
                      <input type="range" min="0" max="100" value={editHumedad} onChange={e => setEditHumedad(+e.target.value)} className="w-full h-2 accent-primary" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-semibold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                          <Thermometer className="w-4 h-4 text-orange-500" /> Temperatura
                        </label>
                        <span className="text-sm font-bold text-primary">{editTemp}°C</span>
                      </div>
                      <input type="range" min="0" max="50" value={editTemp} onChange={e => setEditTemp(+e.target.value)} className="w-full h-2 accent-primary" />
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
                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />{r}
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

// ─── NEW: Stats View ──────────────────────────────────────────────────────────

const StatsView = ({ history, secciones }: { history: EvaluationResult[]; secciones: SeccionHuerto[] }) => {
  const [period, setPeriod] = useState<'all' | '10' | '5'>('10');
  const sliced = period === 'all' ? history : history.slice(0, period === '10' ? 10 : 5);
  const reversed = [...sliced].reverse();

  const avgHum = sliced.length ? Math.round(sliced.reduce((a, b) => a + b.data.humedad, 0) / sliced.length) : 0;
  const avgTemp = sliced.length ? +(sliced.reduce((a, b) => a + b.data.temperatura, 0) / sliced.length).toFixed(1) : 0;
  const optPct = sliced.length ? Math.round(sliced.filter(h => h.status === 'Óptimo').length / sliced.length * 100) : 0;
  const alertCount = sliced.filter(h => h.status === 'Alerta').length;
  const atencCount = sliced.filter(h => h.status === 'Atención').length;

  const maxHum = sliced.length ? Math.max(...sliced.map(h => h.data.humedad)) : 0;
  const minHum = sliced.length ? Math.min(...sliced.map(h => h.data.humedad)) : 0;
  const maxTemp = sliced.length ? Math.max(...sliced.map(h => h.data.temperatura)) : 0;
  const minTemp = sliced.length ? Math.min(...sliced.map(h => h.data.temperatura)) : 0;

  const lightDist = ['Alto', 'Medio', 'Bajo'].map(l => ({
    label: l, count: sliced.filter(h => h.data.luz === l).length,
    pct: sliced.length ? Math.round(sliced.filter(h => h.data.luz === l).length / sliced.length * 100) : 0,
    color: l === 'Alto' ? 'bg-yellow-400' : l === 'Medio' ? 'bg-blue-400' : 'bg-slate-300',
  }));

  // Status distribution
  const statusDist = [
    { label: 'Óptimo', count: sliced.filter(h => h.status === 'Óptimo').length, color: 'bg-primary', textColor: 'text-primary' },
    { label: 'Atención', count: atencCount, color: 'bg-amber-400', textColor: 'text-amber-600' },
    { label: 'Alerta', count: alertCount, color: 'bg-red-500', textColor: 'text-red-600' },
  ];

  // Trend: compare last 3 vs prev 3 for humidity
  const last3 = history.slice(0, 3);
  const prev3 = history.slice(3, 6);
  const humTrend = last3.length && prev3.length
    ? (last3.reduce((a, b) => a + b.data.humedad, 0) / last3.length) - (prev3.reduce((a, b) => a + b.data.humedad, 0) / prev3.length)
    : 0;
  const tempTrend = last3.length && prev3.length
    ? (last3.reduce((a, b) => a + b.data.temperatura, 0) / last3.length) - (prev3.reduce((a, b) => a + b.data.temperatura, 0) / prev3.length)
    : 0;

  const TrendIcon = ({ v }: { v: number }) =>
    v > 0.5 ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> :
    v < -0.5 ? <TrendingDown className="w-3.5 h-3.5 text-red-500" /> :
    <Minus className="w-3.5 h-3.5 text-slate-400" />;

  const humVals = reversed.map(h => h.data.humedad);
  const tempVals = reversed.map(h => h.data.temperatura);
  const BAR_W = 100;
  const CHART_H = 80;

  const renderBarChart = (vals: number[], color: string, unit: string) => {
    if (!vals.length) return null;
    const max = Math.max(...vals) * 1.1 || 1;
    return (
      <div className="flex items-end gap-1 h-20 mt-2">
        {vals.map((v, i) => (
          <motion.div key={i} className="flex-1 relative group"
            initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: i * 0.04, duration: 0.4 }}
            style={{ transformOrigin: 'bottom' }}>
            <div className="relative" style={{ height: `${(v / max) * 100}%`, minHeight: 4 }}>
              <div className={`w-full h-full rounded-t-sm ${color} opacity-80 group-hover:opacity-100 transition-opacity`} />
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                {v}{unit}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  if (history.length === 0) return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="flex-1 p-4 max-w-2xl mx-auto w-full pb-28 overflow-y-auto">
      <div className="pt-2 mb-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Estadísticas</h2>
        <p className="text-sm text-slate-400">Análisis de tus datos históricos.</p>
      </div>
      <EmptyState icon={<BarChart2 className="w-8 h-8" />} title="Sin datos aún"
        desc="Registra al menos una evaluación para ver estadísticas detalladas." />
    </motion.div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="flex-1 p-4 space-y-4 max-w-2xl mx-auto w-full pb-28 overflow-y-auto">
      <div className="flex items-center justify-between pt-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Estadísticas</h2>
          <p className="text-sm text-slate-400">Análisis de {sliced.length} registros</p>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          {([['5', 'Últ. 5'], ['10', 'Últ. 10'], ['all', 'Todo']] as const).map(([v, l]) => (
            <button key={v} onClick={() => setPeriod(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${period === v ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-400'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Humedad prom.', value: avgHum, unit: '%', icon: <Droplets className="w-4 h-4 text-blue-500" />, trend: humTrend, bg: 'bg-blue-50 dark:bg-blue-900/10' },
          { label: 'Temperatura prom.', value: avgTemp, unit: '°C', icon: <Thermometer className="w-4 h-4 text-orange-500" />, trend: tempTrend, bg: 'bg-orange-50 dark:bg-orange-900/10' },
        ].map(kpi => (
          <Card key={kpi.label} className={`p-4 ${kpi.bg}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-white dark:bg-slate-900 rounded-lg shadow-sm">{kpi.icon}</div>
              <div className="flex items-center gap-1">
                <TrendIcon v={kpi.trend} />
                <span className={`text-[10px] font-semibold ${Math.abs(kpi.trend) > 0.5 ? kpi.trend > 0 ? 'text-emerald-600' : 'text-red-500' : 'text-slate-400'}`}>
                  {kpi.trend > 0.5 ? '+' : ''}{kpi.trend !== 0 ? kpi.trend.toFixed(1) : '—'}
                </span>
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{kpi.value}<span className="text-sm font-normal text-slate-400 ml-0.5">{kpi.unit}</span></p>
            <p className="text-xs text-slate-500 mt-0.5">{kpi.label}</p>
          </Card>
        ))}
      </div>

      {/* Min/max */}
      <Card className="p-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Rango del período</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Droplets className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-xs text-slate-500 font-semibold">Humedad</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Min</span>
              <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-300 rounded-full" style={{ width: `${minHum}%` }} />
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 w-8">{minHum}%</span>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs text-slate-400">Max</span>
              <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${maxHum}%` }} />
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 w-8">{maxHum}%</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Thermometer className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-xs text-slate-500 font-semibold">Temperatura</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Min</span>
              <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-orange-300 rounded-full" style={{ width: `${(minTemp / 50) * 100}%` }} />
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 w-10">{minTemp}°C</span>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs text-slate-400">Max</span>
              <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full" style={{ width: `${(maxTemp / 50) * 100}%` }} />
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 w-10">{maxTemp}°C</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Humidity bar chart */}
      {humVals.length >= 2 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Humedad por registro</span>
            </div>
            <span className="text-xs text-slate-400">últimos {humVals.length}</span>
          </div>
          {/* Optimal zone indicator */}
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-3 h-1.5 rounded-full bg-primary/30" />
            <span className="text-[10px] text-slate-400">Zona óptima: 50–70%</span>
          </div>
          {renderBarChart(humVals, 'bg-blue-400', '%')}
        </Card>
      )}

      {/* Temp bar chart */}
      {tempVals.length >= 2 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Temperatura por registro</span>
            </div>
            <span className="text-xs text-slate-400">últimos {tempVals.length}</span>
          </div>
          {renderBarChart(tempVals, 'bg-orange-400', '°C')}
        </Card>
      )}

      {/* Status distribution donut-like */}
      <Card className="p-4">
        <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Distribución de estado</p>
        <div className="flex items-center gap-3 mb-3">
          {statusDist.map(s => (
            <div key={s.label} className="flex-1 flex flex-col items-center gap-1">
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{s.count}</p>
              <p className={`text-xs font-semibold ${s.textColor}`}>{s.label}</p>
            </div>
          ))}
        </div>
        <div className="h-2.5 flex rounded-full overflow-hidden gap-0.5">
          {statusDist.map(s => (
            s.count > 0 ? (
              <motion.div key={s.label} className={`${s.color} h-full rounded-full`}
                initial={{ flex: 0 }} animate={{ flex: s.count }} transition={{ duration: 0.6, ease: 'easeOut' }} />
            ) : null
          ))}
        </div>
        <p className="text-center text-xs text-primary font-bold mt-2">{optPct}% óptimo</p>
      </Card>

      {/* Light distribution */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sun className="w-4 h-4 text-yellow-500" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Distribución de luz</p>
        </div>
        <div className="space-y-2.5">
          {lightDist.map(l => (
            <div key={l.label} className="flex items-center gap-3">
              <span className="text-xs text-slate-500 w-12 shrink-0">{l.label}</span>
              <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <motion.div className={`h-full rounded-full ${l.color}`}
                  initial={{ width: 0 }} animate={{ width: `${l.pct}%` }} transition={{ duration: 0.6, delay: 0.2 }} />
              </div>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 w-10 text-right">{l.pct}%</span>
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
};

// ─── NEW: Plant Guide View ────────────────────────────────────────────────────

const PLANTS = [
  {
    name: 'Lavanda',
    latin: 'Lavandula angustifolia',
    icon: '🌿',
    color: 'bg-purple-100 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
    iconBg: 'bg-purple-100 dark:bg-purple-900/20 text-purple-600',
    temp: '15–25°C',
    humidity: '30–50%',
    light: 'Alto',
    pollinators: ['Abejas', 'Mariposas'],
    tip: 'Prospera en suelos bien drenados. Evita el exceso de riego.',
    stars: 5,
  },
  {
    name: 'Girasol',
    latin: 'Helianthus annuus',
    icon: '🌻',
    color: 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800',
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600',
    temp: '20–30°C',
    humidity: '40–60%',
    light: 'Alto',
    pollinators: ['Abejas', 'Abejorros'],
    tip: 'Orientar hacia el sur. Tolera bien el calor y la sequía leve.',
    stars: 5,
  },
  {
    name: 'Menta',
    latin: 'Mentha spp.',
    icon: '🌱',
    color: 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800',
    iconBg: 'bg-green-100 dark:bg-green-900/20 text-green-600',
    temp: '18–24°C',
    humidity: '55–75%',
    light: 'Medio',
    pollinators: ['Abejas', 'Sírfidos'],
    tip: 'Puede invadir. Plantar en maceta. Prefiere sombra parcial.',
    stars: 4,
  },
  {
    name: 'Albahaca',
    latin: 'Ocimum basilicum',
    icon: '🌿',
    color: 'bg-lime-50 dark:bg-lime-900/10 border-lime-200 dark:border-lime-800',
    iconBg: 'bg-lime-100 dark:bg-lime-900/20 text-lime-600',
    temp: '22–30°C',
    humidity: '50–65%',
    light: 'Alto',
    pollinators: ['Abejas', 'Mariposas'],
    tip: 'Sensible al frío. Retirar flores para prolongar vida útil.',
    stars: 4,
  },
  {
    name: 'Caléndula',
    latin: 'Calendula officinalis',
    icon: '🌼',
    color: 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800',
    iconBg: 'bg-orange-100 dark:bg-orange-900/20 text-orange-500',
    temp: '15–22°C',
    humidity: '45–65%',
    light: 'Alto',
    pollinators: ['Abejas', 'Mariposas', 'Abejorros'],
    tip: 'Repele plagas naturalmente. Floración larga y resistente.',
    stars: 5,
  },
  {
    name: 'Tomillo',
    latin: 'Thymus vulgaris',
    icon: '🌿',
    color: 'bg-teal-50 dark:bg-teal-900/10 border-teal-200 dark:border-teal-800',
    iconBg: 'bg-teal-100 dark:bg-teal-900/20 text-teal-600',
    temp: '18–26°C',
    humidity: '30–50%',
    light: 'Alto',
    pollinators: ['Abejas', 'Abejorros'],
    tip: 'Muy resistente a la sequía. Excelente planta compañera.',
    stars: 4,
  },
];

const POLLINATORS = [
  { name: 'Abeja melífera', icon: <Bug className="w-5 h-5" />, desc: 'Polinizador principal. Prefiere flores ricas en néctar como lavanda y caléndula.', color: 'bg-amber-100 dark:bg-amber-900/20 text-amber-700' },
  { name: 'Mariposa', icon: <Sparkles className="w-5 h-5" />, desc: 'Atraída por flores de colores brillantes. Necesita plantas huésped para reproducirse.', color: 'bg-pink-100 dark:bg-pink-900/20 text-pink-700' },
  { name: 'Abejorro', icon: <Zap className="w-5 h-5" />, desc: 'Polinizador de vibración. Esencial para tomates y pimientos. Activo en días nublados.', color: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700' },
  { name: 'Sírfido', icon: <Wind className="w-5 h-5" />, desc: 'Parecido a avispa pero inofensivo. Larvae controlan pulgones. Gran aliado del jardín.', color: 'bg-green-100 dark:bg-green-900/20 text-green-700' },
];

const GuideView = () => {
  const [selectedPlant, setSelectedPlant] = useState<typeof PLANTS[0] | null>(null);
  const [activeTab, setActiveTab] = useState<'plantas' | 'polinizadores'>('plantas');

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="flex-1 p-4 space-y-4 max-w-2xl mx-auto w-full pb-28 overflow-y-auto">
      <div className="pt-2">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Guía de Plantas</h2>
        <p className="text-sm text-slate-400">Plantas ideales para atraer polinizadores.</p>
      </div>

      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
        {[['plantas', <Flower2 className="w-4 h-4" />, 'Plantas'], ['polinizadores', <Bug className="w-4 h-4" />, 'Polinizadores']].map(([id, icon, label]) => (
          <button key={id as string} onClick={() => setActiveTab(id as any)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === id ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-400'}`}>
            {icon as React.ReactNode}{label as string}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'plantas' && (
          <motion.div key="plantas" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-3">
            {PLANTS.map((plant, i) => (
              <motion.button key={plant.name} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                onClick={() => setSelectedPlant(plant)}
                className={`w-full text-left p-4 rounded-2xl border ${plant.color} active:scale-[0.99] transition-all`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${plant.iconBg}`}>
                    <Leaf className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-slate-800 dark:text-slate-200">{plant.name}</p>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, si) => (
                          <Star key={si} className={`w-3 h-3 ${si < plant.stars ? 'text-amber-400 fill-amber-400' : 'text-slate-200 dark:text-slate-700'}`} />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 italic mb-2">{plant.latin}</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                        <Thermometer className="w-3 h-3 text-orange-400" />{plant.temp}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                        <Droplets className="w-3 h-3 text-blue-400" />{plant.humidity}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                        <Sun className="w-3 h-3 text-yellow-400" />{plant.light}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}

        {activeTab === 'polinizadores' && (
          <motion.div key="pollinators" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-3">
            {POLLINATORS.map((p, i) => (
              <motion.div key={p.name} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl shrink-0 ${p.color}`}>{p.icon}</div>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{p.name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">{p.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex gap-3">
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                <span className="font-bold text-primary">Consejo:</span> Para atraer más polinizadores, combina plantas de diferentes familias y alturas. La diversidad es clave.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Plant detail modal */}
      <AnimatePresence>
        {selectedPlant && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setSelectedPlant(null); }}>
            <motion.div initial={{ y: 80, opacity: 0, scale: 0.95 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 80, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 220, damping: 26 }}
              className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
              <div className={`p-5 ${selectedPlant.color}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex gap-0.5 mb-2">
                      {Array.from({ length: 5 }).map((_, si) => (
                        <Star key={si} className={`w-3.5 h-3.5 ${si < selectedPlant.stars ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />
                      ))}
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200">{selectedPlant.name}</h3>
                    <p className="text-sm text-slate-500 italic">{selectedPlant.latin}</p>
                  </div>
                  <button onClick={() => setSelectedPlant(null)}
                    className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: <Thermometer className="w-4 h-4 text-orange-500" />, val: selectedPlant.temp, lbl: 'Temperatura', bg: 'bg-orange-50 dark:bg-orange-900/20' },
                    { icon: <Droplets className="w-4 h-4 text-blue-500" />, val: selectedPlant.humidity, lbl: 'Humedad', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                    { icon: <Sun className="w-4 h-4 text-yellow-500" />, val: selectedPlant.light, lbl: 'Luz', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
                  ].map(m => (
                    <div key={m.lbl} className={`${m.bg} rounded-xl p-3 text-center`}>
                      <div className="flex justify-center mb-1">{m.icon}</div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-tight">{m.val}</p>
                      <p className="text-[10px] text-slate-400">{m.lbl}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Polinizadores que atrae</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedPlant.pollinators.map(p => (
                      <span key={p} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20">{p}</span>
                    ))}
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 flex gap-2">
                  <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{selectedPlant.tip}</p>
                </div>
                <button onClick={() => setSelectedPlant(null)}
                  className="w-full py-3 bg-primary text-white font-bold rounded-2xl active:scale-[0.98] transition-all">
                  Cerrar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── NEW: Garden Map View ─────────────────────────────────────────────────────

const GRID_POSITIONS = [
  { x: 0, y: 0, w: 2, h: 2 },
  { x: 2, y: 0, w: 1, h: 1 },
  { x: 3, y: 0, w: 1, h: 1 },
  { x: 2, y: 1, w: 2, h: 1 },
  { x: 0, y: 2, w: 1, h: 1 },
  { x: 1, y: 2, w: 2, h: 1 },
  { x: 3, y: 2, w: 1, h: 1 },
  { x: 0, y: 3, w: 4, h: 1 },
];

const MapView = ({ secciones, history }: { secciones: SeccionHuerto[]; history: EvaluationResult[] }) => {
  const [selectedSection, setSelectedSection] = useState<SeccionHuerto | null>(null);

  // Get last evaluation per section
  const lastBySec = useMemo(() => {
    const map: Record<string, EvaluationResult> = {};
    for (const h of history) {
      if (h.seccionId && !map[h.seccionId]) map[h.seccionId] = h;
    }
    return map;
  }, [history]);

  const statusColor = (s?: EvaluationResult) => {
    if (!s) return 'border-slate-200 dark:border-slate-700';
    return s.status === 'Óptimo' ? 'border-primary' : s.status === 'Atención' ? 'border-amber-400' : 'border-red-500';
  };

  const statusDot = (s?: EvaluationResult) => {
    if (!s) return 'bg-slate-300';
    return s.status === 'Óptimo' ? 'bg-primary' : s.status === 'Atención' ? 'bg-amber-400' : 'bg-red-500';
  };

  if (secciones.length === 0) return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="flex-1 p-4 max-w-2xl mx-auto w-full pb-28 overflow-y-auto">
      <div className="pt-2 mb-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Mapa del Jardín</h2>
        <p className="text-sm text-slate-400">Vista visual de tus secciones.</p>
      </div>
      <EmptyState icon={<Map className="w-8 h-8" />} title="Sin secciones"
        desc="Crea secciones desde Ajustes para ver el mapa interactivo de tu jardín." />
    </motion.div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="flex-1 p-4 space-y-4 max-w-2xl mx-auto w-full pb-28 overflow-y-auto">
      <div className="pt-2">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Mapa del Jardín</h2>
        <p className="text-sm text-slate-400">{secciones.length} secciones · Toca para ver detalles</p>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-1 flex-wrap">
        {[
          { color: 'bg-primary', label: 'Óptimo' },
          { color: 'bg-amber-400', label: 'Atención' },
          { color: 'bg-red-500', label: 'Alerta' },
          { color: 'bg-slate-300', label: 'Sin datos' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
            <span className="text-xs text-slate-500">{l.label}</span>
          </div>
        ))}
      </div>

      {/* Bento garden grid */}
      <Card className="p-4 overflow-hidden">
        <div
          className="grid gap-2"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(4, 1fr)`,
            gridTemplateRows: `repeat(${Math.ceil(secciones.length / 2)}, minmax(70px, auto))`,
          }}
        >
          {secciones.map((sec, i) => {
            const lastEval = lastBySec[sec.id];
            const pos = GRID_POSITIONS[i % GRID_POSITIONS.length];
            const isLarge = i === 0;
            return (
              <motion.button
                key={sec.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.07, type: 'spring', stiffness: 200, damping: 20 }}
                onClick={() => setSelectedSection(sec)}
                className={`relative rounded-2xl border-2 p-3 flex flex-col justify-between text-left
                  active:scale-[0.97] transition-all overflow-hidden min-h-[70px]
                  bg-white dark:bg-slate-800 hover:shadow-md
                  ${statusColor(lastEval)}
                  ${isLarge ? 'col-span-2 row-span-2' : ''}`}
                style={i === 0 ? {} : {}}
              >
                {/* Tinted bg based on section color */}
                <div className={`absolute inset-0 ${sec.color} opacity-[0.06] rounded-2xl`} />

                <div className="relative flex items-start justify-between">
                  <div className={`w-2.5 h-2.5 rounded-full mt-0.5 animate-pulse-dot ${statusDot(lastEval)}`} />
                  <div className={`w-5 h-5 rounded-lg ${sec.color} flex items-center justify-center shrink-0`}>
                    <Leaf className="w-3 h-3 text-white" />
                  </div>
                </div>

                <div className="relative mt-auto">
                  <p className={`font-bold text-slate-800 dark:text-slate-200 leading-tight ${isLarge ? 'text-base' : 'text-xs'}`}>
                    {sec.nombre}
                  </p>
                  {lastEval ? (
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="flex items-center gap-0.5 text-[10px] text-slate-500">
                        <Droplets className="w-2.5 h-2.5 text-blue-400" />{lastEval.data.humedad}%
                      </span>
                      <span className="flex items-center gap-0.5 text-[10px] text-slate-500">
                        <Thermometer className="w-2.5 h-2.5 text-orange-400" />{lastEval.data.temperatura}°C
                      </span>
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 mt-0.5">Sin datos</p>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </Card>

      {/* Section list summary */}
      <div className="space-y-2">
        {secciones.map((sec) => {
          const ev = lastBySec[sec.id];
          return (
            <button key={sec.id} onClick={() => setSelectedSection(sec)}
              className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-primary/30 active:scale-[0.99] transition-all text-left">
              <div className={`w-3 h-3 rounded-full shrink-0 ${ev ? (ev.status === 'Óptimo' ? 'bg-primary' : ev.status === 'Atención' ? 'bg-amber-400' : 'bg-red-500') : 'bg-slate-300'}`} />
              <div className={`w-8 h-8 rounded-xl ${sec.color} flex items-center justify-center shrink-0`}>
                <MapPin className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{sec.nombre}</p>
                {sec.descripcion && <p className="text-xs text-slate-400 truncate">{sec.descripcion}</p>}
              </div>
              {ev ? (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-slate-400">{ev.data.humedad}% · {ev.data.temperatura}°C</span>
                  <StatusBadge status={ev.status} />
                </div>
              ) : (
                <span className="text-xs text-slate-400 shrink-0">Sin evaluar</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Section detail modal */}
      <AnimatePresence>
        {selectedSection && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setSelectedSection(null); }}>
            <motion.div initial={{ y: 80, opacity: 0, scale: 0.95 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 80, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 220, damping: 26 }}
              className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
              <div className="p-5 flex items-start justify-between border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl ${selectedSection.color} flex items-center justify-center`}>
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg">{selectedSection.nombre}</h3>
                    {selectedSection.descripcion && <p className="text-sm text-slate-400">{selectedSection.descripcion}</p>}
                  </div>
                </div>
                <button onClick={() => setSelectedSection(null)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                {(() => {
                  const ev = lastBySec[selectedSection.id];
                  const secHistory = history.filter(h => h.seccionId === selectedSection.id);
                  return ev ? (
                    <>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={ev.status} />
                        <span className="text-xs text-slate-400">
                          Última evaluación: {new Date(ev.timestamp).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { bg: 'bg-blue-50 dark:bg-blue-900/20', icon: <Droplets className="w-4 h-4 text-blue-500" />, val: `${ev.data.humedad}%`, lbl: 'Humedad' },
                          { bg: 'bg-orange-50 dark:bg-orange-900/20', icon: <Thermometer className="w-4 h-4 text-orange-500" />, val: `${ev.data.temperatura}°C`, lbl: 'Temp' },
                          { bg: 'bg-yellow-50 dark:bg-yellow-900/20', icon: <Sun className="w-4 h-4 text-yellow-500" />, val: ev.data.luz, lbl: 'Luz' },
                        ].map(m => (
                          <div key={m.lbl} className={`${m.bg} rounded-xl p-3 text-center`}>
                            <div className="flex justify-center mb-1">{m.icon}</div>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{m.val}</p>
                            <p className="text-[10px] text-slate-400">{m.lbl}</p>
                          </div>
                        ))}
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Resumen</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{secHistory.length} evaluaciones registradas en esta sección.</p>
                      </div>
                      {ev.recommendations.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Recomendaciones</p>
                          <ul className="space-y-1.5">
                            {ev.recommendations.map((r, i) => (
                              <li key={i} className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />{r}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="py-8 flex flex-col items-center gap-3 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <MapPin className="w-6 h-6 text-slate-300" />
                      </div>
                      <p className="font-semibold text-slate-600 dark:text-slate-400">Sin evaluaciones</p>
                      <p className="text-sm text-slate-400">Ve al simulador y selecciona esta sección para registrar datos.</p>
                    </div>
                  );
                })()}
                <button onClick={() => setSelectedSection(null)}
                  className="w-full py-3 bg-primary text-white font-bold rounded-2xl active:scale-[0.98] transition-all">
                  Cerrar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Settings View ────────────────────────────────────────────────────────────

const SettingsView = ({ sensores, secciones, configuracion, setConfiguracion, onAddSeccion, onDeleteSeccion, onAddSensor, onDeleteSensor, onAssignSensor }: {
  sensores: Sensor[];
  secciones: SeccionHuerto[];
  configuracion: Configuracion;
  setConfiguracion: React.Dispatch<React.SetStateAction<Configuracion>>;
  onAddSeccion: (nombre: string, desc: string) => Promise<void>;
  onDeleteSeccion: (id: string) => Promise<void>;
  onAddSensor: (nombre: string, tipo: SensorType) => Promise<void>;
  onDeleteSensor: (id: string) => Promise<void>;
  onAssignSensor: (seccionId: string, sensorId: string, assigned: boolean) => Promise<void>;
}) => {
  const [activeTab, setActiveTab] = useState<'secciones' | 'sensores' | 'config'>('secciones');
  const [newSeccionNombre, setNewSeccionNombre] = useState('');
  const [newSeccionDesc, setNewSeccionDesc] = useState('');
  const [newSensorNombre, setNewSensorNombre] = useState('');
  const [newSensorTipo, setNewSensorTipo] = useState<SensorType>('humedad');
  const [addingSensor, setAddingSensor] = useState(false);
  const [addingSeccion, setAddingSeccion] = useState(false);

  const handleAddSeccion = async () => {
    if (!newSeccionNombre.trim() || addingSeccion) return;
    setAddingSeccion(true);
    try { await onAddSeccion(newSeccionNombre.trim(), newSeccionDesc.trim()); setNewSeccionNombre(''); setNewSeccionDesc(''); }
    finally { setAddingSeccion(false); }
  };

  const sensorTipoRef = useRef(newSensorTipo);
  sensorTipoRef.current = newSensorTipo;

  const handleAddSensor = async () => {
    if (!newSensorNombre.trim() || addingSensor) return;
    setAddingSensor(true);
    try { await onAddSensor(newSensorNombre.trim(), sensorTipoRef.current); setNewSensorNombre(''); }
    finally { setAddingSensor(false); }
  };

  const tabs = [
    { id: 'secciones' as const, label: 'Secciones', icon: <Layers className="w-4 h-4" /> },
    { id: 'sensores' as const, label: 'Sensores', icon: <Gauge className="w-4 h-4" /> },
    { id: 'config' as const, label: 'Ajustes', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="flex-1 p-4 space-y-4 max-w-2xl mx-auto w-full pb-28 overflow-y-auto">
      <div className="pt-2">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Configuración</h2>
        <p className="text-sm text-slate-400">Gestiona secciones, sensores y preferencias.</p>
      </div>

      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === tab.id ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}>
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'secciones' && (
          <motion.div key="secciones" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
            <Card className="p-4 space-y-3">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" /> Nueva sección
              </h3>
              <input type="text" placeholder="Nombre de la sección" value={newSeccionNombre}
                onChange={(e) => setNewSeccionNombre(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSeccion()}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm" />
              <input type="text" placeholder="Descripción (opcional)" value={newSeccionDesc}
                onChange={(e) => setNewSeccionDesc(e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm" />
              <button onClick={handleAddSeccion} disabled={!newSeccionNombre.trim() || addingSeccion}
                className="w-full py-3 bg-primary text-white rounded-xl font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
                {addingSeccion ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
                {addingSeccion ? 'Agregando...' : 'Agregar sección'}
              </button>
            </Card>
            {secciones.length === 0 ? (
              <EmptyState icon={<Layers className="w-8 h-8" />} title="Sin secciones" desc="Crea tu primera sección del jardín para organizar el monitoreo." />
            ) : secciones.map((seccion) => (
              <Card key={seccion.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${seccion.color}`} />
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-200">{seccion.nombre}</h4>
                      {seccion.descripcion && <p className="text-sm text-slate-400">{seccion.descripcion}</p>}
                    </div>
                  </div>
                  <button onClick={() => onDeleteSeccion(seccion.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
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
                        <button key={sensor.id} onClick={() => onAssignSensor(seccion.id, sensor.id, !isAssigned)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${isAssigned ? `${seccion.color} text-white` : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                          <SensorIcon tipo={sensor.tipo} className="w-3 h-3" />{sensor.nombre}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </Card>
            ))}
          </motion.div>
        )}

        {activeTab === 'sensores' && (
          <motion.div key="sensores" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
            <Card className="p-4 space-y-3">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" /> Nuevo sensor
              </h3>
              <input type="text" placeholder="Nombre del sensor" value={newSensorNombre}
                onChange={(e) => setNewSensorNombre(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSensor()}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm" />
              <div className="grid grid-cols-3 gap-2">
                {(['humedad', 'temperatura', 'luz'] as SensorType[]).map((tipo) => (
                  <button key={tipo} onClick={() => setNewSensorTipo(tipo)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${newSensorTipo === tipo ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                    <SensorIcon tipo={tipo} className="w-5 h-5" />
                    <span className="text-xs font-semibold capitalize">{tipo}</span>
                  </button>
                ))}
              </div>
              <button onClick={handleAddSensor} disabled={!newSensorNombre.trim() || addingSensor}
                className="w-full py-3 bg-primary text-white rounded-xl font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
                {addingSensor ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
                {addingSensor ? 'Agregando...' : 'Agregar sensor'}
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
                    <button onClick={() => onDeleteSensor(sensor.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </Card>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'config' && (
          <motion.div key="config" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <Card className="divide-y divide-slate-100 dark:divide-slate-800">
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">Notificaciones</p>
                  <p className="text-xs text-slate-400">Alertas de condiciones críticas</p>
                </div>
                <button onClick={() => setConfiguracion(c => ({ ...c, notificacionesHabilitadas: !c.notificacionesHabilitadas }))}
                  className={`relative w-12 h-6 rounded-full transition-colors ${configuracion.notificacionesHabilitadas ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}>
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
                    <button key={u} onClick={() => setConfiguracion(c => ({ ...c, unidadTemperatura: u }))}
                      className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${configuracion.unidadTemperatura === u ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-400'}`}>
                      °{u}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex gap-3">
              <Bell className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                Los datos se almacenan en el servidor de Render. Al reiniciarse el servicio, los datos efímeros se pierden.
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
  const [showNotifications, setShowNotifications] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const stored = sessionStorage.getItem('pj_read_ids');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });

  const alertHistory = history.filter(h => h.status === 'Alerta' || h.status === 'Atención');
  const unreadIds = new Set(alertHistory.map(a => a.id).filter(id => !readIds.has(id)));
  const unreadCount = unreadIds.size;

  const markAllRead = useCallback(() => {
    const newRead = new Set([...readIds, ...unreadIds]);
    setReadIds(newRead);
    try { sessionStorage.setItem('pj_read_ids', JSON.stringify([...newRead])); } catch {}
  }, [readIds, unreadIds]);

  const openNotifications = useCallback(() => setShowNotifications(true), []);

  useEffect(() => {
    const load = async () => {
      try {
        const [evs, secs, sens] = await Promise.all([getEvaluaciones(), getSecciones(), getSensores()]);
        setHistory(evs.reverse()); setLastResult(evs[0] ?? null);
        setSecciones(secs); setSensores(sens);
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

  // ─── Nav: 5 primary + 2 in "more" section (guide/map accessible from settings)
  const navItems = [
    { id: 'dashboard' as const, label: 'Inicio', icon: <Home className="w-5 h-5" /> },
    { id: 'simulator' as const, label: 'Datos', icon: <Cpu className="w-5 h-5" /> },
    { id: 'stats' as const, label: 'Stats', icon: <BarChart2 className="w-5 h-5" /> },
    { id: 'history' as const, label: 'Historial', icon: <History className="w-5 h-5" /> },
    { id: 'settings' as const, label: 'Más', icon: <Settings className="w-5 h-5" /> },
  ];

  // Secondary nav (accessible from header area or settings)
  const secondaryNavItems = [
    { id: 'guide' as const, label: 'Guía', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'map' as const, label: 'Mapa', icon: <Map className="w-4 h-4" /> },
  ];

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-background-light dark:bg-background-dark font-display flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Leaf className="w-7 h-7 text-primary animate-pulse" />
            </div>
            <div className="absolute inset-0 rounded-2xl border-2 border-primary/20 animate-ping" />
          </div>
          <p className="text-sm text-slate-400 font-medium">Conectando con el servidor...</p>
        </div>
      </div>
    );
  }

  const isMainView = ['dashboard', 'simulator', 'stats', 'history', 'settings', 'guide', 'map'].includes(view);

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 min-h-[100dvh] flex flex-col">
      {/* Header */}
      {isMainView && (
        <header className="
flex items-center gap-1.5
px-4 py-2.5
rounded-2xl
text-sm font-bold
bg-primary/10
text-primary
border border-primary/20
hover:bg-primary
hover:text-white
hover:scale-105
transition-all duration-200
shadow-sm hover:shadow-lg hover:shadow-primary/20
">
          <div className="flex items-center gap-3">
            {view === 'recommendations' && (
              <button onClick={() => setView('dashboard')} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <ArrowLeft className="w-5 h-5 text-primary" />
              </button>
            )}
            {(view === 'guide' || view === 'map') && (
              <button onClick={() => setView('settings')} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
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
            {/* Quick access to guide/map from header */}
            {(view === 'dashboard' || view === 'stats') && (
              <div className="flex items-center gap-1 mr-1">
                {secondaryNavItems.map(item => (
                  <button key={item.id} onClick={() => setView(item.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary transition-all">
                    {item.icon}{item.label}
                  </button>
                ))}
              </div>
            )}
            {error && (
              <span className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-lg border border-red-200 dark:border-red-900">
                Sin servidor
              </span>
            )}
            <button onClick={openNotifications}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative">
              <Bell className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              {unreadCount > 0 && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </motion.span>
              )}
            </button>
          </div>
        </header>
      )}

      {error && isMainView && (
        <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-4 py-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      <main className="flex-1 flex flex-col relative overflow-hidden">
        <AnimatePresence mode="wait">
          {view === 'welcome' && <WelcomeView key="welcome" onStart={() => setView('dashboard')} />}
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
          {view === 'stats' && <StatsView key="stats" history={history} secciones={secciones} />}
          {view === 'guide' && <GuideView key="guide" />}
          {view === 'map' && <MapView key="map" secciones={secciones} history={history} />}
        </AnimatePresence>
      </main>

      {/* Bottom Nav — 5 items */}
      {isMainView && view !== 'guide' && view !== 'map' && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-100 dark:border-slate-800 flex px-2 pb-safe pt-2">
          {navItems.map((item) => {
            const active = view === item.id || (item.id === 'dashboard' && view === 'recommendations');
            return (
              <button key={item.id} onClick={() => setView(item.id)}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-1 transition-all ${active ? 'text-primary' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-primary/10' : ''}`}>
                  {item.icon}
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider">{item.label}</p>
              </button>
            );
          })}
        </nav>
      )}

      {/* Guide/Map: show simplified back nav */}
      {isMainView && (view === 'guide' || view === 'map') && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-100 dark:border-slate-800 flex px-2 pb-safe pt-2">
          {secondaryNavItems.map((item) => {
            const active = view === item.id;
            return (
              <button key={item.id} onClick={() => setView(item.id)}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-1 transition-all ${active ? 'text-primary' : 'text-slate-400'}`}>
                <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-primary/10' : ''}`}>{item.icon}</div>
                <p className="text-[10px] font-bold uppercase tracking-wider">{item.label}</p>
              </button>
            );
          })}
          <button onClick={() => setView('dashboard')}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-1 text-slate-400">
            <div className="p-1.5 rounded-xl"><Home className="w-4 h-4" /></div>
            <p className="text-[10px] font-bold uppercase tracking-wider">Inicio</p>
          </button>
        </nav>
      )}

      {/* Notifications Panel */}
      <AnimatePresence>
        {showNotifications && (
          <NotificationsPanel history={history} secciones={secciones}
            onClose={() => setShowNotifications(false)}
            onMarkAllRead={markAllRead} unreadIds={unreadIds} />
        )}
      </AnimatePresence>
    </div>
  );
}