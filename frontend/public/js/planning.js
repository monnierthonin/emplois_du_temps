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
  
  // Bouton sélectionner une semaine
  const selectWeekBtn = document.getElementById('select-week');
  if (selectWeekBtn) {
    selectWeekBtn.addEventListener('click', () => {
      openWeekSelectModal();
    });
  }
  
  // Configuration du formulaire de sélection de semaine
  const weekSelectForm = document.getElementById('week-select-form');
  if (weekSelectForm) {
    weekSelectForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const selectedDate = new Date(document.getElementById('week-date-select').value);
      const weekStart = getWeekStartFromDate(selectedDate);
      setCurrentWeek(weekStart);
      closeWeekSelectModal();
    });
  }
  
  // Fermeture du modal de sélection de semaine
  const closeButtons = document.querySelectorAll('#week-select-modal .close');
  closeButtons.forEach(button => {
    button.addEventListener('click', () => {
      closeWeekSelectModal();
    });
  });
  
  // Fermeture du modal en cliquant à l'extérieur
  window.addEventListener('click', (e) => {
    const modal = document.getElementById('week-select-modal');
    if (e.target === modal) {
      closeWeekSelectModal();
    }
  });
}

/**
 * Détermine le début de la semaine courante (lundi)
 * @returns {Date} Date du lundi de la semaine courante
 */
function getCurrentWeekStart() {
  const today = new Date();
  return getWeekStartFromDate(today);
}

/**
 * Calcule le premier jour (lundi) de la semaine contenant la date spécifiée
 * @param {Date} date - Une date quelconque dans la semaine
 * @returns {Date} Date du lundi de cette semaine
 */
function getWeekStartFromDate(date) {
  const dayOfWeek = date.getDay(); // 0 = dimanche, 1 = lundi, ..., 6 = samedi
  
  // Calcul du jour de début de semaine (lundi)
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Transformer 0-6 en "jours depuis lundi"
  
  // Créer une nouvelle date pour le lundi de la semaine
  const mondayDate = new Date(date);
  mondayDate.setDate(date.getDate() - diff);
  
  // Réinitialiser l'heure à minuit
  mondayDate.setHours(0, 0, 0, 0);
  
  return mondayDate;
}

/**
 * Ouvre le modal de sélection de semaine
 */
function openWeekSelectModal() {
  // Pré-remplir avec la date actuelle au format YYYY-MM-DD
  const dateInput = document.getElementById('week-date-select');
  const today = new Date();
  const dateString = today.toISOString().split('T')[0]; // Format YYYY-MM-DD
  dateInput.value = dateString;
  
  // Afficher le modal
  const modal = document.getElementById('week-select-modal');
  if (modal) {
    modal.style.display = 'block';
  }
}

/**
 * Ferme le modal de sélection de semaine
 */
function closeWeekSelectModal() {
  const modal = document.getElementById('week-select-modal');
  if (modal) {
    modal.style.display = 'none';
  }
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
  
  // Mise à jour des en-têtes du tableau avec les dates
  updateTableHeadersWithDates(weekStart);
}

/**
 * Met à jour les en-têtes du tableau avec les dates des jours
 * @param {Date} weekStart - Date du début de semaine
 */
function updateTableHeadersWithDates(weekStart) {
  // Sélectionner toutes les en-têtes de jours (colonnes 1 à 5)
  const headers = document.querySelectorAll('#schedule-table thead th:not(.room-header)');
  
  // Pour chaque en-tête (Lundi à Vendredi)
  headers.forEach((header, index) => {
    // Calculer la date pour ce jour
    const dayDate = new Date(weekStart);
    dayDate.setDate(weekStart.getDate() + index);
    
    // Formater la date (jour et mois)
    const day = dayDate.getDate();
    const month = dayDate.getMonth() + 1; // Les mois commencent à 0
    
    // Mettre à jour le texte de l'en-tête avec le jour et la date
    header.innerHTML = `${DAYS_OF_WEEK[index]}<br><span class="date-info">${day}/${month}</span>`;
  });
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
