import React, { useState, useEffect } from 'react';
import { 
  FaUserPlus, FaEdit, FaTrash, FaSave, FaTimes, FaEye, FaHistory, 
  FaSearch, FaSpinner, FaUser, FaEnvelope, FaLock, FaUserTag, FaIdCard 
} from 'react-icons/fa';
import toast, { Toaster } from 'react-hot-toast'; 
import './AdminUsuarios.css';
import TablaRoles from './TablaRoles'; 
import { supabase } from '../services/supabaseClient';


export default function AdminUsuarios() {
  
  const [usuarios, setUsuarios] = useState([]);
  const [usuariosFiltrados, setUsuariosFiltrados] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [editandoId, setEditandoId] = useState(null);
  const [verSolo, setVerSolo] = useState(false);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [accesos, setAccesos] = useState([]);
  
  const [tabActiva, setTabActiva] = useState('usuarios'); 
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);

  const [form, setForm] = useState({
    nombre: '', apellido_p: '', apellido_m: '', email: '', password: '', estado: 'activo'
  });

  const fetchUsuarios = async () => {
    try {
      setCargando(true);
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .order('id_usuario', { ascending: true });

      if (error) throw error;
      
      setUsuarios(data);
      setUsuariosFiltrados(data);
    } catch (error) {
      toast.error('Error al conectar con la base de datos en la nube');
      console.error(error);
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
      setForm({ 
        nombre: u.nombre || '', 
        apellido_p: u.apellido_p || '', 
        apellido_m: u.apellido_m || '', 
        email: u.email || '', 
        estado: u.estado || 'activo',
        password: '' 
      });

      if (modoVer) {
        const cargarHistorial = async () => {
          const { data, error } = await supabase
            .from('log_accesos')
            .select('fecha_hora')
            .eq('id_usuario', u.id_usuario)
            .order('fecha_hora', { ascending: false })
            .limit(10);
            
          if (error) throw error;
          return data.map(log => new Date(log.fecha_hora).toLocaleString());
        };

        toast.promise(cargarHistorial(), {
          loading: 'Cargando historial...',
          success: (dataHistorial) => {
            setAccesos(dataHistorial);
            return 'Historial cargado';
          },
          error: 'Error al cargar detalles'
        });
      }
    } else {
      setEditandoId(null);
      setForm({
        nombre: '', apellido_p: '', apellido_m: '', email: '', password: '', estado: 'activo'
      });
    }

    setMostrarModal(true);
  };

  const validarFormulario = () => {
    const regexLetras = /^[a-zA-ZÀ-ÿ\s]{2,40}$/;
    const regexEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const dominiosBloqueados = ['hola.com', 'test.com', 'ejemplo.com', 'prueba.com', 'abc.com', '123.com'];
    
    if (!regexLetras.test(form.nombre.trim())) { toast.error('El nombre solo debe contener letras'); return false; }
    if (!regexLetras.test(form.apellido_p.trim())) { toast.error('El apellido paterno solo debe contener letras'); return false; }
    if (form.apellido_m && form.apellido_m.trim() !== '' && !regexLetras.test(form.apellido_m.trim())) {
      toast.error('El apellido materno solo debe contener letras'); return false;
    }
    const emailLimpio = form.email.trim().toLowerCase();
    if (!regexEmail.test(emailLimpio)) { toast.error('Ingresa un correo con formato válido'); return false; }
    if (dominiosBloqueados.includes(emailLimpio.split('@')[1])) { toast.error('Dominio no permitido.'); return false; }
    if (!editandoId && form.password.length < 6) { toast.error('La contraseña debe tener al menos 6 caracteres'); return false; }

    return true; 
  };

  const manejarGuardar = async (e) => {
    e.preventDefault();
    if (!validarFormulario()) return;
    setProcesando(true); 

    const guardarEnNube = async () => {
      if (editandoId) {
        const updateData = {
          nombre: form.nombre, apellido_p: form.apellido_p, apellido_m: form.apellido_m, 
          email: form.email, estado: form.estado,
        };
        if (form.password && form.password.trim() !== '') updateData.password_hash = form.password;

        const { error } = await supabase.from('usuarios').update(updateData).eq('id_usuario', editandoId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('usuarios').insert([{
          nombre: form.nombre, apellido_p: form.apellido_p, apellido_m: form.apellido_m,
          email: form.email, estado: form.estado, password_hash: form.password 
        }]);
        if (error) throw error;
      }
    };

    toast.promise(guardarEnNube(), {
      loading: editandoId ? 'Actualizando datos...' : 'Registrando usuario...',
      success: () => {
        setMostrarModal(false);
        fetchUsuarios(); 
        return editandoId ? '¡Usuario actualizado!' : '¡Usuario registrado con éxito!';
      },
      error: (err) => {
        if (err.code === '23505') return 'El correo ya está en uso';
        return `Error: ${err.message}`;
      }
    }).finally(() => { setProcesando(false); });
  };

  const manejarEliminar = (id) => {
    toast((t) => (
      <div>
        <p className="toast-titulo">¿Inactivar este usuario?</p>
        <div className="toast-botones">
          <button className="btn-toast-cancelar" onClick={() => toast.dismiss(t.id)}>Cancelar</button>
          <button className="btn-toast-eliminar" onClick={async () => {
              toast.dismiss(t.id);
              const inactivarEnNube = async () => {
                const { error } = await supabase.from('usuarios').update({ estado: 'inactivo' }).eq('id_usuario', id);
                if (error) throw error;
              };
              toast.promise(inactivarEnNube(), {
                loading: 'Inactivando...', success: 'Usuario inactivado correctamente', error: 'Error al inactivar en la nube'
              });
              try { await inactivarEnNube(); fetchUsuarios(); } catch(e) {}
            }}>
            Sí, inactivar
          </button>
        </div>
      </div>
    ), { duration: Infinity }); 
  };

  return (
    <div className="admin-container">
      <Toaster position="top-right" reverseOrder={false} />

      <header className="admin-header">
        <div>
          <h1>Gestión de Accesos</h1>
          <p>Administra los usuarios y roles sincronizados en la Nube</p>
        </div>
        {tabActiva === 'usuarios' && (
          <div className="header-acciones">
            <div className="buscador-wrapper">
              <FaSearch className="icono-busqueda" />
              <input type="text" placeholder="Buscar por nombre o email..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            </div>
            <button className="btn-primario" onClick={() => abrirModal()}><FaUserPlus /> Nuevo Usuario</button>
          </div>
        )}
      </header>

      <div className="tabs-navegacion">
        <button className={`tab-btn ${tabActiva === 'usuarios' ? 'activa' : ''}`} onClick={() => setTabActiva('usuarios')}>Lista de Usuarios</button>
        <button className={`tab-btn ${tabActiva === 'roles' ? 'activa' : ''}`} onClick={() => setTabActiva('roles')}>Configuración de Roles</button>
      </div>

      {tabActiva === 'usuarios' ? (
        <div className="tabla-card">
          <table className="tabla-usuarios">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Estado</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr>
                  <td colSpan="4" className="tabla-vacia">
                    <FaSpinner className="icon-spin spinner-grande" />
                    <p>Cargando datos desde Supabase...</p>
                  </td>
                </tr>
              ) : usuariosFiltrados.length === 0 ? (
                <tr><td colSpan="4" className="tabla-vacia"><p>No se encontraron usuarios.</p></td></tr>
              ) : (
                usuariosFiltrados.map(u => (
                  <tr key={u.id_usuario}>
                    <td className="col-usuario">
                      <div className="avatar-tabla">{u.nombre.charAt(0).toUpperCase()}</div>
                      <span>{u.nombre} {u.apellido_p} {u.apellido_m}</span>
                    </td>
                    <td>{u.email}</td>
                    <td><span className={`badge badge-${u.estado}`}>{u.estado}</span></td>
                    <td>
                      <div className="acciones-flex">
                        <button className="btn-accion btn-view" onClick={() => abrirModal(u, true)}><FaEye /></button>
                        <button className="btn-accion btn-edit" onClick={() => abrirModal(u, false)}><FaEdit /></button>
                        <button className="btn-accion btn-delete" onClick={() => manejarEliminar(u.id_usuario)}><FaTrash /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <TablaRoles />
      )}

      {mostrarModal && tabActiva === 'usuarios' && (
        <div className="modal-overlay">
          <div className="modal-card">
            <button className="btn-cerrar-modal" onClick={() => setMostrarModal(false)} disabled={procesando}><FaTimes /></button>
            <h3 className="mb-1-5">
              {verSolo ? 'Ficha de Usuario (Cloud)' : (editandoId ? 'Editar Usuario' : 'Nuevo Usuario')}
            </h3>

            {!verSolo ? (
              <form onSubmit={manejarGuardar} className="form-grid">
                <div className="input-block">
                  <label>Nombre(s)</label>
                  <div className="input-icon-wrapper">
                    <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} disabled={procesando} placeholder="Ej: Yahir Alexander" required />
                    <FaUser />
                  </div>
                </div>

                <div className="detalles-grid">
                  <div className="input-block">
                    <label>Apellido Paterno</label>
                    <div className="input-icon-wrapper">
                      <input value={form.apellido_p} onChange={e => setForm({ ...form, apellido_p: e.target.value })} disabled={procesando} placeholder="Ej: Arapa" required />
                      <FaIdCard />
                    </div>
                  </div>
                  <div className="input-block">
                    <label>Apellido Materno</label>
                    <div className="input-icon-wrapper">
                      <input value={form.apellido_m} onChange={e => setForm({ ...form, apellido_m: e.target.value })} disabled={procesando} placeholder="Ej: Quispe (Opcional)" />
                      <FaIdCard />
                    </div>
                  </div>
                </div>

                <div className="input-block">
                  <label>Email</label>
                  <div className="input-icon-wrapper">
                    <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} disabled={procesando} placeholder="Ej: yahir@agua-iot.com" required />
                    <FaEnvelope />
                  </div>
                </div>

                <div className="input-block">
                  <label>Estado</label>
                  <div className="input-icon-wrapper">
                    <select className="form-select" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })} disabled={procesando}>
                      <option value="activo">Activo</option>
                      <option value="inactivo">Inactivo</option>
                    </select>
                    <FaUserTag />
                  </div>
                </div>

                {!editandoId && (
                  <div className="input-block">
                    <label>Contraseña</label>
                    <div className="input-icon-wrapper">
                      <input type="password" onChange={e => setForm({ ...form, password: e.target.value })} disabled={procesando} placeholder="Mínimo 6 caracteres" required />
                      <FaLock />
                    </div>
                  </div>
                )}

                <button type="submit" className="btn-primario btn-full mt-1" disabled={procesando}>
                  {procesando ? <><FaSpinner className="icon-spin" /> Procesando...</> : <><FaSave /> Guardar en Nube</>}
                </button>
              </form>
            ) : (
              <div className="vista-detalles">
                <div className="info-header">
                  <div className="avatar-detalle">{form.nombre.charAt(0)}</div>
                  <div className="user-main-info">
                    <h4>{form.nombre} {form.apellido_p} {form.apellido_m}</h4>
                    <p>{form.email}</p>
                  </div>
                </div>

                <div className="detalles-grid">
                  <div className="detalle-item">
                    <span>Estado</span>
                    <strong className={form.estado === 'activo' ? 'text-activo' : 'text-inactivo'}>{form.estado.toUpperCase()}</strong>
                  </div>
                  <div className="detalle-item">
                    <span>ID Supabase</span>
                    <strong>#{editandoId}</strong>
                  </div>
                </div>

                <div className="historial-seccion">
                  <h5><FaHistory /> Historial (Lectura en vivo)</h5>
                  <ul className="lista-accesos">
                    {accesos.length > 0 ? accesos.map((fecha, i) => (
                      <li key={i} className="acceso-item"><span>Ingreso</span><strong>{fecha}</strong></li>
                    )) : <li className="tabla-vacia" style={{padding: '1rem'}}>Sin registros en la nube</li>}
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