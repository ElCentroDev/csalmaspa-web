# Construcciones Salma SPA

Sitio corporativo desarrollado con React, Vite, JavaScript y CSS tradicional.

## Desarrollo

- `npm run dev`: inicia el servidor de desarrollo.
- `npm run build`: genera los archivos de producción en `dist/`.
- `npm run preview`: sirve localmente el build generado.
- `npm run lint`: ejecuta Oxlint.

## Estructura

- `src/components/layout/`: encabezado, pie y estructura común.
- `src/pages/`: páginas asociadas a las rutas.
- `src/sections/`: secciones reutilizables de página.
- `src/styles/`: estilos globales y variables de presentación.

El destino de publicación previsto es `/var/www/csalma` en `https://csalma.cl`.
Las rutas de React Router en producción requieren que Nginx entregue `index.html`
como fallback para rutas de la aplicación.
