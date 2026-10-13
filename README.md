# Nexo

Nexo ayuda a estudiantes a convertir un error de estudio en dos cosas: un repaso corto hecho a partir de ese tropiezo y una sesión de ayuda entre pares de 15 minutos. El prototipo inicial incluye una ficha de duda, un perfil de compañero disponible y una pregunta de repaso.

Proyecto para Android y iOS con Expo, React Native y TypeScript. Se usó la plantilla oficial de Expo SDK 57. El nombre Nexo es provisional.

## Compartir en la misma Wi-Fi

En la computadora que alojará la app:

1. Instala Node.js LTS y pnpm.
2. En esta carpeta, ejecuta:

   ```bash
   pnpm install
   pnpm build:web
   pnpm start:lan
   ```

3. Abre en cada teléfono la dirección de Wi-Fi que imprime el servidor. La computadora y los teléfonos deben seguir en la misma red; deja el servidor encendido.

La interfaz está pensada para teléfonos y usa modo oscuro de forma predeterminada. En la barra inferior encontrarás Inicio, Ayuda y Actividades.

Las solicitudes se comparten y actualizan entre dispositivos automáticamente. Si alguien acepta ayudar, solo esa persona y quien publicó la duda ven el chat privado, que permite texto y notas de voz. Las notas se guardan en `data/media/` y sus mensajes en `data/requests.json` en la computadora anfitriona. La captura directa de audio depende del navegador; en algunos teléfonos se podrá grabar desde el selector del sistema y en otros elegir un audio existente.

En Actividades cualquier persona conectada puede publicar una foto o video con un comentario. Los archivos se guardan en `data/media/` y las publicaciones en `data/activities.json`. Las cargas admiten hasta 100 MB por foto o video y 20 MB por nota de voz.

Si Windows pregunta por el acceso de red, permite Node.js en redes privadas. No hace falta habilitar redes públicas.

## Desarrollo

```bash
pnpm start
```

La navegación y las pantallas iniciales están en `src/app/`. Puedes cambiar el nombre visible desde `app.json`.

## Primer alcance

- Guardar el paso exacto donde alguien se equivoca o se atasca.
- Ofrecer un repaso breve que use ese error como punto de partida.
- Encontrar estudiantes disponibles para resolver dudas en sesiones de 15 minutos.
- Mantener la ayuda recíproca sin rankings ni perfiles públicos.

El intercambio de solicitudes y el chat funcionan en la red local y no requieren cuentas. Cualquier persona con acceso a esa Wi-Fi puede ver las dudas publicadas, pero solo quienes participan en una solicitud pueden ver sus mensajes. No incluyas información privada.



## Publicación en GitHub Pages

GitHub Pages puede mostrar la interfaz web, pero es un alojamiento estático y no ejecuta server/server.mjs. Por eso la lista compartida de solicitudes, el chat, las notas de voz y las cargas de fotos y videos necesitan el servidor Node en una computadora conectada a la red. Para que esas funciones estén disponibles desde cualquier lugar, habrá que alojar también ese servidor en un servicio compatible y configurar su dirección en la app.

