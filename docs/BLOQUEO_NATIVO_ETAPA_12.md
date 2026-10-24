# Bloqueo local de Kaptal en Android — Etapa 12

## Alcance

Opción voluntaria en Configuración → Seguridad → «Bloquear Kaptal al salir», desactivada inicialmente. Android 11 o posterior con bloqueo de pantalla configurado. La autenticación usa `BiometricPrompt` del sistema con biometría fuerte o credencial del dispositivo; Kaptal no recibe ni almacena la huella, PIN, patrón o contraseña de Android. No añade dependencias.

Activar y desactivar requieren una comprobación del sistema. Cancelar no confirma el cambio: la interfaz permite consultar el estado real antes de reintentar. La preferencia es privada y por instalación/dispositivo, también aplicable a la pantalla de acceso; no es una preferencia por cuenta financiera. Web y Android anteriores no ofrecen un bloqueo simulado.

Cuando está habilitado, el arranque, recreación y retorno del fondo abren directamente el diálogo de autenticación Android, como al activar la opción. La WebView queda invisible para interacción y accesibilidad, se oculta el teclado y se protege la ventana/Recientes. La cobertura opaca usa el logo de Kaptal y colores claro/oscuro de la app; oculta sus controles mientras está el diálogo y permite reintentar tras cancelar, sin bucles. Es desplazable para conservar acceso con letra grande o en horizontal. La preferencia independiente de capturas se restaura al desbloquear; la interfaz reconcilia el estado efectivo mediante un evento nativo.

El bloqueo no llama al cierre de sesión ni modifica tokens, recepción, colas o configuración bancaria. No sustituye el cifrado de datos ni promete resistencia frente a un dispositivo comprometido. Si no puede leer la preferencia, conserva el bloqueo. Si Android deja de ofrecer autenticación, no desbloquea automáticamente y proporciona acceso a sus ajustes de seguridad.

Cada intento pertenece a una Activity viva; cancelación, destrucción o un intento posterior invalidan callbacks anteriores. La autorización se consume una sola vez. El retorno del diálogo de credenciales puede completarse al reanudar la Activity, con una autorización efímera de cinco segundos; no se guarda una aprobación en disco.

## Evidencia y límites

- Pruebas escritas antes de la implementación: fallos iniciales por ausencia del controlador de autorización y contrato frontend conservados en evidencia local.
- 443 pruebas frontend correctas, diez E2E locales correctos y build web/release correcto. Lint y pruebas JVM Android correctos; seis pruebas específicas de autorización cubren reutilización, cancelación, callback anterior, retorno, expiración/destrucción y diálogo automático sin bucles.
- Dos instrumentadas correctas en Samsung, repetidas tras el fondo nuevo: arranque, retorno y recreación bloqueados con WebView invisible y flag seguro, sesión intacta y preferencia de capturas conservada; regresión del puente de privacidad correcta. Solo paquete de pruebas; preferencias restauradas, instrumentación retirada y debug detenida.
- APK 0.1.10/código11 instalada como actualización con firma original y fecha de instalación conservadas. El propietario confirma cancelación sin activación, activación, apertura automática del diálogo al volver, fondo Kaptal y acceso normal. Cancelar con el bloqueo activo conserva el fondo bloqueado y permite reintentar sin bucles ni mostrar datos.
- El piloto bancario permanece pendiente del próximo aviso habitual. No se generan compras, eventos productivos ni usuarios QA. Gmail permanece deshabilitado.

## Referencias oficiales

- [BiometricPrompt de Android](https://developer.android.com/reference/android/hardware/biometrics/BiometricPrompt): diálogo del sistema y callbacks.
- [Autenticadores permitidos](https://developer.android.com/reference/android/hardware/biometrics/BiometricPrompt.Builder#setAllowedAuthenticators(int)): combinación disponible desde API30; credencial del dispositivo sin botón negativo adicional.
- [Disponibilidad del autenticador](https://developer.android.com/reference/android/hardware/biometrics/BiometricManager): comprobar soporte antes de solicitar autenticación.
- [FLAG_SECURE](https://developer.android.com/reference/android/view/WindowManager.LayoutParams#FLAG_SECURE): protección de la ventana, separada del bloqueo de acceso.
