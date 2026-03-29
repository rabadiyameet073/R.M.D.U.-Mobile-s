import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/global.css';
import './styles/pages/home.css';
import './styles/pages/budget-killer.css';
import './styles/pages/gaming-guru.css';
import './styles/pages/camera-champ.css';
import './styles/pages/battery-boss.css';
import './styles/pages/goat.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
