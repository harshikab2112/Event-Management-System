FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend
ARG VITE_GOOGLE_CLIENT_ID
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN VITE_GOOGLE_CLIENT_ID="$VITE_GOOGLE_CLIENT_ID" npm run build

FROM node:22-alpine AS api
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY backend/ ./backend/
COPY database/ ./database/
COPY --from=frontend-build /app/frontend/dist ./frontend/dist
EXPOSE 3000
CMD ["npm", "start"]
