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
    
    const statusClass = `status-${infirmier.status.replace('*', 'star').toLowerCase()}`;
    const presentClass = infirmier.present ? 'present' : 'absent';
    
    li.innerHTML = `
      <div class="infirmier-info ${presentClass}">
        <span class="infirmier-name">${infirmier.prenom} ${infirmier.nom}</span>
        <span class="infirmier-status ${statusClass}">${infirmier.status}</span>
      </div>
      <div class="infirmier-actions">
        <button class="btn-edit" title="Modifier"><i class="fas fa-edit"></i></button>
        <button class="btn-delete" title="Supprimer"><i class="fas fa-trash"></i></button>
      </div>
    `;
    
    // Ajouter les écouteurs d'événements pour les boutons
    li.querySelector('.btn-edit').addEventListener('click', () => editInfirmier(infirmier.id));
    li.querySelector('.btn-delete').addEventListener('click', () => deleteInfirmier(infirmier.id));
    
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
    
    if (!response.ok) {
      throw new Error(`Erreur lors de la suppression: ${response.status}`);
    }
    
    // Recharger la liste
    await loadInfirmiers();
    showMessage('Infirmier supprimé avec succès', 'success');
    
  } catch (error) {
    console.error('Erreur:', error);
    showMessage('Erreur lors de la suppression', 'error');
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
 * Affiche un message à l'utilisateur
 */
function showMessage(message, type = 'info') {
  // Implémentation simple, à améliorer avec un vrai système de notification
  alert(message);
}

// Initialisation du module quand le DOM est chargé
document.addEventListener('DOMContentLoaded', initInfirmiersModule);
