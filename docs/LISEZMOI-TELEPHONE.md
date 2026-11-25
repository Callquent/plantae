# Utiliser l'application depuis le téléphone

Le PC héberge l'application, le téléphone l'ouvre par le Wi-Fi de la maison. Dans le journal photo d'une plante
(ou d'un semis), le formulaire propose « Prendre une photo » (appareil photo du téléphone) ou « Choisir des fichiers » ;
les photos sont réduites puis ajoutées au journal avec la date et l'observation.

## Installation (sur le PC)
1. `npm install`
2. `npm run build`
3. `npm run start`   (écoute sur tout le réseau local ; Windows demandera d'autoriser Node.js : choisissez « Réseaux privés »)
4. Notez l'adresse du PC sur le réseau local (par exemple http://192.168.1.20:3000).

## Sur le téléphone (même Wi-Fi)
1. Tapez l'adresse du PC dans le navigateur.
2. Chrome, menu ⋮ → « Ajouter à l'écran d'accueil ».
3. Ouvrez « Mes plantes » → la plante → Journal photo → « Prendre une photo ».

## À savoir
- Photos réduites à 2000 px avant envoi (≈1 Mo au lieu de 8). Le téléphone doit joindre le PC au moment de la prise de photo.
- Sur ordinateur, « Prendre une photo » ouvre simplement le choix de fichier.
- Pas de mot de passe : toute personne sur votre Wi-Fi peut ouvrir l'application. Ne l'exposez pas sur Internet.
- Si le téléphone n'accède pas au PC : pare-feu Windows (réseau privé), « isolation des clients » de la box, adresse du PC à réserver dans la box.

## Stockage des données
Les plantes et les semis sont enregistrés dans une seule base SQLite (Prisma) : `base.db`, dans le dossier de données de l'application (`DATA_DIR`, sinon `./data`). Avec Triviae, la plateforme crée ce fichier et fournit son adresse dans `DATABASE_URL`, que l'application utilise. Les photos restent des fichiers dans `uploads/`.
Au tout premier démarrage, les anciens fichiers `plants.json` et `seedlings.json` sont repris automatiquement dans la base ; ils ne sont pas modifiés et servent de sauvegarde.
