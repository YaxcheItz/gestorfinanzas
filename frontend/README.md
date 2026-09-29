# Frontend

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.0.6.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Probar en un celular dentro de la red local

Conecta la computadora y el celular a la misma red Wi-Fi. En Windows, ejecuta `ipconfig` y usa la dirección IPv4 del adaptador Wi-Fi (por ejemplo, `192.168.0.14`), no la de un adaptador virtual o desconectado.

Conserva el backend ejecutándose en el puerto `8080` con sus variables de entorno habituales. Desde `frontend`, inicia Angular con:

```bash
npm run start:lan
```

Abre `http://192.168.0.14:4200` en el celular, reemplazando la IP por la dirección actual del adaptador Wi-Fi. Si Windows Firewall lo solicita, permite Node.js en redes privadas. Angular reenvía las llamadas del API al backend local en el puerto `8080`, por lo que no es necesario exponer ese puerto en la red.

## Configurar la conexión del asistente IA

El proveedor Gemini se configura únicamente en el backend. Copia `backend/.env.example` como `backend/.env`, agrega tu clave en `GEMINI_API_KEY` y no compartas ni subas ese archivo a Git. También puedes definir la variable de entorno en la terminal del backend antes de iniciarlo:

```powershell
$env:GEMINI_API_KEY="tu-clave"
```

Al entrar en **Asistente IA**, Kaptal consulta el estado del proveedor y prueba la conexión automáticamente. No hay un botón de prueba manual. El modelo principal predeterminado es `gemini-2.5-flash`; si responde con límite de solicitudes (HTTP 429), el backend intenta automáticamente `gemini-flash-lite-latest`. Puedes cambiar los modelos con `AI_MODEL` y `AI_FALLBACK_MODEL`; el respaldo debe estar disponible y tener cuota en tu proyecto de Google AI Studio. Si ambos modelos alcanzan su límite, Kaptal muestra un error para intentar más tarde. Cada mensaje y el historial reciente se envían a Gemini junto con un resumen financiero y opciones para identificar cuentas, categorías, movimientos recientes, presupuestos y plantillas recurrentes. Gemini puede proponer consultas o acciones sobre movimientos, cuentas, categorías, presupuestos y recurrencias; las acciones se muestran en el mismo chat y requieren confirmación explícita antes de ejecutarse. Los borrados requieren una segunda confirmación. El backend vuelve a validar cada operación con las reglas y permisos normales de Kaptal. Las propuestas pendientes expiran después de diez minutos y las conversaciones se conservan solo en memoria del frontend mientras permanezca abierta la pantalla.

No escribas datos que no quieras enviar al proveedor Gemini configurado. La clave de Gemini permanece exclusivamente en el backend; los datos financieros se envían al proveedor para responder a la conversación y preparar acciones, pero no se manda la clave al navegador.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
