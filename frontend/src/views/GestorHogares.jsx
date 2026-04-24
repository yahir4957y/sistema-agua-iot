import React, { useState, useEffect } from 'react';
import { 
  FaHome, FaMicrochip, FaPlus, FaTimes, FaSpinner, 
  FaWifi, FaTrash, FaUser, FaExclamationCircle, FaEdit, 
  FaThermometerHalf, FaMapMarkerAlt 
} from 'react-icons/fa';
import toast, { Toaster } from 'react-hot-toast';
import { supabase } from '../services/supabaseClient';
import './GestorHogares.css'; 

export default function GestorHogares() {
  const [hogares, setHogares] = useState([]);
  const [usuariosDb, setUsuariosDb] = useState([]); 
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  
  const [modalHogar, setModalHogar] = useState(false);
  const [modalDispositivo, setModalDispositivo] = useState({ visible: false, id_hogar: null });
  const [modalSensor, setModalSensor] = useState({ visible: false, id_dispositivo: null });

  const [editandoIdHogar, setEditandoIdHogar] = useState(null);
  const [editandoIdDisp, setEditandoIdDisp] = useState(null);

  const [formHogar, setFormHogar] = useState({ id_usuario: '', nombre: '', descripcion: '' });
  const [formDisp, setFormDisp] = useState({ nombre: '', ssid_wifi: '', password_wifi: '' });
  const [formSensor, setFormSensor] = useState({ nombre: '', ubicacion: '' });

  const fetchDatos = async () => {
    try {
      setCargando(true);
      const peticionHogares = supabase
        .from('hogares')
        .select('*, dispositivos(*, sensores(*))')
        .order('fecha_registro', { ascending: false });
        
      const peticionUsuarios = supabase
        .from('usuarios')
        .select('id_usuario, nombre, email')
        .order('nombre', { ascending: true });

      const [resHogares, resUsuarios] = await Promise.all([peticionHogares, peticionUsuarios]);

      if (resHogares.error) throw resHogares.error;
      if (resUsuarios.error) throw resUsuarios.error;

      setHogares(resHogares.data || []);
      setUsuariosDb(resUsuarios.data || []);
    } catch (error) {
      toast.error('Error de conexión con Supabase');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { fetchDatos(); }, []);

  // --- MODALES ---
  const abrirModalNuevoHogar = () => { setEditandoIdHogar(null); setFormHogar({ id_usuario: '', nombre: '', descripcion: '' }); setModalHogar(true); };
  const abrirModalEditarHogar = (hogar) => { setEditandoIdHogar(hogar.id_hogar); setFormHogar({ id_usuario: hogar.id_usuario, nombre: hogar.nombre, descripcion: hogar.descripcion || '' }); setModalHogar(true); };
  const abrirModalNuevoDisp = (id_hogar) => { setEditandoIdDisp(null); setFormDisp({ nombre: '', ssid_wifi: '', password_wifi: '' }); setModalDispositivo({ visible: true, id_hogar }); };
  const abrirModalEditarDisp = (disp, id_hogar) => { setEditandoIdDisp(disp.id_dispositivo); setFormDisp({ nombre: disp.nombre, ssid_wifi: disp.ssid_wifi, password_wifi: disp.password_wifi }); setModalDispositivo({ visible: true, id_hogar }); };
  const abrirModalNuevoSensor = (id_dispositivo) => { setFormSensor({ nombre: '', ubicacion: '' }); setModalSensor({ visible: true, id_dispositivo }); };

  // --- VALIDACIONES ---
  const esFormHogarValido = formHogar.id_usuario !== '' && formHogar.nombre.trim().length >= 3;
  const esFormDispValido = formDisp.nombre.trim().length >= 3 && formDisp.ssid_wifi.trim().length >= 2 && formDisp.password_wifi.length >= 4;
  const esFormSensorValido = formSensor.nombre.trim().length >= 2;

  // --- ACCIONES ---
  const guardarHogar = async (e) => {
    e.preventDefault();
    if (procesando || !esFormHogarValido) return; 
    setProcesando(true);

    const ejecutarOperacion = async () => {
      const payload = { id_usuario: formHogar.id_usuario, nombre: formHogar.nombre.trim(), descripcion: formHogar.descripcion.trim() };
      const res = editandoIdHogar 
        ? await supabase.from('hogares').update(payload).eq('id_hogar', editandoIdHogar)
        : await supabase.from('hogares').insert([payload]);
      if (res.error) throw res.error;
    };

    toast.promise(ejecutarOperacion(), { loading: 'Procesando...', success: 'Hogar guardado', error: 'Error en la DB' })
      .then(() => { setModalHogar(false); fetchDatos(); })
      .finally(() => setProcesando(false));
  };

  const eliminarHogar = (id) => {
    toast((t) => (
      <div className="toast-custom">
        <p className="toast-titulo">¿Eliminar esta residencia?</p>
        <p className="toast-desc">Se borrarán permanentemente sus dispositivos ESP32 y sensores.</p>
        <div className="toast-acciones">
          <button className="btn-toast-cancel" onClick={() => toast.dismiss(t.id)}>Cancelar</button>
          <button className="btn-toast-delete" onClick={async () => {
              toast.dismiss(t.id);
              const { error } = await supabase.from('hogares').delete().eq('id_hogar', id);
              if (error) toast.error('Error al eliminar'); else { toast.success('Hogar eliminado'); fetchDatos(); }
            }}>Sí, eliminar</button>
        </div>
      </div>
    ), { duration: Infinity, id: 'toast-eliminar-hogar' });
  };

  const guardarDispositivo = async (e) => {
    e.preventDefault();
    if (procesando || !esFormDispValido) return;
    setProcesando(true);

    const ejecutarOperacion = async () => {
      const payload = { nombre: formDisp.nombre.trim(), ssid_wifi: formDisp.ssid_wifi.trim(), password_wifi: formDisp.password_wifi };
      let res;
      if (editandoIdDisp) {
        res = await supabase.from('dispositivos').update(payload).eq('id_dispositivo', editandoIdDisp);
      } else {
        payload.id_hogar = modalDispositivo.id_hogar;
        payload.estado = 'activo';
        res = await supabase.from('dispositivos').insert([payload]);
      }
      if (res.error) throw res.error;
    };

    toast.promise(ejecutarOperacion(), { loading: 'Procesando...', success: 'Dispositivo guardado', error: 'Error al vincular' })
      .then(() => { setModalDispositivo({ visible: false, id_hogar: null }); fetchDatos(); })
      .finally(() => setProcesando(false));
  };

  const eliminarDispositivo = async (id) => {
    if(!window.confirm('¿Desvincular y borrar este dispositivo y sus sensores?')) return;
    const { error } = await supabase.from('dispositivos').delete().eq('id_dispositivo', id);
    if (error) toast.error('Error al eliminar'); else { toast.success('Desvinculado'); fetchDatos(); }
  };

  const guardarSensor = async (e) => {
    e.preventDefault();
    if (procesando || !esFormSensorValido) return;
    setProcesando(true);

    const ejecutarInsert = async () => {
      const { error } = await supabase.from('sensores').insert([{
        id_dispositivo: modalSensor.id_dispositivo,
        nombre: formSensor.nombre.trim(),
        ubicacion: formSensor.ubicacion.trim(),
        estado: 'activo'
      }]);
      if (error) throw error;
    };

    toast.promise(ejecutarInsert(), { loading: 'Mapeando...', success: 'Sensor mapeado', error: 'Error al registrar' })
      .then(() => { setModalSensor({ visible: false, id_dispositivo: null }); fetchDatos(); })
      .finally(() => setProcesando(false));
  };

  const eliminarSensor = async (id) => {
    if(!window.confirm('¿Eliminar este sensor?')) return;
    const { error } = await supabase.from('sensores').delete().eq('id_sensor', id);
    if (error) toast.error('Error al eliminar'); else { toast.success('Sensor eliminado'); fetchDatos(); }
  };

  return (
    <div className="hogares-container">
      <Toaster position="top-right" />
      
      <header className="hogares-header">
        <div>
          <h2 className="m-0 text-slate-900">Infraestructura IoT</h2>
          <p className="m-0 mt-1 text-slate-500 text-sm">Gestiona tus casas, módulos ESP32 y sensores</p>
        </div>
        <button className="btn-primario" onClick={abrirModalNuevoHogar}>
          <FaPlus className="mr-2" /> Nueva Residencia
        </button>
      </header>

      {cargando ? (
        <div className="estado-cargando">
          <FaSpinner className="icon-spin spinner-grande" />
          <p>Sincronizando...</p>
        </div>
      ) : hogares.length === 0 ? (
        <div className="estado-vacio">
          <FaHome className="icono-vacio" />
          <h3 className="titulo-vacio">Ningún hogar registrado</h3>
          <p className="texto-vacio">El primer paso es crear tu residencia.</p>
          <button onClick={abrirModalNuevoHogar} className="btn-primario mx-auto py-3 px-6 text-lg">
            <FaPlus className="mr-2" /> Crear mi primera residencia
          </button>
        </div>
      ) : (
        <div className="grid-hogares">
          {hogares.map(hogar => {
            const dueño = usuariosDb.find(u => u.id_usuario === hogar.id_usuario);

            return (
              <div key={hogar.id_hogar} className="hogar-card">
                <div className="hogar-header">
                  <div className="hogar-info">
                    <h3><FaHome className="text-sky-500 mr-2"/> {hogar.nombre}</h3>
                    <p>{hogar.descripcion || 'Sin descripción'}</p>
                    <p className="propietario-badge">
                      <FaUser className="text-sky-500 mr-1"/> Propietario: {dueño ? dueño.nombre : 'Usuario huérfano'}
                    </p>
                  </div>
                  <div className="acciones-flex">
                    <button onClick={() => abrirModalEditarHogar(hogar)} className="btn-icon edit" title="Editar Hogar"><FaEdit /></button>
                    <button onClick={() => eliminarHogar(hogar.id_hogar)} className="btn-icon delete" title="Eliminar Hogar"><FaTrash /></button>
                  </div>
                </div>

                <div className="dispositivos-lista">
                  <h4 className="text-xs text-slate-400 uppercase mb-2">Módulos ESP32 ({hogar.dispositivos?.length || 0})</h4>
                  
                  {(!hogar.dispositivos || hogar.dispositivos.length === 0) && (
                    <div className="alerta-vacia"><FaExclamationCircle className="mr-1"/> No hay placas activas.</div>
                  )}

                  {hogar.dispositivos && hogar.dispositivos.map(disp => (
                    <div key={disp.id_dispositivo} className="dispositivo-card">
                      <div className="dispositivo-header">
                        <div className="dispositivo-info">
                          <h5 className="m-0 text-sm text-slate-800"><FaMicrochip className="text-slate-500 mr-1"/> {disp.nombre}</h5>
                          <span className="text-xs text-slate-500"><FaWifi className="text-sky-500 mr-1"/> Red: {disp.ssid_wifi}</span>
                        </div>
                        <div className="acciones-flex items-center">
                          <span className={`badge badge-${disp.estado === 'activo' ? 'verde' : 'gris'}`}>{disp.estado}</span>
                          <button onClick={() => abrirModalEditarDisp(disp, hogar.id_hogar)} className="btn-icon edit-blue" title="Editar WiFi"><FaEdit /></button>
                          <button onClick={() => eliminarDispositivo(disp.id_dispositivo)} className="btn-icon delete" title="Borrar ESP32"><FaTrash /></button>
                        </div>
                      </div>

                      <div className="sensores-lista">
                        {disp.sensores && disp.sensores.length > 0 ? (
                          disp.sensores.map(sensor => (
                            <div key={sensor.id_sensor} className="sensor-item">
                              <div className="sensor-info" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <FaThermometerHalf className="text-amber-500" />
                                  <strong style={{ fontSize: '0.9rem', color: '#1e293b' }}>{sensor.nombre}</strong>
                                </div>
                                {sensor.ubicacion && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#94a3b8' }}>
                                    <FaMapMarkerAlt />
                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sensor.ubicacion}</span>
                                  </div>
                                )}
                              </div>
                              <button onClick={() => eliminarSensor(sensor.id_sensor)} className="btn-icon delete p-1"><FaTimes /></button>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-slate-400 my-1">Sin sensores mapeados.</p>
                        )}
                        <button onClick={() => abrirModalNuevoSensor(disp.id_dispositivo)} className="btn-agregar-sensor">
                          + Añadir Sensor a {disp.nombre}
                        </button>
                      </div>
                    </div>
                  ))}

                  <button className="btn-agregar-disp" onClick={() => abrirModalNuevoDisp(hogar.id_hogar)}>
                    <FaPlus className="mr-1"/> Vincular Placa ESP32
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL HOGAR */}
      {modalHogar && (
        <div className="modal-overlay">
          <div className="modal-card">
            <button className="btn-cerrar-modal" onClick={() => setModalHogar(false)} disabled={procesando}><FaTimes /></button>
            <h3 className="mb-6">{editandoIdHogar ? 'Editar Residencia' : 'Registrar Residencia'}</h3>
            <form onSubmit={guardarHogar} className="form-grid">
              <div className="input-block">
                <label>Propietario *</label>
                <select required className="form-select" value={formHogar.id_usuario} onChange={e => setFormHogar({...formHogar, id_usuario: e.target.value})} disabled={procesando}>
                  <option value="" disabled>-- Selecciona un Propietario --</option>
                  {usuariosDb.map(user => (<option key={user.id_usuario} value={user.id_usuario}>{user.nombre}</option>))}
                </select>
              </div>
              <div className="input-block">
                <label>Nombre *</label>
                <input required type="text" className={!esFormHogarValido && formHogar.nombre.length > 0 ? 'input-error' : ''} value={formHogar.nombre} onChange={e => setFormHogar({...formHogar, nombre: e.target.value})} placeholder="Ej: Casa Principal" disabled={procesando} />
              </div>
              <div className="input-block">
                <label>Dirección</label>
                <input type="text" value={formHogar.descripcion} onChange={e => setFormHogar({...formHogar, descripcion: e.target.value})} disabled={procesando} />
              </div>
              <button type="submit" className={`btn-primario btn-full mt-4 ${!esFormHogarValido ? 'btn-disabled' : ''}`} disabled={procesando || !esFormHogarValido}>
                {procesando ? <FaSpinner className="icon-spin" /> : (editandoIdHogar ? 'Guardar Cambios' : 'Registrar')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DISPOSITIVO */}
      {modalDispositivo.visible && (
        <div className="modal-overlay">
          <div className="modal-card">
            <button className="btn-cerrar-modal" onClick={() => setModalDispositivo({visible: false, id_hogar: null})} disabled={procesando}><FaTimes /></button>
            <h3 className="mb-6">{editandoIdDisp ? 'Editar ESP32' : 'Vincular ESP32'}</h3>
            <form onSubmit={guardarDispositivo} className="form-grid">
              <div className="input-block"><label>Nombre *</label><input required type="text" value={formDisp.nombre} onChange={e => setFormDisp({...formDisp, nombre: e.target.value})} disabled={procesando} /></div>
              <div className="input-block"><label>Red WiFi *</label><input required type="text" value={formDisp.ssid_wifi} onChange={e => setFormDisp({...formDisp, ssid_wifi: e.target.value})} disabled={procesando} /></div>
              <div className="input-block"><label>Contraseña *</label><input required type="password" value={formDisp.password_wifi} onChange={e => setFormDisp({...formDisp, password_wifi: e.target.value})} disabled={procesando} /></div>
              <button type="submit" className={`btn-primario btn-full mt-4 ${!esFormDispValido ? 'btn-disabled' : ''}`} disabled={procesando || !esFormDispValido}>
                {procesando ? <FaSpinner className="icon-spin" /> : 'Guardar'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SENSOR */}
      {modalSensor.visible && (
        <div className="modal-overlay">
          <div className="modal-card">
            <button className="btn-cerrar-modal" onClick={() => setModalSensor({visible: false, id_dispositivo: null})} disabled={procesando}><FaTimes /></button>
            <h3 className="mb-6">Mapear Sensor</h3>
            <form onSubmit={guardarSensor} className="form-grid">
              <div className="input-block"><label>Nombre *</label><input required type="text" value={formSensor.nombre} onChange={e => setFormSensor({...formSensor, nombre: e.target.value})} disabled={procesando} placeholder="Ej: Cocina" /></div>
              <div className="input-block"><label>Ubicación</label><input type="text" value={formSensor.ubicacion} onChange={e => setFormSensor({...formSensor, ubicacion: e.target.value})} disabled={procesando} placeholder="Ej: Jardín trasero" /></div>
              <button type="submit" className={`btn-primario btn-full btn-sensor-save ${!esFormSensorValido ? 'btn-disabled' : ''}`} disabled={procesando || !esFormSensorValido}>
                {procesando ? <FaSpinner className="icon-spin" /> : 'Guardar Sensor'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}