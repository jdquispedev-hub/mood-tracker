# Pitufo Moods - Team Mood Tracker 🔵

**Pitufo Moods** es un widget de escritorio ligero y un dashboard en tiempo real diseñado para mantener a los equipos de trabajo conectados, sabiendo de manera sencilla el estado y la disponibilidad de cada miembro durante el día.

---

## 🚀 Características Principales

* **Widget Flotante e Interactivo**:
  * **Modo Compacto (`340x600`)**: Flota por encima de otras ventanas (Always on Top) para cambiar rápidamente tu estado o texto personalizado.
  * **Modo Mini (`130x150`)**: Una vista ultra-compacta y arrastrable de tu propio avatar, nombre y estado.
  * **Modo Dashboard Completo (`1024x768`)**: Abre una vista general de todo el equipo en tiempo real.
* **Galería de Stickers Frecuentes**: Selección rápida con imágenes locales representativas (Feliz, Chambeador, Estresado, etc.) con scroll interno y ajuste automático.
* **Sincronización en Tiempo Real**: Desarrollado con WebSockets (Socket.io) para recibir y notificar actualizaciones al instante.
* **Fotografía de Perfil Personalizada**: Permite subir avatares o imágenes de estado en base64 de hasta 1MB.
* **Consola de Administración (Danna)**: Acceso de administrador para la visualización del dashboard.
* **Listo para macOS (Apple Silicon)**: Empaquetado nativo para procesadores M1/M2/M3/M4 (arm64).

---

## 🛠️ Tecnologías Utilizadas

* **Frontend**: HTML5 (Semántico), Vanilla CSS3 (Glassmorphic Design), JavaScript (ES6).
* **Backend**: Node.js, Express, Socket.io (WebSockets).
* **Escritorio**: Electron.
* **Empaquetado**: Electron Packager.

---

## ⚙️ Archivo de Configuración (`config.json`)

El proyecto contiene un archivo `config.json` (ignorado en Git) para administrar las conexiones locales y del servidor:

```json
{
  "serverIp": "192.168.3.59",
  "isServer": false
}
```

* **`serverIp`**: La dirección IP del servidor central donde está alojado el backend.
* **`isServer`**: 
  * `true`: La aplicación local de la Mac también iniciará el servidor backend (útil para desarrollo o para la máquina principal que sirve de servidor).
  * `false`: La aplicación actúa solo como cliente y se conecta a la IP configurada.

---

## 📦 Despliegue en Servidor Linux (24/7)

Para mantener la aplicación siempre encendida sin depender de que tu computadora personal esté encendida, puedes desplegar el servidor en Linux (ej. IP `192.168.3.59`):

### 1. Clonar e Instalar
```bash
cd /home/gltracker
git clone https://github.com/jdquispedev-hub/mood-tracker.git
cd mood-tracker
npm install
```

### 2. Ejecutar en Segundo Plano (Puerto 3030)
Para iniciar el servidor sin que se cierre al desconectar la terminal de SSH, puedes usar `nohup`:
```bash
nohup node server.js > output.log 2>&1 &
```
*(Puedes revisar los registros de arranque ejecutando `cat output.log`)*

### 3. Configurar Firewall en Linux
Asegúrate de permitir las conexiones entrantes en el puerto `3030`:
```bash
# Si usas UFW:
ufw allow 3030/tcp

# Si usas iptables:
iptables -A INPUT -p tcp --dport 3030 -j ACCEPT
```

---

## 🖥️ Desarrollo y Distribución Local (Mac)

### Requisitos previos
* Node.js v18+ instalado.

### Comandos de Desarrollo
```bash
# 1. Instalar dependencias locales
npm install

# 2. Iniciar el widget local en modo desarrollo
npm run app
```

### Empaquetado para macOS
Para compilar la aplicación `.app` nativa y distribuirla a tus compañeros:
1. Asegúrate de configurar la IP del servidor en el `config.json` de tu Mac con `"isServer": false` y la IP del Linux.
2. Ejecuta:
   ```bash
   npm run pack
   ```
3. Esto generará la carpeta `PitufoMoods-darwin-arm64`.
4. Comprime esta carpeta en un archivo `.zip` y compártela con tus compañeros.

---

## ⚠️ Solución de Problemas (Troubleshooting)

### macOS bloquea el archivo `.app` al descargarlo
Dado que la aplicación se distribuye de forma interna y no está firmada con cuenta de Apple Developer, macOS Gatekeeper bloqueará su ejecución diciendo que *"no se puede verificar el desarrollador"* o *"el archivo está dañado"*.

**Solución**:
Pide a tus compañeros que abran su terminal en Mac y ejecuten:
```bash
xattr -cr /ruta/donde/guardaron/PitufoMoods.app
```
O simplemente que hagan **Clic Derecho -> Abrir** sobre la aplicación y confirmen la excepción de seguridad de macOS.

### Error: `listen EADDRINUSE: address already in use 0.0.0.0:3030`
Este error significa que el puerto `3030` ya está ocupado por otra instancia o aplicación en la máquina.

**Solución**:
* Identifica el proceso que lo usa: `lsof -i :3030`
* Mata el proceso anterior: `kill <PID_DEL_PROCESO>` o `killall node` si es un proceso de Node.js.
