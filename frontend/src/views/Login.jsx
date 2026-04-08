import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEnvelope, FaLock, FaArrowLeft, FaCheckCircle, FaSpinner } from 'react-icons/fa';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  // Estados para la animación "Pro"
  const [cargando, setCargando] = useState(false);
  const [nombreUsuario, setNombreUsuario] = useState('');

  const manejarLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const respuesta = await fetch('http://localhost:8000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const datos = await respuesta.json();

      if (respuesta.ok) {
        setNombreUsuario(datos.usuario.nombre);
        setCargando(true);
        
    
        sessionStorage.setItem('usuario_agua_iot', JSON.stringify(datos.usuario));

        sessionStorage.setItem('token_seguridad', datos.token);
        
        setTimeout(() => {
         
          navigate('/dashboard', { replace: true });
        }, 2000);
        
      } else {
        setError(datos.error || 'Error al iniciar sesión');
      }
    } catch (err) {
      setError('No se pudo conectar con el servidor.');
    }
  };

  // --- PANTALLA DE CARGA (TRANSICIÓN) ---
  if (cargando) {
    return (
      <div className="login-pantalla">
        <div className="tarjeta-carga">
          <FaCheckCircle className="icono-exito animar-pop" />
          <h2>¡Bienvenido, {nombreUsuario}!</h2>
          <p>Preparando tu panel de optimización...</p>
          <FaSpinner className="icono-spinner animar-giro" />
        </div>
      </div>
    );
  }

 
  return (
    <div className="login-pantalla">
      <div className="tarjeta-login animar-entrada">
        <button onClick={() => navigate('/')} className="btn-volver">
          <FaArrowLeft /> Volver
        </button>

        <h2>Iniciar Sesión</h2>
        <p className="subtitulo">Ingresa al sistema de monitoreo loT</p>

        {error && <div className="alerta-error">{error}</div>}

        <form onSubmit={manejarLogin}>
          <div className="grupo-input">
            <FaEnvelope className="icono-input" />
            <input 
              type="email" 
              placeholder="Correo electrónico" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="grupo-input">
            <FaLock className="icono-input" />
            <input 
              type="password" 
              placeholder="Contraseña" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primario btn-full">
            Ingresar al panel
          </button>
        </form>
      </div>
    </div>
  );
}