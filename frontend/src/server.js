const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Route principale
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// API proxy (pour les requêtes vers l'API Python)
const http = require('http');
const axios = require('axios');

// Configuration de l'URL du backend
const BACKEND_URL = 'http://localhost:5000';

// API proxy (pour les requêtes vers l'API Python)
app.use('/api', async (req, res) => {
  const method = req.method;
  const data = req.body;
  
  try {
    // Le path à partir de la racine du serveur backend - ex: /infirmiers, /emplois-du-temps/semaine, etc.
    const url = `${BACKEND_URL}${req.originalUrl}`;
    
    console.log(`[DEBUG] Frontend request: ${req.method} ${req.originalUrl}`);
    console.log(`[DEBUG] Proxying to backend: ${url}`);
    
    // Options de la requête
    const options = {
      method,
      url,
      data: method !== 'GET' ? data : undefined,
      params: method === 'GET' ? req.query : undefined,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      validateStatus: () => true // Pour gérer nous-même les codes de statut
    };
    
    console.log(`Proxy ${method} request to: ${url}`);
    
    // Faire la requête vers le backend Python
    const response = await axios(options);
    
    // Retourner la réponse du backend
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).json({ error: 'Erreur de proxy: ' + error.message });
  }
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
  console.log(`Ouvrez votre navigateur à l'adresse http://localhost:${PORT}`);
});
