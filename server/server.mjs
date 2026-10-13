import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import Busboy from 'busboy';

const PORT = Number(process.env.PORT || 3000);
const ROOT = resolve(import.meta.dirname, '..');
const DIST = resolve(ROOT, 'dist');
const DATA_DIR = resolve(ROOT, 'data');
const DATA_FILE = resolve(DATA_DIR, 'requests.json');
const ACTIVITIES_FILE = resolve(DATA_DIR, 'activities.json');
const MEDIA_DIR = resolve(DATA_DIR, 'media');
const MEDIA_EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
  'video/3gpp': '.3gp',
  'audio/webm': '.webm',
  'audio/mp4': '.m4a',
  'audio/x-m4a': '.m4a',
  'audio/mpeg': '.mp3',
  'audio/aac': '.aac',
  'audio/wav': '.wav',
  'audio/x-wav': '.wav',
  'audio/ogg': '.ogg',
  'application/pdf': '.pdf',
  'text/plain': '.txt',
  'text/csv': '.csv',
  'application/zip': '.zip',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  'application/msword': '.doc',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.ms-powerpoint': '.ppt',
};
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.3gp': 'video/3gpp',
  '.m4a': 'audio/mp4',
  '.mp3': 'audio/mpeg',
  '.aac': 'audio/aac',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.zip': 'application/zip',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

mkdirSync(DATA_DIR, { recursive: true });
mkdirSync(MEDIA_DIR, { recursive: true });
if (!existsSync(DATA_FILE)) writeFileSync(DATA_FILE, '[]\n', 'utf8');
if (!existsSync(ACTIVITIES_FILE)) writeFileSync(ACTIVITIES_FILE, '[]\n', 'utf8');

function loadRequests() {
  try {
    const value = JSON.parse(readFileSync(DATA_FILE, 'utf8'));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

let requests = loadRequests();
let activities = [];

try {
  const savedActivities = JSON.parse(readFileSync(ACTIVITIES_FILE, 'utf8'));
  activities = Array.isArray(savedActivities) ? savedActivities : [];
} catch {
  activities = [];
}

function saveRequests() {
  writeFileSync(DATA_FILE, JSON.stringify(requests, null, 2) + '\n', 'utf8');
}

function saveActivities() {
  writeFileSync(ACTIVITIES_FILE, JSON.stringify(activities, null, 2) + '\n', 'utf8');
}

async function parseMediaUpload(request, allowedPrefixes, maxBytes) {
  return new Promise((resolveUpload, rejectUpload) => {
    let fields = {};
    let upload = null;
    let uploadError = null;
    let writeTask = Promise.resolve();
    let savedPath = null;

    let parser;
    try {
      parser = Busboy({
        headers: request.headers,
        limits: { files: 1, fileSize: maxBytes, fields: 4, fieldSize: 1000 },
      });
    } catch {
      rejectUpload(new Error('El archivo no llegó en un formato válido.'));
      return;
    }

    parser.on('field', (name, value) => { fields[name] = value; });
    parser.on('file', (fieldName, stream, info) => {
      const extension = MEDIA_EXTENSIONS[info.mimeType];
      const allowed = allowedPrefixes.some((prefix) => info.mimeType.startsWith(prefix));
      if (fieldName !== 'file' || !allowed || !extension) {
        uploadError = new Error('Ese formato de archivo no es compatible.');
        stream.resume();
        return;
      }

      const filename = randomUUID() + extension;
      savedPath = resolve(MEDIA_DIR, filename);
      let truncated = false;
      stream.on('limit', () => { truncated = true; });
      writeTask = pipeline(stream, createWriteStream(savedPath)).then(() => {
        if (truncated) throw new Error('El archivo supera el tamaño permitido.');
        upload = { filename, mimeType: info.mimeType };
      });
      writeTask.catch((error) => { uploadError = error; });
    });
    parser.on('filesLimit', () => { uploadError = new Error('Solo puedes subir un archivo a la vez.'); });
    parser.on('error', (error) => { uploadError = error; });
    parser.on('close', async () => {
      try {
        await writeTask;
        if (uploadError) throw uploadError;
        if (!upload) throw new Error('Selecciona una foto, video o nota de voz.');
        resolveUpload({ fields, ...upload });
      } catch (error) {
        if (savedPath && existsSync(savedPath)) unlinkSync(savedPath);
        rejectUpload(error);
      }
    });
    request.pipe(parser);
  });
}

function sendJson(response, status, value) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(value));
}

async function readJson(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 16_000) throw new Error('La solicitud es demasiado grande.');
  }
  return body ? JSON.parse(body) : {};
}

function serveStatic(pathname, response) {
  const relativePath = pathname === '/' ? 'index.html' : decodeURIComponent(pathname).replace(/^\/+/, '');
  const filePath = resolve(DIST, relativePath);
  if (filePath !== DIST && !filePath.startsWith(DIST + sep)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  const target = existsSync(filePath) ? filePath : resolve(DIST, 'index.html');
  if (!existsSync(target)) {
    response.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Falta la compilación web. Ejecuta pnpm build:web y vuelve a iniciar el servidor.');
    return;
  }

  response.writeHead(200, {
    'Content-Type': MIME_TYPES[extname(target).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': 'no-cache',
  });
  response.end(readFileSync(target));
}

const server = createServer(async (request, response) => {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    response.writeHead(204);
    response.end();
    return;
  }

  const url = new URL(request.url || '/', 'http://localhost');
  const mediaMatch = url.pathname.match(/^\/media\/([\w-]+\.(?:jpg|png|webp|gif|mp4|webm|mov|3gp|m4a|mp3|aac|wav|ogg|pdf|txt|csv|zip|doc|docx|xls|xlsx|ppt|pptx))$/i);
  if (mediaMatch && request.method === 'GET') {
    const mediaPath = resolve(MEDIA_DIR, mediaMatch[1]);
    if (!existsSync(mediaPath)) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }
    const size = statSync(mediaPath).size;
    const audioMessage = requests.flatMap((item) => item.messages || []).find((message) => message.audioUrl === '/media/' + mediaMatch[1]);
    const range = request.headers.range;
    const rangeMatch = typeof range === 'string' && range.match(/^bytes=(\d*)-(\d*)$/);
    const headers = {
      'Content-Type': audioMessage?.mimeType || MIME_TYPES[extname(mediaPath).toLowerCase()] || 'application/octet-stream',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    };
    if (rangeMatch) {
      const start = rangeMatch[1] ? Number(rangeMatch[1]) : Math.max(0, size - Number(rangeMatch[2] || 0));
      const end = rangeMatch[2] && rangeMatch[1] ? Math.min(size - 1, Number(rangeMatch[2])) : size - 1;
      if (start >= size || end < start) {
        response.writeHead(416, { ...headers, 'Content-Range': `bytes */${size}` });
        response.end();
        return;
      }
      response.writeHead(206, { ...headers, 'Content-Length': end - start + 1, 'Content-Range': `bytes ${start}-${end}/${size}` });
      createReadStream(mediaPath, { start, end }).pipe(response);
      return;
    }
    response.writeHead(200, { ...headers, 'Content-Length': size });
    createReadStream(mediaPath).pipe(response);
    return;
  }

  if (url.pathname === '/api/activities' && request.method === 'GET') {
    sendJson(response, 200, { activities: [...activities].reverse() });
    return;
  }

  if (url.pathname === '/api/activities' && request.method === 'POST') {
    try {
      const file = await parseMediaUpload(request, ['image/', 'video/'], 100 * 1024 * 1024);
      const item = {
        id: randomUUID(),
        type: file.mimeType.startsWith('image/') ? 'photo' : 'video',
        mimeType: file.mimeType,
        fileName: file.filename,
        mediaUrl: '/media/' + file.filename,
        uploadedBy: String(file.fields.uploadedBy || 'Estudiante').trim().slice(0, 40),
        caption: String(file.fields.caption || '').trim().slice(0, 300),
        createdAt: new Date().toISOString(),
      };
      activities.push(item);
      activities = activities.slice(-500);
      saveActivities();
      sendJson(response, 201, { activity: item });
    } catch (error) {
      sendJson(response, 400, { error: error instanceof Error ? error.message : 'No se pudo subir el archivo.' });
    }
    return;
  }

  if (url.pathname === '/api/requests' && request.method === 'GET') {
    const publicRequests = [...requests].reverse().map(({ messages, ...item }) => item);
    sendJson(response, 200, { requests: publicRequests });
    return;
  }

  if (url.pathname === '/api/requests' && request.method === 'POST') {
    try {
      const body = await readJson(request);
      const name = String(body.name || '').trim().slice(0, 40);
      const topic = String(body.topic || '').trim().slice(0, 80);
      const doubt = String(body.doubt || '').trim().slice(0, 500);
      if (!name || !topic || !doubt) {
        sendJson(response, 400, { error: 'Completa tu nombre, la materia y tu duda.' });
        return;
      }
      const item = {
        id: randomUUID(),
        clientId: String(body.clientId || '').slice(0, 80),
        name,
        topic,
        doubt,
        status: 'open',
        createdAt: new Date().toISOString(),
        helperName: null,
        helperId: null,
        messages: [],
      };
      requests.push(item);
      requests = requests.slice(-200);
      saveRequests();
      sendJson(response, 201, { request: item });
    } catch (error) {
      sendJson(response, 400, { error: error instanceof Error ? error.message : 'Solicitud no válida.' });
    }
    return;
  }

  const voiceMatch = url.pathname.match(/^\/api\/requests\/([\w-]+)\/voice-notes$/);
  if (voiceMatch && request.method === 'POST') {
    let file;
    try {
      file = await parseMediaUpload(request, ['audio/'], 20 * 1024 * 1024);
      const item = requests.find((entry) => entry.id === voiceMatch[1]);
      const senderId = String(file.fields.senderId || '').slice(0, 80);
      if (!item || item.status !== 'claimed' || (senderId !== item.clientId && senderId !== item.helperId)) {
        unlinkSync(resolve(MEDIA_DIR, file.filename));
        sendJson(response, item ? 403 : 404, { error: 'La nota de voz solo está disponible para quienes participan en la ayuda.' });
        return;
      }
      const message = {
        id: randomUUID(),
        senderId,
        senderName: String(file.fields.senderName || 'Estudiante').trim().slice(0, 40),
        text: '',
        audioUrl: '/media/' + file.filename,
        mimeType: file.mimeType,
        createdAt: new Date().toISOString(),
      };
      item.messages ||= [];
      item.messages.push(message);
      item.messages = item.messages.slice(-500);
      saveRequests();
      sendJson(response, 201, { message });
    } catch (error) {
      sendJson(response, 400, { error: error instanceof Error ? error.message : 'No se pudo enviar la nota de voz.' });
    }
    return;
  }

  const attachmentMatch = url.pathname.match(/^\/api\/requests\/([\w-]+)\/attachments$/);
  if (attachmentMatch && request.method === 'POST') {
    let file;
    try {
      file = await parseMediaUpload(request, ['image/', 'video/', 'audio/', 'application/pdf', 'application/zip', 'application/msword', 'application/vnd.', 'text/plain', 'text/csv'], 50 * 1024 * 1024);
      const item = requests.find((entry) => entry.id === attachmentMatch[1]);
      const senderId = String(file.fields.senderId || '').slice(0, 80);
      if (!item || item.status !== 'claimed' || (senderId !== item.clientId && senderId !== item.helperId)) {
        unlinkSync(resolve(MEDIA_DIR, file.filename));
        sendJson(response, item ? 403 : 404, { error: 'Los archivos solo están disponibles para quienes participan en la ayuda.' });
        return;
      }
      const originalName = String(file.fields.originalName || 'archivo').replace(/[\\/\r\n\0]/g, '').slice(0, 120);
      const message = {
        id: randomUUID(), senderId,
        senderName: String(file.fields.senderName || 'Estudiante').trim().slice(0, 40),
        text: '', fileUrl: '/media/' + file.filename, fileName: originalName,
        mimeType: file.mimeType, createdAt: new Date().toISOString(),
      };
      item.messages ||= [];
      item.messages.push(message);
      item.messages = item.messages.slice(-500);
      saveRequests();
      sendJson(response, 201, { message });
    } catch (error) {
      sendJson(response, 400, { error: error instanceof Error ? error.message : 'No se pudo enviar el archivo.' });
    }
    return;
  }

  const messagesMatch = url.pathname.match(/^\/api\/requests\/([\w-]+)\/messages$/);
  if (messagesMatch && request.method === 'GET') {
    const item = requests.find((entry) => entry.id === messagesMatch[1]);
    if (!item) {
      sendJson(response, 404, { error: 'La solicitud ya no está disponible.' });
      return;
    }
    const clientId = url.searchParams.get('clientId') || '';
    if (clientId !== item.clientId && clientId !== item.helperId) {
      sendJson(response, 403, { error: 'Solo las dos personas de esta solicitud pueden ver el chat.' });
      return;
    }
    sendJson(response, 200, { messages: item.messages || [] });
    return;
  }

  if (messagesMatch && request.method === 'POST') {
    try {
      const body = await readJson(request);
      const item = requests.find((entry) => entry.id === messagesMatch[1]);
      if (!item) {
        sendJson(response, 404, { error: 'La solicitud ya no está disponible.' });
        return;
      }
      const senderId = String(body.senderId || '').slice(0, 80);
      if (item.status !== 'claimed' || (senderId !== item.clientId && senderId !== item.helperId)) {
        sendJson(response, 403, { error: 'El chat está disponible para quienes participan en la ayuda.' });
        return;
      }
      const messageText = String(body.text || '').trim().slice(0, 1000);
      if (!messageText) {
        sendJson(response, 400, { error: 'Escribe un mensaje antes de enviarlo.' });
        return;
      }
      const message = {
        id: randomUUID(),
        senderId,
        senderName: String(body.senderName || 'Estudiante').trim().slice(0, 40),
        text: messageText,
        createdAt: new Date().toISOString(),
      };
      item.messages ||= [];
      item.messages.push(message);
      item.messages = item.messages.slice(-500);
      saveRequests();
      sendJson(response, 201, { message });
    } catch (error) {
      sendJson(response, 400, { error: error instanceof Error ? error.message : 'Mensaje no válido.' });
    }
    return;
  }

  const claimMatch = url.pathname.match(/^\/api\/requests\/([\w-]+)\/claim$/);
  if (claimMatch && request.method === 'PATCH') {
    try {
      const body = await readJson(request);
      const item = requests.find((entry) => entry.id === claimMatch[1]);
      if (!item) {
        sendJson(response, 404, { error: 'La solicitud ya no está disponible.' });
        return;
      }
      if (item.status !== 'open') {
        sendJson(response, 409, { error: 'Otro estudiante ya respondió a esta solicitud.' });
        return;
      }
      if (String(body.helperId || '') === item.clientId) {
        sendJson(response, 403, { error: 'No puedes responder a tu propia solicitud.' });
        return;
      }
      item.status = 'claimed';
      item.helperName = String(body.helperName || 'Otro estudiante').trim().slice(0, 40);
      item.helperId = String(body.helperId || '').slice(0, 80);
      item.claimedAt = new Date().toISOString();
      saveRequests();
      sendJson(response, 200, { request: item });
    } catch (error) {
      sendJson(response, 400, { error: error instanceof Error ? error.message : 'Solicitud no válida.' });
    }
    return;
  }

  serveStatic(url.pathname, response);
});

server.listen(PORT, '0.0.0.0', () => {
  const addresses = Object.values(networkInterfaces()).flat().filter((entry) =>
    entry && entry.family === 'IPv4' && !entry.internal && !entry.address.startsWith('169.254.'),
  );
  const lanAddress = addresses.find((entry) =>
    entry.address.startsWith('192.168.') || entry.address.startsWith('10.') || /^172\.(1[6-9]|2\d|3[01])\./.test(entry.address),
  ) || addresses[0];

  console.log('Nexo está disponible en esta computadora: http://localhost:' + PORT);
  console.log(lanAddress
    ? 'En otros dispositivos de esta Wi-Fi: http://' + lanAddress.address + ':' + PORT
    : 'No encontré una dirección de red local. Conecta la computadora a la Wi-Fi e inténtalo de nuevo.');
  console.log('Deja esta ventana abierta mientras las demás personas usan la app.');
});
