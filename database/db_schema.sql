-- Schéma de la base de données pour l'emploi du temps des infirmiers

-- Table des infirmiers
CREATE TABLE IF NOT EXISTS listeInfirmier (
    id INTEGER PRIMARY KEY,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    status TEXT CHECK(status IN ('J', 'J1', 'J1*', 'J3')),
    present BOOLEAN DEFAULT 1 -- 1 pour présent, 0 pour absent
);

-- Table des statistiques par infirmier
CREATE TABLE IF NOT EXISTS statistique (
    id INTEGER PRIMARY KEY,
    infirmierID INTEGER,
    salle16 INTEGER DEFAULT 0,
    salle17 INTEGER DEFAULT 0,
    salle18 INTEGER DEFAULT 0,
    salle19 INTEGER DEFAULT 0,
    salle20 INTEGER DEFAULT 0,
    salle21 INTEGER DEFAULT 0,
    salle22 INTEGER DEFAULT 0,
    salle23 INTEGER DEFAULT 0,
    salle24 INTEGER DEFAULT 0,
    reveil1 INTEGER DEFAULT 0,
    reveil2 INTEGER DEFAULT 0,
    perinduction INTEGER DEFAULT 0,
    FOREIGN KEY (infirmierID) REFERENCES listeInfirmier (id)
);

-- Table des emplois du temps
CREATE TABLE IF NOT EXISTS emploisDuTemps (
    id INTEGER PRIMARY KEY,
    date TEXT NOT NULL, -- Format YYYY-MM-DD
    salle16 INTEGER,
    salle17 INTEGER,
    salle18 INTEGER,
    salle19 INTEGER,
    salle20 INTEGER,
    salle21 INTEGER,
    salle22 INTEGER,
    salle23 INTEGER,
    salle24 INTEGER,
    reveil1 INTEGER,
    reveil2 INTEGER,
    perinduction INTEGER,
    FOREIGN KEY (salle16) REFERENCES listeInfirmier (id),
    FOREIGN KEY (salle17) REFERENCES listeInfirmier (id),
    FOREIGN KEY (salle18) REFERENCES listeInfirmier (id),
    FOREIGN KEY (salle19) REFERENCES listeInfirmier (id),
    FOREIGN KEY (salle20) REFERENCES listeInfirmier (id),
    FOREIGN KEY (salle21) REFERENCES listeInfirmier (id),
    FOREIGN KEY (salle22) REFERENCES listeInfirmier (id),
    FOREIGN KEY (salle23) REFERENCES listeInfirmier (id),
    FOREIGN KEY (salle24) REFERENCES listeInfirmier (id),
    FOREIGN KEY (reveil1) REFERENCES listeInfirmier (id),
    FOREIGN KEY (reveil2) REFERENCES listeInfirmier (id),
    FOREIGN KEY (perinduction) REFERENCES listeInfirmier (id)
);
