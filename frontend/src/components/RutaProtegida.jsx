import React from 'react';
import { Navigate } from 'react-router-dom';

export default function RutaProtegida({ children }) {
  // Buscamos si existe una sesión activa en la memoria del navegador
  const sesionActiva = sessionStorage.getItem('usuario_agua_iot');

  
  if (!sesionActiva) {
    return <Navigate to="/login" replace />;
  }

  // Si hay sesion lo dejamos pasar al Dashboard
  return children;
}