<?php
/**
 * Configuración de Credenciales SMTP para CSALMA SPA
 * Copiar este archivo a config.smtp.php en el servidor y completar con las credenciales reales.
 * IMPORTANTE: El archivo config.smtp.php NUNCA debe subirse a Git (está en .gitignore).
 */

return [
    // Servidor SMTP (ej: mail.csalma.cl, smtp.gmail.com, smtp.office365.com)
    'host' => 'mail.csalma.cl',

    // Puerto: 465 (SSL) o 587 (TLS/STARTTLS)
    'port' => 465,

    // Usuario autenticado (casilla de correo completa)
    'username' => 'correo@csalma.cl',

    // Contraseña de la casilla
    'password' => 'TU_CONTRASENA_AQUI',

    // Remitente visible
    'from_email' => 'correo@csalma.cl',
    'from_name'  => 'Web Construcciones CSALMA',

    // Casilla de destino donde llegarán las cotizaciones
    'to_email'   => 'correo@csalma.cl',
];
