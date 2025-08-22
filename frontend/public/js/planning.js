/**
 * Module de gestion du planning hebdomadaire
 * Gère l'affichage et la navigation entre les semaines
 */

// Configuration
const DAYS_OF_WEEK = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
const MS_PER_DAY = 86400000; // 24 * 60 * 60 * 1000

// Variables globales
let currentWeekStart = null;

/**
 * Initialise le module de planning
 */
function initPlanningModule() {
  setupWeekNavigation();
  setCurrentWeek(getCurrentWeekStart());
}

/**
 * Configure les écouteurs d'événements pour la navigation entre semaines
 */
function setupWeekNavigation() {
  // Bouton semaine précédente
  document.getElementById('prev-week').addEventListener('click', () => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(newWeekStart.getDate() - 7);
    setCurrentWeek(newWeekStart);
  });

  // Bouton semaine suivante
  document.getElementById('next-week').addEventListener('click', () => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(newWeekStart.getDate() + 7);
    setCurrentWeek(newWeekStart);
  });

  // Bouton aujourd'hui
  document.getElementById('today-btn').addEventListener('click', () => {
    setCurrentWeek(getCurrentWeekStart());
  });
}

/**
 * Détermine le début de la semaine courante (lundi)
 * @returns {Date} Date du lundi de la semaine courante
 */
function getCurrentWeekStart() {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = dimanche, 1 = lundi, ..., 6 = samedi
  
  // Calcul du jour de début de semaine (lundi)
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Transformer 0-6 en "jours depuis lundi"
  
  // Créer une nouvelle date pour le lundi de la semaine courante
  const mondayDate = new Date(today);
  mondayDate.setDate(today.getDate() - diff);
  
  // Réinitialiser l'heure à minuit
  mondayDate.setHours(0, 0, 0, 0);
  
  return mondayDate;
}

/**
 * Définit la semaine courante et met à jour l'affichage
 * @param {Date} weekStartDate - Date du lundi de la semaine à afficher
 */
function setCurrentWeek(weekStartDate) {
  currentWeekStart = weekStartDate;
  
  // Mise à jour du titre avec la plage de dates
  updateWeekTitle(weekStartDate);
  
  // Mise à jour des attributs data-date sur les cellules du planning
  updateScheduleCellDates(weekStartDate);
  
  // Charger les données pour cette semaine (à implémenter plus tard)
  // loadWeekData(weekStartDate);
}

/**
 * Met à jour le titre avec la plage de dates de la semaine
 * @param {Date} weekStart - Date du début de semaine
 */
function updateWeekTitle(weekStart) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 4); // Vendredi = lundi + 4 jours
  
  const startDay = weekStart.getDate();
  const endDay = weekEnd.getDate();
  
  const startMonth = weekStart.toLocaleString('fr-FR', { month: 'long' });
  const endMonth = weekEnd.toLocaleString('fr-FR', { month: 'long' });
  
  const year = weekStart.getFullYear();
  
  let titleText = '';
  if (startMonth === endMonth) {
    // Même mois
    titleText = `Semaine du ${startDay} au ${endDay} ${startMonth} ${year}`;
  } else {
    // Mois différents
    titleText = `Semaine du ${startDay} ${startMonth} au ${endDay} ${endMonth} ${year}`;
  }
  
  document.getElementById('current-week').textContent = titleText;
}

/**
 * Met à jour les attributs data-date sur les cellules du planning
 * @param {Date} weekStart - Date du début de semaine
 */
function updateScheduleCellDates(weekStart) {
  const cells = document.querySelectorAll('.schedule-cell');
  
  cells.forEach(cell => {
    const dayOffset = parseInt(cell.getAttribute('data-day')) - 1; // 1-based to 0-based
    
    // Calculer la date pour cette cellule
    const cellDate = new Date(weekStart);
    cellDate.setDate(weekStart.getDate() + dayOffset);
    
    // Format: YYYY-MM-DD
    const dateStr = cellDate.toISOString().split('T')[0];
    
    // Ajouter l'attribut data-date
    cell.setAttribute('data-date', dateStr);
    
    // Optionnel: ajouter un attribut title pour afficher la date au survol
    cell.setAttribute('title', `${DAYS_OF_WEEK[dayOffset]} ${dateStr}`);
  });
}

// Initialisation du module lorsque le DOM est chargé
document.addEventListener('DOMContentLoaded', initPlanningModule);
