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
app.use('/api', (req, res) => {
  // À implémenter pour transférer les requêtes vers l'API Python
  res.status(501).json({ message: 'API non implémentée' });
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
  console.log(`Ouvrez votre navigateur à l'adresse http://localhost:${PORT}`);
});
