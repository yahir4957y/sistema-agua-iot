import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Welcome from './views/Welcome';
import Login from './views/Login'; 
import Dashboard from './views/Dashboard'; 
import RutaProtegida from './components/RutaProtegida';
import './index.css'; 

function App() {
  return (
    
    <Router>
      <Routes>
        <Route path="/" element={<Welcome />} />
        {/* ¡NUEVA RUTA! */}
        <Route path="/login" element={<Login />} />

        <Route path="/dashboard" element={<Dashboard />} />

        <Route 
          path="/dashboard" 
          element={
            <RutaProtegida>
              <Dashboard />
            </RutaProtegida>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;