# Simulateur FrigoDiag V2 (Web)

Ce projet est un simulateur de pannes frigorifiques basé sur le web, inspiré du logiciel Frigodiag. Il permet aux utilisateurs de s'entraîner au diagnostic de pannes sur des systèmes de climatisation simulés. Il inclut également un mode "Solveur" pour aider à identifier des pannes possibles à partir de symptômes observés.

## Fonctionnalités

* **Mode Simulateur :**
    * Présente aléatoirement des pannes parmi 46 scénarios prédéfinis.
    * Progression à travers 4 niveaux de difficulté.
    * Permet de réaliser des mesures virtuelles (pressions HP/BP, températures, contrôles visuels, intensité, etc.) via une interface SVG cliquable.
    * Système de score et d'efficacité pour suivre la performance.
    * Système de pari sur le diagnostic.
    * Mécanisme de "seconde chance" en cas de diagnostic erroné.
    * Bouton pour afficher des explications sur la panne (conséquences et détection) après résolution.
* **Mode Solveur :**
    * Permet à l'utilisateur de saisir des symptômes observés (pressions, températures, aspects visuels).
    * Suggère une liste de pannes possibles correspondant aux symptômes saisis, triées par pertinence.
* **Interface Web :** Construite avec Fastify (Node.js) pour le backend et Bulma CSS / Vanilla JavaScript pour le frontend.

## Technologies Utilisées

* **Backend:** Node.js, Fastify
* **Frontend:** HTML5, CSS3, Vanilla JavaScript, Bulma CSS Framework, Font Awesome (via CDN)
* **Données:** Fichier JSON (`faults.json`) pour les définitions des pannes et les paramètres de simulation.
* **Logging:** Pino (intégré à Fastify), Pino-Pretty (optionnel, pour développement)

## Prérequis

* Node.js (version 16 ou supérieure recommandée)
* npm (généralement inclus avec Node.js)

## Installation

1.  **Cloner le dépôt** (si vous l'avez mis sur Git) ou copiez les fichiers du projet dans un dossier local.
    ```bash
    # Exemple si vous utilisez Git
    # git clone <url-du-depot>
    cd simulateur-frigo
    ```
2.  **Installer les dépendances Node.js :**
    ```bash
    npm install
    ```
3.  **Installer la dépendance de développement pour les logs (optionnel mais recommandé) :**
    ```bash
    npm install --save-dev pino-pretty
    ```

## Lancement de l'Application

1.  Exécutez la commande suivante depuis la racine du projet (`simulateur-frigo/`) :
    ```bash
    node server.js
    ```
2.  Le serveur démarrera (normalement sur le port 3000). Vous verrez un message comme :
    `Serveur FrigoDiag V2 démarré sur le port 3000`
3.  Ouvrez votre navigateur web et allez à l'adresse : `http://localhost:3000`

## Structure des Fichiers

```
simulateur-frigo/
├── public/              # Fichiers servis au client (frontend)
│   ├── index.html     # Structure HTML principale (inclut Simulateur et Solveur)
│   └── script.js      # Logique JavaScript du client
├── faults.json          # Base de données des pannes et paramètres normaux
├── server.js            # Logique du serveur backend (Fastify)
├── package.json         # Dépendances et scripts Node.js
├── package-lock.json    # Gestion des versions des dépendances
└── README.md            # Ce fichier
```

## Notes et Limitations

* **Précision des Données :** Les valeurs de mesure et les explications dans `faults.json` sont simulées et visent à être plausibles. Pour une simulation de haute fidélité, ces données devraient être revues et ajustées par un expert frigoriste.
* **Solveur Simplifié :** Le mode "Solveur" utilise une logique de correspondance simple. Un système de diagnostic expert plus avancé pourrait donner des résultats plus précis.
* **État en Mémoire :** L'état de la session utilisateur (score, niveau, panne active) est stocké en mémoire sur le serveur. Cela convient pour un utilisateur unique ou une utilisation légère. Pour plusieurs utilisateurs simultanés, une solution de session plus robuste serait nécessaire (ex: `fastify-session` avec un stockage externe).