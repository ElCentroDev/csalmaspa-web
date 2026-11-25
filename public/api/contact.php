<?php
/**
 * CSALMA SPA — Endpoint Seguro de Recepción de Cotizaciones y Contacto
 * Cumplimiento: Ley N° 21.663 (Ciberseguridad) y Ley N° 19.628 (Protección de Datos Personales de Chile)
 * Mitigación OWASP: XSS, Email Header Injection, Rate Limiting y Honeypot Anti-Bot.
 */

declare(strict_types=1);

date_default_timezone_set('America/Santiago');

// Encabezados estrictos de seguridad (OWASP / Ley N° 21.663)
header('Content-Type: application/json; charset=UTF-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');
header('Referrer-Policy: strict-origin-when-cross-origin');
header("Content-Security-Policy: default-src 'none'");
header('Strict-Transport-Security: max-age=31536000; includeSubDomains');

// 1. Control de Origen (CORS estricto)
$allowedOrigins = [
    'https://csalma.cl',
    'https://dev.csalma.cl',
    'http://localhost:5173',
    'http://localhost:3000'
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: {$origin}");
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Accept');
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Permitir únicamente solicitudes POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido.']);
    exit;
}

// 2. Control de Tamaño Máximo del Payload (Mitigación DoS - Máximo 64 KB)
$contentLength = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
if ($contentLength > 65536) {
    http_response_code(413);
    echo json_encode(['success' => false, 'error' => 'Carga útil excede el límite permitido.']);
    exit;
}

// 3. Lectura y Decodificación Segura de JSON
$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Formato de solicitud inválido.']);
    exit;
}

// 4. Mecanismo Anti-Bot Honeypot
// Si el campo invisible 'website_trap' tiene algún valor, es un bot automatizado
if (!empty($data['website_trap'])) {
    // Respondemos éxito falso para no alertar al bot
    echo json_encode(['success' => true]);
    exit;
}

// 5. Rate Limiting por IP (Máximo 5 solicitudes cada 15 minutos)
$ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
$rateLimitDir = sys_get_temp_dir() . '/csalma_ratelimit';
if (!is_dir($rateLimitDir)) {
    @mkdir($rateLimitDir, 0700, true);
}

$ipHash = hash('sha256', $ip . 'csalma_salt_2026');
$ipFile = $rateLimitDir . '/' . $ipHash . '.json';
$now = time();
$window = 900; // 15 minutos en segundos
$maxAttempts = 5;

$attempts = [];
if (file_exists($ipFile)) {
    $rawAttempts = @file_get_contents($ipFile);
    $decoded = json_decode($rawAttempts ?: '[]', true);
    if (is_array($decoded)) {
        // Filtrar intentos dentro de la ventana de 15 minutos
        $attempts = array_filter($decoded, fn($t) => ($now - $t) < $window);
    }
}

if (count($attempts) >= $maxAttempts) {
    http_response_code(429);
    echo json_encode(['success' => false, 'error' => 'Demasiadas solicitudes. Por favor intente más tarde o contáctenos vía telefónica.']);
    exit;
}

// 6. Validación Estricta y Sanitización de Datos (OWASP)
$nombre   = trim((string)($data['nombre'] ?? ''));
$empresa  = trim((string)($data['empresa'] ?? ''));
$email    = trim((string)($data['email'] ?? ''));
$telefono = trim((string)($data['telefono'] ?? ''));
$servicio = trim((string)($data['servicio'] ?? ''));
$mensaje  = trim((string)($data['mensaje'] ?? ''));
$acepta   = (bool)($data['consentimiento'] ?? false);

// Validación de Consentimiento (Ley N° 19.628)
if (!$acepta) {
    http_response_code(422);
    echo json_encode(['success' => false, 'error' => 'Debe aceptar los términos de tratamiento de datos conforme a la legislación chilena.']);
    exit;
}

// Validación de Campos Obligatorios y Longitudes
if (empty($nombre) || mb_strlen($nombre) > 100) {
    http_response_code(422);
    echo json_encode(['success' => false, 'error' => 'Nombre inválido o excede longitud permitida.']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 120) {
    http_response_code(422);
    echo json_encode(['success' => false, 'error' => 'Dirección de correo electrónico inválida.']);
    exit;
}

// Prevención de Email Header Injection
if (preg_match("/[\r\n]/", $nombre) || preg_match("/[\r\n]/", $email)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Caracteres no permitidos detectados.']);
    exit;
}

if (mb_strlen($empresa) > 120 || mb_strlen($telefono) > 30 || mb_strlen($servicio) > 150) {
    http_response_code(422);
    echo json_encode(['success' => false, 'error' => 'Campos exceden la longitud permitida.']);
    exit;
}

if (empty($mensaje) || mb_strlen($mensaje) > 3000) {
    http_response_code(422);
    echo json_encode(['success' => false, 'error' => 'Mensaje requerido (máximo 3000 caracteres).']);
    exit;
}

// 7. Carga Segura de Configuración SMTP
// Se busca el archivo de configuración fuera de la raíz web o en ruta protegida
$configFile = __DIR__ . '/config.smtp.php';
if (!file_exists($configFile)) {
    // Fallback de contingencia si no se ha configurado el archivo SMTP
    error_log('[CSALMA SECURITY] Archivo config.smtp.php no encontrado.');
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Servicio de mensajería en mantención.']);
    exit;
}

$smtpConfig = require $configFile;

// 8. Construcción del Mensaje con Escape HTML (Prevención XSS)
$safeNombre   = htmlspecialchars($nombre, ENT_QUOTES, 'UTF-8');
$safeEmpresa  = !empty($empresa) ? htmlspecialchars($empresa, ENT_QUOTES, 'UTF-8') : 'No especificada';
$safeEmail    = htmlspecialchars($email, ENT_QUOTES, 'UTF-8');
$safeTelefono = !empty($telefono) ? htmlspecialchars($telefono, ENT_QUOTES, 'UTF-8') : 'No informado';
$safeServicio = !empty($servicio) ? htmlspecialchars($servicio, ENT_QUOTES, 'UTF-8') : 'Consulta General de Obras';
$safeMensaje  = nl2br(htmlspecialchars($mensaje, ENT_QUOTES, 'UTF-8'));
$fechaEnvio   = date('d/m/Y H:i:s') . ' (Hora Chile - CLT)';

$asunto = "Nueva Solicitud Web CSALMA: {$safeServicio} - {$safeNombre}";

$cuerpoHtml = <<<HTML
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f3f1ec; color: #202326; margin: 0; padding: 24px; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #d1d5db; border-top: 4px solid #b47a42; padding: 32px; border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .header { margin-bottom: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px; }
        .title { color: #202326; font-size: 20px; font-weight: 700; margin: 0 0 4px 0; }
        .subtitle { color: #6b7280; font-size: 13px; margin: 0; }
        .field { margin-bottom: 16px; }
        .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #b47a42; font-weight: 700; margin-bottom: 4px; }
        .value { font-size: 15px; color: #111827; background: #f9fafb; padding: 10px 14px; border-radius: 4px; border: 1px solid #f3f4f6; }
        .message-box { font-size: 14px; line-height: 1.6; color: #1f2937; background: #fafaf9; border-left: 3px solid #b47a42; padding: 14px; margin-top: 6px; }
        .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <h1 class="title">CSALMA SPA — Solicitud de Cotización</h1>
            <p class="subtitle">Recibida el {$fechaEnvio} a través de csalma.cl</p>
        </div>

        <div class="field">
            <div class="label">Solicitante</div>
            <div class="value"><strong>{$safeNombre}</strong></div>
        </div>

        <div class="field">
            <div class="label">Empresa / Razón Social</div>
            <div class="value">{$safeEmpresa}</div>
        </div>

        <div class="field">
            <div class="label">Correo de Contacto</div>
            <div class="value"><a href="mailto:{$safeEmail}">{$safeEmail}</a></div>
        </div>

        <div class="field">
            <div class="label">Teléfono</div>
            <div class="value">{$safeTelefono}</div>
        </div>

        <div class="field">
            <div class="label">Tipo de Proyecto / Especialidad</div>
            <div class="value">{$safeServicio}</div>
        </div>

        <div class="field">
            <div class="label">Requerimientos / Mensaje</div>
            <div class="message-box">{$safeMensaje}</div>
        </div>

        <div class="footer">
            Mensaje originado de forma segura desde el portal corporativo de Construcciones CSALMA SPA.<br>
            Consentimiento Ley N° 19.628 autorizado el {$fechaEnvio} | Trazabilidad IP Hash: {$ipHash}
        </div>
    </div>
</body>
</html>
HTML;

// 9. Enlace y Envío Vía Socket SMTP con TLS/SSL (Sin dependencias externas pesadas)
try {
    $mailSent = enviarSmtpSeguro($smtpConfig, $asunto, $cuerpoHtml, $email, $nombre);

    if ($mailSent) {
        // Registrar intento exitoso en rate-limit
        $attempts[] = $now;
        @file_put_contents($ipFile, json_encode($attempts));

        echo json_encode(['success' => true]);
        exit;
    } else {
        throw new RuntimeException('Fallo al despachar el correo por SMTP.');
    }
} catch (Throwable $e) {
    error_log('[CSALMA SMTP ERROR] ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'No se pudo enviar la solicitud en este momento. Intente más tarde.']);
    exit;
}

/**
 * Cliente SMTP Ligero y Seguro con soporte TLS/SSL y autenticación RFC 4954
 */
function enviarSmtpSeguro(array $config, string $subject, string $bodyHtml, string $replyToEmail, string $replyToName): bool {
    $host     = $config['host'];
    $port     = (int)$config['port'];
    $user     = $config['username'];
    $pass     = $config['password'];
    $to       = $config['to_email'];
    $from     = $config['from_email'];
    $fromName = $config['from_name'];

    $timeout = 15;
    $isSsl = ($port === 465);
    $transportHost = ($isSsl ? 'ssl://' : '') . $host;

    $socket = @fsockopen($transportHost, $port, $errno, $errstr, $timeout);
    if (!$socket) {
        throw new RuntimeException("No se pudo conectar al servidor SMTP ({$errstr})");
    }

    $read = fn() => fgets($socket, 515);
    $write = function(string $cmd) use ($socket) {
        fputs($socket, $cmd . "\r\n");
    };

    $initialResponse = $read();
    if (!str_starts_with($initialResponse, '220')) {
        fclose($socket);
        throw new RuntimeException("Respuesta SMTP inválida: {$initialResponse}");
    }

    $write("EHLO " . gethostname());
    while ($line = $read()) {
        if (substr($line, 3, 1) === ' ') break;
    }

    // Iniciar TLS si es puerto 587
    if ($port === 587) {
        $write("STARTTLS");
        $res = $read();
        if (!str_starts_with($res, '220')) {
            fclose($socket);
            throw new RuntimeException("STARTTLS falló: {$res}");
        }
        stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT | STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT);
        $write("EHLO " . gethostname());
        while ($line = $read()) {
            if (substr($line, 3, 1) === ' ') break;
        }
    }

    // Autenticación AUTH LOGIN
    $write("AUTH LOGIN");
    $res = $read();
    if (!str_starts_with($res, '334')) {
        fclose($socket);
        throw new RuntimeException("AUTH LOGIN rechazado: {$res}");
    }

    $write(base64_encode($user));
    $res = $read();
    if (!str_starts_with($res, '334')) {
        fclose($socket);
        throw new RuntimeException("Usuario SMTP rechazado: {$res}");
    }

    $write(base64_encode($pass));
    $res = $read();
    if (!str_starts_with($res, '235')) {
        fclose($socket);
        throw new RuntimeException("Credenciales SMTP inválidas: {$res}");
    }

    // Envoltorio del mensaje
    $write("MAIL FROM: <{$from}>");
    $read();

    $write("RCPT TO: <{$to}>");
    $read();

    $write("DATA");
    $read();

    // Encabezados MIME RFC 2822
    $boundary = '=_csalma_' . md5(uniqid((string)mt_rand(), true));
    $headers = [
        "From: =?UTF-8?B?" . base64_encode($fromName) . "?= <{$from}>",
        "To: <{$to}>",
        "Reply-To: =?UTF-8?B?" . base64_encode($replyToName) . "?= <{$replyToEmail}>",
        "Subject: =?UTF-8?B?" . base64_encode($subject) . "?=",
        "MIME-Version: 1.0",
        "Content-Type: text/html; charset=UTF-8",
        "Content-Transfer-Encoding: base64",
        "X-Mailer: CSALMA Secure Mailer (Ley 21.663)",
    ];

    $payload = implode("\r\n", $headers) . "\r\n\r\n" . chunk_split(base64_encode($bodyHtml)) . "\r\n.";
    $write($payload);
    $finalRes = $read();

    $write("QUIT");
    fclose($socket);

    return str_starts_with($finalRes, '250');
}
