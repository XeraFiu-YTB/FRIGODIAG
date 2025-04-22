// public/script.js (Version avec logs debug bouton explications et logique onglets)

// --- Références DOM ---
const nouveauDiagnosticBtn = document.getElementById('nouveauDiagnosticBtn');
const messageZone = document.getElementById('messageZone');
const journalDiv = document.getElementById('journal');
const poserDiagnosticBtn = document.getElementById('poserDiagnosticBtn');
const diagnosticModal = document.getElementById('diagnosticModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const confirmerDiagnosticBtn = document.getElementById('confirmerDiagnosticBtn');
const diagnosticSelect = document.getElementById('diagnosticSelect');
const modalLevelInfo = document.getElementById('modalLevelInfo');
const diagnosticAttemptsInfo = document.getElementById('diagnosticAttemptsInfo');
const betAmountInput = document.getElementById('betAmount');
const maxBetAmountSpan = document.getElementById('maxBetAmount');

const voirExplicationsBtn = document.getElementById('voirExplicationsBtn');
const explicationsModal = document.getElementById('explicationsModal');
const closeExplicationsModalBtn = document.getElementById('closeExplicationsModalBtn');
const okExplicationsModalBtn = document.getElementById('okExplicationsModalBtn');
const explanationConsequences = document.getElementById('explanationConsequences');
const explanationDetection = document.getElementById('explanationDetection');

const helpBtn = document.getElementById('helpBtn');
const helpModal = document.getElementById('helpModal');
const closeHelpModalBtn = document.getElementById('closeHelpModalBtn');
const okHelpModalBtn = document.getElementById('okHelpModalBtn');

const currentLevelEl = document.getElementById('currentLevel');
const currentScoreEl = document.getElementById('currentScore');
const currentEfficiencyEl = document.getElementById('currentEfficiency');

const svgCircuit = document.getElementById('circuit-svg');
const componentActionMenu = document.getElementById('componentActionMenu');

// Références pour Solveur et Onglets
const simulatorTab = document.querySelector('.tabs [data-tab="simulator"]');
const solverTab = document.querySelector('.tabs [data-tab="solver"]');
const simulatorContent = document.getElementById('simulatorContent');
const solverContent = document.getElementById('solverContent');
const solveProblemBtn = document.getElementById('solveProblemBtn');
const solverResultsDiv = document.getElementById('solverResults');
const solverResultsList = document.getElementById('solverResultsList');
// Sélectionne tous les inputs/selects dans la div solverContent qui ont l'attribut data-symptom
const solverSymptomInputs = solverContent ? solverContent.querySelectorAll('[data-symptom]') : [];


// Variables d'état globales côté client
let journalInitialHTML = "<p><em>Commencez une nouvelle partie...</em></p>";
let possibleDiagnoses = [];
let currentSessionState = {};
let lastExplanations = null;

// --- Définition des actions possibles par composant (client-side) ---
const componentActions = {
    compresseur: [ { action: 'hp', label: 'Mesurer HP' }, { action: 'bp', label: 'Mesurer BP' }, { action: 'temp_aspiration', label: 'Mesurer T° Aspiration' }, { action: 'temp_refoulement', label: 'Mesurer T° Refoulement' }, { action: 'toucher_haut', label: 'Toucher Haut Cloche', maxLevel: 2 }, { action: 'toucher_bas', label: 'Toucher Bas Cloche', maxLevel: 2 }, { action: 'voir_plaque_signaletique', label: 'Voir Plaque Signalétique', level: 4 }, { action: 'voir_bornier_moteur', label: 'Voir Bornier Moteur', level: 4 }, { action: 'intensite_absorbee', label: 'Mesurer Intensité (A)', level: 4 }, { action: 'controle_mecanique_clapets', label: 'Contrôle Méca. Clapets', level: 4 }, { action: 'controle_fuites', label: 'Contrôle Fuites', level: 4 }, ],
    condenseur: [ { action: 'temp_depart_liquide', label: 'Mesurer T° Départ Liquide' }, { action: 'temp_entree_air', label: 'Mesurer T° Entrée Air' }, { action: 'temp_sortie_air', label: 'Mesurer T° Sortie Air' }, { action: 'voir', label: 'Voir Condenseur' }, { action: 'debit_air', label: 'Mesurer Débit Air', level: 4 }, { action: 'controle_fuites', label: 'Contrôle Fuites Cond.', level: 4 }, { action: 'ventilo_condenseur_voir_plaque_signaletique', label: 'Voir Plaque Ventilo Cond.', level: 4 }, { action: 'ventilo_condenseur_voir_bornier_moteur', label: 'Voir Bornier Ventilo Cond.', level: 4 }, { action: 'ventilo_condenseur_intensite_absorbee', label: 'Mesurer Int. Ventilo Cond.', level: 4 }, ],
    bouteille_liquide: [ { action: 'temp_entree', label: 'Mesurer T° Entrée Liquide', level: 4 }, { action: 'temp_sortie', label: 'Mesurer T° Sortie Liquide', level: 4 }, { action: 'delta_t', label: 'Évaluer Delta T Bouteille', level: 3 }, { action: 'test_mise_a_vide', label: 'Test Mise à Vide', level: 4 }, { action: 'test_incondensables', label: 'Test Incondensables', level: 4 }, { action: 'controle_fuites', label: 'Contrôle Fuites Bouteille', level: 4 }, ],
    deshydrateur: [ { action: 'temp_entree', label: 'Mesurer T° Entrée Liquide', level: 1 }, { action: 'temp_sortie', label: 'Mesurer T° Sortie Liquide', level: 1 }, { action: 'delta_t', label: 'Évaluer Delta T Déshy.', level: 1 }, { action: 'controle_fuites', label: 'Contrôle Fuites Déshy.', level: 4 }, ],
    electrovanne: [ { action: 'temp_entree', label: 'Mesurer T° Entrée Liquide', level: 3 }, { action: 'temp_sortie', label: 'Mesurer T° Sortie Liquide', level: 3 }, { action: 'delta_t', label: 'Évaluer Delta T EV', level: 3 }, { action: 'voir_plaque_signaletique', label: 'Voir Plaque EV', level: 4 }, { action: 'intensite_absorbee', label: 'Mesurer Intensité EV', level: 4 }, { action: 'controle_mecanique_complet', label: 'Contrôle Méca. Complet EV', level: 4 }, { action: 'controle_fuites', label: 'Contrôle Fuites EV', level: 4 }, ],
    detendeur: [ { action: 'temp_bulbe', label: 'Mesurer T° Bulbe (TXV)', level: 3 }, { action: 'voir_train_thermostatique', label: 'Voir Train Thermostatique', level: 4 }, { action: 'voir_tableau_puissance', label: 'Voir Tableau Puissance', level: 4 }, { action: 'controler_tige_reglage', label: 'Contrôler Tige Réglage', level: 4 }, { action: 'controle_mecanique_complet', label: 'Contrôle Méca. Complet Dét.', level: 4 }, { action: 'controle_fuites', label: 'Contrôle Fuites Détendeur', level: 4 }, ],
    evaporateur: [ { action: 'temp_entree_air', label: 'Mesurer T° Entrée Air' }, { action: 'temp_sortie_air', label: 'Mesurer T° Sortie Air' }, { action: 'voir', label: 'Voir Évaporateur' }, { action: 'filtre_air_voir', label: 'Voir Filtre à Air' }, { action: 'debit_air', label: 'Mesurer Débit Air', level: 4 }, { action: 'controle_fuites', label: 'Contrôle Fuites Evap.', level: 4 }, { action: 'ventilo_evaporateur_voir_plaque_signaletique', label: 'Voir Plaque Ventilo Evap.', level: 4 }, { action: 'ventilo_evaporateur_voir_bornier_moteur', label: 'Voir Bornier Ventilo Evap.', level: 4 }, { action: 'ventilo_evaporateur_intensite_absorbee', label: 'Mesurer Int. Ventilo Evap.', level: 4 }, { action: 'ventilo_evaporateur_controle_mecanique_complet', label: 'Contrôle Méca. Ventilo Evap.', level: 4 }, ]
};

// --- Initialisation ---
document.addEventListener('DOMContentLoaded', () => {
    initializeUI();
});

function initializeUI() {
    journalDiv.innerHTML = journalInitialHTML;
    if(voirExplicationsBtn) voirExplicationsBtn.style.display = 'none';
    lastExplanations = null;

    apiCall('/session_state')
        .then(newState => {
            currentSessionState = newState;
            renderSessionState();
            // S'assurer que l'onglet simulateur est bien actif et le contenu visible au chargement
            setActiveTab('simulator'); // Active le simulateur par défaut
            if(!currentSessionState.currentFaultId && !currentSessionState.gameOver) {
                 messageZone.className = 'notification is-warning is-light py-2 px-3';
                 messageZone.textContent = 'Aucune partie en cours. Cliquez sur "Nouvelle Partie".';
                 poserDiagnosticBtn.disabled = true;
            } else if (currentSessionState.currentFaultId) {
                 messageZone.className = 'notification is-info is-light py-2 px-3';
                 messageZone.textContent = `Partie en cours (Niveau ${currentSessionState.currentLevel}, Panne #${currentSessionState.currentFaultId}). Client: Trop chaud.`;
                 poserDiagnosticBtn.disabled = false;
            } else if (currentSessionState.gameOver) { // Cas où on recharge après la fin
                 messageZone.className = 'notification is-success is-light py-2 px-3';
                 messageZone.textContent = 'Vous avez terminé toutes les pannes ! Cliquez sur "Nouvelle Partie".';
                 poserDiagnosticBtn.disabled = true;
            }
        })
        .catch(err => {
             messageZone.className = 'notification is-danger is-light py-2 px-3';
             messageZone.textContent = "Impossible de récupérer l'état initial du serveur.";
             console.error("Impossible de récupérer l'état initial:", err);
             poserDiagnosticBtn.disabled = true;
        });
}

// --- API Call Helper ---
async function apiCall(endpoint, method = 'GET', body = null) {
    const options = { method: method, headers: {}, };
    if (body) { options.body = JSON.stringify(body); options.headers['Content-Type'] = 'application/json'; }
    try {
        const response = await fetch(endpoint, options);
        const contentType = response.headers.get("content-type"); let data;
        if (contentType && contentType.indexOf("application/json") !== -1) { data = await response.json(); }
        else { data = await response.text(); if (!response.ok) throw new Error(data || `Erreur HTTP ${response.status}`); return data; }
        if (!response.ok) { const errorMessage = (typeof data === 'object' && data !== null && data.erreur) ? data.erreur : `Erreur HTTP ${response.status}`; throw new Error(errorMessage); }
        return data;
    } catch (error) {
        console.error(`Erreur API (${endpoint}):`, error);
        if(messageZone) { messageZone.className = 'notification is-danger is-light py-2 px-3'; messageZone.textContent = `Erreur: ${error.message}`; }
        throw error;
    }
}

// --- Mise à jour UI ---
function updateUIFromSessionState(state = null) {
     if (state) { currentSessionState = state; renderSessionState(); }
     else {
         apiCall('/session_state').then(newState => { currentSessionState = newState; renderSessionState(); })
         .catch(err => { console.error("Impossible de rafraîchir l'état:", err); messageZone.textContent = "Erreur de connexion."; messageZone.className = 'notification is-danger py-2 px-3'; });
     }
}

function renderSessionState() {
    if (!currentSessionState || Object.keys(currentSessionState).length === 0) {
        currentLevelEl.textContent = '-'; currentScoreEl.textContent = '-'; currentEfficiencyEl.textContent = '-';
        poserDiagnosticBtn.disabled = true; return;
    }
    currentLevelEl.textContent = currentSessionState.currentLevel !== undefined ? currentSessionState.currentLevel : '?';
    currentScoreEl.textContent = currentSessionState.score !== undefined ? currentSessionState.score : '?';
    currentEfficiencyEl.textContent = currentSessionState.efficiency !== undefined ? `${currentSessionState.efficiency}%` : '?';
    poserDiagnosticBtn.disabled = !currentSessionState.currentFaultId;
    if (currentSessionState.possibleDiagnoses) { possibleDiagnoses = currentSessionState.possibleDiagnoses; }
}

// --- Gestionnaire Bouton Nouvelle Partie ---
nouveauDiagnosticBtn.addEventListener('click', async () => {
    nouveauDiagnosticBtn.disabled = true; nouveauDiagnosticBtn.classList.add('is-loading');
    journalDiv.innerHTML = "<p><em>Démarrage d'une nouvelle partie...</em></p>";
    if (voirExplicationsBtn) voirExplicationsBtn.style.display = 'none'; lastExplanations = null;
    try {
        const data = await apiCall('/nouveau_diagnostic', 'POST');
        messageZone.className = 'notification is-info is-light py-2 px-3'; messageZone.textContent = data.message;
        setActiveTab('simulator'); // Assurer que l'onglet simulateur est actif
        await updateUIFromSessionState();
    } catch (error) { initializeUI(); }
    finally { nouveauDiagnosticBtn.disabled = false; nouveauDiagnosticBtn.classList.remove('is-loading'); }
});

// --- Gestion Clics SVG & Menu Contextuel ---
svgCircuit.addEventListener('click', (event) => {
    hideActionMenu();
    const targetElement = event.target.closest('.component');
    if (targetElement && currentSessionState && currentSessionState.currentFaultId) {
        const componentId = targetElement.dataset.component;
        let actionsForComponent = [];
        if (componentId === 'condenseur') actionsForComponent = componentActions['condenseur'] || [];
        else if (componentId === 'evaporateur') actionsForComponent = componentActions['evaporateur'] || [];
        else actionsForComponent = componentActions[componentId] || [];

        if (actionsForComponent.length > 0) {
            const currentLvl = currentSessionState.currentLevel;
            const availableActions = actionsForComponent.filter(a => (!a.level || a.level <= currentLvl) && (!a.maxLevel || a.maxLevel >= currentLvl));
            if(availableActions.length > 0) populateAndShowActionMenu(availableActions, componentId, event.pageX, event.pageY);
            else ajouterAuJournal(componentId, "Aucune action disponible à ce niveau", "info");
        }
    } else if (!currentSessionState || !currentSessionState.currentFaultId) {
         messageZone.className = 'notification is-warning is-light py-2 px-3'; messageZone.textContent = "Commencez une nouvelle partie.";
    }
});

function populateAndShowActionMenu(actions, componentIdClicked, x, y) {
    componentActionMenu.innerHTML = '';
    actions.forEach(item => {
        const link = document.createElement('a'); link.href = '#';
        link.dataset.component = componentIdClicked; link.dataset.action = item.action;
        link.textContent = item.label;
        link.addEventListener('click', handleActionClick); componentActionMenu.appendChild(link);
    });
    componentActionMenu.style.left = `0px`; componentActionMenu.style.top = `0px`; componentActionMenu.style.display = 'block';
    const menuWidth = componentActionMenu.offsetWidth; const menuHeight = componentActionMenu.offsetHeight;
    const bodyWidth = document.body.clientWidth; const viewportHeight = window.innerHeight;
    let left = x + 5; let top = y + 5;
    if (left + menuWidth > bodyWidth - 10) left = x - menuWidth - 5;
    if (top + menuHeight > viewportHeight + window.scrollY - 10) top = y - menuHeight - 5;
    if(top < window.scrollY + 5) top = window.scrollY + 5; if(left < 5) left = 5;
    componentActionMenu.style.left = `${left}px`; componentActionMenu.style.top = `${top}px`;
    componentActionMenu.style.display = 'block';
}

function hideActionMenu() { if (componentActionMenu) componentActionMenu.style.display = 'none'; }

document.addEventListener('click', (event) => {
    if (componentActionMenu && componentActionMenu.style.display === 'block') {
        if (!componentActionMenu.contains(event.target) && !event.target.closest('.component')) { hideActionMenu(); }
    }
}, true);

async function handleActionClick(event) {
    event.preventDefault(); event.stopPropagation();
    const link = event.target; const component = link.dataset.component; const action = link.dataset.action; hideActionMenu();
    const displayKey = `${component}/${action}`; const tempJournalEntryId = `entry-${Date.now()}`;
    ajouterAuJournal(displayKey, "Mesure en cours...", "info", "", tempJournalEntryId);
    try {
        const data = await apiCall('/mesurer', 'POST', { composant: component, action: action });
        const tempEntry = document.getElementById(tempJournalEntryId);
         if(data.messageErreur){
              if (tempEntry) updateJournalEntry(tempEntry, data.mesure || displayKey, data.resultat, data.deviation, " (Échec)");
              else ajouterAuJournal(data.mesure || displayKey, data.resultat, data.deviation, " (Échec)");
             messageZone.className = 'notification is-warning is-light py-2 px-3'; messageZone.textContent = data.messageErreur;
         } else {
             if (tempEntry) updateJournalEntry(tempEntry, data.mesure || displayKey, data.resultat, data.deviation);
             else ajouterAuJournal(data.mesure || displayKey, data.resultat, data.deviation);
             if (messageZone.classList.contains('is-warning') || messageZone.classList.contains('is-danger')) { messageZone.className = 'notification is-info is-light py-2 px-3'; messageZone.textContent = "Mesure effectuée."; }
             currentSessionState.score = data.score; renderSessionState();
         }
    } catch (error) {
         const tempEntry = document.getElementById(tempJournalEntryId);
          if (tempEntry) updateJournalEntry(tempEntry, displayKey, "Erreur API", "info", " (Erreur API)");
          else ajouterAuJournal(displayKey, "Erreur API", "info", " (Erreur API)");
    }
}

// --- Fonctions Journal ---
function formatMesureForDisplay(mesureKey) {
    const keyParts = mesureKey.split('/'); const componentPart = keyParts[0] || mesureKey; const actionPart = keyParts[1] || '';
    let label = actionPart; const componentDef = componentActions[componentPart];
    if(componentDef){ const actionDef = componentDef.find(a => a.action === actionPart); if(actionDef) label = actionDef.label; }
    if (componentPart === 'manometres' && (actionPart === 'hp' || actionPart === 'bp')) { label = `Mesure ${actionPart.toUpperCase()}`; }
    else if (componentPart === 'Action Générale') { label = actionPart.replace(/_/g, ' '); }
    else if (!label) { label = actionPart.replace(/_/g, ' '); }
    const compDisplay = componentPart.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    let finalFormatted = `<strong>${compDisplay}`;
    if (label && label !== compDisplay && actionPart !== '') { finalFormatted += ` - ${label.charAt(0).toUpperCase() + label.slice(1)}`; } // Ne pas ajouter si action vide
    finalFormatted += ` :</strong>`; return finalFormatted;
}
function updateJournalEntry(entryElement, mesureKey, resultat, deviation = 'info', status = "") {
     const formattedMesure = formatMesureForDisplay(mesureKey); let deviationClass = ''; let deviationIcon = ''; let finalStatus = status;
      switch (deviation) { case 'high': deviationClass = 'has-text-danger'; deviationIcon = ' <i class="fas fa-arrow-up fa-xs"></i>'; break; case 'low': deviationClass = 'has-text-info'; deviationIcon = ' <i class="fas fa-arrow-down fa-xs"></i>'; break; case 'normal': deviationClass = 'has-text-success'; break; default: deviationClass = 'has-text-grey-dark'; break; }
    if (status.includes("Échec") || status.includes("Erreur")) { deviationClass = 'has-text-danger'; finalStatus = `<strong class="has-text-danger">${status}</strong>`; }
     entryElement.innerHTML = `${formattedMesure} <span class="${deviationClass}">${resultat}${deviationIcon}</span> ${finalStatus}`;
}
function ajouterAuJournal(mesureKey, resultat, deviation = 'info', status = "", entryId = null) {
    if (!journalDiv) return; const initialEntry = journalDiv.querySelector('p');
    if (initialEntry && (initialEntry.textContent.includes("Commencez") || initialEntry.textContent.includes("Démarrage"))) { journalDiv.innerHTML = ''; }
    const entry = document.createElement('div'); entry.className = 'journal-entry'; if (entryId) entry.id = entryId;
    updateJournalEntry(entry, mesureKey, resultat, deviation, status); journalDiv.appendChild(entry); journalDiv.scrollTop = journalDiv.scrollHeight;
}

// --- Gestion Modale Diagnostic ---
poserDiagnosticBtn.addEventListener('click', () => {
    if (!currentSessionState || !possibleDiagnoses || possibleDiagnoses.length === 0) { console.error("Diagnostics non chargés."); messageZone.textContent = "Erreur : Diagnostics non disponibles."; messageZone.className = 'notification is-danger'; return; }
    diagnosticSelect.innerHTML = '<option value="">-- Choisissez la panne --</option>';
    const filteredDiagnoses = possibleDiagnoses.filter(p => p.level <= currentSessionState.currentLevel).sort((a, b) => a.level - b.level || a.id - b.id);
    filteredDiagnoses.forEach(panne => { const option = document.createElement('option'); option.value = panne.id; option.textContent = `L${panne.level} - ${panne.id}. ${panne.nom}`; diagnosticSelect.appendChild(option); });
     modalLevelInfo.textContent = currentSessionState.currentLevel; const maxBet = currentSessionState.score > 0 ? currentSessionState.score : 1;
     maxBetAmountSpan.textContent = maxBet; betAmountInput.max = maxBet; betAmountInput.value = Math.min(100, maxBet);
     const attemptsMade = currentSessionState.diagnosisAttempts || 0;
     diagnosticAttemptsInfo.textContent = attemptsMade === 0 ? "Première tentative." : "Seconde (et dernière) tentative.";
     diagnosticAttemptsInfo.className = `mt-2 has-text-weight-medium ${attemptsMade === 0 ? 'has-text-info' : 'has-text-danger'}`;
     diagnosticModal.classList.add('is-active');
});
function closeModal() { diagnosticModal.classList.remove('is-active'); }
closeModalBtn.addEventListener('click', closeModal); cancelModalBtn.addEventListener('click', closeModal);

// --- Confirmation du Diagnostic (avec logs debug explication) ---
confirmerDiagnosticBtn.addEventListener('click', async () => {
    const selectedId = diagnosticSelect.value; const betAmount = parseInt(betAmountInput.value, 10);
    if (!selectedId) { alert('Sélectionnez un diagnostic.'); return; }
    if (isNaN(betAmount) || betAmount <= 0) { alert('Pari invalide (> 0).'); return; }
    if (betAmount > currentSessionState.score) { alert(`Pari (${betAmount}) > score (${currentSessionState.score}).`); return; }

    confirmerDiagnosticBtn.disabled = true; confirmerDiagnosticBtn.classList.add('is-loading');
    try {
        const data = await apiCall('/diagnostiquer', 'POST', { diagnostic_id: selectedId, bet_amount: betAmount });
        console.log("Réponse reçue de /diagnostiquer:", data); // DEBUG
        console.log("Valeur de data.explanations:", data.explanations); // DEBUG
        currentSessionState.score = data.score; currentSessionState.efficiency = data.efficiency;
        currentSessionState.diagnosisAttempts = data.attemptsLeft === 1 ? 1 : 0; renderSessionState();

        // Gérer les explications
        if (data.explanations && data.explanations.consequences && data.explanations.consequences !== "N/D.") { // Condition plus stricte
            lastExplanations = data.explanations;
            if(voirExplicationsBtn) voirExplicationsBtn.style.display = 'block';
            console.log("LOG: Explications VALIDES reçues, affichage bouton."); // LOG
        } else {
             if(voirExplicationsBtn) voirExplicationsBtn.style.display = 'none';
             lastExplanations = null;
             console.log("LOG: Pas d'explications valides reçues (ou 1ere erreur), masquage bouton."); // LOG
        }

        if (data.correct) {
             messageZone.className = 'notification is-success is-light py-2 px-3'; ajouterAuJournal("Diagnostic", "CORRECT !", "normal", `(+${betAmount} pts)`);
             if(data.gameOver){ poserDiagnosticBtn.disabled = true; /* Garder bouton explications */ }
             else if (data.nextFaultAvailable) { await updateUIFromSessionState(); /* Cache bouton explications pour nouvelle panne ? Non */ }
             messageZone.textContent = data.message;
        } else { // Incorrect
             messageZone.className = 'notification is-warning is-light py-2 px-3'; ajouterAuJournal("Diagnostic", "INCORRECT.", "info", `(-${betAmount} pts)`);
             if (data.attemptsLeft === 0) { // Dernière tentative
                  ajouterAuJournal("Solution Révélée", data.correctFaultName, "info");
                  if(data.gameOver){ poserDiagnosticBtn.disabled = true; /* Garder bouton explications */ }
                  else if (data.nextFaultAvailable) { await updateUIFromSessionState(); /* Garder bouton explications */ }
             } // Si 1ere erreur, bouton explications déjà caché
             messageZone.textContent = data.message;
        }

    } catch (error) {
         ajouterAuJournal("Diagnostic", "Erreur validation", "info", "(Erreur API)");
         if(voirExplicationsBtn) voirExplicationsBtn.style.display = 'none'; lastExplanations = null;
    } finally {
        confirmerDiagnosticBtn.disabled = false; confirmerDiagnosticBtn.classList.remove('is-loading'); closeModal();
    }
});

// --- Gestion Modale Aide ---
helpBtn.addEventListener('click', () => helpModal.classList.add('is-active'));
closeHelpModalBtn.addEventListener('click', () => helpModal.classList.remove('is-active'));
okHelpModalBtn.addEventListener('click', () => helpModal.classList.remove('is-active'));

// --- Gestion Modale Explications ---
voirExplicationsBtn.addEventListener('click', () => {
    if (lastExplanations) {
        explanationConsequences.textContent = lastExplanations.consequences;
        explanationDetection.textContent = lastExplanations.detection;
        explicationsModal.classList.add('is-active');
    } else { console.warn("Clic sur Voir Explications mais lastExplanations vide."); }
});
function closeExplicationsModal() { explicationsModal.classList.remove('is-active'); }
closeExplicationsModalBtn.addEventListener('click', closeExplicationsModal);
okExplicationsModalBtn.addEventListener('click', closeExplicationsModal);

// --- Logique de changement d'onglet ---
function setActiveTab(tabName) {
    const tabs = document.querySelectorAll('.tabs li'); const contents = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => { if (tab.dataset.tab === tabName) tab.classList.add('is-active'); else tab.classList.remove('is-active'); });
    contents.forEach(content => { if (content.id === `${tabName}Content`) content.classList.add('is-active'); else content.classList.remove('is-active'); });
     if (tabName === 'simulator') { updateUIFromSessionState(); }
     else if (tabName === 'solver') { if(solverResultsDiv) solverResultsDiv.style.display = 'none'; }
}
if (simulatorTab && solverTab) { // Ajouter vérification existence avant listener
    simulatorTab.addEventListener('click', (e) => { e.preventDefault(); setActiveTab('simulator'); });
    solverTab.addEventListener('click', (e) => { e.preventDefault(); setActiveTab('solver'); });
}

// --- Gestionnaire Bouton Solveur ---
if(solveProblemBtn) {
    solveProblemBtn.addEventListener('click', async () => {
        solveProblemBtn.classList.add('is-loading'); solverResultsDiv.style.display = 'none';
        solverResultsList.innerHTML = '<p>Recherche en cours...</p>'; solverResultsDiv.style.display = 'block'; // Afficher pendant recherche
        const symptoms = {};
        if(solverSymptomInputs) solverSymptomInputs.forEach(input => { const key = input.dataset.symptom; if (input.value && input.value !== "") symptoms[key] = input.value; });
        try {
            const data = await apiCall('/solver_diagnostiquer', 'POST', symptoms);
            displaySolverResults(data.suggestions);
        } catch (error) { solverResultsList.innerHTML = `<p class="has-text-danger">Erreur: ${error.message}</p>`; solverResultsDiv.style.display = 'block'; }
        finally { solveProblemBtn.classList.remove('is-loading'); }
    });
}

function displaySolverResults(suggestions) {
    solverResultsList.innerHTML = '';
    if (!suggestions || suggestions.length === 0) { solverResultsList.innerHTML = '<p>Aucune panne typique ne correspond parfaitement à ces symptômes.</p>'; }
    else { const list = document.createElement('ul'); suggestions.forEach(fault => { const li = document.createElement('li'); li.innerHTML = `<b>L${fault.level} - ${fault.id}. ${fault.nom}</b> (Pertinence: ${fault.matchPercentage}%)`; list.appendChild(li); }); solverResultsList.appendChild(list); }
    solverResultsDiv.style.display = 'block';
}