# Mise à jour : photos depuis le téléphone Android

Le PC héberge l'application, le téléphone l'ouvre par le Wi-Fi de la maison, prend les photos
et les envoie au PC. Si le PC est injoignable, les photos attendent sur le téléphone et partent
toutes seules au retour de la connexion (aucun doublon).

## Installation (sur le PC)
1. Copiez les fichiers de ce zip dans votre projet (en respectant les dossiers, remplacez les fichiers existants).
2. `npm install`
3. `npm run build`
4. `npm run start`   (écoute sur tout le réseau local ; Windows demandera d'autoriser Node.js : choisissez « Réseaux privés »)
5. Notez l'adresse du PC sur le réseau local (par exemple http://192.168.1.20:3000).

## Sur le téléphone (Android, même Wi-Fi)
1. Tapez l'adresse du PC dans Chrome.
2. Chrome, menu ⋮ → « Ajouter à l'écran d'accueil ».
3. Ouvrez « Mes plantes » → choisissez la plante → « Prendre une photo » → « Envoyer au PC ».

## À savoir
- Photos réduites à 2000 px avant envoi (≈1 Mo au lieu de 8).
- Sans HTTPS, la page de prise de photo ne s'ouvre pas hors connexion au PC si elle n'a pas déjà été chargée ; les photos déjà prises, elles, sont conservées et envoyées plus tard.
- Pas de mot de passe : toute personne sur votre Wi-Fi peut ouvrir l'application. Ne l'exposez pas sur Internet.
- Si le téléphone n'accède pas au PC : pare-feu Windows (réseau privé), « isolation des clients » de la box, adresse du PC à réserver dans la box.

## Stockage des données
Les plantes et les semis sont enregistrés dans une base SQLite (Prisma) : `plantes.db`, dans le dossier de données de l'application (`DATA_DIR`, sinon `./data`). Les photos restent des fichiers dans `uploads/`.
Au tout premier démarrage, les anciens fichiers `plants.json` et `seedlings.json` sont repris automatiquement dans la base ; ils ne sont pas modifiés et servent de sauvegarde.
