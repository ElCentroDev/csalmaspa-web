# Construcciones Salma SPA

Base del sitio corporativo de Construcciones Salma SPA, desarrollada con React,
Vite, JavaScript y CSS tradicional. El contenido comercial se agregará cuando
esté validado por la empresa.

## Desarrollo

- `npm run dev`: inicia el servidor de desarrollo.
- `npm run dev:server`: inicia la API Fastify local en `127.0.0.1:3000` usando transporte simulado.
- `npm run start:server`: inicia la API Fastify para un proceso administrado por el servidor.
- `npm run build`: genera los archivos de producción en `dist/`.
- `npm run preview`: sirve localmente el build generado.
- `npm run lint`: ejecuta Oxlint.

## Estructura

- `src/components/layout/`: encabezado, pie y estructura común.
- `src/pages/`: páginas asociadas a las rutas.
- `src/sections/`: secciones reutilizables de página.
- `src/styles/`: estilos globales y variables de presentación.

La portada actual es una página inicial neutral; no contiene servicios, datos
de contacto ni afirmaciones corporativas pendientes de validar.

El destino de publicación previsto es `/var/www/csalma` en `https://csalma.cl`.
Las rutas de React Router en producción requieren que Nginx entregue `index.html`
como fallback para rutas de la aplicación.

## API de contacto

La API Node.js se encuentra en `server/` y expone `POST /api/contact`. En desarrollo,
Vite reenvía `/api` a Fastify. El modo `stream` simula el envío y no entrega correos.
Copie `.env.example` a `.env.local` para ajustar valores locales; no agregue secretos
al repositorio. El límite por IP se mantiene en memoria del proceso y se reinicia al
reiniciar la API.

Para habilitar Google Workspace posteriormente, configure las variables SMTP en el
entorno privado del servidor y cambie `MAIL_TRANSPORT` a `smtp`. La publicación requiere
un proxy inverso de Nginx hacia `127.0.0.1:3000`; no se ha cambiado la configuración
del servidor.
