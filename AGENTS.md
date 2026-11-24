# Instrucciones del proyecto

## Contexto

- Sitio corporativo de Construcciones Salma SPA.
- React, Vite y JavaScript.
- Usar CSS tradicional; no incorporar Tailwind.
- `react-router-dom` está instalado y se usa para las rutas.
- El build de Vite se publica en `/var/www/csalma`.
- Dominio de producción: https://csalma.cl.

## Organización

- Mantener `src/main.jsx` como punto de entrada y `src/App.jsx` como composición de rutas.
- Ubicar páginas en `src/pages/`, componentes reutilizables en `src/components/` y secciones en `src/sections/`.
- Guardar datos estáticos en `src/data/` cuando facilite su mantenimiento.
- Mantener los estilos globales en `src/styles/` y los estilos específicos junto a sus componentes cuando corresponda.
- Usar nombres descriptivos y consistentes para archivos y componentes.

## Implementación

- Diseñar primero para pantallas pequeñas y adaptar con media queries.
- Usar HTML semántico, etiquetas accesibles y textos alternativos útiles.
- Evitar dependencias nuevas si React, el navegador y CSS resuelven la necesidad.
- No añadir datos de proyectos, cifras ni afirmaciones corporativas que no hayan sido proporcionados.
- Eliminar recursos solo después de confirmar que no se usan y que no contienen material propio.

## Comandos

- `npm run dev`: desarrollo local.
- `npm run build`: generar la publicación en `dist`.
- `npm run preview`: previsualizar el build local.
- `npm run lint`: revisar el código con Oxlint.

## Publicación

- El destino de publicación es `/var/www/csalma`.
- No cambiar la configuración del servidor desde este proyecto sin una solicitud explícita.
- Para rutas de React Router en producción, coordinar el fallback de Nginx a `index.html` antes de publicar rutas distintas de `/`.
