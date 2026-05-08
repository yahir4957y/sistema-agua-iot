import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaSignOutAlt,
  FaChartLine,
  FaBell,
  FaBrain,
  FaUsers,
  FaSearch,
  FaCheckCircle,
  FaArrowUp,
  FaWifi,
  FaTint,
  FaExclamationTriangle,
  FaHome,
  FaHistory,
  FaCog 
} from "react-icons/fa";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import AdminUsuarios from "./AdminUsuarios";
import GestorHogares from "./GestorHogares";
import { supabase } from "../services/supabaseClient";
import HistorialConsumo from './HistorialConsumo';
import ConfiguracionHogar from './ConfiguracionHogar';
import "./Dashboard.css";

const datosConsumoVacio = [
  { hora: "06:00", litros: 0 },
  { hora: "09:00", litros: 0 },
  { hora: "12:00", litros: 0 },
  { hora: "15:00", litros: 0 },
  { hora: "18:00", litros: 0 },
  { hora: "21:00", litros: 0 },
];

const COLORES_DONA = ["#10b981", "#f59e0b", "#0ea5e9", "#8b5cf6", "#ec4899"];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: "#fff",
          padding: "12px",
          borderRadius: "8px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
        }}
        role="tooltip"
      >
        <p
          style={{
            margin: "0 0 5px 0",
            fontWeight: "bold",
            color: "#64748b",
            fontSize: "0.85rem",
          }}
        >
          Acumulado a las {label} hrs
        </p>
        <p
          style={{
            margin: 0,
            color: "#0ea5e9",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            fontSize: "1.1rem",
            fontWeight: "bold",
          }}
        >
          <FaTint /> {payload[0].value} L
        </p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [seccionActiva, setSeccionActiva] = useState("monitoreo");
  
  // 🔥 Lógica de caché: Inicializamos la meta leyendo el sessionStorage para evitar parpadeos
  const metaCache = sessionStorage.getItem('meta_diaria_cache');
  const [metaDiaria, setMetaDiaria] = useState(metaCache ? Number(metaCache) : 150);

  const [stats, setStats] = useState({
    total_hoy: 0,
    grafico_barras: [],
    grafico_dona: [],
  });
  const [estadoESP32, setEstadoESP32] = useState("offline");

  const usuarioGuardado = sessionStorage.getItem("usuario_agua_iot");
  const usuario = usuarioGuardado
    ? JSON.parse(usuarioGuardado)
    : { nombre: "Admin" };

  const cerrarSesion = () => {
    sessionStorage.clear();
    navigate("/", { replace: true });
  };

  const parseDateUTC = (dateStr) => {
    return new Date(
      dateStr + (dateStr.includes("Z") || dateStr.includes("+") ? "" : "Z"),
    );
  };

  // 🔥 Sincronización en Background: Trae la meta real del servidor y actualiza estado + caché
  const cargarConfiguracion = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/configuracion/1");
      const data = await res.json();
      if (res.ok && data.configuracion && data.configuracion.meta_diaria) {
        const nuevaMeta = data.configuracion.meta_diaria;
        setMetaDiaria(nuevaMeta);
        sessionStorage.setItem('meta_diaria_cache', nuevaMeta);
      }
    } catch (error) {
      console.warn("⚠️ No se pudo sincronizar la meta de configuración", error);
    }
  };

  const fetchStats = async () => {
    try {
      const inicioDelDia = new Date();
      inicioDelDia.setHours(0, 0, 0, 0);

      const peticionLecturas = supabase
        .from("lecturas")
        .select("valor, fecha_hora, id_sensor")
        .gte("fecha_hora", inicioDelDia.toISOString())
        .order("fecha_hora", { ascending: false });

      const peticionSensores = supabase
        .from("sensores")
        .select("id_sensor, nombre");

      const [resLecturas, resSensores] = await Promise.all([
        peticionLecturas,
        peticionSensores,
      ]);

      if (resLecturas.error) throw resLecturas.error;
      if (resSensores.error) throw resSensores.error;

      const mapaSensores = {};
      resSensores.data.forEach((s) => (mapaSensores[s.id_sensor] = s.nombre));

      // Lógica de estado ONLINE/OFFLINE
      if (resLecturas.data.length > 0) {
        const ultimaLectura = parseDateUTC(resLecturas.data[0].fecha_hora);
        const ahora = new Date();
        const diferenciaMinutos =
          (ahora.getTime() - ultimaLectura.getTime()) / (1000 * 60);

        setEstadoESP32(
          diferenciaMinutos >= 0 && diferenciaMinutos <= 5
            ? "online"
            : "offline",
        );
      } else {
        setEstadoESP32("offline");
      }

      let totalPrincipal = 0;
      const barrasMap = {};
      const donaMap = {};

      resLecturas.data.forEach((row) => {
        const flujoLPM = parseFloat(row.valor) || 0;
        const litrosReales = flujoLPM / 6;

        if (row.id_sensor === 1) {
          totalPrincipal += litrosReales;
          const date = parseDateUTC(row.fecha_hora);
          const hour = date.getHours();
          const horaString = hour.toString().padStart(2, "0") + ":00";
          barrasMap[horaString] = (barrasMap[horaString] || 0) + litrosReales;
        }

        donaMap[row.id_sensor] = (donaMap[row.id_sensor] || 0) + litrosReales;
      });

      const barrasFormateadas = Object.keys(barrasMap)
        .map((h) => ({
          hora: h,
          litros: parseFloat(barrasMap[h].toFixed(2)),
        }))
        .sort(
          (a, b) =>
            parseInt(a.hora.substring(0, 2)) - parseInt(b.hora.substring(0, 2)),
        );

      let consumoSubTotal = 0;
      const donaFormateada = [];

      Object.keys(donaMap).forEach((idSensorStr) => {
        const id = parseInt(idSensorStr);
        if (id !== 1 && donaMap[id] > 0) {
          consumoSubTotal += donaMap[id];
          donaFormateada.push({
            nombre: mapaSensores[id] || `Sensor ${id}`,
            valor: parseFloat(donaMap[id].toFixed(2)),
          });
        }
      });

      const otrosUsos =
        totalPrincipal > consumoSubTotal ? totalPrincipal - consumoSubTotal : 0;
      if (otrosUsos > 0) {
        donaFormateada.push({
          nombre: "Otros / Fugas",
          valor: parseFloat(otrosUsos.toFixed(2)),
          color: "#94a3b8",
        });
      }

      setStats({
        total_hoy: totalPrincipal.toFixed(1),
        grafico_barras: barrasFormateadas,
        grafico_dona: donaFormateada,
      });
    } catch (error) {
      console.warn("Error de red:", error);
    }
  };

  // Se ejecuta una sola vez al cargar la página para sincronizar configuración
  useEffect(() => {
    cargarConfiguracion();
  }, []);

  // 🔥 NUEVO CÓDIGO AÑADIDO AQUÍ 🔥
  // Este useEffect obliga a React a leer la meta cada vez que entras al Monitoreo
  useEffect(() => {
    if (seccionActiva === "monitoreo") {
      const metaCache = sessionStorage.getItem('meta_diaria_cache');
      if (metaCache) setMetaDiaria(Number(metaCache));
    }
  }, [seccionActiva]);
  // 🔥 FIN DEL NUEVO CÓDIGO 🔥

  // Se encarga de las lecturas en tiempo real
  useEffect(() => {
    if (seccionActiva === "monitoreo") {
      fetchStats();
      const intervalo = setInterval(fetchStats, 5000);
      return () => clearInterval(intervalo);
    }
  }, [seccionActiva]);

  const dataBarras =
    stats.grafico_barras.length > 0 ? stats.grafico_barras : datosConsumoVacio;
  
  const totalDona = stats.grafico_dona.reduce(
    (acc, curr) => acc + curr.valor,
    0,
  );
  
  // 🔥 Cálculo de porcentaje usando la meta dinámica con protección contra NaN
  const metaValida = metaDiaria > 0 ? metaDiaria : 150;
  const porcentajeMeta = Math.min(
    Math.round((stats.total_hoy / metaValida) * 100),
    100,
  );

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          Aqua<span>Optimize</span>
        </div>
        <nav className="sidebar-nav" aria-label="Navegación Principal">
          <button
            className={`nav-item ${seccionActiva === "monitoreo" ? "activo" : ""}`}
            onClick={() => setSeccionActiva("monitoreo")}
            aria-current={seccionActiva === "monitoreo" ? "page" : undefined}
          >
            <FaChartLine aria-hidden="true" /> Monitoreo en Vivo
          </button>
          <button
            className={`nav-item ${seccionActiva === "hogares" ? "activo" : ""}`}
            onClick={() => setSeccionActiva("hogares")}
            aria-current={seccionActiva === "hogares" ? "page" : undefined}
          >
            <FaHome aria-hidden="true" /> Gestión de Infraestructura
          </button>
          <button
            className={`nav-item ${seccionActiva === "usuarios" ? "activo" : ""}`}
            onClick={() => setSeccionActiva("usuarios")}
            aria-current={seccionActiva === "usuarios" ? "page" : undefined}
          >
            <FaUsers aria-hidden="true" /> Gestión de Usuarios
          </button>
          <button 
            className={`nav-item ${seccionActiva === 'historial' ? 'activo' : ''}`} 
            onClick={() => setSeccionActiva('historial')}
            aria-current={seccionActiva === "historial" ? "page" : undefined}
          >
            <FaHistory aria-hidden="true" /> Historial de Consumo
          </button>
          <button 
            className={`nav-item ${seccionActiva === 'configHogar' ? 'activo' : ''}`} 
            onClick={() => setSeccionActiva('configHogar')}
            aria-current={seccionActiva === "configHogar" ? "page" : undefined}
          >
            <FaCog aria-hidden="true" /> Configuración de Hogar
          </button>
          <button className="nav-item">
            <FaBell aria-hidden="true" /> Historial de Alertas
          </button>
          <button className="nav-item">
            <FaBrain aria-hidden="true" /> Predicciones ML
          </button>
        </nav>
        <button onClick={cerrarSesion} className="btn-cerrar-sesion" aria-label="Cerrar sesión segura">
          <FaSignOutAlt aria-hidden="true" /> Cerrar Sesión
        </button>
      </aside>

      <main className="dashboard-main">
        {seccionActiva === "monitoreo" && (
          <div className="fade-in">
            <header className="top-header">
              <div>
                <h2>Panel de Control Inteligente</h2>
                <p style={{ color: "#64748b", fontSize: "0.9rem" }}>
                  Decisiones basadas en datos en tiempo real
                </p>
              </div>
              <div className="header-actions">
                <div
                  className="badge-sensores"
                  style={{
                    background: estadoESP32 === "online" ? "#dcfce7" : "#fee2e2",
                    color: estadoESP32 === "online" ? "#166534" : "#991b1b",
                  }}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: estadoESP32 === "online" ? "#22c55e" : "#ef4444",
                      display: "inline-block",
                      marginRight: "6px",
                    }}
                  ></span>
                  {estadoESP32 === "online"
                    ? "Hardware Transmitiendo"
                    : "Hardware Apagado"}
                </div>
                <div className="avatar-header" aria-label={`Usuario: ${usuario.nombre}`}>
                  {usuario.nombre.charAt(0).toUpperCase()}
                </div>
              </div>
            </header>

            <div className="grid-kpis-3">
              <div className="kpi-card" style={{ position: "relative" }}>
                <p className="kpi-titulo">Agua Consumida Hoy</p>
                <h3 className="kpi-valor">
                  {stats.total_hoy}
                  <span>L</span>
                </h3>

                <div
                  style={{
                    marginTop: "10px",
                    background: "#f1f5f9",
                    height: "6px",
                    borderRadius: "3px",
                    overflow: "hidden",
                  }}
                  role="progressbar"
                  aria-valuenow={porcentajeMeta}
                  aria-valuemin="0"
                  aria-valuemax="100"
                >
                  <div
                    style={{
                      width: `${porcentajeMeta}%`,
                      background: porcentajeMeta >= 100 ? "#ef4444" : "#0ea5e9",
                      height: "100%",
                      transition: "width 0.5s ease-in-out, background 0.3s",
                    }}
                  />
                </div>
                {/* 🔥 Etiquetas dinámicas con la meta obtenida */}
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "#64748b",
                    marginTop: "5px",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>{porcentajeMeta}% de la meta</span>
                  <span>Meta: {metaValida}L</span>
                </p>
              </div>

              <div className="kpi-card">
                <p className="kpi-titulo">Proyección Mensual</p>
                <h3 className="kpi-valor">
                  {(stats.total_hoy * 30).toFixed(0)}
                  <span>L</span>
                </h3>
                <p className="kpi-trend" style={{ color: "#94a3b8" }}>
                  Estimado según consumo actual
                </p>
              </div>

              <div className="kpi-card">
                <p className="kpi-titulo">Estado de la Red</p>
                <h3
                  className="kpi-valor"
                  style={{
                    color: estadoESP32 === "online" ? "#10b981" : "#94a3b8",
                  }}
                >
                  {estadoESP32 === "online" ? "Óptimo" : "Sin Datos"}
                </h3>
                <p
                  className="kpi-trend"
                  style={{
                    color: estadoESP32 === "online" ? "#10b981" : "#94a3b8",
                  }}
                >
                  {estadoESP32 === "online" ? (
                    <>
                      <FaCheckCircle style={{ marginRight: "4px" }} /> Sin anomalías detectadas
                    </>
                  ) : (
                    "Esperando lectura..."
                  )}
                </p>
              </div>
            </div>

            <div className="grid-graficos">
              <div className="chart-card col-span-2">
                <div className="chart-header">
                  <div>
                    <h3
                      style={{
                        fontSize: "1.1rem",
                        color: "#0f172a",
                        margin: "0 0 0.2rem 0",
                      }}
                    >
                      Tendencia de Uso
                    </h3>
                    <p
                      style={{
                        fontSize: "0.85rem",
                        color: "#64748b",
                        margin: 0,
                      }}
                    >
                      Basado en la entrada principal
                    </p>
                  </div>
                </div>
                <div className="chart-body">
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart
                      data={dataBarras}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#f1f5f9"
                      />
                      <XAxis
                        dataKey="hora"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#64748b", fontSize: "0.8rem" }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#64748b", fontSize: "0.8rem" }}
                      />
                      <Tooltip
                        content={<CustomTooltip />}
                        cursor={{ fill: "#f8fafc" }}
                      />
                      <Bar
                        dataKey="litros"
                        fill={
                          stats.grafico_barras.length > 0
                            ? "#0ea5e9"
                            : "#e2e8f0"
                        }
                        radius={[4, 4, 0, 0]}
                        maxBarSize={50}
                        aria-label="Gráfico de barras de consumo por hora"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="chart-card">
                <div className="chart-header">
                  <div>
                    <h3
                      style={{
                        fontSize: "1.1rem",
                        color: "#0f172a",
                        margin: "0 0 0.2rem 0",
                      }}
                    >
                      Distribución por área
                    </h3>
                    <p
                      style={{
                        fontSize: "0.85rem",
                        color: "#64748b",
                        margin: 0,
                      }}
                    >
                      Distribución interna
                    </p>
                  </div>
                </div>
                <div className="chart-body flex-center">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={
                          stats.grafico_dona.length > 0
                            ? stats.grafico_dona
                            : [{ nombre: "Vacio", valor: 1, color: "#e2e8f0" }]
                        }
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="valor"
                        nameKey="nombre"
                        stroke="none"
                      >
                        {(stats.grafico_dona.length > 0
                          ? stats.grafico_dona
                          : [{ nombre: "Vacio", valor: 1, color: "#e2e8f0" }]
                        ).map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              entry.color
                                ? entry.color
                                : COLORES_DONA[index % COLORES_DONA.length]
                            }
                          />
                        ))}
                      </Pie>
                      {stats.grafico_dona.length > 0 && (
                        <Tooltip
                          formatter={(value) => [`${value} L`, "Consumo"]}
                          contentStyle={{
                            borderRadius: "8px",
                            border: "none",
                            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                          }}
                        />
                      )}
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {stats.grafico_dona.length > 0 ? (
                  <div className="chart-legend">
                    {stats.grafico_dona.map((entry, index) => {
                      const porcentaje =
                        totalDona > 0
                          ? Math.round((entry.valor / totalDona) * 100)
                          : 0;
                      const color = entry.color
                        ? entry.color
                        : COLORES_DONA[index % COLORES_DONA.length];
                      return (
                        <div
                          key={`legend-${index}`}
                          className="legend-item"
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            width: "100%",
                            marginBottom: "8px",
                            fontSize: "0.85rem",
                            color: "#475569",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <span
                              style={{
                                width: "10px",
                                height: "10px",
                                borderRadius: "50%",
                                backgroundColor: color,
                              }}
                            ></span>
                            {entry.nombre}{" "}
                            {entry.nombre === "Otros / Fugas" && (
                              <FaExclamationTriangle
                                style={{ color: "#f59e0b" }}
                                aria-label="Alerta de posibles fugas"
                              />
                            )}
                          </div>
                          <strong style={{ color: "#0f172a" }}>
                            {porcentaje}%
                          </strong>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p
                    style={{
                      textAlign: "center",
                      fontSize: "0.85rem",
                      color: "#94a3b8",
                      background: "#f8fafc",
                      padding: "10px",
                      borderRadius: "8px",
                    }}
                  >
                    Sin consumo registrado hoy.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {seccionActiva === "usuarios" && <AdminUsuarios />}
        {seccionActiva === "hogares" && <GestorHogares />}
        {seccionActiva === "historial" && <HistorialConsumo />}
        {seccionActiva === "configHogar" && <ConfiguracionHogar />} 
      </main>
    </div>
  );
}