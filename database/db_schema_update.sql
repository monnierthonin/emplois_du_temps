-- Mise à jour du schéma pour ajouter les états des salles

-- Ajouter des colonnes pour l'état de chaque salle dans la table emploisDuTemps
ALTER TABLE emploisDuTemps ADD COLUMN salle16_state TEXT CHECK(salle16_state IN ('close', 'unuse', NULL)) DEFAULT NULL;
ALTER TABLE emploisDuTemps ADD COLUMN salle17_state TEXT CHECK(salle17_state IN ('close', 'unuse', NULL)) DEFAULT NULL;
ALTER TABLE emploisDuTemps ADD COLUMN salle18_state TEXT CHECK(salle18_state IN ('close', 'unuse', NULL)) DEFAULT NULL;
ALTER TABLE emploisDuTemps ADD COLUMN salle19_state TEXT CHECK(salle19_state IN ('close', 'unuse', NULL)) DEFAULT NULL;
ALTER TABLE emploisDuTemps ADD COLUMN salle20_state TEXT CHECK(salle20_state IN ('close', 'unuse', NULL)) DEFAULT NULL;
ALTER TABLE emploisDuTemps ADD COLUMN salle21_state TEXT CHECK(salle21_state IN ('close', 'unuse', NULL)) DEFAULT NULL;
ALTER TABLE emploisDuTemps ADD COLUMN salle22_state TEXT CHECK(salle22_state IN ('close', 'unuse', NULL)) DEFAULT NULL;
ALTER TABLE emploisDuTemps ADD COLUMN salle23_state TEXT CHECK(salle23_state IN ('close', 'unuse', NULL)) DEFAULT NULL;
ALTER TABLE emploisDuTemps ADD COLUMN salle24_state TEXT CHECK(salle24_state IN ('close', 'unuse', NULL)) DEFAULT NULL;
ALTER TABLE emploisDuTemps ADD COLUMN reveil1_state TEXT CHECK(reveil1_state IN ('close', 'unuse', NULL)) DEFAULT NULL;
ALTER TABLE emploisDuTemps ADD COLUMN reveil2_state TEXT CHECK(reveil2_state IN ('close', 'unuse', NULL)) DEFAULT NULL;
ALTER TABLE emploisDuTemps ADD COLUMN perinduction_state TEXT CHECK(perinduction_state IN ('close', 'unuse', NULL)) DEFAULT NULL;
