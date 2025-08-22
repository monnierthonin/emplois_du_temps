// URL de base de l'API pour les appels serveur
const API_BASE_URL = '/api';

document.addEventListener('DOMContentLoaded', function() {
  // Éléments du DOM
  const calendarDays = document.getElementById('calendar-days');
  const currentMonthElement = document.getElementById('current-month');
  const prevMonthBtn = document.getElementById('prev-month');
  const nextMonthBtn = document.getElementById('next-month');
  const dailySchedule = document.getElementById('daily-schedule');
  const modal = document.getElementById('modal');
  const closeBtn = document.querySelector('.close');
  // const addStaffBtn = document.getElementById('add-staff'); // Ancien bouton remplacé par celui dans infirmiers.js
  const shiftForm = document.getElementById('shift-form');

  // Variables d'état
  let currentDate = new Date();
  let selectedDate = null;

  // Noms des mois en français
  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

  // Initialisation
  generateCalendar(currentDate);

  // Événements
  prevMonthBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    generateCalendar(currentDate);
  });

  nextMonthBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    generateCalendar(currentDate);
  });

  closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  // L'ancien gestionnaire d'événement pour ajouter un membre du personnel
  // a été remplacé par le code dans infirmiers.js

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

  // Fermeture du modal en cliquant à l'extérieur
  window.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });

  // Fonctions
  function generateCalendar(date) {
    // Mise à jour du titre du mois
    currentMonthElement.textContent = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    
    // Vider le calendrier
    while (calendarDays.firstChild) {
      calendarDays.removeChild(calendarDays.firstChild);
    }
    
    // Premier jour du mois
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    // Dernier jour du mois
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    // Décalage pour commencer le calendrier au bon jour de la semaine
    // En France, la semaine commence le lundi (1) et non le dimanche (0)
    let startDay = firstDay.getDay();
    if (startDay === 0) startDay = 7; // Dimanche devient 7 au lieu de 0
    startDay--; // Ajustement pour commencer à 0
    
    // Création des cases vides pour les jours avant le début du mois
    for (let i = 0; i < startDay; i++) {
      const emptyDay = document.createElement('div');
      emptyDay.className = 'day empty';
      calendarDays.appendChild(emptyDay);
    }
    
    // Création des cases pour chaque jour du mois
    const today = new Date();
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const day = document.createElement('div');
      day.className = 'day';
      
      // Vérifier si c'est aujourd'hui
      if (date.getMonth() === today.getMonth() && 
          date.getFullYear() === today.getFullYear() && 
          i === today.getDate()) {
        day.classList.add('today');
      }
      
      // Ajouter le numéro du jour
      const dayNumber = document.createElement('div');
      dayNumber.className = 'day-number';
      dayNumber.textContent = i;
      day.appendChild(dayNumber);
      
      // Les événements seront chargés depuis l'API
      // Aucune donnée codée en dur
      
      // Événement de clic pour afficher le planning du jour
      day.addEventListener('click', () => {
        // Enlever la sélection précédente
        const previouslySelected = document.querySelector('.day.selected');
        if (previouslySelected) {
          previouslySelected.classList.remove('selected');
        }
        
        // Ajouter la sélection à ce jour
        day.classList.add('selected');
        
        // Mettre à jour la date sélectionnée
        selectedDate = new Date(date.getFullYear(), date.getMonth(), i);
        
        // Afficher le planning du jour
        showDailySchedule(selectedDate);
        
        // Mettre à jour le champ de date dans le formulaire
        const dateInput = document.getElementById('date-select');
        dateInput.value = `${selectedDate.getFullYear()}-${(selectedDate.getMonth() + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
      });
      
      calendarDays.appendChild(day);
    }
  }

  function addEventToDay(dayElement, name, type) {
    const event = document.createElement('div');
    event.className = `event ${type}`;
    event.textContent = name;
    dayElement.appendChild(event);
  }

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
