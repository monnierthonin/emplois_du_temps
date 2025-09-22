-- Schéma de la base de données pour l'emploi du temps des infirmiers

-- Table des infirmiers
CREATE TABLE IF NOT EXISTS listeInfirmier (
    id INTEGER PRIMARY KEY,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    status TEXT CHECK(status IN ('J', 'J1', 'J1*', 'J3') OR status IS NULL),
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
    salle16 TEXT, -- libellé "Prenom Nom - Status"
    salle17 TEXT,
    salle18 TEXT,
    salle19 TEXT,
    salle20 TEXT,
    salle21 TEXT,
    salle22 TEXT,
    salle23 TEXT,
    salle24 TEXT,
    reveil1 TEXT,
    reveil2 TEXT,
    perinduction TEXT,
    salle16_state TEXT CHECK (salle16_state IN ('close', 'unuse') OR salle16_state IS NULL) DEFAULT NULL,
    salle17_state TEXT CHECK (salle17_state IN ('close', 'unuse') OR salle17_state IS NULL) DEFAULT NULL,
    salle18_state TEXT CHECK (salle18_state IN ('close', 'unuse') OR salle18_state IS NULL) DEFAULT NULL,
    salle19_state TEXT CHECK (salle19_state IN ('close', 'unuse') OR salle19_state IS NULL) DEFAULT NULL,
    salle20_state TEXT CHECK (salle20_state IN ('close', 'unuse') OR salle20_state IS NULL) DEFAULT NULL,
    salle21_state TEXT CHECK (salle21_state IN ('close', 'unuse') OR salle21_state IS NULL) DEFAULT NULL,
    salle22_state TEXT CHECK (salle22_state IN ('close', 'unuse') OR salle22_state IS NULL) DEFAULT NULL,
    salle23_state TEXT CHECK (salle23_state IN ('close', 'unuse') OR salle23_state IS NULL) DEFAULT NULL,
    salle24_state TEXT CHECK (salle24_state IN ('close', 'unuse') OR salle24_state IS NULL) DEFAULT NULL,
    reveil1_state TEXT CHECK (reveil1_state IN ('close', 'unuse') OR reveil1_state IS NULL) DEFAULT NULL,
    reveil2_state TEXT CHECK (reveil2_state IN ('close', 'unuse') OR reveil2_state IS NULL) DEFAULT NULL,
    perinduction_state TEXT CHECK (perinduction_state IN ('close', 'unuse') OR perinduction_state IS NULL) DEFAULT NULL
);
