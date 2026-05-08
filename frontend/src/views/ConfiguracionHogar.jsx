import React, { useState, useEffect } from 'react';
import { FaCog, FaSave, FaBell, FaTint, FaRobot, FaCheckCircle, FaWifi, FaTimesCircle, FaMicrochip } from 'react-icons/fa';
import toast, { Toaster } from 'react-hot-toast';
import { supabase } from '../services/supabaseClient';
import './ConfiguracionHogar.css';

const ID_HOGAR = 1;

export default function ConfiguracionHogar() {
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  
  const [config, setConfig] = useState({
    meta_diaria: 400,
    meta_mensual: 12000,
    notificaciones_web: true,
    notificaciones_email: false,
    alerta_fugas: true
  });

  const [iotStatus, setIotStatus] = useState({
    estado: 'offline',
    nombreDispositivo: 'Cargando...',
    sensores: [],
    ultimaSincronizacion: '...'
  });

  useEffect(() => {
    cargarConfiguracion();
    cargarEstadoIoT();
  }, []);

  const cargarConfiguracion = async () => {
    try {
      const res = await fetch(`http://localhost:8000/api/configuracion/${ID_HOGAR}`);
      const data = await res.json();
      if (res.ok && data.configuracion) {
        setConfig(data.configuracion);
      }
    } catch (error) {
      toast.error('Error al cargar la configuración');
    } finally {
      setCargando(false);
    }
  };

  const cargarEstadoIoT = async () => {
    try {
      // 1. Traemos el dispositivo asignado a este hogar y TODOS sus sensores asociados
      const { data: dispositivoData, error: dispError } = await supabase
        .from('dispositivos')
        .select(`
          id_dispositivo,
          nombre,
          sensores ( id_sensor, nombre, estado )
        `)
        .eq('id_hogar', ID_HOGAR)
        .limit(1)
        .single();

      if (dispError && dispError.code !== 'PGRST116') throw dispError;

      // 2. Buscamos el último pulso de agua para calcular el tiempo
      // Si tenemos dispositivo, buscamos la última lectura general
      const { data: lecturaData, error: lecturaError } = await supabase
        .from('lecturas')
        .select('fecha_hora')
        .order('fecha_hora', { ascending: false })
        .limit(1);

      if (lecturaError) throw lecturaError;

      let estadoActual = 'offline';
      let textoTiempo = 'Sin datos registrados';

      if (lecturaData && lecturaData.length > 0) {
        const ultimaLectura = new Date(lecturaData[0].fecha_hora + (lecturaData[0].fecha_hora.includes('Z') ? '' : 'Z'));
        const ahora = new Date();
        const difMinutos = Math.floor((ahora.getTime() - ultimaLectura.getTime()) / (1000 * 60));

        if (difMinutos >= 0 && difMinutos <= 5) {
          estadoActual = 'online';
          textoTiempo = difMinutos === 0 ? 'Hace unos segundos' : `Hace ${difMinutos} minuto(s)`;
        } else if (difMinutos > 5 && difMinutos < 60) {
          textoTiempo = `Hace ${difMinutos} minuto(s)`;
        } else if (difMinutos >= 60 && difMinutos < 1440) {
          const horas = Math.floor(difMinutos / 60);
          textoTiempo = `Hace ${horas} hora(s)`;
        } else {
          const dias = Math.floor(difMinutos / 1440);
          textoTiempo = `Hace ${dias} día(s)`;
        }
      }

      setIotStatus({
        estado: estadoActual,
        nombreDispositivo: dispositivoData?.nombre || 'Dispositivo Principal',
        sensores: dispositivoData?.sensores || [],
        ultimaSincronizacion: textoTiempo
      });

    } catch (error) {
      console.warn("⚠️ Error al validar el estado del IoT:", error);
      setIotStatus({
        estado: 'offline',
        nombreDispositivo: 'Error de conexión',
        sensores: [],
        ultimaSincronizacion: 'Error de red'
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfig({
      ...config,
      [name]: type === 'checkbox' ? checked : Number(value)
    });
  };

  const guardarConfiguracion = async () => {
    setGuardando(true);
    try {
      const res = await fetch(`http://localhost:8000/api/configuracion/${ID_HOGAR}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      if (res.ok) {
     
        sessionStorage.setItem('meta_diaria_cache', config.meta_diaria);
        toast.success('Configuración guardada exitosamente');
      } else {
        toast.error('Error al guardar');
      }
    } catch (error) {
      toast.error('Error de conexión');
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="loading-state-container">
        <div className="spinner"></div>
        <p>Cargando configuración del sistema...</p>
      </div>
    );
  }

  return (
    <div className="fade-in config-container">
      <Toaster position="top-right" />
      
      <header className="top-header config-header">
        <div>
          <h2 className="historial-header-title">
            <FaCog /> Configuración del Sistema
          </h2>
          <p className="historial-header-sub">
            Ajusta tus metas de consumo y preferencias de alertas.
          </p>
        </div>
        <button 
          className="btn-primario btn-guardar" 
          onClick={guardarConfiguracion}
          disabled={guardando}
        >
          <FaSave /> {guardando ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </header>

      <div className="config-grid">
        {/* Metas de Consumo */}
        <div className="config-card">
          <div className="config-card-header">
            <FaTint className="icon-blue" />
            <h3>Metas de Consumo</h3>
          </div>
          <div className="config-card-body">
            <div className="input-group">
              <label>Límite Diario (Litros)</label>
              <input 
                type="number" 
                name="meta_diaria" 
                value={config.meta_diaria} 
                onChange={handleInputChange}
                className="input-estilizado"
              />
              <span className="input-hint">El sistema te avisará si superas este valor en un día.</span>
            </div>
            <div className="input-group">
              <label>Límite Mensual (Litros)</label>
              <input 
                type="number" 
                name="meta_mensual" 
                value={config.meta_mensual} 
                onChange={handleInputChange}
                className="input-estilizado"
              />
            </div>
          </div>
        </div>

        {/* Notificaciones */}
        <div className="config-card">
          <div className="config-card-header">
            <FaBell className="icon-yellow" />
            <h3>Alertas y Notificaciones</h3>
          </div>
          <div className="config-card-body">
            <div className="toggle-group">
              <div className="toggle-info">
                <strong>Notificaciones en App</strong>
                <span>Mostrar alertas emergentes en el panel.</span>
              </div>
              <label className="switch">
                <input 
                  type="checkbox" 
                  name="notificaciones_web" 
                  checked={config.notificaciones_web} 
                  onChange={handleInputChange}
                />
                <span className="slider round"></span>
              </label>
            </div>

            <div className="toggle-group">
              <div className="toggle-info">
                <strong>Alertas por Correo Electrónico</strong>
                <span>Recibir resúmenes y alertas críticas por email.</span>
              </div>
              <label className="switch">
                <input 
                  type="checkbox" 
                  name="notificaciones_email" 
                  checked={config.notificaciones_email} 
                  onChange={handleInputChange}
                />
                <span className="slider round"></span>
              </label>
            </div>

            <div className="toggle-group highlight-toggle">
              <div className="toggle-info">
                <strong><FaRobot className="icon-purple"/> Detección de Fugas (IA)</strong>
                <span>Permitir que el modelo predictivo envíe alertas de anomalías.</span>
              </div>
              <label className="switch">
                <input 
                  type="checkbox" 
                  name="alerta_fugas" 
                  checked={config.alerta_fugas} 
                  onChange={handleInputChange}
                />
                <span className="slider round slider-purple"></span>
              </label>
            </div>
          </div>
        </div>

        {/* Estado del IoT dinámico */}
        <div className="config-card info-card">
          <div className="config-card-header">
            <FaWifi className={iotStatus.estado === 'online' ? "icon-green" : "icon-gray"} style={{ color: iotStatus.estado === 'online' ? '#22c55e' : '#94a3b8', fontSize: '1.2rem' }} />
            <h3>Estado del Hardware</h3>
          </div>
          <div className="config-card-body">
            <div className="iot-status">
              
              <div 
                className={`status-indicator ${iotStatus.estado}`}
                style={{
                  background: iotStatus.estado === 'online' ? '#dcfce7' : '#fee2e2',
                  color: iotStatus.estado === 'online' ? '#166534' : '#991b1b',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontWeight: '600',
                  marginBottom: '20px'
                }}
              >
                {iotStatus.estado === 'online' ? (
                  <><FaCheckCircle /> Transmitiendo</>
                ) : (
                  <><FaTimesCircle /> Hardware Apagado</>
                )}
              </div>

              <div style={{ marginBottom: '15px' }}>
                <strong style={{ display: 'block', marginBottom: '4px', color: '#475569' }}>Dispositivo Principal:</strong>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0f172a', fontWeight: '500' }}>
                  <FaMicrochip style={{ color: '#64748b' }}/> {iotStatus.nombreDispositivo}
                </span>
              </div>
              
              {/* 🔥 Lista de sensores dinámicos */}
              <div style={{ marginBottom: '15px' }}>
                <strong style={{ display: 'block', marginBottom: '8px', color: '#475569' }}>Sensores Conectados:</strong>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {iotStatus.sensores.length > 0 ? (
                    iotStatus.sensores.map((sensor) => (
                      <span key={sensor.id_sensor} style={{
                        background: '#f1f5f9',
                        color: '#334155',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        border: '1px solid #e2e8f0'
                      }}>
                        <FaTint style={{ color: '#0ea5e9' }}/> {sensor.nombre}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>Ningún sensor detectado</span>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: '10px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                <strong style={{ display: 'block', color: '#475569', fontSize: '0.85rem' }}>Última sincronización:</strong>
                <span style={{ color: '#64748b', fontSize: '0.9rem' }}>{iotStatus.ultimaSincronizacion}</span>
              </div>
              
              <button 
                onClick={cargarEstadoIoT}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'white',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  color: '#334155',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginTop: '10px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                onMouseOut={(e) => e.currentTarget.style.background = 'white'}
              >
                Refrescar Estado
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}