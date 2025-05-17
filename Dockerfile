# Dockerfile (version finale)
FROM mcr.microsoft.com/playwright:v1.52.0-jammy

WORKDIR /app
COPY package*.json ./
RUN npm ci            # installe les deps sans toucher à playwright-core pré-installé
# (« npm ci » ≃ « npm install » mais sans re-écrire package-lock)

COPY . .

# 🟢 S’assure que la copie locale de @playwright/test pointe sur les
#    navigateurs fournis par l’image 👉 on ré-exécute install.
RUN npx playwright install --with-deps

EXPOSE 3000
CMD ["node", "index.js"]
