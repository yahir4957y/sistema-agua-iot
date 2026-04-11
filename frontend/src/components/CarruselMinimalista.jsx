import React, { useState, useEffect } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

export default function CarruselMinimalista() {
  const [indiceActual, setIndiceActual] = useState(0);


  const imagenes = [
    './img/imagen.jpg',
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSZBCHG2uUxWO5Ke0vjiKtfYNX-K0kLcIHUUw&s',
  ];

  const siguienteImagen = () => {
    setIndiceActual((prev) => (prev === imagenes.length - 1 ? 0 : prev + 1));
  };

  const anteriorImagen = () => {
    setIndiceActual((prev) => (prev === 0 ? imagenes.length - 1 : prev - 1));
  };

  useEffect(() => {
    const intervalo = setInterval(siguienteImagen, 5000);
    return () => clearInterval(intervalo);
  }, []);

  return (
    <div className="carrusel-contenedor">
      <button className="carrusel-btn btn-izq" onClick={anteriorImagen}>
        <FaChevronLeft />
      </button>
      <button className="carrusel-btn btn-der" onClick={siguienteImagen}>
        <FaChevronRight />
      </button>

      <div className="carrusel-slides">
        {imagenes.map((img, index) => (
          <img
            key={index}
            src={img}
            alt={`Slide de agua ${index + 1}`}
            className={`carrusel-img ${index === indiceActual ? 'activa' : ''}`}
          />
        ))}
      </div>

      <div className="carrusel-indicadores">
        {imagenes.map((_, index) => (
          <span
            key={index}
            className={`indicador ${index === indiceActual ? 'activo' : ''}`}
            onClick={() => setIndiceActual(index)}
          ></span>
        ))}
      </div>
    </div>
  );
}