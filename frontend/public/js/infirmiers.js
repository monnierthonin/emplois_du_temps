/**
 * Module de gestion des infirmiers
 * Ce fichier gère les interactions avec la liste des infirmiers
 */

// Configuration de l'API
const API_URL = 'http://localhost:5000/api';

// Données mockup pour le développement sans backend
const MOCK_DATA = {
  infirmiers: [
    { id: 1, nom: 'Dupont', prenom: 'Marie', status: 'J1', present: 1 },
    { id: 2, nom: 'Martin', prenom: 'Pierre', status: 'J3', present: 1 },
    { id: 3, nom: 'Lefebvre', prenom: 'Sophie', status: 'J', present: 0 },
    { id: 4, nom: 'Bernard', prenom: 'Thomas', status: 'J1*', present: 1 }
  ]
};

// Déterminer si le mode mock doit être utilisé
const USE_MOCK = true; // Mettre à false pour utiliser l'API réelle

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
 * Charge la liste des infirmiers depuis l'API ou utilise des données mockup
 */
async function loadInfirmiers() {
  try {
    if (USE_MOCK) {
      // Utiliser les données mockup
      console.log('Utilisation des données mockup pour les infirmiers');
      infirmiersList = [...MOCK_DATA.infirmiers]; // Copie pour éviter la référence directe
      renderInfirmiersList();
    } else {
      // Utiliser l'API réelle
      const response = await fetch(`${API_URL}/infirmiers`);
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des infirmiers');
      }
      infirmiersList = await response.json();
      renderInfirmiersList();
    }
  } catch (error) {
    console.error('Erreur:', error);
    showMessage('Erreur de chargement des infirmiers. Utilisation des données de démonstration.', 'warning');
    // En cas d'erreur, utiliser quand même les données mockup
    infirmiersList = [...MOCK_DATA.infirmiers];
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
    
    if (USE_MOCK) {
      // Utiliser les données mockup
      if (isEditing) {
        // Trouver et modifier l'infirmier dans la liste mockup
        const index = MOCK_DATA.infirmiers.findIndex(inf => inf.id === editingId);
        if (index !== -1) {
          MOCK_DATA.infirmiers[index] = {
            ...MOCK_DATA.infirmiers[index],
            ...formData
          };
          successMessage = 'Infirmier modifié avec succès';
        } else {
          throw new Error('Infirmier non trouvé');
        }
      } else {
        // Générer un nouvel ID pour l'ajout
        const newId = Math.max(0, ...MOCK_DATA.infirmiers.map(inf => inf.id)) + 1;
        const newInfirmier = {
          id: newId,
          ...formData
        };
        MOCK_DATA.infirmiers.push(newInfirmier);
        successMessage = 'Infirmier ajouté avec succès';
      }
    } else {
      let response;
      
      if (isEditing) {
        // Mode édition avec API
        response = await fetch(`${API_URL}/infirmiers/${editingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });
        successMessage = 'Infirmier modifié avec succès';
      } else {
        // Mode ajout avec API
        response = await fetch(`${API_URL}/infirmiers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });
        successMessage = 'Infirmier ajouté avec succès';
      }
      
      if (!response.ok) {
        throw new Error('Erreur lors de l\'opération');
      }
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
    let infirmier;
    
    if (USE_MOCK) {
      // Récupérer depuis les données mockup
      infirmier = MOCK_DATA.infirmiers.find(inf => inf.id === id);
      if (!infirmier) {
        throw new Error('Infirmier non trouvé');
      }
    } else {
      // Récupérer depuis l'API
      const response = await fetch(`${API_URL}/infirmiers/${id}`);
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des données');
      }
      infirmier = await response.json();
    }
    
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
    if (USE_MOCK) {
      // Suppression dans les données mockup
      const index = MOCK_DATA.infirmiers.findIndex(inf => inf.id === id);
      if (index !== -1) {
        MOCK_DATA.infirmiers.splice(index, 1);
      } else {
        throw new Error('Infirmier non trouvé');
      }
    } else {
      // Suppression via l'API
      const response = await fetch(`${API_URL}/infirmiers/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }
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
