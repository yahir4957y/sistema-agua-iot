import React, { useState } from 'react'; // Añadimos useState
import { useNavigate } from 'react-router-dom';
import { FaSignOutAlt, FaWater, FaChartLine, FaBell, FaBrain, FaUsers } from 'react-icons/fa';
import AdminUsuarios from './AdminUsuarios'; // Importamos el nuevo componente

export default function Dashboard() {
  const navigate = useNavigate();
  
  // Estado para controlar qué vista mostrar en el panel principal
  const [seccionActiva, setSeccionActiva] = useState('monitoreo');

  // 1. LEEMOS EL USUARIO DESDE LA MEMORIA SEGURA
  const usuarioGuardado = sessionStorage.getItem('usuario_agua_iot');
  const usuario = usuarioGuardado ? JSON.parse(usuarioGuardado) : { nombre: 'Usuario' };

  const cerrarSesion = () => {
    // 2. DESTRUIMOS TODA LA SESIÓN (Usuario y Token)
    sessionStorage.clear(); 
    
    // 3. MANDAMOS AL INICIO SIN POSIBILIDAD DE VOLVER ATRÁS
    navigate('/', { replace: true });
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar Lateral */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          Aqua<span>Optimize</span>
        </div>
        
        <nav className="sidebar-nav">
          {/* Botón Monitoreo */}
          <button 
            className={`nav-item ${seccionActiva === 'monitoreo' ? 'activo' : ''}`}
            onClick={() => setSeccionActiva('monitoreo')}
          >
            <FaChartLine /> Monitoreo en Vivo
          </button>

          {/* Botón Gestión de Usuarios (Fácil acceso, 1 solo clic) */}
          <button 
            className={`nav-item ${seccionActiva === 'usuarios' ? 'activo' : ''}`}
            onClick={() => setSeccionActiva('usuarios')}
          >
            <FaUsers /> Gestión de Usuarios
          </button>

          <button className="nav-item">
            <FaBell /> Alertas de Fugas
          </button>
          
          <button className="nav-item">
            <FaBrain /> Predicciones ML
          </button>
        </nav>

        <button onClick={cerrarSesion} className="btn-cerrar-sesion">
          <FaSignOutAlt /> Cerrar Sesión
        </button>
      </aside>

      {/* Contenido Principal Dinámico */}
      <main className="dashboard-main">
        
        {/* Renderizado condicional: Si es monitoreo muestra las tarjetas, si no, muestra el CRUD */}
        {seccionActiva === 'monitoreo' ? (
          <>
            {/* Cabecera del Dashboard */}
            <header className="dashboard-header">
              <div>
                <h1>Panel de Control</h1>
                <p>Monitoreo de flujo y consumo de agua</p>
              </div>
              <div className="perfil-usuario">
                <div className="avatar">{usuario.nombre.charAt(0).toUpperCase()}</div>
                <span>Hola, <strong>{usuario.nombre}</strong></span>
              </div>
            </header>
            
            {/* Cuadrícula de Tarjetas de Monitoreo */}
            <div className="grid-tarjetas">
              <div className="tarjeta-stat">
                <div className="stat-icono bg-azul"><FaWater /></div>
                <div className="stat-info">
                  <h3>Consumo Diario</h3>
                  <p className="valor">0.0 <span>L/min</span></p>
                  <span className="estado neutro">Esperando datos ESP32...</span>
                </div>
              </div>

              <div className="tarjeta-stat">
                <div className="stat-icono bg-verde"><FaChartLine /></div>
                <div className="stat-info">
                  <h3>Promedio Semanal</h3>
                  <p className="valor">-- <span>L</span></p>
                  <span className="estado positivo">Consumo estable</span>
                </div>
              </div>

              <div className="tarjeta-stat">
                <div className="stat-icono bg-rojo"><FaBell /></div>
                <div className="stat-info">
                  <h3>Estado de Red</h3>
                  <p className="valor">Seguro</p>
                  <span className="estado positivo">Sin fugas detectadas</span>
                </div>
              </div>
            </div>

            <div className="contenedor-grafico">
              <h2>Análisis Predictivo (Random Forest)</h2>
              <div className="grafico-placeholder">
                Recopilando datos de entrenamiento para generar predicciones...
              </div>
            </div>
          </>
        ) : (
          /* VISTA DE ADMINISTRACIÓN DE USUARIOS */
          <AdminUsuarios />
        )}
      </main>
    </div>
  );
}