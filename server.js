// server.js
const fastify = require('fastify')({
    logger: {
        level: 'info', // Mettre 'debug' pour voir plus de logs
        transport: {
          target: 'pino-pretty',
          options: {
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname,reqId,responseTime,req,res'
          }
        }
    }
});
const path = require('path');
const fs = require('fs');

// --- Chargement des données des pannes ---
let faultData = { conditions_normales: {}, pannes: [] };
try {
    const rawData = fs.readFileSync(path.join(__dirname, 'faults.json'));
    faultData = JSON.parse(rawData);
    fastify.log.info(`Données de ${faultData.pannes.length} pannes chargées.`);
} catch (err) {
    fastify.log.error({ err }, "Erreur critique lors du chargement de faults.json:");
    process.exit(1);
}
const MAX_LEVEL = faultData.pannes.reduce((max, p) => Math.max(max, p.level), 0);
fastify.log.info(`Niveau maximum détecté : ${MAX_LEVEL}`);


// --- Etat initial de la session ---
const initialUserSession = {
    currentLevel: 1, score: 10000, efficiency: 100.0, totalAttempts: 0,
    correctDiagnoses: 0, completedFaultsThisRun: [], activeFault: null,
    diagnosisAttempts: 0
};

// --- Attacher l'état à l'instance Fastify ---
fastify.decorate('userSession', { ...initialUserSession });


// --- Helper Functions ---
function calculateEfficiency(currentSession) {
    if (currentSession.totalAttempts === 0) return 100.0;
    return Math.round((currentSession.correctDiagnoses / currentSession.totalAttempts) * 100 * 10) / 10;
}

function getMeasurementValue(fault, measurementKey) {
    fastify.log.debug(`getMeasurementValue: Appel pour clé "${measurementKey}" sur panne ID ${fault?.id}`);
    if (!fault || !fault.mesures || !Object.prototype.hasOwnProperty.call(fault.mesures, measurementKey)) {
        fastify.log.warn(`getMeasurementValue: Clé "${measurementKey}" non trouvée pour la panne ID ${fault?.id}`);
        return { resultat: "N/D", deviation: 'info' };
    }
    const resultatSimule = fault.mesures[measurementKey];
    let value = "N/D"; let deviation = 'info';
    if (typeof resultatSimule === 'object' && resultatSimule !== null && resultatSimule.hasOwnProperty('value')) {
        value = `${resultatSimule.value} ${resultatSimule.unit}`; deviation = resultatSimule.deviation || 'normal';
        fastify.log.debug(`getMeasurementValue: Clé "${measurementKey}" trouvée (objet). Valeur: ${value}, Deviation: ${deviation}`);
   } else if (resultatSimule !== null && resultatSimule !== undefined) {
       value = String(resultatSimule); deviation = 'info';
       fastify.log.debug(`getMeasurementValue: Clé "${measurementKey}" trouvée (autre type). Valeur: ${value}`);
   } else { fastify.log.warn(`getMeasurementValue: Clé "${measurementKey}" trouvée mais valeur invalide/null: ${resultatSimule}`); }
   return { resultat: value, deviation: deviation };
}


function selectNewFault(currentSession) {
    let currentLevelToTry = currentSession.currentLevel; let availableFaults = [];
    while(currentLevelToTry <= MAX_LEVEL) {
        availableFaults = faultData.pannes.filter(p => p.level === currentLevelToTry && !currentSession.completedFaultsThisRun.includes(p.id));
        if (availableFaults.length > 0) {
             if (currentLevelToTry > currentSession.currentLevel) { fastify.log.info(`Passage auto niveau ${currentLevelToTry}.`); currentSession.currentLevel = currentLevelToTry; }
            break;
        } currentLevelToTry++;
    }
    if (availableFaults.length > 0) {
        const index = Math.floor(Math.random() * availableFaults.length);
        currentSession.activeFault = availableFaults[index]; currentSession.diagnosisAttempts = 0;
        fastify.log.info(`Nouvelle panne active (L${currentSession.currentLevel}, ID: ${currentSession.activeFault.id}): ${currentSession.activeFault.nom}`);
        return true;
    } else { currentSession.activeFault = null; fastify.log.info("Toutes pannes traitées !"); return false; }
}

// --- Endpoints ---
fastify.register(require('@fastify/static'), { root: path.join(__dirname, 'public'), prefix: '/' });
fastify.get('/', async (request, reply) => reply.sendFile('index.html'));
fastify.get('/favicon.ico', async (request, reply) => reply.code(204).send());

fastify.get('/session_state', async (request, reply) => {
    const currentSession = fastify.userSession; const { activeFault, ...stateToSend } = currentSession;
    stateToSend.efficiency = calculateEfficiency(currentSession);
    stateToSend.currentFaultId = activeFault ? activeFault.id : null; stateToSend.currentFaultLevel = activeFault ? activeFault.level : null;
    stateToSend.possibleDiagnoses = faultData.pannes.filter(p => p.level <= (stateToSend.currentFaultLevel || stateToSend.currentLevel)).map(p => ({ id: p.id, nom: p.nom, level: p.level }));
    return stateToSend;
});

fastify.post('/nouveau_diagnostic', async (request, reply) => {
     fastify.userSession = { ...initialUserSession, completedFaultsThisRun: [] }; fastify.log.info("Session réinitialisée.");
    if (selectNewFault(fastify.userSession)) {
        return { message: `Nouvelle partie! N${fastify.userSession.currentLevel}. Panne #${fastify.userSession.activeFault.id}. Client: Trop chaud.` };
    } else { fastify.log.error("Impossible sélectionner 1ere panne."); return reply.status(500).send({ erreur: "Erreur interne." }); }
});

// Endpoint /action_generale supprimé

// Effectuer une mesure sur un composant
fastify.post('/mesurer', async (request, reply) => {
    const currentSession = fastify.userSession;
    if (!currentSession.activeFault) return reply.status(400).send({ erreur: "Aucune partie active." });
    const { composant, action } = request.body;
    if(!composant || !action) return reply.status(400).send({ erreur: "Composant/action manquant." });

    let cleMesure = `${composant}_${action}`;
    // Mapping spécifique
    if (composant === 'compresseur' && action === 'hp') cleMesure = 'manometres_hp';
    else if (composant === 'compresseur' && action === 'bp') cleMesure = 'manometres_bp';
    else if (composant === 'evaporateur' && action === 'filtre_air_voir') cleMesure = 'filtre_air_voir';
    else if (composant === 'compresseur' && action === 'toucher_haut') cleMesure = 'compresseur_toucher_haut';
    else if (composant === 'compresseur' && action === 'toucher_bas') cleMesure = 'compresseur_toucher_bas';
    else if (action.startsWith('ventilo_')) cleMesure = action; // Garder le préfixe si action le contient déjà

    fastify.log.info(`[Mesurer] Reçu: ${composant}/${action}. Mappé à: ${cleMesure}.`);

    // Vérification Manomètres Supprimée

    currentSession.score -= 5; // Pénalité mesure

    const measurementData = getMeasurementValue(currentSession.activeFault, cleMesure);
    fastify.log.debug({ dataFromHelper: measurementData }, `Retourné par getMeasurementValue pour ${cleMesure}`);

    return {
         mesure: `${composant}/${action}`, // Renvoyer la clé originale demandée
         resultat: measurementData.resultat,
         deviation: measurementData.deviation,
         score: currentSession.score
    };
});


// Poser un diagnostic
fastify.post('/diagnostiquer', async (request, reply) => {
    const currentSession = fastify.userSession;
    if (!currentSession.activeFault) return reply.status(400).send({ erreur: "Aucune partie active." });
    const { diagnostic_id, bet_amount } = request.body; const betAmount = parseInt(bet_amount, 10);
    if (diagnostic_id === undefined || diagnostic_id === null || diagnostic_id === "") return reply.status(400).send({ erreur: "ID Diag manquant."});
    if (isNaN(betAmount) || betAmount <= 0) return reply.status(400).send({ erreur: "Pari invalide (> 0)." });
    if (betAmount > currentSession.score) return reply.status(400).send({ erreur: `Pari (${betAmount}) > score (${currentSession.score}).` });

    const correctFaultId = currentSession.activeFault.id; const isCorrect = parseInt(diagnostic_id, 10) === correctFaultId;
    let message = ""; let gameOver = false; let nextFaultAvailable = false;
    let faultJustCompletedId = currentSession.activeFault.id; let correctFaultNameForResponse = "";
    let panneFinale = null;
    currentSession.totalAttempts++;

    if (isCorrect) {
        currentSession.score += betAmount; currentSession.correctDiagnoses++; currentSession.completedFaultsThisRun.push(correctFaultId);
        panneFinale = currentSession.activeFault; message = `CORRECT ! (${panneFinale.nom}). Gain: ${betAmount} pts.`;
        nextFaultAvailable = selectNewFault(currentSession);
        if (!nextFaultAvailable) { message += " Félicitations, fin de partie !"; gameOver = true; }
        else { message += ` Panne suivante (N${currentSession.currentLevel}, #${currentSession.activeFault.id}).`; }
    } else { // Incorrect
        currentSession.score -= betAmount; if (currentSession.score < 0) currentSession.score = 0;
        if (currentSession.diagnosisAttempts === 0) {
            currentSession.diagnosisAttempts = 1; message = `Incorrect. Perte: ${betAmount} pts. Essayez encore !`; nextFaultAvailable = true;
        } else {
             correctFaultNameForResponse = currentSession.activeFault.nom; panneFinale = currentSession.activeFault;
             message = `Incorrect à nouveau. Perte: ${betAmount} pts. Panne: ${correctFaultNameForResponse} (ID:${correctFaultId}).`;
             currentSession.completedFaultsThisRun.push(correctFaultId); nextFaultAvailable = selectNewFault(currentSession);
            if (!nextFaultAvailable) { message += " Fin de partie !"; gameOver = true; }
            else { message += ` Panne suivante (N${currentSession.currentLevel}, #${currentSession.activeFault.id}).`; }
        }
    }
    currentSession.efficiency = calculateEfficiency(currentSession);
    let explanations = null;
    if (panneFinale) {
        explanations = { consequences: panneFinale.explication_consequences || "N/D.", detection: panneFinale.explication_detection || "N/D." };
    }
    return {
        correct: isCorrect, message: message, score: currentSession.score, efficiency: currentSession.efficiency,
        attemptsLeft: isCorrect ? 0 : ( (currentSession.diagnosisAttempts >= 1) ? 0 : 1 ),
        gameOver: gameOver, nextFaultAvailable: nextFaultAvailable,
        correctFaultName: correctFaultNameForResponse, explanations: explanations
    };
});

// --- Endpoint pour le Solveur (Logique Étendue) ---
fastify.post('/solver_diagnostiquer', async (request, reply) => {
    const symptoms = request.body;
    if (!symptoms || typeof symptoms !== 'object') return reply.status(400).send({ erreur: "Symptômes invalides." });
    fastify.log.info({ receivedSymptoms: symptoms }, "Requête Solveur reçue");

    let possibleFaults = [];
    for (const fault of faultData.pannes) {
        let matchScore = 0; let maxPossibleScore = 0;
        for (const symptomKey in symptoms) {
            const symptomValue = symptoms[symptomKey]; if (!symptomValue || symptomValue === "") continue;
            maxPossibleScore++; let matchFound = false; const faultMeasure = fault.mesures;
            try {
                switch (symptomKey) {
                    case 'hp_deviation': if (faultMeasure.manometres_hp?.deviation === symptomValue) matchFound = true; break;
                    case 'bp_deviation': if (faultMeasure.manometres_bp?.deviation === symptomValue) matchFound = true; break;
                    case 'refoulement_deviation': if (faultMeasure.compresseur_temp_refoulement?.deviation === symptomValue) matchFound = true; break;
                    case 'surchauffe_deviation': if (faultMeasure.compresseur_temp_aspiration?.deviation === symptomValue) matchFound = true; break; // Approximation
                    case 'sr_deviation': /* Logique SR omise */ break;
                    case 'delta_t_cond_air_deviation': if (faultMeasure.condenseur_temp_sortie_air?.deviation === symptomValue) matchFound = true; break; // Approximation
                    case 'delta_t_evap_air_deviation': if (faultMeasure.evaporateur_temp_sortie_air?.deviation === symptomValue) matchFound = true; break; // Approximation
                    case 'voyant_etat': if (String(faultMeasure.voyant_liquide_etat).toLowerCase().includes(symptomValue.toLowerCase())) matchFound = true; break;
                    case 'evap_givre': const ev = String(faultMeasure.evaporateur_voir).toLowerCase(); if ((symptomValue === "Aucun" && !ev.includes("givr")) || (symptomValue === "Partiel" && ev.includes("partiel")) || (symptomValue === "Complet" && ev.includes("compl"))) matchFound = true; break;
                    case 'filtre_air_etat_select': const fi = String(faultMeasure.filtre_air_voir).toLowerCase(); if ((symptomValue === "Propre" && fi.includes("propre")) || (symptomValue === "Sale" && (fi.includes("sale") || fi.includes("colmat")))) matchFound = true; break;
                    case 'cond_etat_select': const co = String(faultMeasure.condenseur_voir).toLowerCase(); if ((symptomValue === "Propre" && co.includes("propre")) || (symptomValue === "Sale" && (co.includes("sale") || co.includes("obstru")))) matchFound = true; break;
                    case 'delta_t_deshy_deviation': if (faultMeasure.deshydrateur_delta_t?.deviation === symptomValue || (symptomValue === 'normal' && (!faultMeasure.deshydrateur_delta_t || faultMeasure.deshydrateur_delta_t?.deviation !== 'high'))) matchFound = true; break;
                    case 'delta_t_ev_deviation': if (faultMeasure.electrovanne_delta_t?.deviation === symptomValue || (symptomValue === 'normal' && (!faultMeasure.electrovanne_delta_t || faultMeasure.electrovanne_delta_t?.deviation !== 'high'))) matchFound = true; break;
                    default: maxPossibleScore--; break;
                }
            } catch (e) { fastify.log.error(e, `Erreur comparaison ${symptomKey} / panne ${fault.id}`); maxPossibleScore--; }
            if(matchFound) matchScore++;
        }
        if (matchScore > 0) {
            possibleFaults.push({ id: fault.id, nom: fault.nom, level: fault.level, score: matchScore, matchPercentage: maxPossibleScore > 0 ? Math.round((matchScore / maxPossibleScore) * 100) : 0 });
        }
    }
    possibleFaults.sort((a, b) => b.matchPercentage - a.matchPercentage || b.score - a.score || a.level - b.level);
    fastify.log.info(`Solveur: ${possibleFaults.length} suggestions trouvées.`);
    return { suggestions: possibleFaults.slice(0, 10) };
});

// Démarrer le serveur
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    fastify.log.info(`Serveur FrigoDiag V2 démarré sur le port ${fastify.server.address().port}`);
  } catch (err) {
    fastify.log.error({ err }, "Erreur démarrage serveur:"); process.exit(1);
  }
};
start();