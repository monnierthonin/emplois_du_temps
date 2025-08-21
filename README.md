# Projet d'emploi du temps pour infirmier

Ce projet est une application d'emploi du temps pour les infirmiers avec une architecture en trois parties:
- Frontend: Node.js
- Backend: API Python
- Base de données: SQLite (locale)

## Structure du projet

```
emploisDuTemps/
├── frontend/              # Frontend Node.js
│   ├── public/            # Fichiers statiques
│   ├── src/               # Code source du frontend
│   ├── package.json       # Dépendances Node.js
│   └── README.md          # Documentation frontend
├── backend/               # Backend Python
│   ├── api/               # Code de l'API
│   ├── models/            # Modèles de données
│   ├── requirements.txt   # Dépendances Python
│   └── README.md          # Documentation backend
├── database/              # Base de données SQLite
│   └── db_schema.sql      # Schéma de la base de données
├── algorithm/             # Futur algorithme de tri (à développer)
└── README.md              # Documentation principale
```

## Installation et démarrage

### Frontend
```bash
cd frontend
npm install
npm start
```

### Backend
```bash
cd backend
pip install -r requirements.txt
python api/app.py
```

## Technologies utilisées
- Frontend: Node.js, HTML, CSS, JavaScript
- Backend: Python, Flask
- Base de données: SQLite
