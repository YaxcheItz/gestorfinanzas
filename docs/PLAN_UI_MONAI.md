# Corrección de diseño: Kaptal con Inicio dominante

Correccion final del E2E remoto: esperar la respuesta HTTP del retiro antes de consultar saldos; tres repeticiones locales correctas. CI 275: cinco jobs verdes, unico fallo por esa espera en la prueba de metas. Revalidar el nuevo CI del PR #102. Comunicacion breve con Ponytail/Caveman; Graphify instalada sin grafo preparado, no se ejecuto; no se encontro una skill llamada agent-skills.


Tercera entrega de Etapa 11: metas propias con aportes/retiros por transferencias, cancelacion conservando fondos y respaldo v7; divisas con fuente manual y fecha aplicada en historial/CSV/respaldo. Revisadas liquidaciones y concurrencia existentes. Corregidas expectativas obsoletas del CI (respaldo y migraciones) y actualizado Vitest a 4.1.12; auditoria correcta. Frontend 382, build y cinco E2E distintos correctos; backend verify completo final: 509 ejecutadas, 503 correctas y 6 omitidas, sin fallos/errores. Consultar el resultado remoto actual de PostgreSQL/CI en PR #102 antes de integrar. Detalles en COMPARTIDO_DIVISAS_METAS_ETAPA_11.md. PR #102 sin integrar. Despues sigue Capacitor/APK; Gmail fuera.


Historico de la segunda entrega de Etapa 11: reparto de pareja por partes enteras, pesos e importes persistidos, respaldo v6/restauracion compatible con v1-v5 y migracion V11. Verificado: backend 493 correctas y 6 omitidas, frontend 382, build y E2E movil correctos. CI previo del PR #102 verde; nuevo CI/PostgreSQL pendiente de publicar esta ampliacion. Siguen pendientes divisas, metas y revision de liquidaciones; no cerrar Etapa 11. Gmail fuera.


## Prioridad vigente: Etapa 11 (2026-10-21)

Orden autorizado: **11 -> base Android con Capacitor y APK firmado descargable -> 10 sin Gmail -> 12 -> 13 -> revision final**. Etapa 9 completada provisionalmente por el propietario; sus pruebas fisicas pendientes se revisan al final, sin certificarlas ahora. APK directo, sin Play Store; widgets y ajustes rapidos requieren componentes Android. Gmail excluido. Comercializacion opcional.

Rama nueva `mejoras/compartido-divisas-metas` desde `origin/develop` actualizado `6775c1e`. PR #101 fue integrado en develop por el propietario durante el trabajo; rama actualizada con origin/develop `3af6e80`, sin integrar el PR #102. Primera entrega de Etapa 11: cambio de rol editor/lector por el propietario, manteniendo movimientos y saldos. Detalles y pendientes en [COMPARTIDO_DIVISAS_METAS_ETAPA_11.md](COMPARTIDO_DIVISAS_METAS_ETAPA_11.md). Los bloques de roles, partes, metas y divisas estan implementados. Revisar el CI actual y el PR #102 antes del cierre y de continuar con Capacitor/APK.

Los apartados siguientes son el historial anterior; prevalece este orden.

Seguimiento vigente 2026-10-21: Etapa 8 integrada por el propietario; continuar Etapa 9 en `mejoras/android-captura`, carpeta principal. Ver [entrega PWA y pendientes](ANDROID_CAPTURA_ETAPA_9.md) y el plan maestro. Las pruebas físicas anteriores siguen pendientes; Gmail deshabilitado.

Seguimiento PR: [#101 hacia develop](https://github.com/YaxcheItz/gestorfinanzas/pull/101), borrador de `mejoras/android-captura`. 381 unitarias frontend y tres E2E PWA correctas; CI remoto pendiente. Sin merge ni despliegue. PR #99 ya integrado por el propietario; los apartados siguientes son historia.

Seguimiento 2026-10-21: Etapa 8 preparada para PR a develop por autorización del propietario. 366 frontend, 485 backend correctas/6 omitidas; 22 E2E distintos entre regresión y conjunto final. Ver [informe](AUDITORIA_ETAPA_8.md) y [calendario](TARJETAS_CALENDARIO_MX.md). Android físico/producción autenticada pendientes; Etapa 9 después. Gmail deshabilitado.

Prioridad vigente (2026-10-20): solo WhatsApp como canal externo; Gmail deshabilitado y conciliación (Etapa 6) omitida. Sigue el asistente financiero con evidencias. El orden completo actualizado está al inicio de [PLAN_MAESTRO_KAPTAL.md](PLAN_MAESTRO_KAPTAL.md); las prioridades siguientes de este documento son históricas.

Cierre posterior: compactación de Inicio y estado de captura implementados. La secuencia funcional completa para retomar está en [PLAN_CONTINUACION_MONAI.md](PLAN_CONTINUACION_MONAI.md). La validación física sigue pendiente.

Especificación vigente del usuario, 14 de octubre de 2026. Corrige la misma entrega local en `mejoras/rediseno-integral-android`; no abre la etapa de automatizaciones. Los documentos anteriores que describen una barra inferior o estética carbón/verde quedan sustituidos por éste en cuestiones visuales.

## Objetivo y decisiones

Al abrir Inicio deben entenderse gasto, periodo, categorías y cómo registrar en menos de tres segundos. La referencia es el lenguaje visual descrito por el usuario: blanco, coral, emoji, barras pastel y controles contextuales. Se conserva Kaptal, el stack y la contabilidad. No se copian logos ni recursos de MonAi.

[Historial oficial consultado](https://get-monai.app/whats-new): confirma cambios de interfaz, búsqueda global y periodos flexibles; no supone que Kaptal ya tenga todas sus funciones. El diseño sigue la especificación proporcionada, sin depender de reproducir un efecto propietario del sistema operativo. Las medidas son objetivos de Kaptal, no valores oficiales extraídos de MonAi.

## Orden de trabajo de esta corrección

1. **Fundamentos:** tokens blanco/coral y oscuro neutro, sistema de fuente nativa, espaciado de 8 puntos, contraste, círculos/hojas y materiales de vidrio con alternativa opaca. Conservar preferencias de tema de cada usuario.
2. **Estructura:** retirar navegación inferior permanente. Cabecera contextual con acceso a Inicio, herramientas, historial y configuración; micrófono coral flotante y alternativa manual. Todas las rutas existentes siguen accesibles. «Personal» representa el espacio personal actual, no listas ficticias.
3. **Inicio:** total de gastos del periodo sobre el fondo, selector de moneda explícito, periodo, gráfico de gasto real por categoría incluso sin presupuesto y tres movimientos recientes. Vista detallada opcional para ingresos, balance del periodo y datos de cuentas. No confundir gasto, presupuesto y saldo bancario.
4. **Interacción:** barras estrechas redondeadas, emoji, importe fuera de la barra; tap abre movimientos filtrados y acción contextual abre hoja para captura/presupuesto. Selector de periodo en hoja con foco contenido, Escape y retorno de foco. Mostrar solamente opciones de periodo soportadas por la API actual.
5. **Coherencia:** filas sin tarjetas pesadas, categorías con emoji sin migrar datos, historial agrupado por día y moneda, buscador limpio; paneles de captura y formularios con estilo común. Ajustes organiza herramientas y preferencias sin rutas duplicadas en Inicio.
6. **Verificación:** probar Inicio simple/detallado, estados vacío/error/privacidad y categorías sin presupuesto. Probar captura manual/voz disponible, filtros, repetición, temas y navegación con teclado. Build, unitarias, E2E pertinentes y capturas en el servidor real 4300. No cambiar de etapa hasta revisar esta entrega.

## Fundamentos

| Token | Claro | Oscuro |
|---|---|---|
| Fondo | #FFFFFF | #000000 |
| Superficie secundaria | #F7F7F7 | #1C1C1E |
| Control | #F2F2F2 | #2C2C2E |
| Texto | #111111 | #FFFFFF |
| Texto secundario | #737373 | #A1A1A6 |
| Coral visual | #FF746B | #FF8A80 |
| Acción con texto pequeño | Coral oscuro para contraste | Coral claro con texto oscuro |
| Categorías | Verde, amarillo, naranja, rosa, azul y lavanda pastel | Mismos tonos sobre fondo neutro |

Fuente: `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, sans-serif; emoji del sistema. No descargar SF Pro ni añadir fuentes de procedencia dudosa. Números tabulares. Importe principal 48/52 px, reducido según ancho y longitud; títulos 28–30 px; filas 15–16 px; secundarios 12–13 px. Márgenes 20–24 px. Controles táctiles al menos 44 px; FAB 64 px. Hoja con radio 30 px. Safe areas mediante `env()`, sin reservar artificialmente 59 px en un navegador.

Vidrio sólo en controles flotantes: mezcla opaca legible, blur moderado y borde sutil. No apilar blur en contenido. Movimiento de entrada breve, respetando `prefers-reduced-motion`; ninguna función exige gesto oculto, haptic o animación para ser usada.

## Inventario de pantallas y alcance real

| Pantalla / componente | Resolución en esta entrega | Función adicional que queda para su etapa |
|---|---|---|
| Inicio simple | Gasto, periodo, barras, recientes, voz/manual | — |
| Inicio detallado | Métricas inline, saldo/deuda de cuentas separados | Previsión financiera |
| Periodo | Hoja accesible con mes, semana, hoy y rango real | Quincenas, año/todo y periodos de nómina con pruebas contables |
| Categorías del Inicio | Gasto real, tap filtra, hoja contextual | Compacción física del gráfico al scroll si no perjudica lectura |
| Historial | Filas ligeras, búsqueda/filtros existentes, totales del día por moneda en página cargada | Búsqueda por tags y totales completos del día desde servidor |
| Captura natural/voz | Mantener motor y propuestas confirmables, micrófono principal y alternativa manual | Autoguardado opcional y transiciones de campos reconocidos |
| Captura manual/detalle | Formularios existentes, hojas y controles coherentes | Nuevos campos sólo cuando exista modelo |
| Categorías | Emoji visible para códigos existentes; editor actual conservado | Presupuesto disponible dentro del selector |
| Presupuestos/detalle | Funciones actuales y acceso contextual desde Inicio | Umbrales configurables y navegación directa desde avisos |
| Recurrentes | Editor actual en Ajustes | Una instancia/futuras/todas, sin mutar historia |
| Listas | Acceso a personal y compartido real | Modelo de múltiples listas privadas/compartidas y monedas |
| Compartido | Experiencia actual conservada | Grupos arbitrarios, avatares e invitaciones por lista |
| Reportes | Gráficas actuales accesibles desde herramientas | Conversación con evidencias y filtros verificables |
| Asistente | Captura/consulta existente conservada | Respuestas financieras sustentadas en consultas específicas |
| Divisas | Monedas separadas; ninguna equivalencia inventada | Tipo de cambio, fecha y trazabilidad de conversión |
| WhatsApp | Configuración existente, sin prometer recepción donde no exista | Conexión y captura entrante de texto/audio |
| Apple Pay / notificaciones | Especificación en recon; sin controles ficticios | Integración por plataforma y consentimiento |
| Ajustes / cuenta | Temas, seguridad, respaldo y herramientas reales | Biometría nativa y bloqueo al volver del fondo |
| CSV | Importación/exportación existentes, errores reales | Importación de recurrencias y múltiples listas |
| Suscripción / prueba | No mostrar planes ni cobros ficticios en una app personal | Sólo si se decide comercializar |
| Onboarding | No bloquear usuarios actuales | Introducción contextual al terminar flujos definitivos |
| Widgets | No simularlos dentro de la web | Aplicación nativa: voz/presupuesto/compartido |
| Offline / pendientes | Mantener cola, confirmación y reintento actuales | Automatizaciones externas y conciliación multicanal |
| Loading / vacío / error | Mensajes breves, skeletons inline y reintento | — |
| Confirmaciones | Conservar confirmación de acciones irreversibles | — |

## Flujos de aceptación

- Inicio → micrófono → captura → propuestas → confirmar → Inicio actualizado. No iniciar grabación sin acción explícita ni autoguardar por cambiar de aspecto.
- Inicio → escribir → importe/categoría/cuenta → guardar → registro único. Alternativa usable sin micrófono y offline.
- Inicio → categoría → historial filtrado por categoría y fechas actuales. Ninguna cifra mezcla MXN con USD.
- Inicio → acciones de categoría → registrar o presupuesto. Long press tiene alternativa por botón y teclado; cerrar devuelve foco.
- Inicio → periodo → seleccionar/aplicar → gasto y gráfico del mismo rango. Presupuesto mensual se etiqueta como tal cuando se consulta fuera del mes completo.
- Inicio → detallado → saldo actual/deuda aparecen separados del flujo del periodo. Volver a simple elimina información secundaria, no los datos.
- Historial → búsqueda → filtros → detalle → repetir → confirmación. No saltos de layout ni guardados dobles.
- Privacidad oculta importes, alturas y valores accesibles. Datos vacíos o fallo analítico nunca se presentan como gasto cero conocido.

## Cierre y siguiente etapa

Documentar capturas, comandos y resultados efectivos; comprobar 4300 además de dist. No declarar terminadas listas, widgets, Apple Pay, periodos nuevos ni integraciones por haber diseñado sus pantallas. Después de revisar/integrar esta corrección, retomar la etapa funcional de captura automática descrita en `replica/monai-kesef/recon.md`, en rama nueva desde develop comprobado.

## Resultado de esta corrección

Aplicados los seis bloques dentro del alcance de funciones existentes. Las ampliaciones de la matriz siguen pendientes. Backend sin cambios nuevos en esta corrección.

- Build sin avisos: 457.76 kB iniciales; 275 pruebas frontend en 35 archivos.
- Dos E2E con backend aislado/H2: chat offline sin duplicados y repetición con monedas/cuentas; incluyen recuperación de Reportes ante error.
- Servidor real 4300: 161 comprobaciones Chromium, anchos 375/390/393/402/430 con alturas del brief y temas claro/oscuro. Estados vacío/error, privacidad, navegación contextual, periodo y preselección de categoría comprobados.
- Artefacto compilado: 130 comprobaciones, incluidos escritorio y recarga offline con cinco hojas de estilos en caché. Revisión adicional 393/1280: 64 comprobaciones de interacción, incluido cierre por clic de la captura.
- APIs sintéticas para la revisión visual; no equivale a probar datos privados, un Android físico ni integraciones externas. No hay nueva instalación, commit, push o despliegue.

Evidencia: [verificación](../replica/rediseno-integral/monai-final/verification.json), [Inicio claro 393](../replica/rediseno-integral/monai-interactions/screens/dashboard-393-CLARO.png), [Inicio oscuro 393](../replica/rediseno-integral/monai-interactions/screens/dashboard-393-OSCURO.png). Logs y capturas en esos directorios; las revisiones anteriores se conservan como historia.

Reproducir desde `frontend`: `npm run build`, `npm test -- --watch=false`, E2E con `E2E_FRONTEND_PORT=14220`. Para la revisión local, establecer `DESIGN_REVIEW_ORIGIN=http://localhost:4300`, `DESIGN_REVIEW_SKIP_SW=1`, `DESIGN_REVIEW_WIDTHS=375,390,393,402,430` y ejecutar `node scripts/review-design.mjs`. Sin origen/skip, el script sirve dist en un puerto temporal y comprueba también service worker. No lanzar un rebuild mientras se revisa dist.
