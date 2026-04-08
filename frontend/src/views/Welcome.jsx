import React from 'react';
// 1. IMPORTAMOS useNavigate
import { useNavigate } from 'react-router-dom';
import CarruselMinimalista from '../components/CarruselMinimalista';

export default function Welcome() {
  // 2. INICIAMOS EL NAVEGADOR
  const navigate = useNavigate();

  // 3. CREAMOS LAS FUNCIONES DE LOS BOTONES
  const irALogin = () => {
    navigate('/login'); // Nos lleva a la ruta del login
  };

  const mostrarInfo = () => {
    alert("Sistema de Optimización de Agua: Integra sensores de flujo ESP32 y modelos predictivos Random Forest para la detección de fugas.");
  };

  return (
    <div className="welcome-layout">
      <div className="glow-background"></div>

      <nav className="navbar-moderna">
        <div className="logo">Aqua<span className="logo-bold">Optimize</span></div>
        {/* 4. ASIGNAMOS LA FUNCIÓN AL BOTÓN */}
        <button className="btn-login" onClick={irALogin}>Ingresar al Sistema</button>
      </nav>

      <main className="hero-section">
        <div className="hero-texto">
          <div className="badge-moderno">Tecnología IoT & ML</div>
          <h1>Inteligencia para el<br/><span className="text-gradient">Consumo de Agua</span></h1>
          
          <p>
            Sistema integral diseñado para hogares de la zona norte de Cochabamba. Monitoreo en tiempo real, detección de fugas y recomendaciones personalizadas.
          </p>
          
          <div className="hero-botones">
            {/* 5. ASIGNAMOS LAS FUNCIONES A LOS BOTONES */}
            <button className="btn-primario" onClick={irALogin}>Comenzar ahora</button>
            <button className="btn-secundario" onClick={mostrarInfo}>Saber más</button>
          </div>
        </div>

        <div className="hero-carrusel">
          <CarruselMinimalista />
        </div>
      </main>
    </div>
  );
}