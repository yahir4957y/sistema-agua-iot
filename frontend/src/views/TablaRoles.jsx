import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaSave, FaTimes, FaPlus, FaSpinner } from 'react-icons/fa';
import toast from 'react-hot-toast';

export default function TablaRoles() {
  const [roles, setRoles] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  
  const [form, setForm] = useState({
    nombre: '',
    descripcion: ''
  });

  // 1. OBTENER ROLES
  const fetchRoles = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/roles');
      const data = await res.json();
      setRoles(data);
    } catch (error) {
      toast.error('Error al cargar los roles');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { fetchRoles(); }, []);

  // 2. ABRIR MODAL
  const abrirModal = (rol = null) => {
    if (rol) {
      setEditandoId(rol.id_rol);
      setForm({ nombre: rol.nombre, descripcion: rol.descripcion });
    } else {
      setEditandoId(null);
      setForm({ nombre: '', descripcion: '' });
    }
    setMostrarModal(true);
  };

  // 3. GUARDAR ROL
  const manejarGuardar = async (e) => {
    e.preventDefault();
    setProcesando(true);

    const metodo = editandoId ? 'PUT' : 'POST';
    const url = editandoId 
      ? `http://localhost:8000/api/roles/${editandoId}` 
      : 'http://localhost:8000/api/roles';

    const peticionGuardar = fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    }).then(async res => {
      if (!res.ok) throw new Error();
      return res.json();
    });

    toast.promise(peticionGuardar, {
      loading: 'Guardando rol...',
      success: editandoId ? 'Rol actualizado' : 'Rol creado con éxito',
      error: 'Error al procesar la solicitud'
    });

    try {
      await peticionGuardar;
      setMostrarModal(false);
      fetchRoles();
    } catch (error) {
      console.error(error);
    } finally {
      setProcesando(false);
    }
  };

  // 4. ELIMINAR ROL
  const manejarEliminar = (id) => {
    toast((t) => (
      <div>
        <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', fontWeight: 'bold' }}>¿Eliminar este rol de forma permanente?</p>
        <p style={{ margin: '0 0 10px 0', fontSize: '0.8rem', color: '#ef4444' }}>Advertencia: Asegúrate de que no haya usuarios usándolo.</p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={() => toast.dismiss(t.id)} style={{ padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
          <button 
            onClick={async () => {
              toast.dismiss(t.id);
              const promesaBorrar = fetch(`http://localhost:8000/api/roles/${id}`, { method: 'DELETE' }).then(res => {
                  if(!res.ok) throw new Error();
              });
              
              toast.promise(promesaBorrar, {
                loading: 'Eliminando...',
                success: 'Rol eliminado correctamente',
                error: 'Error: Puede que este rol esté en uso'
              });
              
              await promesaBorrar;
              fetchRoles();
            }} 
            style={{ padding: '6px 12px', border: 'none', background: '#ef4444', color: 'white', borderRadius: '6px', cursor: 'pointer' }}>
            Sí, eliminar
          </button>
        </div>
      </div>
    ), { duration: Infinity });
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
        <h3 style={{ color: '#0f172a', margin: 0 }}>Catálogo de Roles</h3>
        <button className="btn-primario" onClick={() => abrirModal()} style={{ padding: '0.6rem 1rem', fontSize: '0.85rem' }}>
          <FaPlus style={{ marginRight: '5px' }} /> Nuevo Rol
        </button>
      </div>

      <div className="tabla-card">
        <table className="tabla-usuarios">
          <thead>
            <tr>
              <th style={{ width: '80px' }}>ID</th>
              <th style={{ width: '200px' }}>Nombre del Rol</th>
              <th>Descripción y Permisos</th>
              <th style={{ textAlign: 'right', width: '120px' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                  <FaSpinner className="icon-spin" style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#0ea5e9' }} />
                  <p>Cargando roles...</p>
                </td>
              </tr>
            ) : roles.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No hay roles registrados.</td>
              </tr>
            ) : (
              roles.map(r => (
                <tr key={r.id_rol}>
                  <td style={{ fontWeight: 'bold', color: '#64748b' }}>#{r.id_rol}</td>
                  <td>
                    <span style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: '8px', fontWeight: '600', color: '#0f172a' }}>
                      {r.nombre}
                    </span>
                  </td>
                  <td style={{ color: '#475569', fontSize: '0.9rem' }}>{r.descripcion || 'Sin descripción'}</td>
                  <td>
                    <div className="acciones-flex">
                      <button className="btn-accion btn-edit" onClick={() => abrirModal(r)} title="Editar"><FaEdit /></button>
                      <button className="btn-accion btn-delete" onClick={() => manejarEliminar(r.id_rol)} title="Eliminar"><FaTrash /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL DE ROLES */}
      {mostrarModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '400px' }}>
            <button className="btn-cerrar-modal" onClick={() => setMostrarModal(false)} disabled={procesando}><FaTimes /></button>
            <h3 style={{ marginBottom: '1.5rem' }}>{editandoId ? 'Editar Rol' : 'Nuevo Rol'}</h3>

            <form onSubmit={manejarGuardar} className="form-grid">
              <div className="input-block">
                <label>Nombre del Rol</label>
                <input 
                  type="text" 
                  value={form.nombre} 
                  onChange={e => setForm({...form, nombre: e.target.value})} 
                  placeholder="Ej: SuperAdmin"
                  disabled={procesando} 
                  required 
                />
              </div>

              <div className="input-block">
                <label>Descripción / Permisos</label>
                <textarea 
                  value={form.descripcion} 
                  onChange={e => setForm({...form, descripcion: e.target.value})} 
                  placeholder="Describe qué puede hacer este rol..."
                  disabled={procesando}
                  style={{ padding: '0.8rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#f8fafc', minHeight: '80px', outline: 'none', fontFamily: 'inherit' }}
                />
              </div>

              <button type="submit" className="btn-primario btn-full" disabled={procesando} style={{marginTop: '1rem'}}>
                {procesando ? <><FaSpinner className="icon-spin" /> Guardando...</> : <><FaSave /> Guardar Rol</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}