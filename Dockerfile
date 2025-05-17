# Utilise l’image officielle Playwright (avec navigateurs déjà installés)
FROM mcr.microsoft.com/playwright:v1.52.0-jammy

# Crée le dossier de travail
WORKDIR /app

# Copie tous les fichiers dans le container
COPY . .

# Installe les dépendances
RUN npm install

# Expose le port (important pour Render)
EXPOSE 3000

# Commande de démarrage
CMD ["node", "index.js"]
