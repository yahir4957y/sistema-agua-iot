import React, { useState, useEffect, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import {
  FaSyncAlt, FaSpinner, FaChartArea,
  FaTint, FaCalendarCheck, FaArrowUp, FaArrowDown, FaMinus,
  FaHome, FaChevronDown
} from 'react-icons/fa';
import toast, { Toaster } from 'react-hot-toast';
import './HistorialConsumo.css';

const FILTROS = [
  { clave: '7d',         etiqueta: 'Últimos 7 días' },
  { clave: 'mes_actual', etiqueta: 'Este mes'        },
  { clave: 'mes_pasado', etiqueta: 'Mes pasado'      },
  { clave: 'todo',       etiqueta: 'Todo'             },
];

// Espera fechas en formato YYYY-MM-DD desde la API
function parsearFecha(str) {
  return new Date(str + 'T00:00:00');
}

function filtrarPorRango(datos, clave) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  if (clave === '7d') {
    const desde = new Date(hoy);
    desde.setDate(hoy.getDate() - 6);
    return datos.filter(d => {
      const f = parsearFecha(d.fecha);
      return f >= desde && f <= hoy;
    });
  }

  if (clave === 'mes_actual') {
    return datos.filter(d => {
      const f = parsearFecha(d.fecha);
      return f.getMonth() === hoy.getMonth() && f.getFullYear() === hoy.getFullYear();
    });
  }

  if (clave === 'mes_pasado') {
    const mesPasado = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    return datos.filter(d => {
      const f = parsearFecha(d.fecha);
      return f.getMonth() === mesPasado.getMonth() && f.getFullYear() === mesPasado.getFullYear();
    });
  }

  return datos; // 'todo'
}

// ─── Icono de tendencia ──────────────────────────────────────────────────────
function IconoTendencia({ pct }) {
  if (pct === null) return <FaMinus className="tendencia-neutral" />;
  return pct > 0
    ? <FaArrowUp className="tendencia-sube" />
    : <FaArrowDown className="tendencia-baja" />;
}

// ─── Tooltip personalizado ───────────────────────────────────────────────────
function TooltipPersonalizado({ active, payload, label, promedio }) {
  if (!active || !payload?.length) return null;
  const valor = payload[0].value;
  const diff = valor - promedio;
  const porcentaje = promedio > 0 ? ((diff / promedio) * 100).toFixed(1) : 0;
  const esMayor = diff > 0;

  return (
    <div className="tooltip-box">
      <p className="tooltip-fecha">{label}</p>
      <p className="tooltip-valor">{valor.toLocaleString('es-BO')} L</p>
      <p className={`tooltip-diff ${esMayor ? 'tooltip-diff--alto' : 'tooltip-diff--bajo'}`}>
        {esMayor ? '▲' : '▼'} {Math.abs(porcentaje)}% vs promedio
      </p>
    </div>
  );
}

// ─── Tarjeta de métrica ──────────────────────────────────────────────────────
function TarjetaMetrica({ icono, titulo, valor, unidad, color, detalle }) {
  return (
    <div className="metrica-card" style={{ borderLeftColor: color }}>
      <div className="metrica-top">
        <span className="metrica-titulo">{titulo}</span>
        <span style={{ color }}>{icono}</span>
      </div>
      <div className="metrica-valor-wrap">
        <span className="metrica-valor">{valor}</span>
        <span className="metrica-unidad">{unidad}</span>
      </div>
      {detalle && <p className="metrica-detalle">{detalle}</p>}
    </div>
  );
}

// ─── Tabla de registros recientes ────────────────────────────────────────────
function TablaRecientes({ datos }) {
  if (!datos.length) return null;
  const recientes = [...datos].reverse().slice(0, 7);
  const max = Math.max(...datos.map(d => d.total_consumo));

  return (
    <div className="chart-card tabla-recientes-card">
      <div className="chart-header">
        <div>
          <h3 className="chart-titulo">Últimos registros</h3>
          <p className="chart-subtitulo">Detalle de los 7 cierres diarios más recientes</p>
        </div>
      </div>
      <div className="tabla-wrapper">
        <table className="tabla-recientes">
          <thead>
            <tr>
              {['Fecha', 'Consumo (L)', 'Nivel', 'Barra'].map(h => (
                <th key={h} className="tabla-th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recientes.map((fila, i) => {
              const pct = max > 0 ? (fila.total_consumo / max) * 100 : 0;
              const nivel = pct >= 80
                ? { texto: 'Alto',  color: '#ef4444', bg: '#fef2f2' }
                : pct >= 50
                ? { texto: 'Medio', color: '#f59e0b', bg: '#fffbeb' }
                : { texto: 'Bajo',  color: '#22c55e', bg: '#f0fdf4' };

              return (
                <tr key={i} className="tabla-fila">
                  <td className="tabla-td tabla-td--fecha">{fila.fecha}</td>
                  <td className="tabla-td tabla-td--valor">
                    {fila.total_consumo.toLocaleString('es-BO')}
                  </td>
                  <td className="tabla-td">
                    <span
                      className="nivel-badge"
                      style={{ color: nivel.color, background: nivel.bg }}
                    >
                      {nivel.texto}
                    </span>
                  </td>
                  <td className="tabla-td">
                    <div className="barra-fondo">
                      <div
                        className="barra-relleno"
                        style={{ width: `${pct.toFixed(1)}%`, background: nivel.color }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function HistorialConsumo() {
  const [historial, setHistorial]               = useState([]);
  const [cargando, setCargando]                 = useState(true);
  const [procesandoCierre, setProcesandoCierre] = useState(false);
  const [filtro, setFiltro]                     = useState('mes_actual');
  const [hogares, setHogares]                   = useState([]);
  const [idHogar, setIdHogar]                   = useState(null);

  // Datos filtrados por el rango seleccionado
  const historialFiltrado = useMemo(
    () => filtrarPorRango(historial, filtro),
    [historial, filtro]
  );

  // Métricas calculadas sobre los datos filtrados
  const metricas = useMemo(() => {
    if (!historialFiltrado.length) return null;
    const valores = historialFiltrado.map(d => d.total_consumo);
    const total   = valores.reduce((a, b) => a + b, 0);
    const promedio = total / valores.length;
    const maximo  = Math.max(...valores);
    const fechaMax = historialFiltrado[valores.indexOf(maximo)]?.fecha ?? '—';

    const ultimos7   = valores.slice(-7);
    const anteriores7 = valores.slice(-14, -7);
    let tendenciaPct = null;
    if (ultimos7.length && anteriores7.length) {
      const avgU = ultimos7.reduce((a, b) => a + b, 0) / ultimos7.length;
      const avgA = anteriores7.reduce((a, b) => a + b, 0) / anteriores7.length;
      tendenciaPct = avgA > 0 ? parseFloat(((avgU - avgA) / avgA * 100).toFixed(1)) : null;
    }

    return { total, promedio, maximo, fechaMax, tendenciaPct };
  }, [historialFiltrado]);

  const cargarHistorial = async (id) => {
    if (!id) return;
    try {
      setCargando(true);
      const respuesta = await fetch(`http://localhost:8000/api/consumo/historial/${id}`);
      const data = await respuesta.json();
      if (respuesta.ok) {
        setHistorial(data.datos.reverse());
      } else {
        toast.error(data.error || 'Error al obtener el historial');
      }
    } catch (error) {
      toast.error('Error de conexión con el servidor');
      console.error(error);
    } finally {
      setCargando(false);
    }
  };

  // Al montar: traer lista de hogares y seleccionar el primero por defecto
  useEffect(() => {
    const fetchHogares = async () => {
      try {
        const respuesta = await fetch('http://localhost:8000/api/hogares');
        const data = await respuesta.json();
        if (respuesta.ok && data.hogares?.length) {
          setHogares(data.hogares);
          setIdHogar(data.hogares[0].id);
        } else {
          toast.error('No se pudieron cargar los hogares');
        }
      } catch (error) {
        toast.error('Error de conexión con el servidor');
        console.error(error);
      }
    };
    fetchHogares();
  }, []);

  // Recargar historial cada vez que cambia el hogar seleccionado
  useEffect(() => { cargarHistorial(idHogar); }, [idHogar]);

  const forzarCierreDiario = async () => {
    setProcesandoCierre(true);
    const peticion = async () => {
      const respuesta = await fetch('http://localhost:8000/api/consumo/cierre', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_hogar: idHogar })
      });
      const data = await respuesta.json();
      if (!respuesta.ok) throw new Error(data.error || 'Error en el cierre');
      return data.mensaje;
    };
    toast.promise(peticion(), {
      loading: 'Calculando métricas...',
      success: (msg) => { cargarHistorial(idHogar); return msg; },
      error: (err) => `Error: ${err.message}`
    }).finally(() => setProcesandoCierre(false));
  };

  return (
    <div className="fade-in">
      <Toaster position="top-right" />

      {/* Encabezado */}
      <header className="top-header historial-header">
        <div className="historial-header-left">
          <h2 className="historial-header-title">
            <FaChartArea /> Historial de Consumo
          </h2>
          <div className="selector-hogar-wrap">
            <div className={`selector-hogar-control${!hogares.length ? ' selector-hogar-control--disabled' : ''}`}>
              <FaHome className="selector-hogar-icon" aria-hidden="true" />
              <select
                id="selector-hogar"
                className="selector-hogar"
                value={idHogar ?? ''}
                onChange={e => setIdHogar(Number(e.target.value))}
                disabled={!hogares.length}
              >
                {hogares.length === 0 && (
                  <option value="">Cargando hogares...</option>
                )}
                {hogares.map(h => (
                  <option key={h.id} value={h.id}>{h.nombre}</option>
                ))}
              </select>
              <FaChevronDown className="selector-hogar-chevron" aria-hidden="true" />
            </div>
          </div>
        </div>
        <div className="header-actions">
          <button
            className="btn-primario btn-sync"
            onClick={forzarCierreDiario}
            disabled={procesandoCierre}
          >
            {procesandoCierre ? <FaSpinner className="icon-spin" /> : <FaSyncAlt />}
            Forzar Cierre de Día
          </button>
        </div>
      </header>

      {/* Filtros de fecha */}
      <div className="filtros-grupo">
        {FILTROS.map(({ clave, etiqueta }) => (
          <button
            key={clave}
            className={`filtro-btn ${filtro === clave ? 'filtro-btn--activo' : ''}`}
            onClick={() => setFiltro(clave)}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      {/* Tarjetas de métricas */}
      {!cargando && metricas && (
        <div className="metricas-grid">
          <TarjetaMetrica
            icono={<FaTint />}
            titulo="Total acumulado"
            valor={Math.round(metricas.total).toLocaleString('es-BO')}
            unidad="L"
            color="#0ea5e9"
            detalle={`En ${historialFiltrado.length} días registrados`}
          />
          <TarjetaMetrica
            icono={<FaChartArea />}
            titulo="Promedio diario"
            valor={Math.round(metricas.promedio).toLocaleString('es-BO')}
            unidad="L/día"
            color="#8b5cf6"
            detalle="Línea de referencia en la gráfica"
          />
          <TarjetaMetrica
            icono={<FaCalendarCheck />}
            titulo="Día más alto"
            valor={Math.round(metricas.maximo).toLocaleString('es-BO')}
            unidad="L"
            color="#f59e0b"
            detalle={`Fecha: ${metricas.fechaMax}`}
          />
          <TarjetaMetrica
            icono={<IconoTendencia pct={metricas.tendenciaPct} />}
            titulo="Tendencia (7 días)"
            valor={metricas.tendenciaPct !== null ? `${Math.abs(metricas.tendenciaPct)}%` : '—'}
            unidad={
              metricas.tendenciaPct > 0 ? 'más alto'
              : metricas.tendenciaPct < 0 ? 'más bajo'
              : ''
            }
            color={
              metricas.tendenciaPct > 0 ? '#ef4444'
              : metricas.tendenciaPct < 0 ? '#22c55e'
              : '#94a3b8'
            }
            detalle="vs. los 7 días anteriores"
          />
        </div>
      )}

      {/* Gráfica principal */}
      <div className="chart-card">
        <div className="chart-header">
          <div>
            <h3 className="chart-titulo">Tendencia histórica de consumo</h3>
            <p className="chart-subtitulo">Litros por día · La línea punteada indica el promedio</p>
          </div>
          {metricas && (
            <div className="leyenda-grafico">
              <span className="leyenda-item">
                <span className="leyenda-linea leyenda-linea--consumo" />
                Consumo
              </span>
              <span className="leyenda-item">
                <span className="leyenda-linea leyenda-linea--promedio" />
                Promedio
              </span>
            </div>
          )}
        </div>

        <div className="chart-area-wrapper">
          {cargando ? (
            <div className="estado-cargando">
              <FaSpinner className="icon-spin spinner-grande" />
              <p>Cargando datos históricos...</p>
            </div>
          ) : historialFiltrado.length === 0 ? (
            <div className="estado-vacio">
              <FaChartArea className="estado-vacio-icono" />
              <p className="estado-vacio-titulo">Sin registros en este período</p>
              <p className="estado-vacio-sub">
                Prueba con otro rango de fechas o fuerza un cierre de día.
              </p>
            </div>
          ) : (
            <div className="grafico-animado" style={{ width: '100%', height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historialFiltrado} margin={{ top: 16, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorConsumo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#0ea5e9" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="fecha"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: '0.75rem' }}
                    dy={10}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: '0.75rem' }}
                    tickFormatter={v => `${v} L`}
                    width={55}
                  />
                  <Tooltip
                    content={<TooltipPersonalizado promedio={metricas?.promedio ?? 0} />}
                  />
                  {metricas && (
                    <ReferenceLine
                      y={Math.round(metricas.promedio)}
                      stroke="#8b5cf6"
                      strokeDasharray="6 3"
                      strokeWidth={1.5}
                      label={{
                        value: `Prom. ${Math.round(metricas.promedio)} L`,
                        fill: '#8b5cf6',
                        fontSize: '0.72rem',
                        position: 'insideTopRight',
                        dy: -6
                      }}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="total_consumo"
                    stroke="#0ea5e9"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorConsumo)"
                    dot={{ fill: '#0ea5e9', strokeWidth: 0, r: 3 }}
                    activeDot={{ r: 5, fill: '#0ea5e9', stroke: 'white', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Tabla de últimos registros */}
      {!cargando && historialFiltrado.length > 0 && (
        <TablaRecientes datos={historialFiltrado} />
      )}
    </div>
  );
}