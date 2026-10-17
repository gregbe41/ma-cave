# Image du relais pour Cloud Run : petite (Node sur Alpine), pour rester sous les 500 Mo d'Artifact Registry offerts.
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY relais.js regles.js stockage-firestore.js stockage.js serveur.js ./
ENV NODE_ENV=production
CMD ["node", "serveur.js"]
