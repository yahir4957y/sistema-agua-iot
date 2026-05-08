import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTimes, FaMicrochip, FaChartLine, FaShieldAlt } from 'react-icons/fa';
import CarruselMinimalista from '../components/CarruselMinimalista';

const INFO_ITEMS = [
  {
    icono: <FaMicrochip />,
    titulo: 'Sensores ESP32',
    texto: 'Sensores de flujo conectados en tiempo real que miden el consumo por área del hogar.',
  },
  {
    icono: <FaChartLine />,
    titulo: 'Predicciones ML',
    texto: 'Modelos Random Forest entrenados para anticipar fugas y patrones de consumo anómalos.',
  },
  {
    icono: <FaShieldAlt />,
    titulo: 'Alertas inteligentes',
    texto: 'Notificaciones automáticas cuando se detectan irregularidades en el consumo.',
  },
];

export default function Welcome() {
  const navigate = useNavigate();
  const [mostrandoInfo, setMostrandoInfo] = useState(false);

  return (
    <div className="welcome-layout">
      <div className="glow-background" />

      {/* Navbar */}
      <nav className="navbar-moderna">
        <div className="logo">Aqua<span className="logo-bold">Optimize</span></div>
        <button className="btn-login" onClick={() => navigate('/login')}>
          Ingresar al Sistema
        </button>
      </nav>

      {/* Hero */}
      <main className="hero-section">
        <div className="hero-texto">
          <div className="badge-moderno">Tecnología IoT & ML</div>

          <h1>
            Inteligencia para el<br />
            <span className="text-gradient">Consumo de Agua</span>
          </h1>

          <p>
            Sistema integral diseñado para hogares de la zona norte de Cochabamba.
            Monitoreo en tiempo real, detección de fugas y recomendaciones personalizadas.
          </p>

          <div className="hero-botones">
            <button className="btn-primario" onClick={() => navigate('/login')}>
              Comenzar ahora
            </button>
            <button className="btn-secundario" onClick={() => setMostrandoInfo(true)}>
              Saber más
            </button>
          </div>
        </div>

        <div className="hero-carrusel">
          <CarruselMinimalista />
        </div>
      </main>

      {/* Panel de información — reemplaza el alert() */}
      {mostrandoInfo && (
        <div className="info-overlay" onClick={() => setMostrandoInfo(false)}>
          <div className="info-panel" onClick={e => e.stopPropagation()}>
            <div className="info-panel-header">
              <h3>¿Cómo funciona?</h3>
              <button
                className="info-panel-cerrar"
                onClick={() => setMostrandoInfo(false)}
                aria-label="Cerrar"
              >
                <FaTimes />
              </button>
            </div>

            <p className="info-panel-sub">
              AquaOptimize integra hardware y software para optimizar el consumo
              de agua en zonas con recursos hídricos limitados.
            </p>

            <div className="info-items">
              {INFO_ITEMS.map(({ icono, titulo, texto }) => (
                <div key={titulo} className="info-item">
                  <div className="info-item-icono">{icono}</div>
                  <div>
                    <strong>{titulo}</strong>
                    <p>{texto}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              className="btn-primario info-panel-cta"
              onClick={() => navigate('/login')}
            >
              Ingresar al Sistema
            </button>
          </div>
        </div>
      )}
    </div>
  );
}