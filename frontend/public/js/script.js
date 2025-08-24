// API_BASE_URL est défini dans api-config.js

document.addEventListener('DOMContentLoaded', function() {
  // Éléments du DOM
  const dailySchedule = document.getElementById('daily-schedule');
  const modal = document.getElementById('modal');
  const closeBtn = document.querySelector('.close');
  const shiftForm = document.getElementById('shift-form');

  // Variables d'état
  let currentDate = new Date();
  let selectedDate = null;

  // Noms des mois en français
  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

  // Événements
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });
  }

  // Fermeture du modal en cliquant à l'extérieur
  window.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });

  // L'ancien gestionnaire d'événement pour ajouter un membre du personnel
  // a été remplacé par le code dans infirmiers.js

  if (shiftForm) {
    shiftForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const staffId = document.getElementById('staff-select').value;
      const shiftType = document.getElementById('shift-select').value;
      const date = document.getElementById('date-select').value;
      
      if (staffId && shiftType && date) {
        // Dans une version future, ceci enverra les données à l'API
        alert(`Service enregistré !\nInfirmier: ${staffId}\nService: ${shiftType}\nDate: ${date}`);
        modal.style.display = 'none';
      }
    });
  }
  // Fonctions
  // Les fonctions liées au calendrier ont été supprimées car le calendrier a été retiré de l'interface

  // Les fonctions relatives aux événements du calendrier ont été supprimées car elles ne sont plus utilisées

  async function showDailySchedule(date) {
    const formattedDate = `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    const dateFormatAPI = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    
    // Affichage du squelette de l'interface pendant le chargement
    dailySchedule.innerHTML = `
      <h4>Planning du ${formattedDate}</h4>
      <div class="loading">Chargement des données...</div>
    `;
    
    try {
      // Appel à l'API pour récupérer les services du jour
      const response = await fetch(`${API_BASE_URL}/emplois-du-temps?date=${dateFormatAPI}`);
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const planningData = await response.json();
      
      // Construction du tableau avec les données de l'API
      let tableContent = `
        <h4>Planning du ${formattedDate}</h4>
        <table style="width:100%; margin-top:15px; border-collapse:collapse;">
          <tr>
            <th style="text-align:left; padding:8px; border-bottom:1px solid #ddd;">Infirmier/ère</th>
            <th style="text-align:left; padding:8px; border-bottom:1px solid #ddd;">Service</th>
            <th style="text-align:left; padding:8px; border-bottom:1px solid #ddd;">Heures</th>
          </tr>
      `;
      
      // Si aucune donnée n'est retournée
      if (!planningData.length) {
        tableContent += `
          <tr>
            <td colspan="3" style="padding:20px; text-align:center;">Aucun service programmé pour cette date</td>
          </tr>
        `;
      } else {
        // Génération des lignes du tableau avec les données de l'API
        planningData.forEach(item => {
          const shiftHours = getShiftHours(item.service);
          tableContent += `
            <tr>
              <td style="padding:8px; border-bottom:1px solid #ddd;">${item.prenom} ${item.nom}</td>
              <td style="padding:8px; border-bottom:1px solid #ddd;">${getShiftName(item.service)}</td>
              <td style="padding:8px; border-bottom:1px solid #ddd;">${shiftHours}</td>
            </tr>
          `;
        });
      }
      
      tableContent += `
        </table>
        <button class="btn" style="margin-top:15px;" onclick="document.getElementById('modal').style.display='block'">Ajouter un service</button>
      `;
      
      dailySchedule.innerHTML = tableContent;
      
    } catch (error) {
      console.error('Erreur lors du chargement du planning:', error);
      dailySchedule.innerHTML = `
        <h4>Planning du ${formattedDate}</h4>
        <div class="error">Erreur de chargement des données</div>
        <button class="btn" style="margin-top:15px;" onclick="document.getElementById('modal').style.display='block'">Ajouter un service</button>
      `;
    }
  }
  
  // Fonction utilitaire pour obtenir le nom du service
  function getShiftName(shiftCode) {
    const shifts = {
      'morning': 'Matin',
      'afternoon': 'Après-midi',
      'night': 'Nuit',
      'off': 'Repos'
    };
    return shifts[shiftCode] || shiftCode;
  }
  
  // Fonction utilitaire pour obtenir les heures du service
  function getShiftHours(shiftCode) {
    const hours = {
      'morning': '7h - 15h',
      'afternoon': '14h - 22h',
      'night': '21h - 8h',
      'off': 'Jour de repos'
    };
    return hours[shiftCode] || '';
  }

});
