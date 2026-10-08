# Arquitectura móvil y privada de Kaptal

## Objetivo

Acercar Kaptal al flujo de MonAi: capturar gastos rápido desde el teléfono, entender texto natural, revisar cada movimiento antes de registrarlo y permitir una modalidad local que no dependa de iniciar sesión. La arquitectura debe explicar con claridad qué datos salen del dispositivo y conservar el libro financiero transaccional.

## Estado actual del repositorio

| Capa | Ya existe | Falta para cumplir el objetivo |
| --- | --- | --- |
| Cliente | Angular con rutas cargadas de forma diferida, PWA instalable, captura desde dashboard, dictado del navegador y avisos de conexión. | No son aplicaciones nativas. `SpeechRecognition` depende del navegador y no garantiza que el audio se procese localmente. No hay Apple Speech, Atajos de Apple Pay ni integración Android nativa. |
| Modo sin conexión | IndexedDB conserva movimientos pendientes de una cuenta autenticada y un catálogo limitado para reintentar la sincronización. | No es un perfil local independiente: saldos, historial, categorías y presupuestos no viven como una base de datos local completa. Tampoco equivale a cifrado local de datos financieros. |
| Comprensión de texto | OpenAI es el proveedor preferido; Groq y Gemini permanecen disponibles. Si falta la clave del proveedor preferido, el backend elige el primero configurado. Hay un comando exacto que usa diccionario y evita llamar al proveedor. El asistente puede preparar acciones pendientes y requiere confirmación. | El enrutamiento actual solo cambia de proveedor por configuración ausente; un error de red/cuota requiere reintento y no hace fallback en caliente. El diccionario cubre frases concretas, no la clasificación amplia de comercios. |
| Lotes de movimientos | La API y el chat ahora pueden devolver varias propuestas `CREATE_TRANSACTION`. El usuario confirma o descarta cada una. | La captura por voz del dashboard todavía rellena un formulario individual; no convierte una lista de voz en un lote. |
| Audio externo | Hay reconocimiento de voz del navegador en la web. | No hay endpoint de transcripción Whisper, carga de audio con Groq, fallback de transcripción a OpenAI ni flujo entrante de audio por WhatsApp. El proveedor Groq existente es de texto, no es Whisper. |
| Backend y base de datos | Spring Boot, PostgreSQL, JPA, autenticación, libro diario y operaciones financieras transaccionales. Hay configuración de Cloudflare para el despliegue del proyecto. | No es una arquitectura Appwrite Functions ni un backend que despierte por evento. Migrar sin una etapa de sincronización y conciliación pondría en riesgo las cuentas y los asientos existentes. |
| WhatsApp | Twilio puede enviar recordatorios salientes. | No existe un webhook entrante para mensajes o audios, ni emparejamiento con usuario, cuenta y zona horaria. |
| Reportes conversacionales | El asistente responde con contexto financiero y puede preparar cambios. | No hay conversaciones persistidas con metadatos de título/icono ni un módulo separado de reportes IA. |

## Cambios implementados en esta etapa

- OpenAI queda como proveedor preferido (`AI_PROVIDER=openai`) con `OPENAI_API_KEY`, `OPENAI_API_URL` y `OPENAI_MODEL`. Si no hay clave OpenAI, se selecciona Gemini si su clave ya está configurada, y después Groq. No se escribió ninguna clave real en el repositorio ni se modificó el `.env` local.
- El chat admite hasta ocho propuestas separadas de movimientos cuando el usuario enumera varios gastos o ingresos. Cada propuesta se valida como `CREATE_TRANSACTION` y necesita confirmación individual antes de ejecutarse.
- El dashboard y el menú móvil siguen siendo una PWA; estos cambios no anuncian como local una transcripción que el navegador podría procesar fuera del dispositivo.

## Secuencia recomendada

1. Configurar y verificar una clave del proveedor elegido en el entorno del backend; antes de transmitir contexto financiero, controlar el consentimiento y documentar qué proveedor procesa los datos. El selector permite fallback solo cuando falta una clave, no cuando el servicio falla.
2. Implementar transcripción de audio en memoria con límites de tamaño, validación de formato y Groq Whisper como primer proveedor; usar OpenAI como fallback. No escribir audio en logs, archivos temporales ni base de datos. El borrado de buffers en una JVM no garantiza eliminar todas las copias internas de memoria.
3. Crear un perfil local independiente con IndexedDB y cifrado WebCrypto, importación/exportación y una ruta explícita de sincronización. Definir cómo manejar conflictos antes de mezclar los datos locales con PostgreSQL.
4. Envolver la interfaz con Capacitor si se confirma que se requieren binarios nativos. Añadir Apple Speech/Atajos y almacenamiento seguro de iOS; añadir almacenamiento SQLite y permisos Android. La PWA seguirá siendo la versión web.
5. Añadir el webhook entrante de WhatsApp después de diseñar el emparejamiento. Verificar la firma de Twilio, enlazar el remitente de forma inequívoca y pedir confirmación antes de insertar movimientos dudosos.
6. Diseñar reportes guardados y decidir la retención de chats. Appwrite puede ser una alternativa de infraestructura, pero primero debe hacerse una migración ensayada con exportación, conteo, conciliación del libro diario, vuelta atrás y residencia elegida. La región Frankfurt ayuda a fijar residencia de datos; por sí sola no acredita cumplimiento GDPR.

## Datos y límites de seguridad

- Nunca exponer claves de OpenAI, Groq o Twilio en Angular. Todas las solicitudes de proveedor salen del backend.
- El modelo genera propuestas, no movimientos ya confirmados. La ejecución pasa por los servicios financieros existentes.
- El audio externo necesita consentimiento explícito y una política visible de tratamiento y retención. “No guardarlo en una tabla” no garantiza por sí solo que ningún intermediario conserve datos.
- La ubicación Frankfurt es una decisión de residencia. Deben revisarse contrato, subprocesadores, acceso, transferencias internacionales y obligaciones legales antes de afirmar cumplimiento.
- Mantener PostgreSQL como fuente de verdad mientras se construye y verifica una migración reversible.
