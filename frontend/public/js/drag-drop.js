/**
 * Module de gestion du drag & drop pour les infirmiers
 * Permet de faire glisser un infirmier de la liste vers une case de l'emploi du temps
 */

// Référence à la fonction showMessage définie dans infirmiers.js
// Si la fonction n'est pas disponible, en créer une version simplifiée
if (typeof showMessage !== 'function') {
  // Fonction de repli si showMessage n'est pas définie ailleurs
  function showMessage(message, type = 'info') {
    console.log(`Message (${type}): ${message}`);
    alert(message);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  initDragAndDrop();
});

/**
 * Initialise la fonctionnalité de drag and drop pour les infirmiers
 */
function initDragAndDrop() {
  setupDraggableInfirmiers();
  setupDroppableScheduleCells();
}

/**
 * Configure les éléments de la liste des infirmiers pour être glissables
 */
function setupDraggableInfirmiers() {
  // Observer pour surveiller en continu les modifications de la liste des infirmiers
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(mutation => {
      // Vérifier si des nœuds ont été ajoutés
      if (mutation.addedNodes.length > 0) {
        const infirmiersList = document.getElementById('infirmiers-list');
        if (infirmiersList && infirmiersList.children.length > 0) {
          // Uniquement configurer les nouveaux éléments
          const infirmierItems = infirmiersList.querySelectorAll('li:not([draggable="true"])');
          
          infirmierItems.forEach(item => {
            console.log('Configuration d\'un nouvel élément draggable:', item.dataset.id);
            
            // Rendre l'élément glissable
            item.setAttribute('draggable', 'true');
            
            // Événements de glisser-déposer
            item.addEventListener('dragstart', handleDragStart);
            item.addEventListener('dragend', handleDragEnd);
          });
        }
      }
    });
  });
  
  // Observer le DOM pour détecter quand les infirmiers sont ajoutés ou modifiés
  observer.observe(document.body, { childList: true, subtree: true });
  
  // Configuration initiale pour les éléments existants
  const infirmiersList = document.getElementById('infirmiers-list');
  if (infirmiersList) {
    const infirmierItems = infirmiersList.querySelectorAll('li:not([draggable="true"])');
    infirmierItems.forEach(item => {
      console.log('Configuration initiale d\'un élément draggable:', item.dataset.id);
      
      // Rendre l'élément glissable
      item.setAttribute('draggable', 'true');
      
      // Événements de glisser-déposer
      item.addEventListener('dragstart', handleDragStart);
      item.addEventListener('dragend', handleDragEnd);
    });
  }
}

/**
 * Configure les cellules de l'emploi du temps pour accepter le drop
 */
function setupDroppableScheduleCells() {
  // Sélectionner toutes les cellules du planning
  const cells = document.querySelectorAll('.schedule-cell');
  
  cells.forEach(cell => {
    // Événements de drop
    cell.addEventListener('dragover', handleDragOver);
    cell.addEventListener('dragleave', handleDragLeave);
    cell.addEventListener('drop', handleDrop);
  });
}

/**
 * Gère le début du drag pour un infirmier
 * @param {DragEvent} e - L'événement de drag
 */
function handleDragStart(e) {
  // Récupérer les données de l'infirmier depuis dataset (accès moderne aux attributs data-*)
  const infirmierId = this.dataset.id;
  const infirmierNom = this.dataset.nom;
  const infirmierPrenom = this.dataset.prenom;
  
  console.log('Début de drag:', { infirmierId, infirmierNom, infirmierPrenom });
  
  // Vérifier que les données sont présentes
  if (!infirmierId || !infirmierNom || !infirmierPrenom) {
    console.error('Données infirmier manquantes:', this);
    // Afficher un message visuel pour le débogage
    const errorMsg = `Erreur: données manquantes - ID: ${infirmierId}, Nom: ${infirmierNom}, Prénom: ${infirmierPrenom}`;
    showMessage(errorMsg, 'error');
    return;
  }
  
  // Définir les données de transfert
  e.dataTransfer.setData('text/plain', JSON.stringify({
    id: infirmierId,
    nom: infirmierNom,
    prenom: infirmierPrenom
  }));
  
  // Définir une image de drag (optionnel)
  e.dataTransfer.effectAllowed = 'move';
  
  // Ajouter une classe pour indiquer que l'élément est en cours de glissement
  this.classList.add('dragging');
  
  // Changer le style du curseur
  document.body.style.cursor = 'grabbing';
}

/**
 * Gère la fin du drag pour un infirmier
 * @param {DragEvent} e - L'événement de drag
 */
function handleDragEnd(e) {
  // Retirer la classe de glissement
  this.classList.remove('dragging');
  
  // Restaurer le style du curseur
  document.body.style.cursor = 'default';
  
  console.log('Fin de drag');
}

/**
 * Gère le survol d'une cellule du planning
 * @param {DragEvent} e - L'événement de drag
 */
function handleDragOver(e) {
  // Vérifier si la salle est fermée ou non utilisée
  if (this.classList.contains('room-close') || this.classList.contains('room-unuse')) {
    // Ne pas autoriser le drop sur les salles fermées ou non utilisées
    this.classList.add('drag-not-allowed');
    return; // Ne pas appeler preventDefault() pour empêcher le drop
  }
  
  // Autoriser le drop
  e.preventDefault();
  
  // Ajouter une classe pour indiquer que la cellule est une cible valide
  this.classList.add('drag-over');
}

/**
 * Gère la sortie d'une cellule du planning
 * @param {DragEvent} e - L'événement de drag
 */
function handleDragLeave(e) {
  // Retirer les classes de survol
  this.classList.remove('drag-over', 'drag-not-allowed');
}

/**
 * Gère le drop d'un infirmier sur une cellule du planning
 * @param {DragEvent} e - L'événement de drag
 */
function handleDrop(e) {
  e.preventDefault();
  
  // Retirer les classes de survol
  this.classList.remove('drag-over', 'drag-not-allowed');
  
  // Vérifier si la salle est fermée ou non utilisée
  if (this.classList.contains('room-close') || this.classList.contains('room-unuse')) {
    const roomState = this.classList.contains('room-close') ? 'fermée' : 'non utilisée';
    showMessage(`Impossible d'assigner un infirmier à une salle ${roomState}`, 'error');
    return;
  }
  
  try {
    // Récupérer les données de l'infirmier
    const rawData = e.dataTransfer.getData('text/plain');
    if (!rawData) {
      throw new Error('Aucune donnée reçue lors du drop');
    }
    
    console.log('Données reçues lors du drop:', rawData);
    const infirmierData = JSON.parse(rawData);
    
    // Vérifier que les données essentielles sont présentes
    if (!infirmierData.id) {
      throw new Error('Données infirmier incomplètes');
    }
    
    // Récupérer les informations de la cellule de destination
    const targetDate = this.getAttribute('data-date');
    const targetRoom = this.getAttribute('data-room');
    const targetDay = this.getAttribute('data-day');
    
    if (!targetDate || !targetRoom) {
      throw new Error(`Information manquante sur la cellule: date=${targetDate}, salle=${targetRoom}`);
    }
    
    console.log('Drop sur cellule:', { targetDate, targetRoom, targetDay });
    console.log('Données infirmier:', infirmierData);
    
    // Vérifier si l'infirmier vient d'une autre cellule ou de la liste
    if (infirmierData.isFromCell) {
      // Cas où l'infirmier est déplacé d'une cellule à une autre
      const sourceDate = infirmierData.sourceDate;
      const sourceRoom = infirmierData.sourceRoom;
      
      // Si c'est la même cellule, ne rien faire
      if (sourceDate === targetDate && sourceRoom === targetRoom) {
        console.log('Même cellule, aucune action nécessaire');
        return;
      }
      
      // Déplacer l'infirmier entre les cellules
      moveInfirmierBetweenCells(
        infirmierData,
        this,
        targetDate,
        targetRoom,
        sourceDate,
        sourceRoom
      );
    } else {
      // Cas classique: l'infirmier vient de la liste
      assignInfirmierToCell(infirmierData, this, targetDate, targetRoom);
    }
  } catch (error) {
    console.error('Erreur lors du drop:', error);
    showMessage(`Erreur lors du glisser-déposer: ${error.message}`, 'error');
    
    // Restaurer l'apparence normale de la cellule
    this.classList.remove('loading');
  } finally {
    // Restaurer le curseur
    document.body.style.cursor = 'default';
  }
}

/**
 * Assigne un infirmier à une cellule du planning
 * @param {Object} infirmierData - Données de l'infirmier
 * @param {HTMLElement} cell - La cellule du planning
 * @param {string} date - La date (YYYY-MM-DD)
 * @param {string} room - Le code de la salle
 */
async function assignInfirmierToCell(infirmierData, cell, date, room) {
  try {
    // Afficher un indicateur de chargement sur la cellule
    cell.classList.add('loading');
    
    // Préparer les données pour l'API
    const updateData = {
      date: date,
      [room]: infirmierData.id
    };
    
    // Appeler l'API pour assigner un infirmier - utiliser le bon endpoint /assign-infirmier
    const response = await fetch(`${API_BASE_URL}/assign-infirmier`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        infirmierId: infirmierData.id,
        date: date,
        salle: room
      })
    });
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    
    // Réponse de l'API réussie
    const result = await response.json();
    
    // Mettre à jour l'affichage visuel
    updateVisualAssignment(infirmierData, cell);
    
    // Recharger les données de la semaine pour mettre à jour tout l'affichage
    if (currentWeekStart) {
      loadWeekData(currentWeekStart);
    }
    
  } catch (error) {
    console.error('Erreur lors de l\'assignation de l\'infirmier:', error);
    alert('Erreur lors de l\'assignation de l\'infirmier. Veuillez réessayer.');
  } finally {
    // Retirer l'indicateur de chargement
    cell.classList.remove('loading');
  }
}

/**
 * Met à jour visuellement la cellule avec les infos de l'infirmier
 * @param {Object} infirmierData - Données de l'infirmier
 * @param {HTMLElement} cell - La cellule du planning
 */
function updateVisualAssignment(infirmierData, cell) {
  // Nettoyer la cellule des événements existants
  const existingEvents = cell.querySelectorAll('.event');
  existingEvents.forEach(event => event.remove());
  
  // Créer un nouvel élément pour l'infirmier
  const eventElement = document.createElement('div');
  eventElement.className = 'event';
  eventElement.textContent = `${infirmierData.prenom} ${infirmierData.nom}`;
  
  // Ajouter l'élément à la cellule
  cell.appendChild(eventElement);
}

/**
 * Marque un infirmier comme assigné dans la liste (grisé)
 * @param {string} infirmierId - ID de l'infirmier
 */
function markInfirmierAsAssigned(infirmierId) {
  const infirmierItem = document.querySelector(`#infirmiers-list li[data-id="${infirmierId}"]`);
  if (infirmierItem) {
    infirmierItem.classList.add('assigned');
  }
}

/**
 * Déplace un infirmier d'une cellule à une autre
 * @param {Object} infirmierData - Données de l'infirmier
 * @param {HTMLElement} targetCell - Cellule de destination
 * @param {string} targetDate - Date de destination
 * @param {string} targetRoom - Salle de destination
 * @param {string} sourceDate - Date d'origine
 * @param {string} sourceRoom - Salle d'origine
 */
async function moveInfirmierBetweenCells(infirmierData, targetCell, targetDate, targetRoom, sourceDate, sourceRoom) {
  try {
    // 1. Vérifier la disponibilité de l'infirmier à la date cible, en excluant la salle source
    if (sourceDate === targetDate && sourceRoom !== targetRoom) {
      const availabilityResponse = await fetch(
        `${API_BASE_URL}/check-nurse-availability?infirmier_id=${infirmierData.id}&date=${targetDate}&current_room=${sourceRoom}`
      );

      if (!availabilityResponse.ok) {
        throw new Error(`Erreur HTTP: ${availabilityResponse.status}`);
      }

      const availabilityData = await availabilityResponse.json();
      
      // Si l'infirmier n'est pas disponible à cette date (déjà assigné ailleurs)
      if (!availabilityData.available && availabilityData.assigned_room !== sourceRoom) {
        alert(`Cet infirmier est déjà assigné à la salle ${availabilityData.assigned_room} ce jour-là.`);
        return;
      }
    }
    
    // 2. Supprimer l'infirmier de la salle d'origine
    await fetch(`${API_BASE_URL}/assign-infirmier`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        infirmierId: 0, // 0 signifie supprimer
        date: sourceDate,
        salle: sourceRoom
      })
    });

    // 3. Assigner l'infirmier à la nouvelle salle
    await fetch(`${API_BASE_URL}/assign-infirmier`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        infirmierId: infirmierData.id,
        date: targetDate,
        salle: targetRoom
      })
    });

    // 4. Mettre à jour l'affichage visuel
    updateVisualAssignment(infirmierData, targetCell);

    // 5. Supprimer l'affichage visuel de la salle d'origine
    const sourceCell = document.querySelector(`.schedule-cell[data-date="${sourceDate}"][data-room="${sourceRoom}"]`);
    if (sourceCell) {
      const existingEvents = sourceCell.querySelectorAll('.event');
      existingEvents.forEach(event => event.remove());
    }

    // 6. Recharger les données de la semaine pour mettre à jour tout l'affichage
    if (currentWeekStart) {
      loadWeekData(currentWeekStart);
    }

  } catch (error) {
    console.error('Erreur lors du déplacement de l\'infirmier:', error);
    alert('Erreur lors du déplacement de l\'infirmier. Veuillez réessayer.');
  }
}

/**
 * Vérifie si un infirmier est disponible à une date donnée
 * @param {number} infirmierId - ID de l'infirmier
 * @param {string} date - Date à vérifier
 * @param {string|null} currentRoom - Salle actuelle à exclure (optionnel)
 * @returns {Promise<Object>} - Objet avec available (boolean) et assigned_room (string|null)
 */
async function checkNurseAvailability(infirmierId, date, currentRoom = null) {
  try {
    let url = `${API_BASE_URL}/check-nurse-availability?infirmier_id=${infirmierId}&date=${date}`;
    if (currentRoom) {
      url += `&current_room=${currentRoom}`;
    }

    console.log(`Vérification de disponibilité: ${url}`);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la vérification de disponibilité:', error);
    throw error;
  }
}

/**
 * Marque toutes les cellules où un infirmier est déjà assigné comme indisponibles
 * @param {number} infirmierId - ID de l'infirmier
 * @param {string|null} sourceDate - Date de la cellule source (optionnel, pour permettre le déplacement)
 * @param {string|null} sourceRoom - Salle de la cellule source (optionnel, pour permettre le déplacement)
 */
async function markUnavailableDays(infirmierId, sourceDate = null, sourceRoom = null) {
  try {
    // D'abord, réinitialiser toutes les cellules (supprimer la classe nurse-unavailable)
    document.querySelectorAll('.schedule-cell').forEach(cell => {
      cell.classList.remove('nurse-unavailable');
    });

    // Pour chaque jour dans le planning actuellement affiché
    const cells = document.querySelectorAll('.schedule-cell[data-date]');
    const uniqueDates = new Set([...cells].map(cell => cell.getAttribute('data-date')));

    console.log(`Vérification de disponibilité pour ${uniqueDates.size} dates`);

    // Pour chaque date, vérifier si l'infirmier est déjà assigné
    for (const date of uniqueDates) {
      const availability = await checkNurseAvailability(infirmierId, date, 
        (date === sourceDate) ? sourceRoom : null);

      if (!availability.available) {
        // Marquer toutes les cellules de ce jour comme indisponibles, sauf la cellule source
        document.querySelectorAll(`.schedule-cell[data-date="${date}"]`).forEach(cell => {
          const cellRoom = cell.getAttribute('data-room');
          // Ne pas marquer la cellule source comme indisponible
          if (!(date === sourceDate && cellRoom === sourceRoom)) {
            cell.classList.add('nurse-unavailable');
          }
        });

        console.log(`Infirmier ${infirmierId} déjà assigné le ${date} à ${availability.assigned_room}`);
      }
    }
  } catch (error) {
    console.error('Erreur lors du marquage des jours indisponibles:', error);
  }
}
