/**
 * Module de gestion des infirmiers
 * Ce fichier gère les interactions avec la liste des infirmiers
 */

// La variable API_BASE_URL est définie dans script.js

// Fonctions d'accès à l'API
async function fetchInfirmiers() {
  try {
    const response = await fetch(`${API_BASE_URL}/infirmiers`);
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Erreur lors du chargement des infirmiers:', error);
    return { infirmiers: [] }; // Retourne un tableau vide en cas d'erreur
  }
}

// Toujours utiliser l'API réelle

// État de l'application
let infirmiersList = [];
let isEditing = false;
let editingId = null;

/**
 * Initialise le module de gestion des infirmiers
 */
function initInfirmiersModule() {
  loadInfirmiers();
  setupEventListeners();
}

/**
 * Charge la liste des infirmiers depuis l'API
 */
async function loadInfirmiers() {
  try {
    // Utiliser l'API réelle
    const response = await fetch(`${API_BASE_URL}/infirmiers`);
    if (!response.ok) {
      throw new Error(`Erreur lors du chargement des infirmiers: ${response.status}`);
    }
    const data = await response.json();
    infirmiersList = data.infirmiers || data; // Adaptation selon la structure de la réponse API
    renderInfirmiersList();
  } catch (error) {
    console.error('Erreur:', error);
    showMessage('Erreur de chargement des infirmiers depuis l\'API.', 'error');
    // En cas d'erreur, initialiser avec un tableau vide
    infirmiersList = [];
    renderInfirmiersList();
  }
}

/**
 * Configure les écouteurs d'événements
 */
function setupEventListeners() {
  // Bouton pour ajouter un infirmier
  document.getElementById('add-infirmier').addEventListener('click', () => {
    document.getElementById('infirmier-modal').style.display = 'block';
  });

  // Fermeture du modal
  document.querySelector('#infirmier-modal .close').addEventListener('click', () => {
    document.getElementById('infirmier-modal').style.display = 'none';
    resetInfirmierForm();
  });

  // Soumission du formulaire d'ajout/modification
  document.getElementById('infirmier-form').addEventListener('submit', handleInfirmierFormSubmit);
}

/**
 * Gère la soumission du formulaire d'ajout/modification d'infirmier
 */
async function handleInfirmierFormSubmit(event) {
  event.preventDefault();
  
  const formData = {
    nom: document.getElementById('infirmier-nom').value.trim(),
    prenom: document.getElementById('infirmier-prenom').value.trim(),
    status: document.getElementById('infirmier-status').value,
    present: document.getElementById('infirmier-present').checked ? 1 : 0
  };
  
  // Validation basique
  if (!formData.nom || !formData.prenom) {
    showMessage('Veuillez remplir tous les champs requis', 'error');
    return;
  }
  
  try {
    let successMessage;
    let response;
    
    if (isEditing) {
      // Mode édition avec API
      response = await fetch(`${API_BASE_URL}/infirmiers/${editingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      successMessage = 'Infirmier modifié avec succès';
    } else {
      // Mode ajout avec API
      response = await fetch(`${API_BASE_URL}/infirmiers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      successMessage = 'Infirmier ajouté avec succès';
    }
    
    if (!response.ok) {
      throw new Error(`Erreur lors de l'opération: ${response.status}`);
    }
    
    // Recharger la liste et masquer le modal
    await loadInfirmiers();
    document.getElementById('infirmier-modal').style.display = 'none';
    resetInfirmierForm();
    showMessage(successMessage, 'success');
    
  } catch (error) {
    console.error('Erreur:', error);
    showMessage('Erreur lors de l\'opération', 'error');
  }
}

/**
 * Affiche la liste des infirmiers dans l'interface
 */
function renderInfirmiersList() {
  const listElement = document.getElementById('infirmiers-list');
  listElement.innerHTML = '';
  
  if (infirmiersList.length === 0) {
    listElement.innerHTML = '<li class="empty-list">Aucun infirmier enregistré</li>';
    return;
  }
  
  infirmiersList.forEach(infirmier => {
    const li = document.createElement('li');
    li.className = 'infirmier-item';
    li.dataset.id = infirmier.id;
    li.dataset.nom = infirmier.nom;
    li.dataset.prenom = infirmier.prenom;
    li.dataset.status = infirmier.status;
    
    const statusClass = `status-${infirmier.status.replace('*', 'star').toLowerCase()}`;
    const presentClass = infirmier.present ? 'present' : 'absent';
    
    li.innerHTML = `
      <div class="infirmier-info ${presentClass}">
        <span class="infirmier-name">${infirmier.prenom} ${infirmier.nom}</span>
      </div>
      <div class="status-buttons">
        <button class="status-btn ${infirmier.status === 'J' ? 'active' : ''}" data-status="J" title="Statut J">J</button>
        <button class="status-btn ${infirmier.status === 'J1' ? 'active' : ''}" data-status="J1" title="Statut J1">J1</button>
        <button class="status-btn ${infirmier.status === 'J1*' ? 'active' : ''}" data-status="J1*" title="Statut J1*">J1*</button>
        <button class="status-btn ${infirmier.status === 'J3' ? 'active' : ''}" data-status="J3" title="Statut J3">J3</button>
      </div>
      <div class="infirmier-actions">
        <button class="btn-edit" title="Modifier"><i class="fas fa-edit"></i></button>
        <button class="btn-delete" title="Supprimer"><i class="fas fa-trash"></i></button>
      </div>
    `;
    
    // Ajouter les écouteurs d'événements pour les boutons d'action
    li.querySelector('.btn-edit').addEventListener('click', () => editInfirmier(infirmier.id));
    li.querySelector('.btn-delete').addEventListener('click', () => deleteInfirmier(infirmier.id));
    
    // Ajouter les écouteurs d'événements pour les boutons de statut
    li.querySelectorAll('.status-btn').forEach(btn => {
      btn.addEventListener('click', () => updateInfirmierStatus(infirmier.id, btn.dataset.status));
    });
    
    listElement.appendChild(li);
  });
}

/**
 * Lance l'édition d'un infirmier
 */
async function editInfirmier(id) {
  try {
    // Récupérer depuis l'API
    const response = await fetch(`${API_BASE_URL}/infirmiers/${id}`);
    
    if (!response.ok) {
      throw new Error(`Erreur lors de la récupération des données: ${response.status}`);
    }
    
    const data = await response.json();
    const infirmier = data.infirmier || data; // Adaptation selon la structure de la réponse API
    
    // Remplir le formulaire
    document.getElementById('infirmier-nom').value = infirmier.nom;
    document.getElementById('infirmier-prenom').value = infirmier.prenom;
    document.getElementById('infirmier-status').value = infirmier.status;
    document.getElementById('infirmier-present').checked = infirmier.present === 1;
    
    // Mettre à jour l'état
    isEditing = true;
    editingId = id;
    
    // Changer le titre du modal
    document.querySelector('#infirmier-modal h3').textContent = 'Modifier un infirmier';
    document.querySelector('#infirmier-form button[type="submit"]').textContent = 'Enregistrer';
    
    // Afficher le modal
    document.getElementById('infirmier-modal').style.display = 'block';
    
  } catch (error) {
    console.error('Erreur:', error);
    showMessage('Erreur lors de la récupération des données', 'error');
  }
}

/**
 * Supprime un infirmier
 */
async function deleteInfirmier(id) {
  // Confirmation de suppression
  if (!confirm('Êtes-vous sûr de vouloir supprimer cet infirmier ?')) {
    return;
  }
  
  try {
    // Suppression via l'API
    const response = await fetch(`${API_BASE_URL}/infirmiers/${id}`, {
      method: 'DELETE',
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      // Si le backend a renvoyé un message d'erreur spécifique, l'afficher
      if (data && data.error) {
        throw new Error(data.error);
      } else {
        throw new Error(`Erreur lors de la suppression: ${response.status}`);
      }
    }
    
    // Recharger la liste
    await loadInfirmiers();
    showMessage('Infirmier supprimé avec succès', 'success');
    
  } catch (error) {
    console.error('Erreur:', error);
    showMessage(error.message || 'Erreur lors de la suppression', 'error');
  }
}

/**
 * Réinitialise le formulaire
 */
function resetInfirmierForm() {
  document.getElementById('infirmier-form').reset();
  isEditing = false;
  editingId = null;
  document.querySelector('#infirmier-modal h3').textContent = 'Ajouter un infirmier';
  document.querySelector('#infirmier-form button[type="submit"]').textContent = 'Ajouter';
}

/**
 * Met à jour le statut d'un infirmier directement depuis les boutons
 * @param {number} id - ID de l'infirmier à mettre à jour
 * @param {string} newStatus - Nouveau statut ('J', 'J1', 'J1*', 'J3')
 */
async function updateInfirmierStatus(id, newStatus) {
  try {
    // Trouver l'élément infirmier dans la liste
    const infirmierItem = document.querySelector(`.infirmier-item[data-id="${id}"]`);
    if (!infirmierItem) return;
    
    // Appliquer une classe de chargement pendant la requête
    infirmierItem.classList.add('updating');
    
    // Rechercher l'infirmier dans notre liste locale
    const infirmier = infirmiersList.find(inf => inf.id === id);
    if (!infirmier) {
      throw new Error(`Infirmier avec l'ID ${id} non trouvé dans la liste locale`);
    }
    
    // Préparer les données pour la mise à jour (ne modifier que le statut)
    const updateData = {
      nom: infirmier.nom,
      prenom: infirmier.prenom,
      status: newStatus,
      present: infirmier.present
    };
    
    // Appel à l'API pour mettre à jour l'infirmier
    const response = await fetch(`${API_BASE_URL}/infirmiers/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });
    
    if (!response.ok) {
      throw new Error(`Erreur lors de la mise à jour du statut: ${response.status}`);
    }
    
    const updatedInfirmier = await response.json();
    
    // Mettre à jour l'infirmier dans notre liste locale
    const infirmierIndex = infirmiersList.findIndex(inf => inf.id === id);
    if (infirmierIndex !== -1) {
      infirmiersList[infirmierIndex] = updatedInfirmier;
    }
    
    // Mettre à jour l'UI pour ce seul infirmier sans recharger toute la liste
    updateInfirmierUI(infirmierItem, updatedInfirmier);
    
    // Afficher un message de succès discret
    showMessage(`Statut de ${updatedInfirmier.prenom} ${updatedInfirmier.nom} mis à jour: ${newStatus}`, 'success');
    
  } catch (error) {
    console.error('Erreur:', error);
    showMessage(`Erreur lors de la mise à jour du statut: ${error.message}`, 'error');
  } finally {
    // Retirer la classe de chargement
    const infirmierItem = document.querySelector(`.infirmier-item[data-id="${id}"]`);
    if (infirmierItem) {
      infirmierItem.classList.remove('updating');
    }
  }
}

/**
 * Met à jour l'interface pour un infirmier spécifique après changement de statut
 * @param {HTMLElement} itemElement - Élément DOM de l'infirmier 
 * @param {Object} infirmier - Données mises à jour de l'infirmier
 */
function updateInfirmierUI(itemElement, infirmier) {
  // Mise à jour des attributs data
  itemElement.dataset.status = infirmier.status;
  
  // Mise à jour des boutons de statut
  const statusButtons = itemElement.querySelectorAll('.status-btn');
  statusButtons.forEach(btn => {
    if (btn.dataset.status === infirmier.status) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

/**
 * Affiche un message à l'utilisateur dans une boîte de dialogue modale stylée
 */
function showMessage(message, type = 'info') {
  // Vérifier si le conteneur de notification existe déjà
  let notifContainer = document.getElementById('notification-container');
  
  // Créer le conteneur s'il n'existe pas
  if (!notifContainer) {
    notifContainer = document.createElement('div');
    notifContainer.id = 'notification-container';
    notifContainer.style.position = 'fixed';
    notifContainer.style.top = '20px';
    notifContainer.style.right = '20px';
    notifContainer.style.zIndex = '10000';
    document.body.appendChild(notifContainer);
  }
  
  // Créer la notification
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.style.padding = '15px 20px';
  notification.style.margin = '10px 0';
  notification.style.borderRadius = '5px';
  notification.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
  notification.style.opacity = '0';
  notification.style.transition = 'opacity 0.3s ease';
  
  // Style selon le type de message
  if (type === 'error') {
    notification.style.backgroundColor = '#f8d7da';
    notification.style.color = '#721c24';
    notification.style.borderLeft = '4px solid #dc3545';
  } else if (type === 'success') {
    notification.style.backgroundColor = '#d4edda';
    notification.style.color = '#155724';
    notification.style.borderLeft = '4px solid #28a745';
  } else {
    notification.style.backgroundColor = '#cce5ff';
    notification.style.color = '#004085';
    notification.style.borderLeft = '4px solid #0d6efd';
  }
  
  // Contenu du message
  notification.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between;">
      <div>${message}</div>
      <button style="background: none; border: none; cursor: pointer; font-size: 16px; color: inherit;" 
              onclick="this.parentNode.parentNode.remove();">×</button>
    </div>
  `;
  
  // Ajouter au conteneur et animer
  notifContainer.appendChild(notification);
  
  // Animation d'apparition
  setTimeout(() => {
    notification.style.opacity = '1';
  }, 10);
  
  // Auto-destruction après 6 secondes pour les messages de succès ou d'info
  if (type !== 'error') {
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 6000);
  }
}

// Initialisation du module quand le DOM est chargé
document.addEventListener('DOMContentLoaded', initInfirmiersModule);
