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
  const prevWeekBtn = document.getElementById('prev-week');
  if (prevWeekBtn) {
    prevWeekBtn.addEventListener('click', () => {
      const newWeekStart = new Date(currentWeekStart);
      newWeekStart.setDate(newWeekStart.getDate() - 7);
      setCurrentWeek(newWeekStart);
    });
  }

  // Bouton semaine suivante
  const nextWeekBtn = document.getElementById('next-week');
  if (nextWeekBtn) {
    nextWeekBtn.addEventListener('click', () => {
      const newWeekStart = new Date(currentWeekStart);
      newWeekStart.setDate(newWeekStart.getDate() + 7);
      setCurrentWeek(newWeekStart);
    });
  }

  // Bouton aujourd'hui
  const todayBtn = document.getElementById('today-btn');
  if (todayBtn) {
    todayBtn.addEventListener('click', () => {
      setCurrentWeek(getCurrentWeekStart());
    });
  }
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
  
  // Charger les données pour cette semaine
  loadWeekData(weekStartDate);
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

/**
 * Charge les données de planning pour une semaine depuis l'API
 * @param {Date} weekStartDate - Date du début de semaine
 */
async function loadWeekData(weekStartDate) {
  try {
    // Préparer les dates de début et fin de la semaine pour l'API
    const weekStart = weekStartDate.toISOString().split('T')[0]; // Format YYYY-MM-DD
    
    // Calculer la date de fin (vendredi)
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 4); // Vendredi = lundi + 4
    const weekEnd = weekEndDate.toISOString().split('T')[0];
    
    // Construire l'URL de l'API avec paramètres de dates
    const apiUrl = `${API_BASE_URL}/emplois-du-temps/semaine?debut=${weekStart}&fin=${weekEnd}`;
    
    // Effacer les événements existants
    clearEvents();
    
    // Appel à l'API
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Ajouter les événements au calendrier
    if (data && data.length > 0) {
      data.forEach(item => {
        // Date de l'événement (format YYYY-MM-DD attendu dans la réponse API)
        const eventDate = new Date(item.date);
        
        // Trouver la cellule correspondant à cette date
        const dateStr = item.date;
        const cell = document.querySelector(`.schedule-cell[data-date="${dateStr}"]`);
        
        if (cell) {
          // Ajouter un événement visuel pour chaque service
          addEventToCell(cell, item.prenom, item.service);
        }
      });
    }
  } catch (error) {
    console.error('Erreur lors du chargement des données de la semaine:', error);
    // Afficher un message d'erreur si nécessaire
  }
}

/**
 * Efface tous les événements affichés dans les cellules du planning
 */
function clearEvents() {
  const eventElements = document.querySelectorAll('.schedule-cell .event');
  eventElements.forEach(event => event.remove());
}

/**
 * Ajoute un événement visuel à une cellule du planning
 * @param {HTMLElement} cell - Cellule du planning
 * @param {string} name - Nom de l'infirmier
 * @param {string} service - Code du service (morning, afternoon, night)
 */
function addEventToCell(cell, name, service) {
  const event = document.createElement('div');
  event.className = `event ${service}`;
  event.textContent = name;
  // Ajouter des styles spécifiques selon le service
  switch(service) {
    case 'morning':
      event.classList.add('event-morning');
      break;
    case 'afternoon':
      event.classList.add('event-afternoon');
      break;
    case 'night':
      event.classList.add('event-night');
      break;
    case 'off':
      event.classList.add('event-off');
      break;
  }
  cell.appendChild(event);
}

// La variable API_BASE_URL est définie dans script.js

// Initialisation du module lorsque le DOM est chargé
document.addEventListener('DOMContentLoaded', initPlanningModule);
