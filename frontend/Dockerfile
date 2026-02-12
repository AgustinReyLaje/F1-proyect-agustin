# F1 Analytics Frontend - Next.js
FROM node:20-alpine

# Metadatos
LABEL maintainer="F1 Analytics Platform"
LABEL description="Next.js Frontend for F1 Analytics"

# Directorio de trabajo
WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto de los archivos
COPY . .

# Exponer puerto
EXPOSE 3000

# Variables de entorno
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

# Comando de desarrollo
CMD ["npm", "run", "dev"]
