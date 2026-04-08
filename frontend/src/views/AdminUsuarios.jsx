import React, { useState, useEffect } from 'react';
import { FaUserPlus, FaEdit, FaTrash, FaSave, FaTimes, FaEye, FaHistory, FaSearch, FaSpinner } from 'react-icons/fa';
import toast, { Toaster } from 'react-hot-toast'; 
import './AdminUsuarios.css';
import TablaRoles from './TablaRoles'; // <-- AÑADE ESTA LÍNEA ARRIBA

export default function AdminUsuarios() {
  // ESTADOS DE USUARIOS
  const [usuarios, setUsuarios] = useState([]);
  const [usuariosFiltrados, setUsuariosFiltrados] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [editandoId, setEditandoId] = useState(null);
  const [verSolo, setVerSolo] = useState(false);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [accesos, setAccesos] = useState([]);
  
  // ESTADO DE LAS PESTAÑAS (TABS) - "Cero clics innecesarios"
  const [tabActiva, setTabActiva] = useState('usuarios'); // 'usuarios' o 'roles'

  // ESTADOS DE CARGA Y UX
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);

  // ESTADO DEL FORMULARIO (Ya incluye apellido materno)
  const [form, setForm] = useState({
    nombre: '',
    apellido_p: '',
    apellido_m: '',
    email: '',
    password: '',
    estado: 'activo'
  });

  const fetchUsuarios = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/usuarios');
      const data = await res.json();
      setUsuarios(data);
      setUsuariosFiltrados(data);
    } catch (error) {
      toast.error('Error al conectar con el servidor');
    } finally {
      setCargando(false); 
    }
  };

  useEffect(() => { fetchUsuarios(); }, []);

  useEffect(() => {
    const filtrados = usuarios.filter(u =>
      u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.email.toLowerCase().includes(busqueda.toLowerCase())
    );
    setUsuariosFiltrados(filtrados);
  }, [busqueda, usuarios]);

  const abrirModal = async (u = null, modoVer = false) => {
    setVerSolo(modoVer);

    if (u) {
      setEditandoId(u.id_usuario);
      setForm({ ...u, password: '' });

      if (modoVer) {
        const promesaAccesos = fetch(`http://localhost:8000/api/usuarios/${u.id_usuario}`).then(res => res.json());
        
        toast.promise(promesaAccesos, {
          loading: 'Cargando historial...',
          success: 'Historial cargado',
          error: 'Error al cargar detalles'
        });

        const data = await promesaAccesos;
        setAccesos(data.accesos || []);
      }
    } else {
      setEditandoId(null);
      setForm({
        nombre: '',
        apellido_p: '',
        apellido_m: '',
        email: '',
        password: '',
        estado: 'activo'
      });
    }

    setMostrarModal(true);
  };

  const manejarGuardar = async (e) => {
    e.preventDefault();
    setProcesando(true); 

    const metodo = editandoId ? 'PUT' : 'POST';
    const url = editandoId
      ? `http://localhost:8000/api/usuarios/${editandoId}`
      : 'http://localhost:8000/api/usuarios';

    const peticionGuardar = fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    }).then(async res => {
      if (!res.ok) throw new Error('Error en el servidor');
      return res.json();
    });

    toast.promise(peticionGuardar, {
      loading: editandoId ? 'Actualizando datos...' : 'Registrando usuario...',
      success: editandoId ? '¡Usuario actualizado!' : '¡Usuario registrado con éxito!',
      error: 'Error al procesar la solicitud.'
    });

    try {
      await peticionGuardar;
      setMostrarModal(false);
      fetchUsuarios();
    } catch (error) {
      console.error(error);
    } finally {
      setProcesando(false); 
    }
  };

  const manejarEliminar = (id) => {
    toast((t) => (
      <div>
        <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#1e293b', fontWeight: 'bold' }}>
          ¿Inactivar este usuario?
        </p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button 
            onClick={() => toast.dismiss(t.id)} 
            style={{ padding: '6px 12px', border: '1px solid #e2e8f0', background: 'white', borderRadius: '6px', cursor: 'pointer' }}>
            Cancelar
          </button>
          <button 
            onClick={async () => {
              toast.dismiss(t.id);
              const promesaBorrar = fetch(`http://localhost:8000/api/usuarios/${id}`, { method: 'DELETE' }).then(res => {
                  if(!res.ok) throw new Error();
              });
              
              toast.promise(promesaBorrar, {
                loading: 'Inactivando...',
                success: 'Usuario inactivado correctamente',
                error: 'Error al inactivar'
              });
              
              await promesaBorrar;
              fetchUsuarios();
            }} 
            style={{ padding: '6px 12px', border: 'none', background: '#ef4444', color: 'white', borderRadius: '6px', cursor: 'pointer' }}>
            Sí, inactivar
          </button>
        </div>
      </div>
    ), { duration: Infinity }); 
  };

  return (
    <div className="admin-container">
      <Toaster position="top-right" reverseOrder={false} />

      {/* HEADER PRINCIPAL */}
      <header className="admin-header">
        <div>
          <h1>Gestión de Accesos</h1>
          <p>Administra los usuarios y roles del sistema</p>
        </div>

        {/* Solo mostramos la búsqueda y el botón "Nuevo" si estamos en la pestaña de usuarios */}
        {tabActiva === 'usuarios' && (
          <div className="header-acciones">
            <div className="buscador-wrapper">
              <FaSearch className="icono-busqueda" />
              <input
                type="text"
                placeholder="Buscar por nombre o email..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>

            <button className="btn-primario" onClick={() => abrirModal()}>
              <FaUserPlus /> Nuevo Usuario
            </button>
          </div>
        )}
      </header>

      {/* PESTAÑAS (TABS) */}
      <div className="tabs-navegacion">
        <button 
          className={`tab-btn ${tabActiva === 'usuarios' ? 'activa' : ''}`}
          onClick={() => setTabActiva('usuarios')}
        >
          Lista de Usuarios
        </button>
        <button 
          className={`tab-btn ${tabActiva === 'roles' ? 'activa' : ''}`}
          onClick={() => setTabActiva('roles')}
        >
          Configuración de Roles
        </button>
      </div>

      {/* RENDERIZADO CONDICIONAL DE PESTAÑAS */}
      {tabActiva === 'usuarios' ? (
        
      
           //VISTA DE USUARIOS (TABLA)
     
        <div className="tabla-card">
          <table className="tabla-usuarios">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    <FaSpinner className="icon-spin" style={{ fontSize: '2rem', marginBottom: '1rem', color: '#0ea5e9' }} />
                    <p>Cargando datos del sistema...</p>
                  </td>
                </tr>
              ) : usuariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    <p>No se encontraron usuarios.</p>
                  </td>
                </tr>
              ) : (
                usuariosFiltrados.map(u => (
                  <tr key={u.id_usuario}>
                    <td className="col-usuario">
                      <div className="avatar-tabla">
                        {u.nombre.charAt(0).toUpperCase()}
                      </div>
                      {/* Aquí mostramos ambos apellidos en la tabla */}
                      <span>{u.nombre} {u.apellido_p} {u.apellido_m}</span>
                    </td>

                    <td>{u.email}</td>

                    <td>
                      <span className={`badge badge-${u.estado}`}>
                        {u.estado}
                      </span>
                    </td>

                    <td>
                      <div className="acciones-flex">
                        <button className="btn-accion btn-view" onClick={() => abrirModal(u, true)}>
                          <FaEye />
                        </button>

                        <button className="btn-accion btn-edit" onClick={() => abrirModal(u, false)}>
                          <FaEdit />
                        </button>

                        <button className="btn-accion btn-delete" onClick={() => manejarEliminar(u.id_usuario)}>
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      ) : (

       
          // VISTA DE ROLES (PROXIMAMENTE)
      
      <TablaRoles />

      )}

      {/* MODAL PRO (Para Usuarios) */}
      {mostrarModal && tabActiva === 'usuarios' && (
        <div className="modal-overlay">
          <div className="modal-card">

            <button className="btn-cerrar-modal" onClick={() => setMostrarModal(false)} disabled={procesando}>
              <FaTimes />
            </button>

            <h3 style={{ marginBottom: '1.5rem' }}>
              {verSolo
                ? 'Ficha de Usuario'
                : (editandoId ? 'Editar Usuario' : 'Nuevo Usuario')}
            </h3>

            {!verSolo ? (
              /* FORMULARIO */
              <form onSubmit={manejarGuardar} className="form-grid">

                <div className="input-block">
                  <label>Nombre(s)</label>
                  <input
                    value={form.nombre}
                    onChange={e => setForm({ ...form, nombre: e.target.value })}
                    disabled={procesando}
                    required
                  />
                </div>

                <div className="detalles-grid">
                  <div className="input-block">
                    <label>Apellido Paterno</label>
                    <input
                      value={form.apellido_p}
                      onChange={e => setForm({ ...form, apellido_p: e.target.value })}
                      disabled={procesando}
                      required
                    />
                  </div>

                  <div className="input-block">
                    <label>Apellido Materno</label>
                    <input
                      value={form.apellido_m}
                      onChange={e => setForm({ ...form, apellido_m: e.target.value })}
                      disabled={procesando}
                    />
                  </div>
                </div>

                <div className="input-block">
                  <label>Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    disabled={procesando}
                    required
                  />
                </div>

                <div className="input-block">
                  <label>Estado</label>
                  <select
                    className="form-select"
                    value={form.estado}
                    onChange={e => setForm({ ...form, estado: e.target.value })}
                    disabled={procesando}
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>

                {!editandoId && (
                  <div className="input-block">
                    <label>Contraseña</label>
                    <input
                      type="password"
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      disabled={procesando}
                      required
                    />
                  </div>
                )}

                <button type="submit" className="btn-primario btn-full" disabled={procesando} style={{marginTop: '1rem'}}>
                  {procesando ? (
                    <><FaSpinner className="icon-spin" /> Procesando...</>
                  ) : (
                    <><FaSave /> Guardar</>
                  )}
                </button>
              </form>

            ) : (
              /* DETALLES BONITOS */
              <div className="vista-detalles">

                <div className="info-header">
                  <div className="avatar-detalle">
                    {form.nombre.charAt(0)}
                  </div>

                  <div className="user-main-info">
                    {/* Ambos apellidos en la vista de detalles */}
                    <h4>{form.nombre} {form.apellido_p} {form.apellido_m}</h4>
                    <p>{form.email}</p>
                  </div>
                </div>

                <div className="detalles-grid">
                  <div className="detalle-item">
                    <span>Estado</span>
                    <strong style={{ color: form.estado === 'activo' ? '#10b981' : '#ef4444' }}>
                      {form.estado.toUpperCase()}
                    </strong>
                  </div>

                  <div className="detalle-item">
                    <span>ID</span>
                    <strong>#{editandoId}</strong>
                  </div>
                </div>

                <div className="historial-seccion">
                  <h5><FaHistory /> Historial</h5>

                  <ul className="lista-accesos">
                    {accesos.length > 0 ? (
                      accesos.map((fecha, i) => (
                        <li key={i} className="acceso-item">
                          <span>Ingreso</span>
                          <strong>{fecha}</strong>
                        </li>
                      ))
                    ) : (
                      <li style={{ textAlign: 'center', color: '#94a3b8' }}>
                        Sin registros
                      </li>
                    )}
                  </ul>
                </div>

              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}