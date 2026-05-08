import React, { useState, useEffect, useCallback } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

// Fuera del componente: no se recrea en cada render
const IMAGENES = [
  './img/imagen.jpg',
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSZBCHG2uUxWO5Ke0vjiKtfYNX-K0kLcIHUUw&s',
];

export default function CarruselMinimalista() {
  const [indiceActual, setIndiceActual] = useState(0);
  const [pausado, setPausado] = useState(false);

  const siguiente = useCallback(() => {
    setIndiceActual(prev => (prev === IMAGENES.length - 1 ? 0 : prev + 1));
  }, []);

  const anterior = useCallback(() => {
    setIndiceActual(prev => (prev === 0 ? IMAGENES.length - 1 : prev - 1));
  }, []);

  // El intervalo se resetea cada vez que cambia indiceActual o si está pausado
  useEffect(() => {
    if (pausado) return;
    const intervalo = setInterval(siguiente, 5000);
    return () => clearInterval(intervalo);
  }, [indiceActual, pausado, siguiente]);

  return (
    <div
      className="carrusel-contenedor"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
    >
      <button
        className="carrusel-btn btn-izq"
        onClick={anterior}
        aria-label="Imagen anterior"
      >
        <FaChevronLeft />
      </button>

      <button
        className="carrusel-btn btn-der"
        onClick={siguiente}
        aria-label="Siguiente imagen"
      >
        <FaChevronRight />
      </button>

      <div className="carrusel-slides">
        {IMAGENES.map((img, index) => (
          <img
            key={index}
            src={img}
            alt={`Slide ${index + 1}`}
            className={`carrusel-img ${index === indiceActual ? 'activa' : ''}`}
          />
        ))}
      </div>

      <div className="carrusel-indicadores">
        {IMAGENES.map((_, index) => (
          <button
            key={index}
            className={`indicador ${index === indiceActual ? 'activo' : ''}`}
            onClick={() => setIndiceActual(index)}
            aria-label={`Ir a imagen ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}