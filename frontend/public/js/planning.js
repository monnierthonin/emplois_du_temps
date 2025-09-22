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
  addRoomStateControlsToAllCells();
  addRoomStateControlsToHeaders();
  setCurrentWeek(getCurrentWeekStart());
}

/**
 * Ajoute un libellé (texte) à une cellule du planning et l'active pour le drag
 * @param {HTMLElement} cell
 * @param {string} label
 */
function addLabelToCell(cell, label) {
  // Nettoyer la cellule
  const existingEvents = cell.querySelectorAll('.event');
  existingEvents.forEach(event => event.remove());

  const container = document.createElement('div');
  container.className = 'event assigned-infirmier';
  container.setAttribute('draggable', 'true');
  container.style.backgroundColor = '#a3c1ad';
  container.style.color = '#333';
  container.style.padding = '2px 5px';
  container.style.borderRadius = '3px';
  container.style.fontSize = '0.9em';
  container.style.fontWeight = 'bold';
  container.style.display = 'flex';
  container.style.justifyContent = 'space-between';
  container.style.alignItems = 'center';
  container.style.cursor = 'grab';

  container.dataset.label = label;

  const nameElement = document.createElement('span');
  nameElement.textContent = label;
  container.appendChild(nameElement);

  const deleteButton = document.createElement('button');
  deleteButton.textContent = 'X';
  deleteButton.style.marginLeft = '5px';
  deleteButton.style.background = 'none';
  deleteButton.style.border = 'none';
  deleteButton.style.color = '#555';
  deleteButton.style.fontWeight = 'bold';
  deleteButton.style.cursor = 'pointer';
  deleteButton.style.fontSize = '0.8em';
  deleteButton.style.padding = '0px 3px';
  deleteButton.title = 'Retirer de cette salle';
  deleteButton.addEventListener('click', function(e) {
    e.stopPropagation();
    const cellEl = this.closest('.schedule-cell');
    const date = cellEl.getAttribute('data-date');
    const room = cellEl.getAttribute('data-room');
    if (date && room) {
      removeInfirmierFromCell(date, room, cellEl);
    }
  });
  container.appendChild(deleteButton);

  container.addEventListener('dragstart', handleInfirmierDragStart);
  container.addEventListener('dragend', handleInfirmierDragEnd);

  cell.appendChild(container);
}

/**
 * Gère le changement d'état d'une salle sur tous les jours de la semaine courante
 * @param {string} room - Identifiant de la salle (ex: salle16, reveil1)
 * @param {string|null} state - Le nouvel état ('close', 'unuse' ou null pour ouvert)
 */
async function handleWeeklyRoomStateChange(room, state) {
  try {
    // Si aucune semaine n'est actuellement chargée, on ne fait rien
    if (!currentWeekStart) return;
    
    // Indication visuelle pendant le chargement
    const roomHeaders = document.querySelectorAll(`.room-cell[data-room="${room}"]`);
    roomHeaders.forEach(header => header.classList.add('loading'));
    
    // Préparer les dates pour chaque jour de la semaine
    const dates = [];
    for (let i = 0; i < 5; i++) { // Du lundi au vendredi
      const dayDate = new Date(currentWeekStart);
      dayDate.setDate(currentWeekStart.getDate() + i);
      dates.push(dayDate.toISOString().split('T')[0]); // Format YYYY-MM-DD
    }
    
    // Compteurs pour les résultats
    let successCount = 0;
    let skippedCount = 0;
    
    // Pour chaque jour de la semaine
    for (const date of dates) {
      // Vérifier si un infirmier est déjà assigné à cette salle ce jour-là
      const cell = document.querySelector(`.schedule-cell[data-date="${date}"][data-room="${room}"]`);
      
      if (cell && cell.querySelector('.event')) {
        // Si un infirmier est déjà assigné, on ne modifie pas cette cellule
        skippedCount++;
        continue;
      }
      
      // Appel à l'API pour mettre à jour l'état de la salle
      try {
        const response = await fetch(`${API_BASE_URL}/salle-state`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            date: date,
            salle: room,
            state: state
          })
        });
        
        if (response.ok) {
          successCount++;
          // Mettre à jour visuellement la cellule si elle existe
          if (cell) {
            updateRoomStateUI(cell, state);
          }
        }
      } catch (cellError) {
        console.error(`Erreur pour la salle ${room} le ${date}:`, cellError);
      }
    }
    
    // Message de confirmation avec le résumé des actions
    const stateMsg = state ? (state === 'close' ? 'fermée' : 'marquée comme non utilisée') : 'ouverte';
    const skipMsg = skippedCount > 0 ? ` (${skippedCount} jours ignorés car un infirmier y est déjà assigné)` : '';
    showMessage(`Salle ${room} ${stateMsg} pour ${successCount} jours de la semaine${skipMsg}`, 'success');
    
    // Recharger les états des salles pour mettre à jour l'affichage
    if (currentWeekStart) {
      await loadRoomStates(currentWeekStart);
    }
    // Rafraîchir les statistiques en temps réel (au cas où des affectations ont été supprimées)
    if (window.StatsChartManager && typeof window.StatsChartManager.refresh === 'function') {
      await window.StatsChartManager.refresh();
    }
    
  } catch (error) {
    console.error('Erreur lors du changement d\'\u00e9tat de la salle sur la semaine:', error);
    showMessage('Erreur lors du changement d\'\u00e9tat de la salle. Veuillez réessayer.', 'error');
  } finally {
    // Retirer l'indication de chargement
    const roomHeaders = document.querySelectorAll(`.room-cell[data-room="${room}"]`);
    roomHeaders.forEach(header => header.classList.remove('loading'));
  }
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
 * Ajoute les boutons de contrôle d'état de salle à toutes les cellules du planning
 */
function addRoomStateControlsToAllCells() {
  const cells = document.querySelectorAll('.schedule-cell');
  
  cells.forEach(cell => {
    // Créer le conteneur pour les boutons d'état
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'room-state-controls';
    
    // Bouton pour ouvrir la salle (état normal)
    const openBtn = document.createElement('button');
    openBtn.className = 'room-state-btn btn-open';
    openBtn.innerHTML = '✓';
    openBtn.title = 'Ouvrir la salle';
    openBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleRoomStateChange(cell, null);
    });
    
    // Bouton pour marquer comme "non utilisée"
    const unuseBtn = document.createElement('button');
    unuseBtn.className = 'room-state-btn btn-unuse';
    unuseBtn.innerHTML = '!';
    unuseBtn.title = 'Marquer comme non utilisée';
    unuseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleRoomStateChange(cell, 'unuse');
    });
    
    // Bouton pour fermer la salle
    const closeBtn = document.createElement('button');
    closeBtn.className = 'room-state-btn btn-close';
    closeBtn.innerHTML = 'X';
    closeBtn.title = 'Fermer la salle';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleRoomStateChange(cell, 'close');
    });
    
    // Ajouter les boutons au conteneur
    controlsContainer.appendChild(openBtn);
    controlsContainer.appendChild(unuseBtn);
    controlsContainer.appendChild(closeBtn);
    
    // Ajouter le conteneur à la cellule
    cell.appendChild(controlsContainer);
  });
}

/**
 * Gère le changement d'état d'une salle
 * @param {HTMLElement} cell - La cellule du planning
 * @param {string|null} state - Le nouvel état ('close', 'unuse' ou null pour ouvert)
 */
async function handleRoomStateChange(cell, state) {
  try {
    const date = cell.getAttribute('data-date');
    const room = cell.getAttribute('data-room');
    
    if (!date || !room) {
      console.error('Impossible de déterminer la date ou la salle');
      return;
    }
    
    // Indication visuelle pendant le chargement
    cell.classList.add('loading');
    
    // Appel à l'API pour mettre à jour l'état de la salle
    const response = await fetch(`${API_BASE_URL}/salle-state`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        date: date,
        salle: room,
        state: state
      })
    });
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    
    const result = await response.json();
    
    // Mise à jour de l'UI avec le nouvel état
    updateRoomStateUI(cell, state);
    
    // Si l'état est 'close' ou 'unuse', l'API aura déjà retiré l'infirmier de cette salle
    // Recharger les états des salles pour mettre à jour l'affichage
    if (currentWeekStart) {
      loadRoomStates(currentWeekStart);
    }
    // Rafraîchir les statistiques (décrément possible côté backend)
    if (window.StatsChartManager && typeof window.StatsChartManager.refresh === 'function') {
      await window.StatsChartManager.refresh();
    }
    
    // Montrer un message de confirmation
    const stateMsg = state ? (state === 'close' ? 'fermée' : 'marquée comme non utilisée') : 'ouverte';
    showMessage(`Salle ${room} ${stateMsg} pour le ${formatDate(date)}`, 'success');
    
  } catch (error) {
    console.error('Erreur lors du changement d\'état de la salle:', error);
    showMessage('Erreur lors du changement d\'état de la salle. Veuillez réessayer.', 'error');
  } finally {
    cell.classList.remove('loading');
  }
}

/**
 * Met à jour l'UI d'une cellule en fonction de son état
 * @param {HTMLElement} cell - La cellule du planning
 * @param {string|null} state - L'état de la salle ('close', 'unuse' ou null)
 */
function updateRoomStateUI(cell, state) {
  // Retirer les classes d'état existantes
  cell.classList.remove('room-close', 'room-unuse');
  
  // Ajouter la classe appropriée en fonction de l'état
  if (state === 'close') {
    cell.classList.add('room-close');
  } else if (state === 'unuse') {
    cell.classList.add('room-unuse');
  }
}

/**
 * Ajoute des contrôles d'état aux cellules d'en-tête des salles pour permettre
 * de modifier l'état d'une salle sur tous les jours de la semaine
 */
function addRoomStateControlsToHeaders() {
  // Sélectionner toutes les cellules d'en-tête des salles
  const roomHeaders = document.querySelectorAll('.room-cell');
  
  roomHeaders.forEach(header => {
    // Extraire le nom de la salle à partir du texte de l'en-tête
    const roomText = header.textContent.trim();
    let roomKey = '';
    
    // Convertir le nom affiché en clé utilisée dans l'API
    if (roomText.startsWith('Salle ')) {
      const roomNumber = roomText.replace('Salle ', '');
      roomKey = 'salle' + roomNumber;
    } else if (roomText.startsWith('Réveil ')) {
      const roomNumber = roomText.replace('Réveil ', '');
      roomKey = 'reveil' + roomNumber;
    } else if (roomText === 'Pré-induction') {
      roomKey = 'perinduction';
    }
    
    if (roomKey) {
      // Stocker la clé de la salle comme attribut data
      header.setAttribute('data-room', roomKey);
      
      // Créer le conteneur pour les boutons d'état
      const controlsContainer = document.createElement('div');
      controlsContainer.className = 'room-state-controls header-controls';
      
      // Bouton pour ouvrir la salle (état normal) sur toute la semaine
      const openBtn = document.createElement('button');
      openBtn.className = 'room-state-btn btn-open';
      openBtn.innerHTML = '✓';
      openBtn.title = 'Ouvrir la salle pour toute la semaine';
      openBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleWeeklyRoomStateChange(roomKey, null);
      });
      
      // Bouton pour marquer comme "non utilisée" sur toute la semaine
      const unuseBtn = document.createElement('button');
      unuseBtn.className = 'room-state-btn btn-unuse';
      unuseBtn.innerHTML = '!';
      unuseBtn.title = 'Marquer comme non utilisée pour toute la semaine';
      unuseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleWeeklyRoomStateChange(roomKey, 'unuse');
      });
      
      // Bouton pour fermer la salle sur toute la semaine
      const closeBtn = document.createElement('button');
      closeBtn.className = 'room-state-btn btn-close';
      closeBtn.innerHTML = 'X';
      closeBtn.title = 'Fermer la salle pour toute la semaine';
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleWeeklyRoomStateChange(roomKey, 'close');
      });
      
      // Ajouter les boutons au conteneur
      controlsContainer.appendChild(openBtn);
      controlsContainer.appendChild(unuseBtn);
      controlsContainer.appendChild(closeBtn);
      
      // Ajouter le conteneur à l'en-tête
      header.appendChild(controlsContainer);
    }
  });
}

/**
 * Charge les états des salles pour une période donnée
 * @param {Date} weekStartDate - Date du début de semaine
 */
async function loadRoomStates(weekStartDate) {
  try {
    // Préparer les dates pour chaque jour de la semaine
    const dates = [];
    for (let i = 0; i < 5; i++) { // Du lundi au vendredi
      const dayDate = new Date(weekStartDate);
      dayDate.setDate(weekStartDate.getDate() + i);
      dates.push(dayDate.toISOString().split('T')[0]); // Format YYYY-MM-DD
    }
    
    // Récupérer les états des salles pour chaque jour
    for (const date of dates) {
      const response = await fetch(`${API_BASE_URL}/salle-states/${date}`);
      
      if (!response.ok) {
        console.warn(`Impossible de récupérer les états des salles pour ${date}`);
        continue;
      }
      
      const data = await response.json();
      
      // Appliquer les états aux cellules correspondantes
      if (data && data.states) {
        const salles = Object.keys(data.states);
        
        salles.forEach(salle => {
          const state = data.states[salle];
          const cell = document.querySelector(`.schedule-cell[data-date="${date}"][data-room="${salle}"]`);
          
          if (cell) {
            updateRoomStateUI(cell, state);
          }
        });
      }
    }
    
  } catch (error) {
    console.error('Erreur lors du chargement des états des salles:', error);
  }
}

/**
 * Formatte une date au format français
 * @param {string} dateStr - Date au format YYYY-MM-DD
 * @returns {string} Date au format DD/MM/YYYY
 */
function formatDate(dateStr) {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Affiche un message à l'utilisateur
 * @param {string} message - Le message à afficher
 * @param {string} type - Type de message ('success', 'error', 'info')
 */
function showMessage(message, type = 'info') {
  // Vérifier si la fonction existe dans un autre module (infirmiers.js par exemple)
  // mais éviter de s'appeler elle-même (récursion infinie)
  if (window.showNotification && typeof window.showNotification === 'function' && window.showNotification !== showMessage) {
    window.showNotification(message, type);
  } else {
    // Implémentation directe
    const notifContainer = document.getElementById('notification-container') || createNotificationContainer();
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <span>${message}</span>
        <button class="notification-close">&times;</button>
      </div>
    `;
    
    // Ajouter au conteneur
    notifContainer.appendChild(notification);
    
    // Ajouter l'écouteur d'événement pour fermer
    notification.querySelector('.notification-close').addEventListener('click', () => {
      notification.remove();
    });
    
    // Auto-suppression après 5 secondes
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);
    
    // Log dans la console également
    console.log(`${type.toUpperCase()}: ${message}`);
  }
}

/**
 * Crée le conteneur de notifications s'il n'existe pas
 * @returns {HTMLElement} Le conteneur de notifications
 */
function createNotificationContainer() {
  const container = document.createElement('div');
  container.id = 'notification-container';
  container.style.position = 'fixed';
  container.style.bottom = '20px';
  container.style.right = '20px';
  container.style.zIndex = '9999';
  document.body.appendChild(container);
  return container;
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
    
    // Appel à l'API pour les données d'emploi du temps
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Charger également les états des salles
    await loadRoomStates(weekStartDate);
    
    // Ajouter les événements au calendrier (nouveau modèle via labels)
    if (data && data.length > 0) {
      data.forEach(item => {
        const dateStr = item.date;
        const salles = ['salle16', 'salle17', 'salle18', 'salle19', 'salle20', 'salle21', 
                        'salle22', 'salle23', 'salle24', 'reveil1', 'reveil2', 'perinduction'];

        const doublons = item.doublons || [];
        if (doublons.length > 0) {
          doublons.forEach(salle => {
            const doublonCell = document.querySelector(`.schedule-cell[data-date="${dateStr}"][data-room="${salle}"]`);
            if (doublonCell) {
              doublonCell.classList.add('doublon');
            }
          });
        }

        const labels = item.labels || {};
        salles.forEach(salle => {
          const label = labels[salle];
          if (label) {
            const cell = document.querySelector(`.schedule-cell[data-date="${dateStr}"][data-room="${salle}"]`);
            if (cell) {
              addLabelToCell(cell, label);
              if (doublons.includes(salle)) {
                const infoElement = document.createElement('div');
                infoElement.className = 'doublon-info';
                infoElement.textContent = '⚠️ Doublon';
                infoElement.title = 'Ce libellé est affecté à plusieurs salles ce jour-là';
                infoElement.style.fontSize = '0.7em';
                infoElement.style.color = '#d32f2f';
                infoElement.style.marginTop = '2px';
                cell.appendChild(infoElement);
              }
            }
          }
        });
      });
    }
  } catch (error) {
    console.error('Erreur lors du chargement des données de la semaine:', error);
    // Afficher un message d'erreur si nécessaire
  }
}

/**
 * Efface tous les événements affichés dans les cellules du planning
 * et réinitialise les statuts de doublon
 */
function clearEvents() {
  // Supprimer tous les événements
  const eventElements = document.querySelectorAll('.schedule-cell .event');
  eventElements.forEach(event => event.remove());
  
  // Supprimer les indicateurs de doublon
  const doublonInfoElements = document.querySelectorAll('.schedule-cell .doublon-info');
  doublonInfoElements.forEach(info => info.remove());
  
  // Supprimer la classe doublon de toutes les cellules
  const doublonCells = document.querySelectorAll('.schedule-cell.doublon');
  doublonCells.forEach(cell => cell.classList.remove('doublon'));
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

/**
 * Ajoute les informations d'un infirmier à une cellule du planning
 * @param {HTMLElement} cell - Cellule du planning
 * @param {Object} infirmier - Objet contenant les informations de l'infirmier
 */
function addInfirmierToCell(cell, infirmier) {
  // Nettoyer la cellule des événements existants
  const existingEvents = cell.querySelectorAll('.event');
  existingEvents.forEach(event => event.remove());
  
  // Créer un conteneur pour l'infirmier et le bouton de suppression
  const container = document.createElement('div');
  container.className = 'event assigned-infirmier';
  
  // Rendre l'élément draggable pour permettre le déplacement
  container.setAttribute('draggable', 'true');
  
  // Ajouter des styles spécifiques au conteneur
  container.style.backgroundColor = '#a3c1ad'; // Couleur de fond légère
  container.style.color = '#333'; // Couleur du texte foncée pour la lisibilité
  container.style.padding = '2px 5px';
  container.style.borderRadius = '3px';
  container.style.fontSize = '0.9em';
  container.style.fontWeight = 'bold';
  container.style.display = 'flex';
  container.style.justifyContent = 'space-between';
  container.style.alignItems = 'center';
  container.style.cursor = 'grab'; // Curseur indiquant que l'élément est déplaçable
  
  // Nouveau modèle basé sur libellé; conserver l'ancien fallback si dispo
  const label = `${infirmier.prenom || ''} ${infirmier.nom || ''}`.trim();
  container.dataset.label = infirmier.label || label;
  
  // Créer l'élément pour le nom de l'infirmier
  const nameElement = document.createElement('span');
  nameElement.textContent = infirmier.label || `${infirmier.prenom || ''} ${infirmier.nom || ''}`.trim();
  container.appendChild(nameElement);
  
  // Créer le bouton de suppression
  const deleteButton = document.createElement('button');
  deleteButton.textContent = 'X';
  deleteButton.style.marginLeft = '5px';
  deleteButton.style.background = 'none';
  deleteButton.style.border = 'none';
  deleteButton.style.color = '#555';
  deleteButton.style.fontWeight = 'bold';
  deleteButton.style.cursor = 'pointer';
  deleteButton.style.fontSize = '0.8em';
  deleteButton.style.padding = '0px 3px';
  deleteButton.title = 'Retirer l\'infirmier de cette salle';
  
  // Ajouter l'événement de clic pour supprimer l'infirmier
  deleteButton.addEventListener('click', function(e) {
    e.stopPropagation(); // Éviter la propagation du clic
    
    // Récupérer la date et la salle
    const cell = this.closest('.schedule-cell');
    const date = cell.getAttribute('data-date');
    const room = cell.getAttribute('data-room');
    
    if (date && room) {
      // Appeler l'API pour retirer l'infirmier de cette salle
      removeInfirmierFromCell(date, room, cell);
    }
  });
  
  container.appendChild(deleteButton);
  
  // Ajouter les événements de drag pour le conteneur
  container.addEventListener('dragstart', handleInfirmierDragStart);
  container.addEventListener('dragend', handleInfirmierDragEnd);
  
  // Ajouter à la cellule
  cell.appendChild(container);
}

/**
 * Retire un infirmier d'une cellule du planning
 * @param {string} date - La date de la cellule (YYYY-MM-DD)
 * @param {string} room - La salle concernée
 * @param {HTMLElement} cell - La cellule du planning
 */
async function removeInfirmierFromCell(date, room, cell) {
  try {
    // Afficher un indicateur de chargement
    cell.classList.add('loading');
    
    // Appeler l'API pour retirer l'infirmier
    const response = await fetch(`${API_BASE_URL}/reset-assignment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        date: date,
        salle: room
      })
    });
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    
    // Réponse de l'API réussie
    const result = await response.json();
    
    // Nettoyer la cellule
    const existingEvents = cell.querySelectorAll('.event');
    existingEvents.forEach(event => event.remove());

    // Rafraîchir les statistiques en temps réel après suppression
    if (window.StatsChartManager && typeof window.StatsChartManager.refresh === 'function') {
      await window.StatsChartManager.refresh();
    }
    
    // Recharger les données de la semaine pour mettre à jour tout l'affichage
    if (currentWeekStart) {
      loadWeekData(currentWeekStart);
    }
    
    console.log('Infirmier retiré avec succès');
    
  } catch (error) {
    console.error('Erreur lors du retrait de l\'infirmier:', error);
    alert('Erreur lors du retrait de l\'infirmier. Veuillez réessayer.');
  } finally {
    // Retirer l'indicateur de chargement
    cell.classList.remove('loading');
  }
}

/**
 * Gère le début du drag pour un infirmier déjà placé dans l'emploi du temps
 * @param {DragEvent} e - L'événement de drag
 */
function handleInfirmierDragStart(e) {
  // Stocker les informations (nouveau modèle: libellé)
  const label = this.dataset.label;
  
  // Récupérer les informations de la cellule d'origine
  const sourceCell = this.closest('.schedule-cell');
  const sourceDate = sourceCell.getAttribute('data-date');
  const sourceRoom = sourceCell.getAttribute('data-room');
  
  // Stocker les données pour le transfert
  const transferData = {
    label: label,
    sourceDate: sourceDate,
    sourceRoom: sourceRoom,
    isFromCell: true
  };
  
  e.dataTransfer.setData('text/plain', JSON.stringify(transferData));
  
  // Ajouter une classe pour indiquer que l'élément est en cours de glissement
  this.classList.add('dragging');
  
  // Changer le style du curseur pendant le drag
  document.body.style.cursor = 'grabbing';
}

/**
 * Gère la fin du drag pour un infirmier déjà placé
 * @param {DragEvent} e - L'événement de drag
 */
function handleInfirmierDragEnd(e) {
  // Retirer la classe de glissement
  this.classList.remove('dragging');
  
  // Rétablir le style du curseur
  document.body.style.cursor = 'default';
}

/**
 * Gère le déplacement d'un infirmier d'une cellule à une autre
 * @param {Object} infirmierData - Données de l'infirmier
 * @param {HTMLElement} targetCell - La cellule de destination
 * @param {string} targetDate - Date de la cellule de destination
 * @param {string} targetRoom - Salle de la cellule de destination
 * @param {string} sourceDate - Date de la cellule d'origine
 * @param {string} sourceRoom - Salle de la cellule d'origine
 */
async function moveInfirmierBetweenCells(infirmierData, targetCell, targetDate, targetRoom, sourceDate, sourceRoom) {
  try {
    // Afficher un indicateur de chargement sur les deux cellules
    targetCell.classList.add('loading');
    
    // Étape 1: Supprimer l'infirmier de la cellule d'origine
    const resetResponse = await fetch(`${API_BASE_URL}/reset-assignment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        date: sourceDate,
        salle: sourceRoom
      })
    });
    
    if (!resetResponse.ok) {
      throw new Error(`Erreur HTTP lors de la suppression: ${resetResponse.status}`);
    }
    
    // Étape 2: Assigner l'infirmier à la nouvelle cellule
    const assignResponse = await fetch(`${API_BASE_URL}/assign-infirmier`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        label: infirmierData.label,
        date: targetDate,
        salle: targetRoom
      })
    });
    
    if (!assignResponse.ok) {
      throw new Error(`Erreur HTTP lors de l'assignation: ${assignResponse.status}`);
    }
    
    // Recharger les données de la semaine pour mettre à jour tout l'affichage
    if (currentWeekStart) {
      loadWeekData(currentWeekStart);
    }
    
    console.log('Infirmier déplacé avec succès');
    
  } catch (error) {
    console.error('Erreur lors du déplacement de l\'infirmier:', error);
    alert('Erreur lors du déplacement de l\'infirmier. Veuillez réessayer.');
  } finally {
    // Retirer les indicateurs de chargement
    targetCell.classList.remove('loading');
  }
}

// La variable API_BASE_URL est définie dans script.js

// Initialisation du module lorsque le DOM est chargé
document.addEventListener('DOMContentLoaded', initPlanningModule);
