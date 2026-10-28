# Kaptal: plan maestro y traspaso al siguiente chat

## Avance vigente: Amex/Revolut, IA gratuita y consumo publicados

- **Código/integración:** #151/#152/#153/#154/#156 integradas. Base funcional de develop `1bfe913452f7a5632bc99593aaec1628abb1ae27`. Promoción #155 integrada a main `5bc2ae6e2a8fbeb04e174740ad9639a73593619b` tras CI462/40702370571, CI463/40702401683 y Android98/40702401961 SUCCESS, quince checks y Vercel correctos. Main posterior CI464/40704414478, Android99/40704414412 y KeepWarm160/40704462252 SUCCESS. Cierre de documentación/aislamiento en rama nueva `correcciones/aislar-ia-pruebas`; HEAD/CI/integración exactos en `.local/ampliacion-cierre.json`, separados de producción.
- **Producción:** Render7387852850 y VercelProduction7387867984 SUCCESS para main5bc2ae6. Verificación pública 2026-10-28T14:24:17.198Z:66JS/CSS/manifiesto correctos, health HTTPS directo/proxy UP y Google con cliente habitual correcto. Siete estáticos contrastados con bytes canónicos de Git: diferencia local CRLF/LF, contenido servido exacto; primer diagnóstico conservado. V11–V14 verificadas en transacción de solo lectura a2026-10-28T14:22:54.539099+00:00, sin migración nueva. Evidencias `.local/avisos-formatos-production-result.json`, `ampliacion-static-asset-verification.json`, `ampliacion-deployments.json` y `ampliacion-schema-after.json`.
- **Respaldo:** `.local/promotion-20261028T141645Z/before-main.dump.dpapi`, extracción de origen de solo lectura, cifrado DPAPI, descifrado/hash/catálogo comprobados; no restauración productiva. Publicación permanentemente autorizada tras checks, sin otra aprobación; no destrucción/restauraciones.
- **Comportamiento bancario:** Amex extrae comercio del título normalizado y compra del cuerpo, sin sumar el total diario; respeta rechazos/códigos y restricciones de tarjeta. El formato sin tarjeta exige una asociación única sin terminación configurada; no retirarla automáticamente. Revolut registra INGRESO MXN únicamente con opción consentida guardada por conexión; no se activa por actualizar. Envía descripción fija sin remitente y nunca categoría de gasto. Guardar asociaciones intactas conserva IDs/categorías fijas, Sears física/digital y destinos. UberEats→Comida, Uber→Transporte, conservando desconocidos/ambiguos/intermediarios y correcciones; sin reclasificar historia.
- **IA/operación:** solo proveedores/modelos/orígenes aprobados de Groq/Gemini, cuentas Free sin facturación confirmadas por propietario, no verificadas por API. Transporte OpenAI y fallback de audio de pago retirados. Preferencia GroqGPT-OSS20B; Gemini3.5Flash-Lite con enum REST canónico MINIMAL y respaldo fijo permitido. Presupuesto conjunto opcional de intentos HTTP con PostgreSQL, sin fallback a memoria si es positivo; predeterminado-1respeta cuotas Free sin inventar tope. Resumidor formato3 separa generaciones, intentos, señales de presupuesto, tokens reportados y respuestas sin contadores. No estima facturas ni suma dos veces razonamiento; no logs de texto/identidades.
- **Pruebas/aislamiento:**593casos backend de funciones sin fallos/errores, ocho PostgreSQL reservados y comprobados en CI;40focales IA,14Python,20registros ficticios Java→Python correctos. Corrección REST:20focales correctas. Nueva protección del perfil test:595casos locales sin fallos/errores con ocho PostgreSQL reservados para CI. Vacía claves/desactiva proveedores en tests Spring, incluso con nombres de variables heredadas. **Incidente inicial documentado:** la primera suite bancaria heredó una clave Gemini y registró tres generaciones con datos H2 ficticios; su coste no se verificó. No afirmar cero llamadas externas para toda la sesión. Ejecuciones posteriores aisladas; evidencia `.local/test-isolation-incident.json` y `docs/AISLAMIENTO_IA_EN_PRUEBAS.md`. Sin escrituras financieras productivas.
- **APK/dispositivo:** APK0.1.16/código17 final preparada en `.local/releases/Kaptal-0.1.16.apk` y Descargas; SHA256 `18702AB6D3323C3D15AE6FF465F42B9BD0BCC55F78E11BFD76E771A548DF375C`, firma habitual verificada.25unitarias Android/lint/release correctos. **No instalada:** teléfono desconectado por propietario y ADB vacío; última instalación productiva comprobada0.1.15/código16. Veinte Store/Worker físicos previos pertenecen al build anterior97DA6A7F, no al final. No pedir reconexión ni repetir login/bloqueo/reinicio por rutina para seguir trabajo independiente.
- **Evidencia real/pendientes:** recuperación previa Santander ya confirmada una vez/cuenta correcta, sin guardar manualmente. Formatos nuevos y primera categoría real aún esperan avisos habituales futuros tras instalar/configurar; no importar ejemplos, comprar para probar o recuperar descartados. Metadatos reales de IA se observarán durante uso habitual, sin generaciones de QA. Etapa13 sigue abierta para cuotas efectivas por cuenta, duración de audio reportada, p95 representativo y operación/recuperación restante; no confundir reglas/H2/CI con producción física.
- **Plan/diseño:** sección20 reescrita con orden vigente y sin Gmail como siguiente paso. Revisar categorías como función sin reclasificar historia; diseño completo al final con propietario, sección por sección, incluidas etiquetas. Santander solo gastos; Sears física/digital/asociaciones conservadas; Gmail deshabilitado, Desktop intacto y TalkBack omitido. No activar cobros/proveedores de pago por defecto.

Siguiente: comprobar cierre exacto en `.local/ampliacion-cierre.json` y `.local/CONTINUAR_IA_GRATUITA_ETAPA_13.md`; continuar pendientes operativos/funcionales de Etapa13 en otra rama desde develop remoto actualizado/comprobado. APK e ingresos consentidos guardados se completan cuando vuelva el teléfono, sin bloquear el resto.

## Avance vigente: contrato REST de Gemini y publicación conjunta

- #154 integrada desde278bdb27691dd147eadaf64216353ac93894e591 a develop71adde0cbfb31d35e4bea3fe1f4529000305fb67 tras CI456/40697652485 y CI457/40697808229 SUCCESS, catorce checks y Vercel correctos. Consumo reportado de tokens y resumidor formato3 ya integrados; fuentes #151/#152/#153 también integradas. Promoción conjunta #155 creada hacia main y mantenida en borrador mientras termina este ajuste de protocolo.
- Rama independiente `correcciones/gemini-thinking-rest`, desde develop remoto71adde0 comprobado. La referencia oficial de GenerateContent define ThinkingLevel con enum `MINIMAL`: se usa su representación canónica en REST y se comprueba el JSON con HTTP simulado. Veinte pruebas focales Gemini/metadatos correctas; sin peticiones reales, otros modelos, cambios de cuotas, dependencias, migraciones ni otra APK. Tras integrar, actualizar #155 desde develop y exigir checks del nuevo HEAD antes de publicar.
- Teléfono desconectado por el propietario y ADB sin dispositivos. APK0.1.16/código17 final preparada, no instalada; SHA25618702AB6D3323C3D15AE6FF465F42B9BD0BCC55F78E11BFD76E771A548DF375C, misma firma, en `.local/releases/Kaptal-0.1.16.apk` y Descargas. Instalación y activación de ingresos MXN guardados quedan para cuando vuelva el teléfono, sin bloquear backend/CI/publicación. No repetir el gasto de Santander ni hacer compras de prueba.
- Producción anterior main18b721b revalidada2026-10-28T13:36:39.214Z:65estáticos, health directo/proxy y Google correctos; Render7369733828 y VercelProduction7369749846 siguen SUCCESS para ese SHA. Publicación conjunta todavía pendiente; nuevos estaticos esperados66archivos. Respaldo DPAPI fresco, esquema de solo lectura y verificación servida se harán tras checks, sin restauraciones. Autorización permanente de producción vigente, sin pedir otra aprobación.
- Etapa13 conserva IA gratuita confirmada por propietario, sin API OpenAI/fallback de pago, presupuesto opcional compartido y consumo de tokens reportado sin datos privados. Pendientes: observación habitual, cuotas efectivas, duración audio reportada, p95 representativo y recuperación/operación restante. Diseño completo al final con propietario por secciones, incluidas etiquetas. Santander solo gastos; Sears física/digital/asociaciones conservadas, Gmail deshabilitado, Desktop intacto, TalkBack omitido. No QA financiera productiva, destrucción ni recuperación de descartados.

## Avance vigente: Etapa13, consumo de tokens reportado

- **Parte nueva:** rama independiente `mejoras/etapa-13-consumo-tokens-ia`, creada desde develop remoto/CI comprobado d9e00cb y actualizada con #153. Solo contadores de la respuesta recibida de Groq/Gemini; entrada/salida/total validados, sin estimar tokens por caracteres ni dinero por llamadas. Ausentes/inválidos→desconocidos; cero solo si vino explícito. Gemini conserva total incluyendo razonamiento sin doble suma. Logs sin prompt, respuesta, identidad, modelo, URL, ID ni contenido bancario. Ver `docs/CONSUMO_TOKENS_IA_ETAPA_13.md`.
- **Consumo y presupuesto:** resumidor formato3 agrega tokens reportados y respuestas sin contadores, separadas de generaciones, intentos HTTP y alertas del presupuesto conjunto. No equivalen a factura ni a un movimiento guardado. No nuevos proveedores/peticiones/SDKs/endpoints/migraciones ni otra APK. Se mantiene política de IA gratuita y retirada del fallback de pago de #152. Propietario confirmó Groq/Gemini Free sin facturación; los paneles no se verificaron por API.
- **Validación:**40focales backend correctas (13nuevas de consumo),593casos backend locales sin fallos/errores con ocho PostgreSQL reservados para CI,14Python correctas. Proveedores HTTP simulados y claves retiradas del proceso local. No generaciones reales para QA ni escrituras financieras productivas. HEAD/CI/PR/integración y producción exactos en `.local/ia-tokens-delivery.json` y `.local/CONTINUAR_IA_GRATUITA_ETAPA_13.md`; confirmar al retomar.
- **Integraciones previas:** #151 (Amex/Revolut/categorías) y #152 (IA gratuita/presupuesto) integradas con checks exactos correctos. #153 integrada desde3661ba53a14f6e5d1b4dc90b08953340433d6714 a develop4da42bad7a914a6ed966604323c24c3d0bbd9a75 tras CI453/40695723340, CI454/40695770934 y Android95/40695771111 SUCCESS; quince checks y Vercel correctos. Normaliza títulos Amex antes de rechazo/códigos/comercio. Comprobación posterior de develop se registra aparte.
- **APK/dispositivo:** teléfono desconectado por propietario y ADB vacío. APK0.1.16/código17 final preparada en `.local/releases/Kaptal-0.1.16.apk` y Descargas, SHA25618702AB6D3323C3D15AE6FF465F42B9BD0BCC55F78E11BFD76E771A548DF375C, misma firma;25unitarias Android/lint/release correctos. No instalada. Última versión física comprobada0.1.15/código16; veinte Store/Worker físicos anteriores pertenecen al build previo, no al final. No bloquear trabajo independiente ni pedir reconexión por rutina.
- **Bancos:** compras Amex sin sumar total diario; formato sin tarjeta solo con asociación única y sin terminación configurada, sin retirar restricciones automáticamente. Ingresos Revolut MXN autorizados, pero requieren opción nativa guardada: actualizar no la activa en conexiones antiguas. Fuente de categoría por comercio con UberEats→Comida, Uber→Transporte; respeta categorías fijas, archivadas y correcciones manuales. No importa ejemplos ni reclasifica historia. Observación real de formatos/categorías pendiente de avisos habituales futuros; no compras de prueba ni recuperación de descartados.
- **Producción:** antes de publicación conjunta seguía main18b721b; publicarla solo tras checks correctos, con respaldo DPAPI fresco/solo lectura, esquema y assets verificados. Publicación permanentemente autorizada sin otra aprobación; no destrucción ni restauración. Registrar main/CI/Render/Vercel/health/Google/estáticos separados de APK y evidencia bancaria real.
- **Siguiente:** completar entrega conjunta; observar uso habitual de tokens/formatos sin provocar llamadas o compras. Etapa13 mantiene cuotas efectivas por cuenta, duración audio realmente reportada, p95 representativo y operación/recuperación restante. Revisar categorías como función, sin reclasificación histórica ni aprendizaje supuesto. Diseño completo al final con propietario, sección por sección (incluidas etiquetas). Santander solo gastos; Sears física/digital/destinos conservados; Gmail deshabilitado, Desktop intacto, TalkBack omitido.

## Avance vigente: cierre de Amex/Revolut e IA gratuita

- #151 integrada a develop78dff7e306f56cdf3b16b523655b9a9b3ec218c8 desde65ba9f033a6e236daeae7d560fd929a9cb768036, con quince checks correctos. CI447/40616344549, CI448/40616347965 y Android93/40616347928 SUCCESS; CI449/40617349299 y Android94/40617349357 posteriores SUCCESS, ocho checks y Vercel correctos.
- #152 integrada desde21e112d34956b1a924f6b59da06bb2814ff159d0 a developd9e00cb4a5e6341b1c92b3553776eb11e906071f después de CI450/40618538024 y CI451/40618577043 SUCCESS, catorce checks y Vercel correctos. Política solo IA gratuita: Groq/Gemini Free sin facturación confirmados por propietario, transporte OpenAI y fallback de audio de pago retirados. Presupuesto global opcional, intentos y señales agregadas; tokens reales/p95/cuotas efectivas siguen pendientes. Ver `docs/IA_GRATUITA_PRESUPUESTO_ETAPA_13.md`.
- Revisión final en rama independiente `correcciones/amex-titulo-seguro`, creada desde develop78dff7e remoto/CI comprobados y actualizada con developd9e00cb: normalizar espacios, saltos de línea y espacios Unicode del título antes de comprobar rechazos/códigos/comercio. Regresión reproducida,25unitarias Android correctas, lint y release firmada correctos. No cambio de asociaciones, formato de cola ni backend. Integración/publicación exactas en las continuaciones y entregas JSON privadas.
- APK final preparada0.1.16/código17, SHA256 `18702AB6D3323C3D15AE6FF465F42B9BD0BCC55F78E11BFD76E771A548DF375C`, firma habitual conservada. Sustituye la preparación anterior97DA6A7F, que se archiva como anterior al endurecimiento del título. **No instalada:** propietario desconectó el teléfono; ADB sin dispositivos. Última instalación productiva comprobada0.1.15/código16; veinte Store/Worker físicos previos pertenecen al build anterior y no acreditan la APK final. No pedir reconexión para seguir backend/CI/producción.
- American Express reconoce comercio en título y compra en cuerpo, sin sumar el total diario. Si no hay tarjeta en el aviso, exige una asociación única sin terminación configurada; no retirar una restricción existente automáticamente. Revolut puede registrar INGRESO MXN con opción guardada expresamente; actualizar no activa ingresos en conexiones antiguas. No importar los ejemplos del chat ni historia, ni recuperar descartados. La primera observación real de categoría/formatos nuevos queda pendiente de avisos habituales futuros, sin compras para probar.
- Antes de la publicación conjunta, main18b721b y comprobación pública2026-10-28T01:22:47.422Z correctos; respaldo `.local/promotion-20261028T013820Z/before-main.dump.dpapi` comprobado y V11–V14 verificadas en solo lectura, sin migraciones nuevas. Producción e instalación se revalidan por separado. Publicación permanentemente autorizada tras checks; no acciones destructivas ni restauraciones.
- Siguiente: terminar CI/integración/publicación conjunta y documentar HEAD exactos. Continuar pendientes operativos Etapa13 (tokens/duración audio reales, cuotas efectivas, p95 representativo y operación/recuperación) en otra rama desde develop actualizado/comprobado. Revisión funcional de categorías sin reclasificar historia; diseño completo al final con propietario, por secciones, incluidas etiquetas. Santander solo gastos; Sears física/digital y destinos conservados. Gmail deshabilitado, Desktop intacto, TalkBack omitido, sin QA financiera productiva ni llamadas de pago.

## Avance vigente: Etapa13, IA gratuita y presupuesto conjunto

- **Decisión vigente:** el propietario exige usar solo IA gratuita y confirmó Groq/Gemini en Free sin facturación activada. No es una verificación automática de sus paneles. Investigación oficial en `docs/IA_GRATUITA_PRESUPUESTO_ETAPA_13.md`: GroqGPT-OSS20B como preferencia rápida, Gemini3.5Flash-Lite estable como alternativa, WhisperTurbo de Groq para audio. Cerebras descartado por prueba temporal sin cuota gratuita permanente. Velocidades publicadas no equivalen a latencia de Kaptal.
- **Código:** rama independiente `mejoras/etapa-13-presupuesto-global-ia`, creada desde develop remoto comprobadoe919644 y actualizada con develop78dff7e de #151. Política previa a cada HTTP para proveedores/modelos fijos/orígenes oficiales; API OpenAI deshabilitada sin transporte y fallback de audio de pago retirado, aunque exista una clave antigua. Conserva reglas locales, categorías sin IA y capturas nativas. Sin proveedor/dependencia/migración nueva.
- **Presupuesto/consumo:** contador opcional conjunto para usuarios/instancias/proveedores/audio/fallbacks, reutiliza PostgreSQL y falla cerrado sin almacén compartido o ante indisponibilidad. `AI_GLOBAL_REQUEST_LIMIT_24H=-1` respeta cuotas Free sin inventar un tope;0bloquea;positivo requiere `ABUSE_LIMIT_STORE=postgres`, ventana24h desde primera reserva. Cada intento cuenta antes de HTTP, sin reembolso por error. Logs/sumario agregado distinguen generaciones, intentos externos y avisos operativos, sin cuerpos/identidades. No calcula tokens ni facturas a partir de conteos; no envía alertas externas.
- **Pruebas locales:**579casos backend sin fallos/errores, ocho PostgreSQL reservados para CI;27focales finales y11Python correctas. HTTP simulado comprueba cuotas antes de cada intento de Gemini, cero llamadas con bloqueo, no fallback de audio a OpenAI y borrado del audio. Sin peticiones reales de proveedores para QA. CI/HEAD/PR/integración y despliegue en `.local/ia-gratis-budget-delivery.json` y `.local/CONTINUAR_IA_GRATUITA_ETAPA_13.md`; revalidar antes de asumir.
- **Parte bancaria previa:** #151 integrada desde65ba9f033a6e236daeae7d560fd929a9cb768036 a develop78dff7e306f56cdf3b16b523655b9a9b3ec218c8 tras CI447/40616344549, CI448/40616347965 y Android93/40616347928 SUCCESS; quince checks y Vercel correctos. CI449/40617349299 y Android94/40617349357 posteriores se verifican aparte. Amex toma compra sin sumar total diario; UberEats→Comida y Uber→Transporte. Ingreso Revolut requiere consentimiento MXN guardado; conexiones anteriores no lo activan por actualizar. IDs/destinos/categorías fijas y Sears física/digital conservados.
- **Producción/APK, estados separados:** antes de publicar estas partes, main18b721b y comprobación pública de categorías2026-10-28T01:22:47.422Z correctos. APK0.1.16/código17 preparada con firma habitual, SHA25697DA6A7F37AD925EE2DA8891964A603AE75221E96F2BDC689CA7BDBD5488592B; veinte instrumentadas Store/Worker en Samsung debug aislado correctas. Instalación productiva se comprueba aparte; esta parte de IA no requiere otra APK. Respaldo previo `.local/promotion-20261028T013820Z/before-main.dump.dpapi` cifrado/descifrado/hash/catálogo comprobados, sin restaurar; V11–V14 verificadas de solo lectura.
- **Siguiente funcionalidad:** completar entrega/producción/instalación, activar opción de ingresos con asociaciones conservadas y observar avisos habituales futuros de Revolut/Amex/categorías, sin compras de prueba ni recuperar descartados. Etapa13 sigue abierta para tokens/duración de audio reales, cuotas efectivas, p95 representativo y operación/recuperación restante. Categorías: revisión de nombres/organización/archivado/corrección sin reclasificar historia ni aprendizaje supuesto.
- **Diseño al final con el propietario:** Inicio, captura, Movimientos, cuentas, categorías, presupuestos/recurrencias, listas/etiquetas, reportes, Avisos, asistente y ajustes, sección por sección. Mantener diseño completo separado de correcciones funcionales; explicar/simplificar etiquetas. Santander solo gastos, Sears física/digital conservados; Gmail deshabilitado, Desktop intacto y TalkBack omitido. Sin QA productiva, destrucción, restauración o llamadas de pago. Producción permanentemente autorizada tras checks, sin otra aprobación.

Siguiente: consultar `.local/CONTINUAR_IA_GRATUITA_ETAPA_13.md` y ambas entregas JSON; verificar HEAD/CI/producción/APK/dispositivo por separado. Cada parte nueva en otra rama desde develop remoto actualizado y comprobado.

## Avance vigente: formatos American Express e ingresos Revolut

- Rama nueva `mejoras/avisos-amex-revolut` desde develop remoto limpio `e9196445af8377eb42f825a1a062d9dcbc4af120`. GitHub revalidado: #150 MERGED y CI444 SUCCESS; main `18b721bca501f38780e0663454515f482f6a624c`, CI442/Android91 SUCCESS. Health directo/proxy, Google y65estáticos correctos a2026-10-28T01:22:47.422Z. Samsung SM-A546E conectado,0.1.15/código16 y primera instalación conservadas antes de esta entrega.
- American Express: comercio en título, importe de compra en cuerpo, total diario informativo; formato sin tarjeta requiere asociación única sin terminación. No debilitar una restricción de tarjeta configurada. Uber Eats→Comida; Uber→Transporte, preservando desconocidos/ambiguos/intermediarios y decisiones manuales.
- Revolut: propietario autorizó ingresos y confirmó MXN. Campo opcional `ingresosMxn` por regla, false en conexiones anteriores. Parser nativo exige formato completo/paquete oficial; descripción enviada fija sin remitente. Backend verifica consentimiento y cuenta de débito MXN. No transformar ingreso en compra ni asignar categoría de gasto. Santander sigue solo gastos.
- Asociaciones: guardar sin cambiar proveedor/origen/tarjeta/cuenta/lista conserva IDs y categorías fijas. Sears física/digital conservados. Nuevos ingresos solo con opción expresamente activada; reconectar no amplía consentimiento. Sin migración ni dependencias nuevas.
- Validación local:568casos backend sin fallos/errores, ocho PostgreSQL reservados para CI;462frontend iniciales;16instrumentadas Store iniciales en Samsung debug aislado; cinco E2E de interfaz sobre build productivo. Android unitarias/lint/debug/instrumentación/release correctos. Comprobaciones finales, HEAD/CI/PR/integración y publicación en `.local/avisos-formatos-delivery.json` y `.local/CONTINUAR_AVISOS_AMEX_REVOLUT.md`; no confundir estos estados.
- APK0.1.16/código17 preparada, firma habitual; SHA256 `97DA6A7F37AD925EE2DA8891964A603AE75221E96F2BDC689CA7BDBD5488592B`. Instalación productiva y observación bancaria real se comprueban aparte. Ejemplos del chat no se importan; no compras de prueba, QA productiva ni recuperación de descartados.
- Revisión del plan: categorías automáticas base ya publicadas; esta entrega corrige el formato y la actividad demostrados. Queda revisión funcional de organización/nombres/archivado/corrección, sin reclasificar historia ni aprendizaje automático. Después Etapa13: presupuesto global de IA distribuido, consumo/tokens/costes y alertas. El router actual cubre generaciones, mientras audio transcribe por otra ruta: censar ambos antes de prometer presupuesto global. No inventar precios ni cuotas.
- Diseño completo al final con el propietario: Inicio, captura, Movimientos, cuentas, categorías, presupuestos/recurrencias, listas/etiquetas, reportes, Avisos, asistente y ajustes, sección por sección. Explicar/simplificar etiquetas. Accesibilidad restante vigente con TalkBack omitido. Gmail deshabilitado y Desktop intacto. Publicación permanentemente autorizada tras checks; no destrucción ni restauraciones.

Siguiente: comprobar cierre de esta entrega y continuar Etapa13 en otra rama desde develop remoto actualizado. Leer `docs/AVISOS_AMEX_REVOLUT.md`, categorías y la continuación local. Mantener separados fixture/CI/PostgreSQL/producción/APK/dispositivo/observación real.

## Avance vigente: categorías de compras automáticas publicadas

- **Código e integración:** fuente `1ba0725163af70d782c6383b7632fad53bc686c7`, #148 integrado a develop `eebe55d9f96491a82e7ba2f273f7607990c599fc` tras CI438/40575724417, CI439/40575773362 y Android88/40575773500 SUCCESS, catorce checks y Vercel correctos. Promoción #149 integrada después de CI440/40577476124, CI441/40577522771 y Android89/40577475831/90/40577522624 SUCCESS, quince checks y Vercel correctos. Main publicado `18b721bca501f38780e0663454515f482f6a624c`. Seguimiento posterior CI442/40579201303 y Android91/40579201427: estado exacto en `.local/CONTINUAR_CATEGORIAS_AUTOMATICAS.md` y `.local/categorias-auto-delivery.json`; comprobar GitHub al retomar.
- **Comportamiento:** reglas deterministas del comercio ya parseado; restaurante→Comida, supermercados/transporte/salud/hogar/ocio con equivalentes activos, desconocidos/ambiguos/intermediarios→Otros gastos. Categoría activa personal inequívoca antes de global; creación solo de la necesaria para ese usuario. Categorías fijas y correcciones manuales prevalecen. Archivadas/de otro usuario/ingresos excluidas; si Otros gastos también está archivada o es ambigua, el gasto sigue sin categoría para respetar esa configuración. No IA de pago ni texto bancario completo a proveedores.
- **Reintentos/historial:** se busca primero una recepción existente con la huella original; solo una compra automática nueva obtiene categoría efectiva. No se reclasifican recibos antiguos, datos modificados con el mismo identificador ni movimientos corregidos manualmente. La creación manual revisa duplicados tras obtener el bloqueo compartido de usuario. Entrada manual y otros canales conservados. Sin endpoints/campos API/migraciones/dependencias nuevos ni aprendizaje automático de correcciones.
- **Validación:**560casos backend locales sin fallos/errores con ocho PostgreSQL reservados para CI;43focales finales correctas. Clasificador100%líneas/100%ramas con JaCoCo puntual. E2E local backend real/datos ficticios correcto: categoría visible y dos gastos únicos con redelivery; fixture corregido para excluir Saldo inicial. PostgreSQL, flujos API y PWA pasaron en CI del HEAD exacto. Evidencia `.local/categorias-auto-full-final.log`, `categorias-auto-final-verification.log`, `categorias-auto-coverage-result.json`, `categorias-auto-e2e-final.log`. No QA productiva ni compras para probar.
- **Producción:** Render7369733828 y VercelProduction7369749846 SUCCESS para main18b721b. Verificación posterior2026-10-27T20:39:56.855Z:65JS/CSS/manifiesto coincidentes, health directo/proxy HTTPS UP y Google con el cliente del proyecto877485729157. V11–V14 comprobadas a las20:39:55Z en transacción de solo lectura, sin nueva migración. Frontend productivo conservado; estáticos comparados con bytes canónicos de Git por CRLF/LF locales. Evidencias `.local/categorias-auto-production-result.json`, `categorias-auto-production-schema.json` y `categorias-auto-delivery.json`, separadas de Avisos0.1.15.
- **Respaldo:** `.local/promotion-20261027T203248Z/before-main.dump.dpapi`, origen solo lectura, cifrado DPAPI, descifrado/hash/catálogo verificados; sin restauraciones. Publicación permanentemente autorizada tras comprobaciones, sin otra aprobación; no destrucción, restauraciones ni Gmail.
- **APK/dispositivo:** ajuste visual pendiente de0.1.15/código16 ya instalado en Samsung SM-A546E, SHA256 `85A337B3C968C28DA30F2ACCC0426FAD5755E1FE53B2E21810BC61BCDD7980C0`, firma habitual y primera instalación2026-10-22 conservadas. No hay otra APK por esta mejora del backend. No repetir login/bloqueo/reinicio o el gasto de Santander por rutina.
- **Evidencia real separada:** recuperación de Santander ya confirmada por el propietario una vez/cuenta correcta sin guardar manualmente. La primera clasificación real productiva queda pendiente de un aviso habitual futuro; no pedir compras ni reutilizar avisos descartados. Los movimientos anteriores mantienen su categoría. Santander solo gastos, Sears física/digital conservados; Gmail deshabilitado y Desktop intacto; TalkBack omitido.
- **Pendientes siguientes:** revisión funcional de categorías según el plan y operación de Etapa13 (presupuesto global, consumo/costes, límites y alertas). Diseño/flujos sección por sección con el propietario al final, incluyendo utilidad y simplificación de etiquetas. No presentar reglas por palabras como conocimiento de todos los comercios ni como aprendizaje de correcciones.

Siguiente: cerrar comprobaciones posteriores/documentación y dejar prompt con HEAD/CI/integración, APK/dispositivo y producción separados. Continuar las siguientes partes en ramas nuevas desde develop remoto actualizado y comprobado; leer `docs/CATEGORIAS_COMPRAS_AUTOMATICAS.md` y `.local/CONTINUAR_CATEGORIAS_AUTOMATICAS.md`. Mantener estado/plan/plan local sincronizados. No extender esta entrega a reclasificación histórica ni a IA de pago.


## Histórico: Avisos 0.1.15 integrada y recuperación real de Santander

- **Caso real comprobado:** el propietario recuperó el envío existente mediante Restablecer conexión, conservando las asociaciones. No guardó manualmente el movimiento y confirmó después del build funcional: **Santander, una sola vez y cuenta correcta**. No pedir otra compra ni repetir esa comprobación. La pausa está acreditada, pero no se identificó cuál de HTTP401/403/404 la provocó. El resto de bancos/formatos y un aviso espontáneo posterior no se presentan como validados.
- **Código/CI/integración:** fuente final `ac67a6dcd7dcffbfed878dddf7db49d47ae24e4f`; #145 integrado en develop `eed2c7b1420f0049bc0f9a47aadff264fb574b0f` tras CI431/40524638809, CI432/40524648980 y Android84/40524648947 SUCCESS, catorce checks y Vercel correctos. Promoción #146 integrada después de CI433/40527879407, CI434/40527947449 y Android85/40527879347/86/40527947376 SUCCESS, quince checks y Vercel correctos. Main publicado `5f698add4c32e74f92bdba7be29a95caa2bbc53a`. Seguimiento posterior: CI435/40531319478 y Android87/40531319234; resultado exacto actualizado en `.local/CONTINUAR_AVISOS_0_1_15.md` y `.local/avisos-recovery-delivery.json`, comprobarlo en GitHub antes de retomar.
- **Corrección:** reconexión consentida de reglas guardadas con identidades/cuentas/listas intactas y cola cifrada conservada; prevalidación nativa antes de rotar capacidad; detalle de envíos, motivos y reintento visibles. Consultas KEEP sin ampliar cadena, recepción APPEND_OR_REPLACE conservada y reintento/reconexión REPLACE. Débito Santander/BBVA disponible; catálogo independiente de listado SMS; bandeja recargada al cambiar resultados. Bancos desplegables y ayuda/permisos secundarios, sin texto repetido. Ocultar montos conservado. No nuevos endpoints, migraciones o dependencias.
- **Validación:**461unitarias frontend correctas en CI, cinco E2E sobre build productivo y cinco sobre servidor de desarrollo correctos esperando fuentes, temas claro/oscuro/320px/horizontal/texto200% y privacidad accesible.17instrumentadas Store/Worker en Samsung con datos/archivos/transporte ficticios aislados. CI429/430 fallaron por desborde de14px en permisos; corregido sin relajar prueba, sustituidos por CI431/432 correctos. Build inicial JavaScript125811bytes gzip y CSS18384bytes gzip; no es latencia ni ensayo de carga.
- **APK/dispositivo, estado separado:** instalada y probada funcional0.1.15/código16, SHA256 `6BEAD10B6A3940B9F6277A54DE2E2BDD833AA8ECCE01E497D9916D163D778663`, fuente funcional63fee43; misma firma y primera instalación2026-10-22 conservadas. Propietario desconectó Samsung SM-A546E. APK con el ajuste CSS final **preparada, no instalada**: `.local/releases/Kaptal-0.1.15.apk` y Descargas, SHA256 `85A337B3C968C28DA30F2ACCC0426FAD5755E1FE53B2E21810BC61BCDD7980C0`, fuente finalac67a6d. Firma habitual verificada; build funcional archivado como `Kaptal-0.1.15-funcional-probada.apk`. Instalar conservando datos cuando vuelva el teléfono, sin repetir el gasto ya acreditado.
- **Producción y respaldo:** Render7362703694 y VercelProduction7362715543 SUCCESS para main5f698ad. Verificación posterior2026-10-27T15:34:28Z:65JS/CSS/manifiesto correctos, health directo y por proxy HTTPS UP, Google activo con cliente del proyecto877485729157. V11–V14 comprobadas a las15:33:02Z en transacción de solo lectura, sin nueva migración. Se contrastaron seis estáticos con bytes canónicos de Git: diferencia local CRLF frente a LF, contenido publicado exacto; primera comprobación conservada como diagnóstico. Respaldo previo `.local/promotion-20261027T152734Z/before-main.dump.dpapi`, origen de solo lectura, cifrado DPAPI y descifrado/hash/catálogo comprobados; sin restauraciones. Evidencias `.local/avisos-0115-production-result.json`, `avisos-0115-production-schema.json`, `avisos-0115-static-asset-verification.json` y `avisos-recovery-delivery.json`.
- **Nuevas peticiones del plan:** clasificar compras reconocidas por categoría (restaurante→Comida; sin coincidencia clara→Otros gastos), reutilizando categorías/reglas del usuario y conservando decisiones manuales. Revisar categorías como función; no reclasificar historia sin autorización ni introducir IA de pago por defecto. Preparación técnica en `.local/categorias-automaticas-preparacion.md`; las categorías iniciales no incluyen Comida/Otros gastos y hay que resolverlo sin renombrar ni borrar las existentes.
- **Diseño global al final:** revisar sección por sección con el propietario y simplificar, cambiar o añadir lo necesario. Incluir etiquetas: explicar su utilidad y replantear dónde aportan; no mantener complejidad que no entienda solo porque ya existía. El ajuste de Avisos era parte del incidente prioritario y no sustituye ese repaso final.
- **Límites y pendientes:** Etapa10 mantiene observación del uso habitual y otros escenarios, distinguiéndolos de la recuperación de Santander ya comprobada. Santander solo gastos; Sears física/digital conservados. Gmail deshabilitado, cliente Desktop intacto; TalkBack omitido expresamente. Publicación autorizada tras checks, sin otra aprobación; no destrucción, restauraciones, QA productiva ni recuperación de descartados. Presupuesto global/consumo/costes/alertas de Etapa13 siguen pendientes.

Siguiente: terminar verificaciones posteriores y cierre documental; instalar el ajuste CSS cuando vuelva el teléfono. Continuar categorización automática y revisión funcional de categorías, después los pendientes operativos de Etapa13 según el plan; cada parte en rama nueva desde develop remoto actualizado y comprobado. Diseño global por secciones al final. Ver HEAD/CI exactos de documentación y siguientes pasos en `.local/CONTINUAR_AVISOS_0_1_15.md`; mantener separados código/CI/integración, APK/dispositivo y producción.


## Histórico: Etapa 13, métricas operativas de IA

- **Código e integración:** fuente `d3408b6b4a4338931434134490f86e704cf8aaff`, PR #142 integrado en develop `52907b14ac69b8c773f0fe0478cdcf419c3881bf`. CI422/40444247094 y CI423/40444293930 SUCCESS; trece checks y Vercel correctos. Promoción #143 integrada tras CI424/40445071545 y CI425/40445094529 SUCCESS, trece checks y Vercel correctos. Main publicado `0ab5674624f6d5acabe61b0b3e615b019a5e9276`; CI426/40445895585 posterior SUCCESS, incluidos flujos API/PWA y PostgreSQL. Producción y APK se informan por separado a continuación.
- **Implementación:** una métrica por generación lógica con proveedor permitido, resultado y duración, sin prompt, respuesta, excepción, modelo, URL, identidad ni credenciales. Resumidor Python de biblioteca estándar: conteos y p95 por proveedor/resultado, ventana de 1024 duraciones por grupo, entrada y memoria acotadas. No equivale a peticiones facturadas ni a una acción financiera guardada. Sin nuevas dependencias de ejecución, endpoints, migraciones ni cambios de límites/proveedores.
- **Validación:** 529 casos backend locales correctos, con ocho PostgreSQL omitidos en H2 y comprobados por el trabajo PostgreSQL de CI. Siete pruebas del router y nueve del resumidor correctas; cobertura 100% de líneas/90,91% de ramas del router y 95,16% de líneas Python. Ida y vuelta de 33 registros ficticios Java→Python correcta. Evidencias privadas en `.local/metricas-backend-full.log`, `.local/metricas-coverage-result.json`, `.local/metricas-python-coverage.json` y `.local/metricas-roundtrip-final.json`. No llamadas de pago ni QA de IA en producción.
- **Respaldo:** `.local/promotion-20261027T033427Z/before-main.dump.dpapi`, extracción de solo lectura, cifrado DPAPI y descifrado/hash/catálogo comprobados; sin restauraciones.
- **Producción:** Render7349787963 y Vercel Production7349804463 SUCCESS para main `0ab5674624f6d5acabe61b0b3e615b019a5e9276`. Verificación pública 2026-10-27T03:50:19Z: 60 archivos JS/CSS y manifiesto coinciden con la entrega 0.1.14; health directo y por proxy HTTPS UP, Google activo con el cliente del proyecto877485729157. Esquema comprobado en transacción de solo lectura a las03:50:25Z: V11–V14 aplicadas, sin migración nueva. Evidencias `.local/metricas-ia-production-result.json` y `.local/production-promotion-schema.json`. No se generaron peticiones reales de IA para comprobar la métrica.
- **APK/dispositivo:** se conserva Kaptal 0.1.14/código 15, SHA256 `7DF12224481B8AE9B16C3903E1D82BEEC69E51AC8F49E602AA6650F63D8A84F2`. Última confirmación del propietario: sesión, resumen y bancos conservados en Samsung SM-A546E. Esta parte de backend no requiere otra APK, instalación ni prueba física; no se afirma una nueva comprobación del dispositivo.
- **Límites y pendientes:** presupuesto global, tokens/costes y alertas siguen abiertos en Etapa 13. Las métricas reales se observarán durante uso habitual; no se provocaron generaciones de pago para validarlas. Etapa 10 sigue abierta hasta comprobar un único gasto automático de un aviso habitual reconocido y consentido; no recuperar avisos descartados ni hacer compras de prueba. Santander solo gastos. TalkBack omitido expresamente; Gmail deshabilitado, cliente Desktop intacto. Diseño global al final.

Siguiente: continuar presupuesto global, consumo/costes, límites distribuidos y alertas de Etapa 13, censando primero rutas, proveedores y controles existentes; no inventar precios ni cuotas monetarias. Cada parte nueva en rama desde develop remoto actualizado y comprobado. La documentación de cierre se entrega en una rama independiente; comprobar su HEAD/CI/integración en `.local/CONTINUAR_METRICAS_IA_ETAPA_13.md` y GitHub antes de retomar.


## Histórico: Kaptal0.1.14 publicada y verificada (26 de octubre)

**Alcance vigente:** el propietario omitió expresamente TalkBack. Está fuera de los pendientes activos: no solicitar esa prueba ni activar el servicio; no presentarlo como validado. Esta decisión prevalece sobre las menciones históricas siguientes.

### Código, CI e integración

- #139 integrado desde `0d572c318c722e69faba14d4bb862e490f182c5f` a develop `0ba10a28fbc49debbb8b3858a40272cdc16df1c1`. CI415/40409935321, CI416/40410054467 y Android79/40410054443 SUCCESS; catorce checks y Vercel correctos.
- Promoción #140 integrada después de quince checks/Vercel correctos sobre0ba10a2: CI417/40411162802, CI418/40411298399, Android80/40411162794 y81/40411299564 SUCCESS. Main publicado `a41731af1063a2ba448db3f7afecbe52f2285b91`; comprobaciones posteriores CI419/40413641657 y Android82/40413641683 SUCCESS.
- Cierre0.1.13/#138 ya integrado, fuente b94ea5f y CI413/40408665741 correctos. Operación #136/#137 publicada anteriormente: solo límite total E2E15→25min para preparación de Chromium, manteniendo límites de pruebas, arranque y PostgreSQL. No ocultó fallos ni añadió reintentos financieros.

### Cambios y validación

- Se corrigió una fuga visual en el resumen de envíos para revisión: ahora importe/descripción respetan Ocultar montos mediante MontoPipe/TextoFinancieroPipe existentes, también en el árbol accesible. Cuenta y terminación identifican etiqueta visible y banco. No cambia backend, Worker, asociaciones ni registro financiero.
- Dos pruebas E2E rojas reprodujeron el importe visible con preferencia activa y el nombre de control ausente. Resultado final:454 unitarias, build y cuatro E2E ficticios correctos; sin escrituras HTTP, temas claro/oscuro,320px/horizontal/texto200%. No equivale a prueba bancaria real. JS inicial125810bytes gzip/CSS18384bytes gzip, mismo tamaño inicial medido que0.1.13.
- Se conserva la corrección funcional previa: Santander reconstruye título/cuerpo; Sears admite física/digital en una misma cuenta y nuevos folios dentro de una conversación SMS. Validación de tarjeta/fecha/moneda/propietario y deduplicación conservadas. Santander SOLO gastos; depósitos y otros ingresos excluidos de esta conexión. Sin nuevas migraciones ni Gmail.

### APK y dispositivo

- Samsung recibió0.1.14/código15 con firma/datos y primera instalación2026-10-22 conservados. SHA256 `7DF12224481B8AE9B16C3903E1D82BEEC69E51AC8F49E602AA6650F63D8A84F2`; `.local/releases/Kaptal-0.1.14.apk` y Descargas. DEX sin diagnóstico temporal. Fuente del APK:0d572c3; no confundir con SHA de merge o CI.
- El propietario reconectó el teléfono y confirmó sesión, resumen automático y bancos asociados correctos después de instalar0.1.14. No repetir login/bloqueo/reinicio/persistencia ya acreditados por rutina.0.1.13/BAD50 es histórica y quedó sustituida; no distribuir candidatos probe.

### Producción y recuperación

- Main a41731a: VercelProduction7345295353 y Render7345285413 SUCCESS. Verificación posterior al despliegue22:42:02Z:60archivos JS/CSS exactos, API/proxy HTTPS saludables y nuevo cliente Google activo. Esquema de solo lectura22:42:03Z: V11–V14 aplicadas; sin migraciones nuevas. El primer chequeo previo a finalizar Vercel fue sustituido por verificaciones correctas posteriores.
- Respaldo previo actualizado `.local/promotion-20261026T221732Z/before-main.dump.dpapi`: origen solo lectura, cifrado/descifrado/hash/catálogo correctos; sin restaurar. Evidencias `.local/avisos-0114-production-result.json`, `avisos-0114-delivery-result.json`, `avisos-0114-e2e-green.log`, `avisos-0114-unit.log` y `avisos-0114-build-metrics.json`. Manifiestos/verificadores separados por versión.
- Publicación permanentemente autorizada tras checks; no pedir otra aprobación. No acciones destructivas, restauraciones, QA productiva, compras de prueba ni Gmail. No modificar su cliente Desktop.

### Pendientes y siguiente parte

- Etapa10 sigue ABIERTA: el propietario aclaró que descartó las revisiones editables y aún no hizo otra compra tras la actualización. Reconocimiento no acredita gasto automático real. Esperar próximo aviso habitual y comprobar gasto único/cuenta correcta sin guardar manualmente; no pedir compras ni recuperar descartados.
- Continuar pendientes reales de Etapas12/13 según alcance vigente, con TalkBack omitido: contraste/accesibilidad restante, métricas/latencias, presupuesto global y límites de IA, alertas/cuotas/costes y recuperación. Este parche y el ajuste de CI son avances parciales; diseño global del resto de la app al final. Cada parte nueva en rama desde develop remoto actualizado/comprobado.


## Histórico: privacidad y etiquetas accesibles de Avisos 0.1.14

El propietario omitió expresamente TalkBack el26 de octubre: queda fuera de los pendientes activos. No solicitar esa prueba ni activar el servicio; no presentarla como validada. Esta decisión prevalece sobre las menciones históricas siguientes.

- Nueva rama `correcciones/avisos-privacidad-accesible`, creada desde develop remoto f0746e4 comprobado y actualizada por fast-forward a80d23f8f3fa9ac694ee7a7765add0ecef44b7553 después de integrar #138. Ese cierre documental pasó CI413/40408665741 y siete checks/Vercel correctos. Se preservaron los cambios locales de frontend al actualizar la base.
- Fallo de privacidad reproducido con prueba E2E roja y datos ficticios: un envío automático que requiere revisión mostraba importe/descripción directamente pese a Ocultar montos. El resumen usa ahora MontoPipe y TextoFinancieroPipe existentes, respetando preferencia guardada desde el primer frame y cambios posteriores. No basta ocultar visualmente: la regresión comprueba también ausencia del importe en el árbol accesible.
- Etiquetas de cuenta incluyen el texto visible «Cuenta de destino» y el banco; últimos cuatro dígitos incluyen banco para distinguir controles con lector/voz. Sears mantiene etiqueta única. Prueba anterior roja por nombre ausente; ambos temas,320px/horizontal/texto200% y reglas guardadas siguen correctos.
- Validación:454 unitarias y build correctos; cuatro E2E sintéticos correctos, sin escrituras HTTP. Pruebas rojas en `.local/avisos-privacy-red.log` y `.local/avisos-accessible-label-red.log`; verdes en `.local/avisos-0114-e2e-green.log`. No sustituye una prueba física de TalkBack ni registro automático real.
- APK0.1.14/código15 firmado e instalado en Samsung conectado, firma/datos y primera instalación2026-10-22 conservados. SHA256 `7DF12224481B8AE9B16C3903E1D82BEEC69E51AC8F49E602AA6650F63D8A84F2`, `.local/releases/Kaptal-0.1.14.apk` y Descargas. DEX sin diagnóstico temporal. Se pidió comprobar continuidad de sesión/resumen/bancos; respuesta del propietario pendiente al escribir. No cambios de autenticación, backend, Worker, asociaciones ni registro financiero.
- Producción continúa main `a5beff7f5f6b3433c298569c32a98838b5f6f0bf`, aplicación0.1.13 verificada. CI412/40380969029 y despliegues Render7340620531/Vercel7340641516 SUCCESS. HTTPS/API/proxy/Google,60archivos exactos y V11–V14 revalidados21:54Z. No confundir APK0.1.14 instalado con publicación de0.1.14, todavía pendiente de commit/CI/integración/promoción.
- El propietario reconectó el teléfono y confirmó que aún no ha hecho otra compra. Etapa10 ABIERTA hasta próximo aviso habitual con gasto único en cuenta correcta sin guardado manual. No pedir compras ni recuperar descartados; Santander SOLO gastos, Sears física/digital en una cuenta. No QA productiva ni Gmail.

Siguiente: publicar HEAD final de esta corrección, esperar todos sus checks exactos, integrar y promover con respaldo y comprobaciones posteriores ya autorizadas. Actualizar ambos documentos/plan local y continuación separando CI, integración, APK/dispositivo y producción. Etapas12/13 siguen abiertas por aceptación física y operación/costes pendientes; diseño global del resto de la app al final.


## Histórico: entrega 0.1.13 publicada y operación CI integrada (26 de octubre)

### Código, CI e integración

- Aplicación: corrección #132 y diseño #134 integrados en develop y promovidos por #133/#135. Fuente funcional `94e1fed85d6d21549a76d71aeaa34c1ca8168cdd`; fuente del APK/diseño `533e4e2d7908277228a56f3563c493c92a1b1554`. CI398/399 y Android71 correctos para la corrección; CI402/403 y Android74 correctos para el diseño. Las promociones se comprobaron sobre sus HEAD exactos antes de main.
- Main de la aplicación0.1.13: `ecc62fda0160c60d60f73fd246cf1ba1d6ea66e4`, CI409/40377856431 y Android78/40377856484 SUCCESS. El propietario validó físicamente el nuevo resumen, bancos asociados y Administrar bancos.
- Operación #136/#137 integrada y promovida: fuente `cdf3722cf1c7dd1ff4c1f6fecc4b81a29e147218`, CI407/40376963106 y CI408/40377250417 SUCCESS; base develop `f0746e494eae449a7bb8e2256ffc4e4fa2885bb6`, CI410/40378565782 y CI411/40378882806 SUCCESS. Main actual `a5beff7f5f6b3433c298569c32a98838b5f6f0bf`, CI412/40380969029 SUCCESS. Frontend/backend idénticos a la fuente del APK533e4e2; no corresponde otra versión ni instalación por el cambio operativo.
- Se elevó SOLO el límite total del trabajo E2E15→25min: la instalación de Chromium agotaba15min antes de terminar flujos/PWA. Se conservan límites de pruebas, arranque y PostgreSQL. CI400/405 iniciales cancelados fueron sustituidos por sus intentos2 correctos, sin ocultar fallos ni repetir operaciones financieras.
- Cierre documental en rama nueva `docs/cierre-avisos-0-1-13`, creada desde develop remoto f0746e4 actualizado y comprobado. Sus checks/integración se registran por separado en el prompt local; no confundir documentación con otra entrega de app.

### Comportamiento y pruebas

- Santander reconstruye la compra dividida entre título/cuerpo; Sears admite física/digital en la misma cuenta y nuevas compras en una conversación SMS. Mantiene validación de tarjeta, fecha, moneda, propietario y folio; payload del mismo evento inmutable y deduplicado. Terminación JSON null corregida.
- Santander SOLO gastos: avisos claros de depósitos/abonos/ingresos/devoluciones/transferencias se excluyen de esta conexión y backend rechaza ingresos/devoluciones Santander. Otros ingresos para otra cuenta quedan pospuestos. No borrar movimientos ni recuperar descartados.
- Avisos muestra estado automático y bancos/tarjetas sin abrir formularios, contadores recientes diferenciados de Movimientos, permisos y asociaciones por banco. Separa registro asociado de revisión manual. Consultar no envía dinero; estados enviados/registrados evitan otro registro. Resumen nativo independiente de catálogos/red y presentación limpia al cambiar usuario.
- Corrección:452 pruebas frontend, nueve backend aisladas y19 instrumentadas Samsung correctas. Diseño final:454 frontend, build sin advertencias de presupuesto y tres E2E sintéticos correctos, sin escrituras HTTP;320px/horizontal/claro/oscuro/texto200%. Texto secundario/control: contraste5.26/3.50 claro y6.38/5.44 oscuro. No sustituye TalkBack ni un aviso bancario real.
- Medición del build: JS inicial125810bytes gzip y CSS18384bytes gzip; evidencia `.local/avisos-0113-build-metrics.json`. Es tamaño de artefactos, no latencia pública ni coste de proveedores.

### APK y dispositivo

- Samsung SM-A546E `RZCW80EJNHX` reconectado por el propietario el26 de octubre; versión instalada comprobada0.1.13/código14, firma/datos y primera instalación2026-10-22 conservados. SHA256 `BAD50B56B2FF8FD3B71D3CE667BDCD74DC737EFCFB8C473E4E0E823021D321DD`; `.local/releases/Kaptal-0.1.13.apk` y Descargas. Sin diagnóstico temporal en DEX.
- La versión funcional0.1.12 limpia quedó sustituida: SHA256 A2A9F1F45C7325DC7B22910D88DA67DB3619ECD1465E635F93DB1BA15106B9A7. No distribuir candidatos probe históricos ni reinstalar por rutina. Tampoco repetir login/bloqueo/reinicio/persistencia ya acreditados sin motivo.

### Producción y respaldo

- Main actual a5beff7: Render7340620531 y VercelProduction7340641516 SUCCESS. Verificación pública21:54:57Z:60 archivos JS/CSS exactos, API/proxy HTTPS saludables y nuevo cliente Google activo. Esquema de solo lectura21:54:58Z: V11–V14 aplicadas; sin migraciones nuevas.
- Respaldo previo actualizado `.local/promotion-20261026T184257Z/before-main.dump.dpapi`: cifrado/descifrado/hash/catálogo correctos, origen solo lectura, sin restaurar. Anteriores16:22/18:04 conservados. Evidencias `.local/avisos-0113-production-result.json` y `.local/avisos-design-delivery-result.json`; expected manifests de0.1.12/0.1.13 separados.
- Publicación permanentemente autorizada tras checks, sin otra aprobación. No autoriza acciones destructivas, restauraciones, QA productiva, Gmail ni compras de prueba. Gmail permanece deshabilitado; no modificar su cliente Desktop.

### Pendientes reales y siguiente etapa

- Etapa10 ABIERTA: el propietario había reconocido ambos avisos pero aclaró que descartó revisiones editables. Al reconectar confirma que aún no ha hecho otra compra. No existe prueba fiable de registro automático real. Esperar el próximo aviso habitual y comprobar gasto único/cuenta correcta sin guardar manualmente; no solicitar compras ni recuperar descartados.
- Etapa12: pendiente revisión física de accesibilidad/TalkBack y demás aceptación faltante. Preservar configuración original del teléfono al terminar. El diseño específico de Avisos fue solicitado y validado; diseño global del resto de la app continúa al final.
- Etapa13 continúa abierta: presupuesto global de IA, límites distribuidos, métricas/latencias y alertas operativas, cuotas/costes y recuperación según plan. El ajuste de CI y la medición del build son avances parciales. Cada parte nueva en rama desde develop remoto actualizado/comprobado; mantener estado, plan local y continuación sincronizados.


## Histórico: operación CI y entrega de Avisos 0.1.13

- Corrección funcional #132 integrada y promovida por #133: main d83720ef2bf2f4fe672723904c077d00dad8aee2. CI404/40373946575 y Android75/40373946513 SUCCESS; Render7339601061 y Vercel7339615172 SUCCESS. Sesenta assets exactos, HTTPS/API/proxy/Google correctos; V11–V14 aplicadas, comprobación solo lectura. Sin nuevas migraciones ni Gmail.
- Diseño #134 integrado en develop f3560503b9617e9d55b46d7178a4069b83dcdd39. Fuente533e4e2d7908277228a56f3563c493c92a1b1554 validada por CI402/403 y Android74, catorce checks/Vercel correctos. Promoción #135 en espera del CI405 intento2; CI406/40374179835 y Android76/40374110981,77/40374179899 correctos.
- APK0.1.13/código14 instalado, firma/datos/primera instalación conservados; SHA256 BAD50B56B2FF8FD3B71D3CE667BDCD74DC737EFCFB8C473E4E0E823021D321DD, `.local/releases/Kaptal-0.1.13.apk` y Descargas. Propietario confirma resumen, bancos y Administrar bancos visibles/operativos. DEX sin diagnóstico temporal.454 unitarias/build y tres E2E ficticios correctos, incluyendo320px/horizontal/claro/oscuro/texto200% y acción nativa sin escrituras HTTP.
- Teléfono desconectado por indicación del propietario: continuar solo computadora; no pedir conexión ahora. Piloto real Etapa10 ABIERTO: reconocimiento no prueba movimiento automático; propietario descartó revisiones. No recuperar descartados ni pedir compras. Santander solo gastos, depósitos excluidos; física/digital Sears usan una misma cuenta.
- Nueva rama `mejoras/operacion-ci-etapa-13` desde develop f356050 comprobado contra remoto. Incidencia operativa demostrada: CI400 y405 agotaron15min cuando la instalación de frontend/Chromium dejó poco tiempo para flujos/PWA; CI401/406 del mismo código pasaron.400 se recuperó con reintento correcto;405 reiniciado solo el job cancelado121752361850. No atribuir cancelación de infraestructura a fallo contable.
- Ajuste acotado de Etapa13: elevar SOLO el límite total del job E2E de15 a25min, reservando tiempo para preparación, flujos y PWA. Conserva límites de pruebas, arranque de servidores y trabajo PostgreSQL. No añade reintentos financieros, cambia API/APK ni elimina comprobaciones. Validar YAML y ejecución real de CI; integrar después de cerrar #135 para conservar sus evidencias exactas.
- Respaldo actualizado antes de promoción de diseño: `.local/promotion-20261026T180411Z/before-main.dump.dpapi`, cifrado/descifrado/hash/catálogo correctos, origen solo lectura y sin restaurar. Publicación autorizada permanentemente tras checks; sin acciones destructivas, QA productiva ni Gmail.

Siguiente: esperar CI405 intento2, integrar #135 con HEAD f356050 exacto, verificar despliegues/post-CI/HTTPS/Google/V11–V14/60 assets del diseño mediante `.local/verify-avisos-0113-production.cjs`. Revalidar CI del ajuste operativo e integrarlo en develop en su propia rama; documentar estado final y continuar pendientes reales de Etapas12/13. Diseño general del resto de la app al final. Mantener documentación y plan local sincronizados.


## Histórico: Avisos rediseñado y APK0.1.13 instalado

- Nueva rama `mejoras/avisos-bancarios-diseno` desde develop595fea6990e6f0ed8077bac2ffe5d6465b3bc316 verificado contra remoto; corrección funcional #132 ya integrada (fuente94e1fed, CI398/399 y Android71 SUCCESS).
- Rediseño completo de la sección Avisos solicitado por el propietario: resumen automático visible y consultable sin HTTP, contadores recientes, bancos asociados/tarjetas, permisos de Android, formularios por banco, avisos locales y revisión manual separados. Acciones explícitas y bloqueo de otro registro cuando ya está enviado/registrado. Mantiene todos los bancos y física/digital Sears en una cuenta.
- Lectura nativa independiente de catálogos: una caída de red no convierte Registro activo en desactivado ni borra asociaciones. Cambio de usuario limpia datos de presentación y rechaza respuestas tardías. No se envía dinero al consultar; no cambios de API, esquema o Gmail.
- Verificación final:454 unitarias correctas; build web sin advertencia de presupuesto CSS; tres E2E sintéticos correctos en claro/oscuro,320px/horizontal y texto200%, incluida acción por ID/revisión/versión sin escrituras HTTP. Capturas ficticias revisadas visualmente. Contraste local de texto secundario sobre superficie:5.26 claro/6.38 oscuro; borde de controles:3.50/5.44. No sustituye TalkBack ni validación física del propietario.
- APK0.1.13/código14 instalado en Samsung, firma original y primera instalación2026-10-22 conservadas, sin borrar datos. SHA256 BAD50B56B2FF8FD3B71D3CE667BDCD74DC737EFCFB8C473E4E0E823021D321DD. Archivo `.local/releases/Kaptal-0.1.13.apk` y Descargas; DEX sin diagnóstico temporal. Se pidió únicamente comprobar nuevo resumen y apertura de Administrar bancos, sin cambiar conexiones ni compartir datos.
- Publicación de este diseño/CI final todavía pendiente. Promoción funcional #133 develop595fea6→main sigue esperando CI400/40358524823; CI401/40358593358 y Android72/40358524806,73/40358593628 SUCCESS. No mezclar la instalación APK con producción. Respaldo listo `.local/promotion-20261026T162244Z/before-main.dump.dpapi`, cifrado y comprobado de origen solo lectura, sin restaurar.
- Producción última confirmada main ecf71ef4c26cfa0e22fe300eb72bfd1837b0541b (0.1.11). Esperar checks exactos, integrar #133, verificar CI/despliegues/HTTPS/Google/V11–V14/assets mediante `.local/verify-avisos-0112-production.cjs`, y luego integrar/promover el diseño cuando sus propios checks pasen. Publicación permanentemente autorizada tras comprobaciones.
- Piloto real pendiente: el propietario confirmó reconocimiento de ambas compras, después aclaró que descartó las revisiones editables. NO se ha acreditado registro automático real; no recuperar descartados, fabricar QA productiva ni pedir compras. Santander solo gastos; depósitos excluidos. Etapa10 continúa abierta; resto Etapas12/13 conforme al plan, diseño global al final.


## Histórico: corrección integrada y rediseño de Avisos en validación

- #132 integrado en develop595fea6990e6f0ed8077bac2ffe5d6465b3bc316 desde94e1fed85d6d21549a76d71aeaa34c1ca8168cdd. CI398/40263558940, CI399/40263564148 y Android71/40263564324 SUCCESS, quince checks y Vercel correctos. Se corrigieron título/cuerpo Santander, física/digital Sears, nueva compra en conversación SMS y filtro de solo gastos Santander.
- APK funcional limpio0.1.12/código13 instalado, SHA256 A2A9F1F45C7325DC7B22910D88DA67DB3619ECD1465E635F93DB1BA15106B9A7, firma/datos originales conservados y diagnóstico temporal ausente del DEX. Pruebas locales452 frontend, nueve backend aisladas y19 instrumentadas correctas. Reconocimiento real confirmado; registro automático real NO acreditado porque el propietario aclaró que descartó las revisiones. Etapa10 abierta; no recuperar descartados ni pedir compras.
- Promoción #133 develop→main creada en borrador, fuente595fea6. Android72/40358524806 y Android73/40358593628 correctos; CI401/40358593358 correcto, CI400/40358524823 todavía ejecutándose al escribir esta nota. Esperar todos los checks exactos antes de main. Respaldo actualizado `.local/promotion-20261026T162244Z/before-main.dump.dpapi`: solo lectura, cifrado/descifrado/hash/catálogo correctos; sin restaurar. Producción aún main ecf71ef4c26cfa0e22fe300eb72bfd1837b0541b, independiente del APK.
- Rama NUEVA `mejoras/avisos-bancarios-diseno` desde develop595fea6 verificado contra remoto. Rediseño expreso de toda la sección Avisos: resumen automático visible, contadores recientes diferenciados del total de Movimientos, bancos asociados y cantidad de tarjetas, permisos legibles y formularios ordenados por banco. Sears conserva física/digital en una sola cuenta y demás asociaciones. Acciones automáticas y revisión manual diferenciadas; estados enviados/registrados evitan otra acción de registro.
- Estilos usan tokens Kaptal, tema claro/oscuro, controles de48px y foco visible; plantillas/estilos extraídos de componentes inline, sin bibliotecas nuevas ni cambio global de tipografía. Resumen consulta estado nativo sin HTTP; conserva Registro activo si no se descargan catálogos por falta de red. Cambiar de usuario limpia estado/formulario y descarta respuestas tardías.
- Validación del rediseño en curso:454 unitarias iniciales correctas, build web correcto. Tres E2E sintéticos correctos (original nativo por ID/revisión/versión sin escrituras HTTP;320px/390px/horizontal;claro/oscuro y texto200%). Se ajustó únicamente el texto esperado del vacío en el E2E financiero existente. Se repiten contra build final tras limpiar CSS redundante y completar fixtures nativos. Capturas exclusivamente ficticias locales; ningún mensaje financiero ni pantalla privada del propietario.
- Se prepara release0.1.13/código14 con el diseño; no confundirla todavía con APK instalado, integración o producción. Comprobar firma y hash, instalar conservando datos y solicitar valoración visual breve sin capturas ni datos bancarios. Actualizar esta nota con resultado final, CI, PR y producción al terminar.


## Histórico: APK limpio de avisos instalado; CI final pendiente

- Corrección funcional en `correcciones/avisos-reales-diagnostico`, PR #132: Santander reconstruye título/cuerpo; Sears permite física y digital en la misma cuenta y distingue nuevas compras en una conversación SMS. Mantiene deduplicación y validación de identidad, tarjeta, fecha y moneda.
- Santander queda limitado a gastos: se ignoran avisos claros de depósitos y otros ingresos; backend rechaza ingresos/devoluciones de esa conexión. Sin nuevas migraciones ni cambios de Gmail.
- Validación local completada: 452 pruebas frontend, build web, nueve pruebas backend aisladas, JVM/lint/build Android y 19 instrumentadas en Samsung. No confundir estas pruebas con registro real automático.
- APK final limpio 0.1.12/código13 instalado con `adb install -r`, firma original y primera instalación conservadas. SHA256 A2A9F1F45C7325DC7B22910D88DA67DB3619ECD1465E635F93DB1BA15106B9A7. Archivos `.local/releases/Kaptal-0.1.12.apk` y Descargas. DEX comprobado sin diagnóstico temporal; instrumentación de pruebas retirada. Samsung conectado al verificar entrega.
- El propietario aclaró que descartó los avisos editables: reconocimiento confirmado, registro automático real aún NO acreditado. No recuperar descartados ni pedir compras de prueba. Etapa10 continúa abierta hasta el próximo aviso habitual y comprobación de movimiento único en cuenta correcta.
- GitHub: preparar nuevo commit final de #132 y esperar sus checks exactos; los checks iniciales CI396/397 y Android70 corresponden solo a8cfd784. Develop verificado74049165838047746cd846926b72a7276ee2fc29; producción main ecf71ef4c26cfa0e22fe300eb72bfd1837b0541b, todavía entrega0.1.11. No se ha promovido esta corrección.
- Siguiente: integrar #132 con CI final correcto; refrescar respaldo cifrado y promover con verificaciones posteriores, ya autorizado. Rediseñar toda la sección Avisos en rama NUEVA desde develop actualizado: estado automático claro, bancos/tarjetas y acciones sin confusión con revisión manual. Esta petición específica de diseño está autorizada ahora; diseño global permanece al final.


## Histórico: cierre funcional de avisos 0.1.12 y rediseño autorizado

- Rama `correcciones/avisos-reales-diagnostico`, base develop7404916; PR132 borrador. HEAD publicado inicial8cfd784 pasó CI396/397 y Android70; existen mejoras posteriores aún sin commit, no usar esos checks como validación del HEAD final.
- Causas reales confirmadas con indicadores internos sin datos bancarios: Sears tenía terminación distinta y necesita física/digital en la MISMA cuenta; UI ahora admite ambas separadas por coma, genera reglas distintas sin crear cuentas y preserva demás bancos/lista. El propietario introdujo ambas y confirmó reconocimiento de los dos avisos. No copiar dígitos reales al código/pruebas/docs.
- Santander recibe la compra repartida entre título y cuerpo: el cuerpo solo no contiene el comienzo. Indicadores reales `joinedAccepted=true` y `envelopeAccepted=true`; se reconstruye únicamente el paquete bancario autorizado y se valida la compra completa. Rechazos/cancelaciones/no autorizadas siguen bloqueados. Pruebas cubren divisiones entre palabras, misma identidad y tarjeta/paquete/fecha/moneda.
- Reproducción adicional Sears: dos compras físicas/digitales pueden usar la misma notificación de conversación SMS. La prueba falló (una entrada en vez de dos). Ahora se distingue el folio bancario para admitir el nuevo evento, manteniendo inmutable el payload del mismo folio y deduplicando reintentos. Otras notificaciones conservan la política previa.
- Alcance expreso del propietario: Santander SOLO compras/gastos. Cliente ignora depósitos/abonos/ingresos/devoluciones/transferencias claros del paquete Santander, sin cola ni prellenado; avisos locales previos de esos tipos se ocultan sin borrar registros financieros. Backend rechaza INGRESO/DEVOLUCION para reglas Santander. Otros canales/manual y otros proveedores no cambian. Futuro ingreso para otra cuenta queda pospuesto.
- Diagnóstico útil por aviso, tarjeta frente a formato, prellenado sin enviar y reintento EXPLÍCITO del original propietario/vigente (ID/revisión/versión, nunca texto financiero desde JS). Consultar no registra dinero. Nativos siguen usando cola cifrada/Worker/endpoint existentes. No recuperar descartados ni fabricar mensajes/compras de prueba productivos.
- Aclaración del piloto: el propietario primero dijo «ambas compras», pero después aclaró que vio avisos editables/Guardar movimiento y los descartó. NO hay confirmación fiable de registro automático ni de movimientos nuevos; no cerrar Etapa10 ni afirmar 100 %. Parece ruta manual; no se obtuvo evidencia de respuesta automática. Próximo aviso habitual deberá entrar sin revisión si no hay ambigüedad; no pedir nuevas compras.
- Validación:452 frontend/build correctos; nueve backend AndroidIntegrationTest correctos en H2 aislado (XML confirma cero errores/fallos; PowerShell marcó advertencia Mockito como error de comando). Prueba backend roja antes del guard de gastos. JVM/lint/build Android correctos;19 instrumentadas Samsung correctas tras corregir reutilización de notificación, incluidas permisos de búsqueda por propietario/revisión/caducidad, cola idempotente, tarjetas, título/cuerpo y depósito ignorado. Sin QA productiva.
- Fuente temporal BankNoticeShapeProbe y hook retirados del código. Se reconstruye release limpia; comprobar ausencia del tag/clase en DEX, firma original y datos antes de sustituir candidato instalado. Teléfono tiene candidato5E2E90 (0.1.12/código13 con diagnóstico de booleanos); NO distribuir como final. Registrar nuevo SHA tras build final. Debug detenida/instrumentación pendiente de retirar tras última tanda.
- Producción sigue main ecf71ef de0.1.11; API existente compatible con reglas múltiples. No integrar/promover hasta CI del HEAD final. Publicación permanente autorizada tras comprobaciones; no pedir aprobación adicional, sin restauraciones/acciones destructivas ni Gmail.
- Petición nueva expresa: rediseñar TODA la sección de avisos/registro bancario ahora y después continuar plan. Es excepción específica al diseño general al final. Hacer en rama nueva desde develop actualizado tras integrar corrección; reutilizar paleta/tokens Kaptal y stack Angular21, sin nuevas bibliotecas. Mejorar jerarquía, estado automático visible, conexión de física/digital, avisos y acciones, permisos y formularios; distinguir compra automática de revisión manual. Mantener pendientes globales de accesibilidad/TalkBack/Etapa13.

Siguiente: build final sin diagnóstico, instalar conservando firma/datos/asociaciones y actualizar hash; commit/CI exacto e integración de132. Crear rama independiente de diseño al actualizar develop; trabajar diseño mientras promoción y comprobaciones posteriores se completan, sin confundir APK, CI, integración y producción. Respaldar antes de promover, verificar después. Mantener estado/plan/plan local/prompt sincronizados.


## Histórico: evidencia real por banco y validación pendiente

- Ambos avisos quedaron en `format_or_card` en0.1.12 inicial. Diagnóstico temporal recogió únicamente claves fijas, booleanos y proveedor SEARS/SANTANDER; ningún mensaje/importe/fecha/tarjeta/identificador real. Evidencia `.local/bank-shape-indicators-only.json`.
- Sears: remitente coincide, formato completo se acepta sin comparar la tarjeta, moneda/fecha válidas; `cardMatches=false` y terminación configurada. Causa real: terminación del aviso distinta de la vinculada. Se pidió al propietario comprobar que es la misma cuenta y corregir terminación conservando otros bancos/lista, sin compartir dígitos. Esperando resultado «Compra reconocida». No relajar la comprobación de tarjeta.
- Santander: cuerpo no contiene el comienzo exacto «Compra con tarjeta en …» que se tenía transcrito; sin espacios especiales y ningún parseo positivo al ignorar terminación o normalizar. Se pidió SOLO la frase inicial anterior al comercio/importe; no mensaje completo ni datos financieros. Falta esa frase para ajustar el patrón exacto. La regresión JSONObject null existe, pero ambos avisos reales tenían terminación configurada: no atribuirles ese fallo.
- PR132 borrador HEAD8cfd784cf1e02fe9664f67527030855cf0d6d361: CI396/40204372460, CI397/40204378123 y Android70/40204378138 SUCCESS. No usar estos checks para cambios locales posteriores. Sin integración/promoción.
- Dispositivo tiene temporal0.1.12/código13 SHA25664E5DC51A907065E117A7A3D1A2601CC00CA766882C0C184D4B2C66E6510C6FD (`.local/releases/Kaptal-0.1.12-probe.apk`). Solo registra indicadores no personales; NO distribuirla como final. Archivo canónico/Descargas siguen F3F147 inicial. Fuente temporal BankNoticeShapeProbe retirada ya del árbol y hook eliminado; falta recompilar/reinstalar final para retirarla del teléfono.
- Cambios locales sobre8cfd784: distinguir tarjeta incorrecta de formato no admitido; helper Sears verifica forma sin exponer dígitos, prueba adicional correspondiente; pendiente patrón Santander y prueba física final. EOL generado Gradle sin cambio funcional, restaurar solo esos dos archivos después de build. Conservar todo al retomar; no guardar dinero ni reenviar avisos por herramientas.

Siguiente: recibir frase Santander y resultado de Sears; patrón con fixtures ficticios y pruebas negativas, quitar diagnóstico del APK final, instalar conservando firma/datos. Solo entonces reintento REAL por botón explícito del propietario si aparece Compra reconocida; comprobar resultado/cuenta/movimiento único sin datos privados. No compras nuevas. Actualizar ambos documentos/plan/continuación y revalidar HEAD final.

## Histórico: avisos reales siguen fallando; 0.1.12 en validación

- El propietario informa nuevas compras reales Sears y Santander que solo aparecen locales y no rellenan ni registran. El piloto real NO pasó; la entrega0.1.11 y sus pruebas sintéticas no prueban registro productivo. Detenidas funciones nuevas hasta resolver. No pedir nuevas compras ni descartar/recrear conexiones.
- Rama nueva `correcciones/avisos-reales-diagnostico` desde develop remoto `74049165838047746cd846926b72a7276ee2fc29` verificado con siete checks correctos. Árbol limpio al inicio. Samsung conectado; APK instalado comprobado por hash idéntico a 0.1.11 final83AFF, descartada instalación intermedia como causa.
- La captura habitual de jerarquía falla por falta de estado inactivo. Un diagnóstico temporal explícito en debug no logró ver la ventana Kaptal: cero nodos, sin leer ni conservar mensajes bancarios. Fuente temporal retirada del código; no inferir formato real de esos resultados. Originales y configuración intactos.
- Fallo Android reproducido con compra ficticia: JSONObject.optString convierte terminación JSON null en el texto «null», rechazando una terminación opcional vacía. Prueba instrumentada roja antes del cambio. Corrección mediante isNull y evaluación compartida entre recepción, diagnóstico y revisión; pendiente comprobar el motivo específico de cada aviso real, especialmente Sears.
- 0.1.12/código13 en preparación: cada aviso mostrará motivo local (conexión, aplicación, remitente, formato/tarjeta, ambigüedad, cola/registrado/revisión); una compra reconocida rellena cuenta/lista/importe/fecha/descripción al revisarla SIN enviarla. Cambios de revisión/asociación/estado invalidan formularios antiguos.
- Reintento explícito para un aviso existente reconocido Sears o Santander con identidad bancaria estable: el plugin solo acepta ID/revisión/versión y vuelve a leer el original propietario/no vencido; comprueba desbloqueo, permiso, conexión vigente y regla única. No acepta texto/datos financieros desde JS. Conserva original; usa cola/Worker existentes y deduplicación. No dispara registros al consultar o abrir una revisión.
- Validación: 450 frontend y build web correctos; suite JVM/lint/build Android correctos;16 instrumentadas Samsung correctas (ocho del almacén automático y ocho de avisos locales), incluidas null, diagnóstico sin mutación, reintento y búsqueda por propietario/revisión/caducidad. Debug detenida e instrumentación retirada.
- APK0.1.12/código13 instalado, firma y primera instalación/datos originales conservados; SHA256 `F3F147201C0CBEB9876063D380A5E56C711093BE91074CCA52CC501DD250D4BC`, `.local/releases/Kaptal-0.1.12.apk` y Descargas. Esperando SOLO motivos por aviso Sears/Santander mostrados en app; no pulsar reintento hasta saber motivo. No integrado/promovido todavía ni reenviados avisos reales.
- Producción sigue main `ecf71ef4c26cfa0e22fe300eb72bfd1837b0541b`, entrega0.1.11. Publicación autorizada tras checks permanentemente; no pedir aprobación adicional. No QA/avisos sintéticos productivos, acciones destructivas/restauración ni Gmail. Datos de todas las pruebas son ficticios y archivos debug aislados.

Siguiente: terminar pruebas físicas aisladas, instalar0.1.12 con firma/datos conservados y obtener SOLO motivos por aviso Sears/Santander. Corregir según evidencia; no volver a prometer registro real basándose solo en regex unitarias. Reintento de compra REAL solo por acción explícita del propietario en la app, comprobando cuenta y movimiento único. Luego CI exacto, integración/promoción y documentación; Etapas10/12/13 siguen abiertas y diseño general al final.


## Histórico: Santander 0.1.11 corregido, integrado y APK final instalado

- Causas confirmadas: las asociaciones bancarias seguían guardadas pero el formulario no las recuperaba; corregido. El propietario confirmó reaparición de Santander/Sears y Registro activo. El formato real «Compra con tarjeta en …» no coincidía con el parser anterior «Gastaste …»; corregido sin guardar el mensaje real ni sus datos en código, pruebas, documentos o logs.
- Reconocimiento nuevo limitado a Santander crédito/MXN, comercio, tarjeta enmascarada y fecha/hora estrictas. Respeta terminación configurada y fecha bancaria hasta31d como backend; rechazos, pagos, moneda distinta y formatos ambiguos permanecen fuera del registro automático. Identidad estable del evento deduplica reentregas Android. El aviso antiguo no se reenvía retrospectivamente.
- Código #129 integrado en develop `aaff8aeb6b31d4228b08f69cf313ad683cab824f`, fuente `d382997a37a9ab790d69bd6e6ad4fee29b70b408`. CI388/40135252061, CI390/40135393464 y Android66/40135393514 SUCCESS. CI389/Android65 cancelados al reabrir PR y sustituidos por390/66; no son fallos del producto ni validación final. No confundir con HEAD84baa30 intermedio del formulario.
- Promoción #130 integrada en main `ecf71ef4c26cfa0e22fe300eb72bfd1837b0541b` después de quince checks y Vercel SUCCESS del HEADaaff8ae: CI391/40136013166, CI392/40136046635, Android67/40136013168 y Android68/40136046654 SUCCESS. Despliegues y checks posteriores de ese main se verifican por separado: consultar `.local/CONTINUAR_SANTANDER_0_1_11.md` y `.local/santander-production-result.json` para resultado final, no inferirlos de la integración.
- APK FINAL 0.1.11/código12 instalado conservando firma, datos, primera instalación y permiso de avisos. SHA256 `83AFF54AD1BD40FFF7779749EBCAB9F670998CD605385838A5DB4C63C181392C`, `.local/releases/Kaptal-0.1.11.apk` y Descargas, origen funcional d382997. D39D es intermedio solo del formulario; no distribuirlo como final. Samsung puede desconectarse: no se necesitan más instalaciones para esta corrección. Confirmar conexión de nuevo si se requiere hardware después.
- Validación: 447 frontend y build correctos; siete JVM del parser, suite JVM/lint y cinco instrumentadas aisladas del almacén en Samsung correctas, incluida recepción Santander, fecha bancaria y cola única con reentrega/diferente segundo. Todas usan compras ficticias y archivos debug aislados. Debug detenida e instrumentación retirada. No repetir logout/bloqueo/reinicio ya acreditados por rutina.
- Respaldo previo actualizado `.local/promotion-20261024T215530Z/before-main.dump.dpapi`, origen solo lectura y cifrado/descifrado/hash/catálogo correctos, sin restaurar. Sin migraciones nuevas: V11–V14. Publicación autorizada permanentemente tras comprobaciones; no pedir aprobación separada. No acciones destructivas, restauraciones ni QA productiva; Gmail sigue deshabilitado.
- Compra previa: se indicó al propietario Revisar notificación, completar cuenta/datos, Enviar revisión a mi cuenta y Guardar movimiento, revisando coincidencias antes de añadir otro. No asumir que lo hizo. Falta siguiente aviso habitual para comprobar registro automático real, cuenta correcta y movimiento único. No compras de prueba. Etapa10 sigue abierta. TalkBack/contraste completo de Etapa12 y rendimiento/costes/presupuesto global/alertas/recuperación de Etapa13 siguen pendientes; diseño general al final.

Siguiente: confirmar producción/CI posterior y cierre documental; después validar el siguiente aviso habitual sin pruebas bancarias artificiales. Ante otra incidencia, detener funciones nuevas y diagnosticar con información anonimizada. Cada etapa nueva en rama desde develop remoto actualizado y verificado; mantener ambos documentos, plan local y prompt sincronizados.


## Histórico: aviso real Santander recibido sin movimiento

- El propietario informa una compra habitual real: el aviso Santander aparece en Kaptal, pero no se registró movimiento. Esto confirma recepción visible, no el registro automático ni su causa. Etapa10 sigue abierta y este incidente tiene prioridad sobre nuevas funciones.
- Diagnóstico en rama nueva `correcciones/santander-aviso-sin-registro`, desde origin/develop `748ac09b9dce9a6fe18a8c00e22ceae09d8542f1` verificado; árbol limpio al iniciar y Samsung conectado.
- Causa confirmada: conexión activa y asociaciones persistidas; el aviso real comienza «Compra con tarjeta en …». El parser anterior solo aceptaba «Gastaste … en … con tu tarjeta». El aviso quedó local y no se preparó envío automático. No fue pérdida de los bancos configurados.
- Propietario confirma que solo ve «Notificación local», revisar/descartar; actualizar configuración deja contadores en cero y formulario sin bancos. Causa visual reproducida: el plugin no devolvía reglas guardadas y el componente nunca rellenaba las selecciones. Corregido el contrato nativo y la carga de asociaciones; no devuelve la clave, no reactiva ni modifica la cola, consentimiento sigue sin marcar.
- Formulario: dos pruebas nuevas, fallo reproducido antes del cambio, seis enfocadas y 447 frontend completas correctas; build correcto. APK intermedio 0.1.11/código12 instalado con firma/datos/primera instalación originales. Propietario confirma que reaparecen Santander/Sears y «Registro activo». PR129 borrador, HEAD84baa30 con CI386/387 y Android64 iniciales; comprobar nuevos HEAD después del parser.
- Parser corregido: formato Santander de crédito con MXN, comercio, tarjeta enmascarada, fecha/hora estrictas; fecha bancaria preservada y máximo31d como backend. Identidad estable por campos del evento bancario para deduplicar reentregas con distinta clave Android. Pruebas usan únicamente otra compra ficticia, nunca el mensaje real. Siete pruebas JVM del parser correctas tras fallo previo, suite JVM/lint correctos y cinco instrumentadas Samsung del almacén correctas, incluida nueva cola Santander única y segundo evento distinto. Debug detenida e instrumentación retirada.
- APK final 0.1.11/código12 reconstruido e instalado con datos y primera instalación originales, SHA256 `83AFF54AD1BD40FFF7779749EBCAB9F670998CD605385838A5DB4C63C181392C`, `.local/releases/Kaptal-0.1.11.apk` y Descargas. Misma firma original; sustituye intermedio D39D del formulario. CI final/integración/promoción pendientes; producción sigue main0c82f2f de 0.1.10.
- No se modificaron movimientos ni configuración; no se descartó/reenvió el aviso, no compras de prueba, Gmail deshabilitado. No registrar mensajes originales ni datos bancarios en logs/documentos.

Siguiente: terminar prueba instrumentada aislada del parser/cola, reconstruir e instalar APK final, validar CI exacto de PR129 e integrar/promover tras checks. No reenviar automáticamente el aviso antiguo ni simular avisos productivos; la compra previa necesita revisión única del propietario. Etapa10 sigue abierta hasta constatar registro real con siguiente aviso habitual. No reactivar conexión por rutina.


## Histórico: entrega combinada 0.1.10 e integración completa

- Integración: #126 (mediciones), #124 (bloqueo nativo) y #125 (accesibilidad/respaldo) integrados en develop `8038946e1894bd1d9bc8d25f9cffc1f85f4d00f9`. #125 terminó con CI380/40130497481 y Android60/40130497478 correctos.
- Promoción #127 integrada en main `0c82f2f25fbc170d85733e23097858244815aac3` tras quince checks y estado Vercel SUCCESS del HEAD exacto 8038946: CI381/40131370547, CI382/40131389846, Android61/40131370565 y Android62/40131389869. Comprobar por separado CI383/40132044197, Android63/40132044247 y despliegues posteriores; integrar no equivale a despliegue terminado.
- APK combinado 0.1.10/código11 instalado conservando firma, datos, primera instalación y acceso a notificaciones. SHA256 `897D4BBF0F35DADF01141420FF325629C81BF129F18EDCC52231E5A952C52522`, `.local/releases/Kaptal-0.1.10.apk` y Descargas. Sustituye los APK intermedios E398/2E70. Origen 8038946.
- Dispositivo: Samsung SM-A546E. El propietario confirma sesión/cuentas y uso normal después de desbloquear el APK combinado. Ya confirmó fondo Kaptal, diálogo Android automático, cancelación protegida y reintento sin bucle. No repetir esas pruebas sin motivo ni cerrar su sesión. Debug detenida e instrumentación retirada.
- Validación local combinada: 445 pruebas frontend, cinco del medidor, build y dieciséis E2E correctos. Respaldo/restauración solo local con datos sintéticos. Seis pruebas JVM del bloqueo y dos instrumentadas Samsung correctas. TalkBack y contraste completo siguen pendientes.
- Respaldo previo a promoción actualizado: `.local/promotion-20261024T204749Z/before-main.dump.dpapi`; origen solo lectura, cifrado/descifrado/hash y catálogo comprobados, sin restaurar. V11–V14 sin cambios. La autorización permanente de publicación tras comprobaciones sigue vigente; no permite acciones destructivas, restauración/QA productiva ni Gmail.
- Piloto Santander y otros bancos seleccionados intencionalmente activos/consentidos. Falta el próximo aviso habitual para comprobar formato, asociación y registro único; no realizar compras de prueba. Etapa10 abierta.
- Etapa12 pendiente de TalkBack/contraste completo. Etapa13 tiene métricas de build y latencia local; faltan rendimiento real, consumo/costes de IA, presupuesto global, alertas y recuperación operativa. No presentar mediciones H2 como p95 productivo. Diseño general al final.

Siguiente: terminar verificaciones posteriores de main y Render/Vercel, HTTPS/health/Google, hashes servidos y migraciones; registrar el resultado exacto en el prompt local `.local/CONTINUAR_KAPTAL_ETAPAS_12_13.md`. Continuar pendientes en ramas nuevas desde develop remoto actualizado. Mantener ambos documentos y plan local sincronizados.


## Histórico: accesibilidad corregida con fuentes alternativas y mediciones integradas

- #125 en `validacion/etapa-12-accesibilidad-respaldo`, worktree `.local/wt-a12`, rama independiente desde develop fd821fb y actualizada con `70a7f863eb458650dfffc2daff0e10ccdbf5f822` de #124/#126. Corrige caché bloqueada y reflujo de Configuración, Cuentas, Categorías y Presupuestos con letra al 200 %. CSV/lista activa y alcance del JSON aclarados. Detalle en `ACCESIBILIDAD_RESPALDO_ETAPA_12.md`.
- CI370/40109964613 y CI371/40111171593 fallaron en geometría. Esperar fuentes no bastó: Arial reprodujo exactamente 327px en un viewport320 por texto del estado vacío de Presupuestos. Corregidos padding/palabras, filtro de Cuentas y contadores del respaldo; matriz ahora incluye sistema/Arial, claro/oscuro y dos orientaciones. Diagnóstico de cajas/rangos de texto sin copiar contenido. No retirar el límite de ancho ni atribuir el fallo a SQL sin evidencia.
- Validación combinada local correcta: 445 pruebas frontend (incluye bloqueo incorporado), cinco del medidor heredado, build y dieciséis E2E. Incluye ocho pantallas/árbol Chromium/foco y datos ocultos; descarga CSV/JSON y restauración local única con MXN/USD, listas/etiquetas/IDs remapeados, libro/historial, perfil del destino y origen intactos; segundo intento rechazado. Solo localhost/H2 y datos sintéticos. TalkBack/contraste completo siguen pendientes; no QA ni restauraciones productivas.
- #124, bloqueo0.1.10, integrado en develop `70a7f863eb458650dfffc2daff0e10ccdbf5f822` tras catorce checks y Vercel SUCCESS del HEAD `82c4587d207f4d83c78c9266b5ba4a5183b32d34`: CI377/40129543758, CI378/40129548396 y Android58/40129548375 SUCCESS. El propietario confirma activación/cancelación, diálogo automático, fondo Kaptal y acceso normal; cancelar con bloqueo activo conserva protección y permite reintentar sin bucle. Seis JVM y dos instrumentadas Samsung correctas tras el fondo nuevo.
- Samsung reconectado. APK0.1.10/código11 `E39861D7816DB03C2DFAFA5DA6168CD748FAF043A3A67A0AA9C2AA5CC923E229` instalada, `.local/releases/Kaptal-0.1.10.apk` y Descargas; firma original y primera instalación 2026-10-22 00:26:31 conservadas. Aún no contiene los ajustes de esta rama: reconstruir el combinado antes de entregarlo. No cerrar sesión ni desactivar protección/permisos bancarios. Debug detenida e instrumentación retirada.
- #126 integrado en develop5809587 tras catorce checks y Vercel SUCCESS del HEAD `2c79243209ab88330237de738c88a6491ded7c00`: CI372/40111277630, CI373/40111317099 y Android55/40111317125 SUCCESS. Reportes de build y latencia local por commit sin cuerpos/tokens; no p95 productivo ni coste real. Etapa13 permanece abierta.
- Producción vigente: privacidad0.1.9 de #122/#123 en main `066d111aed612b1944abf2dc84f70672513ec323`. CI365/40107543999 y Android50/40107544012 SUCCESS, siete checks posteriores correctos. Render7300666504 y Vercel7300673123 SUCCESS; HTTPS/health UP, Google nuevo, V11–V14 y hashes servidos comprobados. Ninguna integración develop equivale todavía a promoción completa.
- Snapshot `.local/promotion-20261024T151930Z/before-main.dump.dpapi` verificado, origen solo lectura y sin restaurar; refrescar antes de otra promoción según cambios. Publicación permanente autorizada tras comprobaciones; no pedir aprobación separada. Sin acciones destructivas, restauraciones productivas, QA productiva ni Gmail.
- Piloto: Santander y otros bancos elegidos/consentidos conservados. Falta próximo aviso habitual para formato/asociación/registro único; no compras ni avisos sintéticos productivos. Etapa10 abierta. No repetir reinicio/persistencia/widgets acreditados sin motivo.

Siguiente: revalidar e integrar #125 tras checks de su HEAD final combinado. Promover con respaldo y verificaciones; construir APK combinado manteniendo firma/datos. Mantener ambos documentos, plan local y prompt con CI/integración/APK/dispositivo/producción separados. Continuar pendientes reales de accesibilidad/operación; diseño general al final.

## Histórico: bloqueo 0.1.10 validado en Samsung; accesibilidad y mediciones separadas

- #124, rama `mejoras/etapa-12-bloqueo-nativo`, nueva desde develop fd821fb. Bloqueo voluntario Android11+ con BiometricPrompt, autorización efímera de un solo uso y cobertura nativa opaca. Al volver abre directamente el diálogo Android; logo/colores de Kaptal detrás, controles solo para reintentar tras cancelar y ScrollView para letra grande. No modifica sesión, tokens, WorkManager ni configuración bancaria. Detalle en `BLOQUEO_NATIVO_ETAPA_12.md`.
- Validación: 443 pruebas frontend y diez E2E locales anteriores sin cambios JS en el ajuste de fondo; seis pruebas JVM específicas, lint y builds debug/release correctos. Dos instrumentadas Samsung repetidas después del fondo: flag real, WebView invisible, retorno/recreación, preferencia de capturas y sesión intactas. Debug detenida e instrumentación retirada.
- Propietario confirma en release: cancelar activación deja desactivado; activación y diálogo automático correctos; fondo Kaptal y acceso normal correctos; cancelar al volver conserva bloqueo y permite reintentar sin bucle ni datos visibles. Samsung SM-A546E reconectado. APK 0.1.10/código11 instalada con firma original y primera instalación 2026-10-22 00:26:31; `.local/releases/Kaptal-0.1.10.apk` y Descargas, SHA256 `E39861D7816DB03C2DFAFA5DA6168CD748FAF043A3A67A0AA9C2AA5CC923E229`. Corresponde al bloqueo; ajustes posteriores de otras ramas requieren reconstruir antes de entregar el combinado.
- CI previo de #124: HEAD 2ba83c58a5932ff77f6033f964f99a451dc142ed tuvo catorce checks y Vercel correctos (CI368/369 y Android52). El fondo actualizado tiene otro HEAD: verificar sus checks exactos antes de integrar/promover; no usar los del anterior como aprobación automática.
- #125 independiente en `.local/wt-a12`, rama `validacion/etapa-12-accesibilidad-respaldo`. Corrige caché bloqueada, reflujo con letra al 200 % y ensaya CSV/JSON/restauración local. CI370/371 fallaron en geometría; se reprodujo el mismo desbordamiento de 7px con Arial en Windows y se identificó el título del estado vacío de Presupuestos. Ajustes de palabra/padding, filtro de Cuentas y contadores de respaldo corregidos: ocho pantallas y respaldo pasan con fuente del sistema/Arial, dos orientaciones y claro/oscuro. Conciliar develop y revalidar HEAD final. El ensayo es H2/sintético y no restaura producción. Contraste completo/TalkBack siguen separados.
- #126 integrado en develop `5809587271342c6b28c92728ac600a8e03e034de` tras catorce checks y Vercel SUCCESS del HEAD `2c79243209ab88330237de738c88a6491ded7c00`: CI372/40111277630, CI373/40111317099 y Android55/40111317125 SUCCESS. Cinco pruebas del medidor, build, JSON y E2E de latencia local correctos. Reportes agregados por SHA sin cuerpos/tokens; no son p95 productivo ni coste real. Sin proveedores/recursos nuevos. Incorporado como base actualizada de esta rama; revalidar combinación. Etapa13 permanece abierta.
- Producción vigente: #122/#123 publicaron privacidad0.1.9 en main `066d111aed612b1944abf2dc84f70672513ec323`. CI365/40107543999 y Android50/40107544012 SUCCESS; siete checks posteriores correctos. Render `7300666504` y Vercel `7300673123` SUCCESS; HTTPS/health UP, cliente Google nuevo, V11–V14 y hashes servidos correctos. No equiparar APK0.1.10 instalada con código ya integrado/publicado.
- Snapshot `.local/promotion-20261024T151930Z/before-main.dump.dpapi` verificado, origen solo lectura, cifrado/descifrado/hash/catálogo correctos, sin restaurar. Refrescar antes de la próxima promoción según cambios. Publicación permanente autorizada tras comprobaciones; no pedir aprobación separada de main. No autoriza destruir/restaurar datos productivos, QA productiva ni Gmail.
- Piloto: Santander y otros bancos seleccionados intencionalmente conservados; falta el próximo aviso habitual para formato/asociación/un solo movimiento. No compras de prueba ni eventos sintéticos productivos. Etapa10 abierta; Gmail deshabilitado. No repetir reinicio/persistencia/widgets acreditados sin motivo.

Siguiente: terminar CI exacto e integración de las tres entregas sin mezclar sus estados; conciliar develop en cada rama y reconstruir APK combinado. Promover con respaldo/verificaciones. Mantener planes y prompt local con HEAD/CI/APK/dispositivo/producción separados. Continuar pendientes reales de accesibilidad y operación; diseño general al final.

## Histórico: mediciones de Etapa13 preparadas; accesibilidad en CI y teléfono desconectado

- Rama nueva e independiente `mejoras/etapa-13-mediciones-operacion`, worktree `.local/wt-e13`, desde origin/develop `fd821fb79e9ed86d7fc0e229733df6589441fe3c` verificado. Añade un medidor reproducible del build con imports estáticos/preload, bytes/gzip/Brotli/hash e inline separado, cinco pruebas correctas y artefacto CI por SHA. Usa TypeScript/Node ya instalados; sin dependencias ni recursos nuevos. Build correcto y salida CLI JSON verificada.
- Recorrido HTTP local correcto: veinte compras sintéticas, tres calentamientos y veinte muestras por operación; reporta health/cuentas/página de movimientos, sin cuerpos/tokens/identificadores. Guardia de frontend y PostgreSQL locales. H2 p95 inicial 12.914/24.195/24.659 ms; no p95 productivo, SQL ni ensayo de carga. Referencia de JS inicial 385980 bytes y gzip125784; no es tiempo de arranque. Detalle, fuentes y límites en `RENDIMIENTO_OPERACION_ETAPA_13.md`. Cuotas/costes reales, presupuesto global, alertas, interpretación y mediciones físicas siguen pendientes; Etapa13 no cerrada.
- Accesibilidad/respaldo: #125, rama `validacion/etapa-12-accesibilidad-respaldo`, worktree `.local/wt-a12`, HEAD actualizado `e2c1381250a8f2c77dfaea1e149dd5f70c67941b`. Local: 436 unitarias, build, quince E2E; dos recorridos actualizados repetidos correctos. CI370 del anterior 99c1955 falló en geometría antes de esperar estilos/fuentes; el nuevo arnés mantiene el límite y espera la carga/estabilidad. Comprobar nuevo CI exacto antes de integrar. No atribuir ese fallo a SQL sin evidencia. Ensayo CSV/JSON/restauración es local y con dinero sintético; no toca producción.
- Bloqueo: #124 borrador, rama `mejoras/etapa-12-bloqueo-nativo` en el workspace principal, HEAD `2ba83c58a5932ff77f6033f964f99a451dc142ed`. Catorce checks y Vercel correctos: CI368/40108300664, CI369/40108305903, Android52/40108305612 SUCCESS. Cancelación sin activación y activación inicial confirmadas por el propietario. Diálogo Android automático al volver ajustado y seis pruebas JVM correctas. Falta instalar/probar físicamente ese ajuste; no integrar todavía. Preservar sesión, permiso de avisos y configuración bancaria.
- APK/dispositivo: Samsung desconectado voluntariamente; el propietario autoriza continuar todo lo posible sin él. Instalada inicialmente 0.1.10/código11 con firma/datos originales. Actualizada preparada, aún sin instalar, `.local/releases/Kaptal-0.1.10.apk` y Descargas, SHA256 `2E70FB7332A3B051255D5A0C683A39A50374DB98D8660CE6EFE51DD96582A189`. Este archivo corresponde al bloqueo anterior a #125; reconstruir con los cambios integrados antes de instalar al reconectar. Debug detenida e instrumentación retirada.
- Producción comprobada: main `066d111aed612b1944abf2dc84f70672513ec323`, privacidad0.1.9 de #122/#123. CI365/40107543999 y Android50/40107544012 SUCCESS, siete checks posteriores correctos. Render `7300666504` y Vercel `7300673123` SUCCESS; health/HTTPS/Google nuevo, V11–V14 y hashes servidos correctos. Accesibilidad y mediciones todavía sin integrar/promover. Snapshot `.local/promotion-20261024T151930Z/before-main.dump.dpapi` verificado, solo lectura y sin restaurar; actualizar antes de otra promoción según cambios.
- Autorización de publicación permanente tras checks vigente; no pedir aprobación separada de main. No autoriza destruir/restaurar datos productivos, QA productiva ni Gmail. Santander y otros bancos elegidos permanecen consentidos; falta próximo aviso habitual con registro único/asociación correcta. No hacer compras para probar; Etapa10 abierta.

Siguiente: resolver/revalidar CI de #125 y CI del HEAD exacto de esta entrega; integrar sin confundir las ramas y promover con respaldo/verificaciones. Reconciliar #124 con develop actualizado sin publicar el bloqueo antes de la prueba física. Al reconectar, APK final y diálogo automático/cancelación/reintento/retorno; no repetir reinicio/persistencia/widgets acreditados sin motivo. Continuar los pendientes reales de Etapas12/13; diseño general al final. Mantener plan local y prompt con los tres worktrees y HEAD/CI/producción separados.

## Histórico: privacidad nativa de pantalla 0.1.9

Este avance prevalece sobre 0.1.8 como APK actual. La autorización permanente de publicación tras comprobaciones permanece vigente; no autoriza destruir/restaurar datos ni activar Gmail.

- Base verificada: develop `f74c097896c660f19297c2611c8d2e30a3a3220f`, CI360/40103010727 SUCCESS. #121 documental integrado tras CI359 y siete checks correctos de `2b99210`. Rama nueva `mejoras/etapa-12-privacidad-pantalla` desde ese remoto.
- Implementado control Android opcional en Configuración → Seguridad: protección nativa de capturas y vista previa, preferencia privada por dispositivo, sin logout ni cambios bancarios. `FLAG_SECURE` y API de Recientes desde Android13; lectura del estado real, booleano estricto, errores/reintento sin fingir éxito. El bloqueo biométrico/de acceso aún no está implementado. Detalle/fuentes en `PRIVACIDAD_PANTALLA_ETAPA_12.md`.
- Validación: 434 unitarias frontend correctas, diez nuevas; builds web/debug/release y Android lint/JVM correctos; diez E2E locales correctos con ausencia de control ficticio en web. Una instrumentada Samsung correcta, repetida tras completar Recientes: flag real, validación, recreación, preferencia de tipo inválido recuperable y sesión nativa intacta. Preferencia debug restaurada; instrumentación desinstalada y debug detenida. Sin QA productiva.
- APK/dispositivo: release 0.1.9/código10 instalada con firma/datos y fecha original 2026-10-22 00:26:31 conservados. SHA256 `6BFF7E70739FE431F595DECAEE70DF9C7C2F094E719C340CF2E86D94358290E3`, `.local/releases/Kaptal-0.1.9.apk` y Descargas. Acceso a notificaciones retenido. El propietario activó la opción y confirmó capturas bloqueadas y vista de Recientes protegida. Conservarla; no desactivarla para capturas de diagnóstico.
- Producción al iniciar este incremento: main `4f3651efcd9424a154c21fb2893d0ac925a5cdf4`, guía 0.1.8 publicada, CI358/Android46 y Render/Vercel correctos, HTTPS/config Google y V11–V14 comprobados. Privacidad 0.1.9 instalada no equivale todavía a integración web/publicación del código.
- Piloto bancario: Santander configurado y otros bancos seleccionados intencionalmente, consentidos por el propietario. No desconectar por bloqueo/privacidad. Esperar próximo aviso habitual para formato/asociación/un solo movimiento; no compras de prueba ni avisos sintéticos productivos. Etapa10 sigue abierta; Gmail deshabilitado.

Siguiente: CI del HEAD exacto y PR/integración/publicación; después bloqueo/biometría nativos y accesibilidad amplia, seguido de Etapa13 en ramas nuevas desde develop actualizado. El propietario aclaró que su duda sobre el alcance no era una cancelación y autorizó expresamente continuar con todos estos puntos. No repetir persistencia cifrada, reinicio físico o widgets ya acreditados sin motivo nuevo. Mantener estado/plan/copia local y `.local/CONTINUAR_ANDROID_PRIVACIDAD_ETAPA_12.md` sincronizados. Diseño al final.

## Histórico: guía inicial 0.1.8 y configuración bancaria real

Este avance prevalece sobre las referencias a 0.1.7 como APK actual y al piloto todavía sin configurar. La autorización permanente de publicación sigue vigente; Gmail permanece deshabilitado.

- Base comprobada: develop `7f6b787ef9c87728510b5b5cf0eeccc8948d4d3a`, CI353/40067585130 SUCCESS. Rama nueva `mejoras/etapa-12-guia-inicial` desde ese remoto, sin implementar directamente en develop.
- Integración comprobada: #119 fusionado en develop `b6b1e3da1c18739e55c145dc22e2a32870093b36` tras catorce checks correctos del HEAD `5ec35e0e9c46100029b1fb62abcd66b1c6947cb0` (CI354/355, Android43 y Vercel). #120 fusionado en main `4f3651efcd9424a154c21fb2893d0ac925a5cdf4` tras quince checks correctos de b6b1e3d (CI356/357, Android44/45 y Vercel). Documentación de cierre en rama nueva `entrega/android-0-1-8-cierre` desde ese develop remoto.
- Etapa12: guía breve y omitible bajo el resumen, con enlaces reales a cuentas/movimientos/presupuestos/Avisos; reapertura desde Configuración con foco y título visible. Preferencia local por usuario/dispositivo, tolerante a almacenamiento bloqueado. No solicita permisos, activa canales ni crea datos por mostrarse. Detalle en `GUIA_INICIAL_ETAPA_12.md`.
- Validación local: ocho pruebas nuevas, suite frontend 424 correctas, build web/release correcto; diez E2E de guía/regresión móvil correctos y recorrido final ampliado de tema claro/oscuro, letra grande, foco y reapertura correcto. Datos sintéticos y servicios locales; sin QA en producción.
- APK física: 0.1.8/código9 instalada como actualización; firma original SHA256 `b5f360604095a50f3208299767dcedca2f3acfc5087df8be1fde9cc075c120c3` y primera instalación 2026-10-22 00:26:31 conservadas. El propietario confirma guía visible, omisión y reapertura correctas. APK `.local/releases/Kaptal-0.1.8.apk` y Descargas; SHA256 `979CE4DF15268A19643E14EBA3F0DEFDB8BC8C6BB9400F01A8FE3C7BB5AA4D45`. No se borraron datos ni cerró sesión para actualizar; acceso Android a notificaciones conservado y verificado sin publicar otros permisos. Debug sigue detenida.
- Piloto real: propietario creó su cuenta Santander, concedió acceso Android y confirmó «Registro automático activado» tras seleccionar cuenta/lista y consentimiento. Consulta de solo lectura corrobora una configuración Santander vigente en el servidor. También seleccionó otros bancos y confirmó expresamente que desea registrar sus compras reconocidas; conservar esa selección y no activar bancos nuevos por iniciativa del asistente. Evidencia privada de booleanos `.local/santander-pilot-configuration-result.json`.
- Límite del piloto: configuración activa no acredita formato real, recepción ni un único movimiento. Esperar próximo aviso habitual consentido, sin compras de prueba, importaciones antiguas ni publicar datos bancarios. Etapa10 sigue abierta. No repetir persistencia/reinicio, widgets o configuración sintética aprobados sin motivo.
- Producción 0.1.8: main `4f3651efcd9424a154c21fb2893d0ac925a5cdf4`, Render deployment GitHub `7295092029` y Vercel Production `7295097251` SUCCESS. HTTPS/health UP, cliente Google nuevo y V11–V14 correctos; manifiesto y hashes de `/main-5YYYMASS.js` y `/chunk-EPYYSCOL.js` coinciden con la entrega. Sin migraciones nuevas ni cambios backend en este incremento. Comprobaciones posteriores de ese commit: [CI358](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/40070372816) y [Android46](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/40070372792); consultar esos resultados exactos y el prompt local de cierre.
- Respaldo previo actualizado `.local/promotion-20261024T062034Z/before-main.dump.dpapi`: origen solo lectura, cifrado DPAPI, descifrado/hash y catálogo verificados. Este snapshot nuevo no se restauró; conservar el alcance del ensayo local previo documentado. No se borró ni restauró producción.

Siguiente: cerrar las comprobaciones posteriores y la documentación; continuar piloto esperando aviso habitual. Después privacidad/bloqueo nativo y accesibilidad amplia de Etapa12, luego mediciones/operación de Etapa13, en ramas nuevas desde develop actualizado. El bloqueo de interfaz no debe cerrar sesión ni desconectar el registro bancario. Diseño al final. Estado exacto de HEAD/CI/integración al cerrar en `.local/CONTINUAR_ANDROID_0_1_8.md`; verificar siempre GitHub antes de asumir que un estado histórico sigue vigente.

## Estado vigente: Google 0.1.7 y promoción publicados

Esta sección prevalece sobre los apuntes históricos siguientes, incluidas sus peticiones de aprobación separada y sus estados de OAuth/APK ya superados.

- **Autorización:** publicación permanente autorizada por el propietario tras las comprobaciones. No volver a pedir aprobación de main/producción. No autoriza acciones destructivas, restauraciones de datos ni Gmail; tampoco QA en producción.
- **OAuth público:** el propietario cambió GOOGLE_CLIENT_ID en Render; despliegue terminado. Render directo y Vercel HTTPS responden health UP y config con `877485729157-o5gasaa8saor9ulogjlgfirni6262emv.apps.googleusercontent.com`. Clientes Android release/debug ya creados en el mismo proyecto controlado; no recrearlos ni pedir acceso al proyecto anterior.
- **Login físico:** Google mediante el botón normal de Kaptal Pruebas llegó al dashboard y permitió lectura autenticada de cuentas HTTP200/success. El propietario confirma cuenta esperada y aclara que es reciente, todavía sin cuentas financieras; no afirmar conservación física de cuentas que no existían. Cinco AuthServiceTest cubren continuidad/rechazo de identidad de forma aislada.
- **Logout/cancelación:** cierre real en Configuración/Seguridad, sesión local eliminada; selector Google cancelado con Atrás, retorno al login y reintento habilitado, sin sesión creada. Los intentos incompletos del arnés se resolvieron al corregir navegación/localización del control. Evidencias privadas solo de booleanos: `.local/google-normal-flow-result.json` y `.local/google-normal-logout-cancel-result.json`. No ejecutar `.local/validate-android-live.cjs`, que crea QA productiva.
- **APK/dispositivo:** Samsung SM-A546E conectado. Release 0.1.7/código8 instalada con actualización y login real confirmado por el propietario; misma firma y primera instalación 2026-10-22 00:26:31 conservadas. APK `.local/releases/Kaptal-0.1.7.apk` y Descargas, SHA256 `89A8B40EB6176E2008411B7EC567DBB6103BF8920F622BEA10B51A2D32C8EE03`. Debug sin diagnóstico 0.1.7-pruebas/código8 instalada y detenida; release al frente. Sin borrado de datos ni activación bancaria.
- **Integración:** #117 integrado en develop `59768f690d0e53e27b77c40756951b5b8e5cdf72` tras los 14 checks correctos de `86d0b4368b14a18fa0e6a2a94f36bbb2423a730b` (CI347/348, Android39 y Vercel). CI344/Android37 también pasaron para el anterior aa102bf. Rama nueva de entrega `entrega/promocion-android-0-1-7` desde origin/develop actualizado; documentación de seguimiento aquí.
- **Promoción:** #116 integrado en main `f4aee67d3ff0f35ce49cc89e35337523e68b0a4d` tras 15 checks correctos de `59768f6` (CI349/350, Android40/41 y Vercel). Render y Vercel registran despliegue SUCCESS del commit main; health UP y cliente Google nuevo por HTTPS en ambos. Bundle principal servido y manifiesto coinciden con la entrega. CI351/40066434493 y Android42/40066434483 de main SUCCESS: siete checks posteriores correctos, incluidos E2E/API/PWA. No confundir checks previos de promoción con los posteriores de main.
- **Respaldo/migraciones:** snapshot previo a promoción `.local/promotion-20261024T052812Z/before-main.dump.dpapi`, origen solo lectura, cifrado DPAPI, descifrado/hash y catálogo verificados. Snapshot nuevo no restaurado; ensayo local previo V11–V14 conservó datos, documentado en `ENTREGA_ANDROID_0_1_6_Y_PROMOCION.md`. Consulta productiva posterior de solo lectura confirma V11–V14 aplicadas. No se restauró ni borró producción.
- **Piloto/etapas:** preparación en `PILOTO_SANTANDER_ANDROID_0_1_7.md`; Santander instalado. Configuración real y próximo aviso habitual consentido pendientes, sin compras de prueba. No repetir bloqueo/reinicio, widgets o accesibilidad ya acreditados sin motivo. Etapa10 sigue abierta; Etapas12/13 completas continúan en ramas nuevas desde develop actualizado, diseño al final. Gmail deshabilitado.

Siguiente: integrar la documentación final tras sus checks → configuración Santander con el propietario y próximo aviso habitual → resto de Etapas12/13 en ramas nuevas. Mantener separados CI, integración, APK/dispositivo y producción.


## Apuntes historicos (prevalece el estado vigente anterior)

## Autorizacion vigente de produccion

El propietario autoriza expresamente de forma permanente los pasos de publicacion en produccion de Kaptal tras comprobaciones satisfactorias. Sustituye el requisito historico de pedir aprobacion separada para main/publicacion. No volver a pedir esa aprobacion; no asumir autorizacion para acciones destructivas, restauraciones de datos ni activar Gmail. Primero resolver GOOGLE_CLIENT_ID y validar sesion Google real; luego continuar #117/#116 tras checks exactos. Herramientas actuales sin conector Render ni credencial disponible: guiar al propietario en kaptal-api > Environment para sustituir SOLO GOOGLE_CLIENT_ID por el cliente propuesto y desplegar; verificar config publica despues. Cambio aun no ejecutado.


## Cliente Google del propietario validado de forma aislada

Cliente web nuevo del proyecto 877485729157: prueba fisica aislada correcta. Credential Manager devolvio token y jose verifico firma/audiencia/emisor/expiracion y correo verificado; solo booleanos guardados, sin login ni escrituras productivas. Propuesta concreta .local/google-oauth-transition.json conserva cliente anterior y nuevo; GOOGLE_CLIENT_ID publico aun pertenece a 809732796581. Pendiente aprobacion separada para cambiar solo esa variable en Render, verificar sesion real y continuidad de cuenta. #116 sigue borrador; no autoriza merge main ni V11-V14. Log temporal del plugin retirado. Detalle docs/ANDROID_GOOGLE_NATIVO_ETAPA_12.md.


## Diferencia de proyectos OAuth confirmada

El propietario confirma que solo controla los proyectos visibles en su cuenta; el proyecto Gmail personal es 877485729157 y los nuevos Android pertenecen a este. El backend publico sigue entregando cliente web de 809732796581, obtenido de GOOGLE_CLIENT_ID; no esta fijado en la APK/repositorio y no se acredita acceso al proyecto original. No seguir pidiendo buscar otras cuentas. Preparar cliente WEB de acceso en proyecto controlado junto a Android, validar de forma aislada y revisar continuidad de identidad antes de proponer cambio productivo. No sustituir GOOGLE_CLIENT_ID productivo sin aprobacion separada; no activar Gmail ni alterar su cliente Desktop. Propuesta aun sin ejecutar en consola.


## Diagnostico actual del proveedor Google

Build debug de diagnostico compilado e instalado solo en com.kaptal.app.debug. Tercer intento con cuenta elegida por propietario: GetCredentialCustomException, tipo Google Password Manager. No hubo ID token enviado al backend. Cliente web publico consultado: proyecto numerico 809732796581. Pregunta pendiente: confirmar que ID de cliente Android Kaptal Pruebas empieza por 809732796581-. No registrar mensajes completos ni tokens. Cambio temporal sin commit en GoogleSignInPlugin.java: log de clase/tipo solo para app debuggable; revisar o retirar al cerrar diagnostico. Release del propietario sigue 0.1.6; #117 y #116 en borrador. CI success de 1071fd4 no cubre este cambio temporal.


## Login Google real: fallo del proveedor en investigacion

Samsung reconectado. El selector Google aparecio y el propietario eligio su cuenta habitual dos veces; ambas devolvieron GOOGLE_UNAVAILABLE desde el plugin antes de enviar el ID token al backend. No hay login real aprobado. Firma debug SHA-1 revalidada y coincidente con la guia. Se prepara build debug de diagnostico con clase/tipo de excepcion, sin mensajes del proveedor, cuentas ni tokens. No instalar release ni integrar #117 mientras no se resuelva.


## OAuth Android confirmado por el propietario

El propietario confirma creados los dos clientes Android (release y pruebas) en Google Cloud. Falta verificar el resultado mediante login real; no se inspecciono la consola ni se capturaron secretos. CI342/40062424909 y Android36/40062425053 finalizaron success para HEAD 1071fd41c5f1c072a8db29b0956a63a549ac04fc de #117. El telefono no aparece en ADB al retomar; se solicito reconexion y desbloqueo. PR sigue borrador, sin integrar. Main/produccion sin cambios.


## Seguimiento PR #117 y Google Cloud

PR #117 en borrador, commit funcional d6bbc6c235d29fb8c0d67e74440c0b2087430b6b. CI 340/40062296550 y Android 35/40062296548 en curso al revisar; frontend, backend y contratos ya correctos. Telefono conectado; sin fixtures escuchando en 18082/15434. Falta confirmar clientes OAuth en Google Cloud y login real; no integrar ni promover por dar por terminada esa interaccion.

## Cierre de compilacion Google nativo 0.1.7

Build Android debug/release compatible, lint/JVM y una prueba instrumentada Samsung correctos. APK firmada con certificado release conservado: .local/releases/Kaptal-0.1.7.apk y Descargas; SHA256 89A8B40EB6176E2008411B7EC567DBB6103BF8920F622BEA10B51A2D32C8EE03. No instalada sobre release: faltan clientes OAuth Android y login real del propietario. Configuracion/cancelacion real pendientes; detalle actualizado en docs/ANDROID_GOOGLE_NATIVO_ETAPA_12.md. #116 verificado abierto y en borrador, main d39d899 sin cambios.


## Trabajo vigente: Google nativo necesario para el propietario

El propietario confirmó que solo utiliza Google y eligió Santander para el piloto. La release 0.1.6 ya instalada arranca en login y conserva la limitación previa de Google solo web. No dar por configurado el banco ni por validado el login habitual de la APK. PR de promoción #116 convertido a borrador hasta resolver el incremento Google nativo y su configuración OAuth; main sigue d39d899, sin despliegue nuevo.

Rama nueva `mejoras/android-google-nativo-etapa-12` desde develop d3e97da. Se prepara 0.1.7/código 8 con Credential Manager, botón explícito, validación Google existente del backend y limpieza de sesión del proveedor al salir. Sin Gmail/Drive. Seis pruebas del componente correctas (incluido GIS web sin regresión), 18 focalizadas iniciales y build web correctos; compilación Java/lint/JVM inicial correctos. Compatibilidad resuelta con googleid 1.1.1: build final debug/release y puente Samsung correctos. Login real todavía pendiente.

El propietario debe revisar clientes OAuth Android en el proyecto web existente: paquetes/firma y pasos detallados en `docs/ANDROID_GOOGLE_NATIVO_ETAPA_12.md`. No solicitar ni imprimir contraseñas, secretos OAuth o tokens. No crear cuentas QA en producción ni elegir una cuenta Google distinta de la habitual en la prueba. La configuración del proyecto y el selector de cuenta requieren su interacción. Google nativo no cierra la Etapa 12 completa; onboarding/privacidad/bloqueo y auditoría amplia siguen después.

## Histórico: APK 0.1.6 instalada y promoción preparada

Release 0.1.6/código 7 instalada como actualización en Samsung; misma firma y fecha original conservadas, arranque comprobado. APK y hash en `docs/ENTREGA_ANDROID_0_1_6_Y_PROMOCION.md`; copia en Descargas. Letra 1.5/giro físico con borrador conservado y cierre accesible aprobados en debug aislada. El propietario confirmó etiquetas de login con TalkBack; ajustes originales restaurados y verificados tras una desconexión USB. Fixture cerrada sin movimientos/conexiones, backend apagado; no confundir este alcance con auditoría completa de accesibilidad.

Respaldo productivo nuevo cifrado DPAPI, catálogo/descifrado/hash verificados; restauración local y DDL V11–V14 ensayados conservando columnas/datos anteriores. Instancia temporal 15434 y datos restaurados retirados. Sin escrituras en producción. Main continúa d39d899; promoción pendiente de PR/checks y aprobación separada. El backend público todavía no incorpora V11–V14; registro bancario de release no activado. Gmail deshabilitado.

Rama nueva `entrega/android-accesibilidad-apk-0-1-6` desde develop 81b9293: bump de versión y arreglo del script Windows ante avisos de javac. No repetir pruebas satisfactorias sin motivo. Siguiente: integrar la entrega tras CI, preparar PR de promoción revisable, aprobación separada, comprobar HTTPS y piloto bancario consentido; después Etapas 12/13 en ramas nuevas, diseño al final. Etapa 10 sigue abierta.

## Histórico: configuración y accesos físicos comprobados (2026-10-23)

Samsung conectado: configuración interactiva con API H2 aislada aprobada (consentimiento, mapeo sintético, activación nativa y desconexión); dos instrumentadas del widget correctas; arranque frío Ingreso tras login y tres acciones en caliente aprobados. Los tres accesos reales del launcher Samsung y los tres botones del widget ya pasaron. Vencimiento simulado con renovación y logout → acción protegida → login → captura solicitada correctos. Ningún formulario guardó movimientos. Detalles y límites en `docs/VALIDACION_ANDROID_CONFIGURACION_ACCESOS.md`.

La interrupción previa causó timeout del arnés; sus éxitos UI se conservaron. H2 nueva usada solo para pendientes: cierre satisfactorio, una prueba con cero fallos/errores y aserciones de cero movimientos/conexiones. Evidencia `.local/configuracion-accesos-cierre-backend.log`. Backend apagado y credenciales temporales eliminadas. Logout debug, marca nativa cerrada, cola cifrada ausente, permiso de escucha retirado y APK de instrumentación desinstalada. Widget QA retirado desde el launcher; debug detenida al terminar. Release del propietario no sustituida, sin cambios en producción.

Esta rama `validacion/android-configuracion-accesos-fisicos` registra evidencia física y parches del tooling de desarrollo necesarios para resolver el bloqueo de auditoría de CI 333. No cambió el código funcional ni migraciones. Lockfile: Angular CLI 21.2.28, body-parser 2.4.0, fast-uri 3.1.9, undici 6.29.1/7.30.1 y zod 4.6.6; override de undici limitado a Angular Build. Mantener el control de auditoría sin ampliar excepciones. Revalidar checks del HEAD final de PR #114 antes de integrar. Base `origin/develop` 0d90675. No repetir pruebas aprobadas sin motivo. Etapa 10 sigue abierta por revisión manual TalkBack/giro/letra grande de los nuevos accesos, HTTPS público y piloto bancario real consentido tras autorización. Gmail deshabilitado. Siguiente: revisión manual o Etapas 12/13 en rama nueva; main/producción requieren aprobación separada.

## Histórico: avance físico interrumpido

Configuración interactiva local ya aprobada en Samsung: consentimiento, asociación sintética, activación nativa y desconexión con revocación. Dos instrumentadas del widget correctas; arranque frío Ingreso tras login y tres acciones en caliente correctos. Launcher y widget reales: Gasto correcto. APK debug instalada; release del propietario sin sustituir. Evidencia y límites en `docs/VALIDACION_ANDROID_CONFIGURACION_ACCESOS.md`.

La interrupción dejó caducar los arneses: fixture H2 terminó por timeout y no ejecutó sus aserciones finales. Sin backend 18082 activo ni credenciales temporales locales al retomar. Teléfono no detectado por ADB; faltan botones restantes, recorridos físicos adicionales y limpieza final del dispositivo. No repetir pasos aprobados sin motivo. Etapa 10 abierta; Gmail deshabilitado y producción sin cambios.

## Histórico: accesos/widget integrados en develop (2026-10-23)

PR #112 integrado en `226f0a78dfd4436d227b5ad39c0f1064b52ea5c5`, con expected_head_sha `5b27ac358c756c246137948333064a747cee8ee6`. CI 329/40005808293 y Android 28/40005808351 correctos para ese HEAD: seis jobs CI y APK, incluidos PostgreSQL/recuperación, E2E/API y PWA. Frontend CI: 410 pruebas correctas. Local: 20 focalizadas, nueve JVM, build web, lint sin errores y APKs debug/instrumentación compiladas. No confundir con ejecución física de la nueva instrumentación. #110/#111 también revalidados como integrados. Main sigue `d39d89952a18959511032880457aaccff4bb5f66`, sin despliegue ni cambios financieros de producción.

Accesos Gasto/Ingreso/Dictar del launcher y widget de tres botones, sin datos financieros, reutilizan `accion-captura.ts` y guard/login existentes. Preparada APK debug separada `.local/releases/Kaptal-accesos-e744b0d-debug.apk` (SHA256 `C9E29EF4673600882D9AF7206E09BA5262823CB038C63DC8A67DE5963339985B`), no instalada. Release del propietario: última comprobada 0.1.4; release 0.1.5 anterior solo compilada. Ver `docs/ANDROID_ACCESOS_WIDGETS_ETAPA_10.md`.

Etapa 10 abierta. Ya pasaron persistencia cifrada y deduplicación tras bloqueo/reinicio físicos (registros `automatico-lifecycle-*`); no repetir sin motivo. Pendientes: configuración interactiva y launcher/widget/arranque frío/retorno de sesión/TalkBack en el teléfono desconectado; HTTPS público y piloto bancario consentido tras despliegue autorizado. Fixtures locales sin procesos activos; credenciales temporales retiradas. Pruebas optativas previas preservadas en #112. Gmail deshabilitado, sin QA nuevo en producción. Merges a develop autorizados tras checks; main/producción requieren aprobación separada.

Siguiente: conectar teléfono para configuración y accesos; después Etapas 12/13 y diseño al final. Leer continuidad `.local/CONTINUAR_ANDROID_0_1_5.md`. Los estados siguientes son históricos de su fecha.

## Histórico: accesos y widget Android (2026-10-23)

GitHub revalidado: #110 y #111 integrados; base remota `f0ca6047ae10719133034790f6474268be6c4fcf`. Rama nueva `mejoras/android-accesos-widget-captura`, creada desde ese origin/develop. Main sigue `d39d89952a18959511032880457aaccff4bb5f66`; sin despliegue. La rama conserva los dos tests antes no publicados de `validacion/android-configuracion-ciclo-fisico`.

Persistencia cifrada y deduplicación tras bloqueo y reinicio físicos satisfactorias, según pruebas ya realizadas y registros `.local/automatico-lifecycle-{seed,locked,rebooted,cleanup}.txt` (cada fase OK). No se repitieron. Configuración interactiva sigue pendiente; teléfono desconectado. No había fixtures en ejecución ni listeners en 18081/18082 al revisar; archivo temporal de credenciales de configuración retirado. No tocar GlassFish/Derby ni daemons de compilación ajenos a la fixture.

Implementados tres accesos dinámicos del launcher (Android 7.1+) y widget de pantalla de inicio (Android 7+) con gasto/ingreso/dictar. Intents explícitos, PendingIntents inmutables distintos y lista cerrada de acciones; sin importes, cuentas, balances ni credenciales. Puente Capacitor consume la acción una vez y Angular reutiliza `accion-captura.ts`, `/dashboard`, guard y retorno de captura tras login. Arranque espera la navegación inicial. Dictar abre la captura existente, sin activar el micrófono automáticamente. Mantener pulsado el icono permite acceder a los atajos según launcher; widget disponible en su selector.

Validación local correcta: build web, 20 pruebas focalizadas de puente/guard/login, nueve JVM y builds Android debug/instrumentación; lint sin errores (16 avisos y un hint). PR #112 abierto hacia develop; CI 327/40005657088 y Android 27/40005657084 arrancaron sobre código e744b0d. Consultar checks del HEAD final, incluidos commits documentales, antes de integrar. Detalle en `docs/ANDROID_ACCESOS_WIDGETS_ETAPA_10.md`. No dar por probado el launcher/widget físico, arranque frío/retorno a sesión en dispositivo ni TalkBack. Etapa 10 sigue abierta por configuración interactiva, validación física de estos accesos, HTTPS público tras autorización y piloto bancario consentido. No repetir suites anteriores sin cambio/riesgo nuevo. Gmail deshabilitado; no recrear QA en producción. Merge a develop autorizado solo tras checks del HEAD exacto; main/producción requieren aprobación separada.

Siguiente: completar pruebas/CI y revisar PR de esta rama; después validar configuración y accesos en teléfono, luego Etapas 12/13 y diseño al final. Continuación local: `.local/CONTINUAR_ANDROID_0_1_5.md`.

## Histórico: registro automático integrado (2026-10-23)

PR #110 integrado a develop en `6b81bbc92d629bf822ed8b8f5a3391e4404cb150`, con `expected_head_sha=56870dc5689bc47ef101c1203b9b8097225b57e6`. GitHub confirmó CI 321/39914158715 y Android APK 25/39914158564 correctos para ese HEAD: seis jobs verdes, incluidos PostgreSQL/migraciones/recuperación, E2E/API y PWA. Main remoto sigue en `d39d89952a18959511032880457aaccff4bb5f66`. Esta integración no despliega ni activa producción.

Requisito vigente: compras reconocidas se registran sin confirmación individual; ambiguos y posibles duplicados requieren revisión. Santander, American Express, BBVA y Sears Visa: crédito; solo Revolut: débito. Cinco cuentas inicialmente MXN y cero, sin inventar límites, fechas ni cashback. Limpieza terminada: no repetir ni recrear QA en producción; las fixtures antiguas pertenecen a usuarios eliminados. Datos privados solo en `.local/canales-bancarios-autorizados.private.json`, sin imprimir ni comprometer.

Implementado: receptor limitado por dispositivo, V14, clave revocable/caducable, contabilidad idempotente, configuración de cinco proveedores, parsers Sears/Gastaste y cola AES-GCM/Keystore con WorkManager. No lee historial SMS. Los cuatro formatos distintos de Sears se describieron de memoria: no hay compatibilidad universal acreditada. Las tarjetas sin límite conocido admiten deuda sin inventarlo; los límites configurados siguen comprobándose.

Evidencias revalidadas: PostgreSQL aislado 15433, 517 pruebas, cero fallos/errores y una omitida optativa (`.local/automatico-postgres-full.log`); Samsung, 21 instrumentadas (`.local/automatico-instrumentation-all.txt`) y una HTTP física parser Sears → cola cifrada → Worker → Spring/H2 aislado → movimiento único tras reenvío (`.local/automatico-device-http-native.txt` y `.local/automatico-device-http-backend.log`). Frontend 406, parsers JVM 8 y lint/builds correctos según cierre de #110. No repetir suites satisfactorias sin cambio/riesgo nuevo ni tocar PostgreSQL habitual 5432.

APK 0.1.5/código 6 compilada/firmada: `.local/releases/Kaptal-0.1.5.apk`, SHA256 revalidado `EFF027190F0F6EF9D5EBEDAF820C4E8211DCBA25E87DC112FD4B5ACD04852761`. No instalada sobre la release del propietario: última comprobada 0.1.4. Pruebas en debug separada; permiso debug y APK de instrumentación retirados al terminar las pruebas anteriores.

Etapa 10 abierta: faltan configuración interactiva, bloqueo/reinicio físicos y, tras despliegue autorizado, HTTPS público y piloto consentido con formatos reales. HTTP aislado no acredita TLS público ni activación. Después: accesos/widgets/gestos en NUEVA rama desde develop remoto actualizado, sin reutilizar la rama vieja `mejoras/android-accesos-widgets`. Reutilizar `accion-captura.ts` (nuevo-gasto/nuevo-ingreso/dictar), comprobar autenticación, arranque frío y retorno a sesión; widgets sin datos financieros en pantalla bloqueada. Luego Etapas 12/13 y diseño al final.

Merges a develop autorizados tras comprobaciones; main/producción requieren aprobación después de preparar una promoción comprobada. Diff main→develop: V11 (reparto por partes), V12 (metas), V13 (trazabilidad de divisas), V14 (conexiones Android), además de Etapa 11 sin desplegar. Revisar las cuatro migraciones, respaldo/recuperación y compatibilidad antes de publicar. Gmail deshabilitado, Etapa 6 omitida.

Continuación vigente: `.local/CONTINUAR_ANDROID_0_1_5.md`; leer AGENTS.md y `docs/ANDROID_REGISTRO_AUTOMATICO_ETAPA_10.md`. Los apartados históricos siguientes son evidencia de su fecha, no instrucciones ni estado actuales.

## Histórico: Prioridad vigente: datos reiniciados y registro bancario automático (2026-10-23)

El propietario autorizó eliminar los usuarios de prueba y su contenido, conservar únicamente su usuario de Google y vaciar sus datos financieros. Operación realizada y verificada: ocho usuarios eliminados, uno conservado con identidad/autenticación/sesiones intactas; 28 cuentas y 48 movimientos antiguos eliminados; cinco cuentas nuevas en MXN a cero. Santander, American Express, BBVA y Sears Visa son crédito; solo Revolut es débito. Sin límites, corte/pago ni cashback inventados. Ver `docs/REINICIO_DATOS_PRUEBA_2026_10_23.md`; copia cifrada y evidencias privadas en `.local/reset-20261022/`. No repetir la limpieza ni reutilizar la fixture Android del usuario eliminado para crear más datos en producción.

El requisito vigente de Etapa 10 es registrar automáticamente los movimientos reconocidos, especialmente gastos, sin confirmación por cada compra. Esto sustituye la preferencia anterior de revisión obligatoria. El propietario eligió Santander, Revolut, American Express y BBVA, y añadió Sears Visa por SMS con un ejemplo real. Remitente, terminación y asociación de identificadores de cuenta se guardan solo en `.local/canales-bancarios-autorizados.private.json`; no comprometerlos. Los casos ambiguos y las posibles duplicidades no deben registrarse a ciegas. La APK 0.1.4 aún conserva el flujo manual: automático pendiente de implementar, probar y activar.

Rama de limpieza/documentación `mantenimiento/limpieza-datos-prueba`, nueva desde origin/develop `3676f5d` revalidado. La operación de datos no despliega código; main sigue sin actualizarse. Merges a develop autorizados tras comprobaciones. Siguiente: nueva entrega de registro bancario automático en `mejoras/android-registro-bancario-automatico`; después accesos/widgets/gestos útiles, Etapas 12 y 13, y modificaciones de diseño al final. No llamar cerrado al piloto bancario sin pruebas reales consentidas, bloqueo/reinicio y deduplicación. Gmail deshabilitado y Etapa 6 omitida.



## Histórico: Avance vigente: Etapa 10, notificaciones consentidas (2026-10-22)

PR #107 integrado a develop en `b158f04617b926f4ba05de31062e03d0ed48c46d`, desde `mejoras/android-notificaciones-consentidas`, creada en `origin/develop` revalidado `5de3683`. Código `2a149811a5a07f2bc278cfb8ff29154612f88b53`: CI 304/39902079287 y Android 18/39902079348 correctos, incluidos 33 E2E/API y 4 PWA sobre PostgreSQL; seis jobs de CI verdes, con recuperación de base comprobada. Main permanece `d39d89952a18959511032880457aaccff4bb5f66`, sin despliegue nuevo. La rama `docs/cierre-android-0-1-4` se creó desde ese develop actualizado para registrar el cierre; consultar su PR para el estado documental remoto.

Implementado NotificationListener con consentimiento, apps elegidas explícitamente y recepción desactivada/selección vacía por defecto. Cola privada ligada a sesión, 20 pendientes/100 identidades/24 horas, filtro local antes de leer contenido, indicadores conocidos de OTP/tarjetas rechazados y borrado al pausar, cambiar/cerrar cuenta o revocar acceso. Repeticiones y actualizaciones conservan identidad; publicar otro evento requiere su propia revisión. Solo el resumen y los campos revisados se envían a Avisos como NOTIFICACION; recibir deja PENDIENTE y no registra dinero.

Samsung SM-A546E/Android 16: 10 pruebas instrumentadas de almacenes y regresiones correctas; prueba del servicio real con emisor sintético, actualización, segunda publicación y revocación/borrado correctos. Recorrido por UI física correcto: consentimiento, selección del APK emisor sintético, repetición, force-stop/reapertura conservando UUID, revisión sin original en backend, pendiente sin cambiar saldos, reintento HTTP con el mismo aviso, descarte y pausa. Los permisos de escucha de QA se retiraron al terminar; ninguna app bancaria real fue elegida. No se registraron movimientos financieros nuevos.

Frontend 402 correctas; builds web/debug/instrumentación/release firmada correctos. Auditoría sin vulnerabilidades de producción; cinco alertas conocidas de desarrollo sin parche. El E2E local no arrancó: su fixture apunta a la instancia aislada apagada de PostgreSQL en 15433; las regresiones E2E/API/PWA completas sí se ejecutaron correctamente en CI y esa es la evidencia vigente. No modificar el PostgreSQL habitual en 5432 para resolver esa fixture.

Release 0.1.4/código 5 instalada como actualización en Samsung, con firma y fecha original conservadas. Copias `.local/releases/Kaptal-0.1.4.apk`, alias `kaptal-release.apk` y Descargas/Kaptal-0.1.4.apk. 3502117 bytes, SHA-256 `1FF2C4D85BCD00DE2C2FA4B1064DFD6CFF654C02F31C4F410F93734BF0326CC1`. Arranque release correcto; permisos bancarios reales no activados. La validación financiera y del servicio se hizo en debug separada; no confundirla con la instalación/arranque de release. Ver detalles y límites en `docs/ANDROID_NOTIFICACIONES_CONSENTIDAS_ETAPA_10.md`.

La autorización de merges a develop continúa vigente tras comprobaciones; main/producción quedan fuera. Gmail deshabilitado y Etapa 6 omitida. No cerrar Etapa 10: quedan piloto bancario con apps/formatos elegidos por el propietario, bloqueo y reinicio completo físicos, accesos nativos y después Etapas 12/13. La lectura bloqueada del almacén y force-stop de la app no equivalen a esas pruebas del teléfono. No activar permisos bancarios por iniciativa propia.



## Histórico: Etapa 10: compartir texto Android, primera entrega (2026-10-22)

El propietario autorizó merges automáticos de este trabajo a develop tras comprobaciones. #104 integrado en develop mediante 55bdfe93c8b642b158349d22d1e3f4a785d3d2aa, con CI 292/39876160988 y Android 12/39876160968 correctos. Main d39d899 sin despliegue nuevo. No volver a pedir autorización para estos merges a develop; producción sigue fuera de esa autorización.

Rama nueva mejoras/android-compartir-avisos desde origin/develop 55bdfe9 comprobado. Implementada recepción ACTION_SEND/text/plain con app abierta/cerrada, original local acotado y ligado a sesión, rechazo de indicadores de claves/tarjetas, revisión manual y envío explícito al contrato existente de Avisos. Recibir un aviso no mueve dinero; la confirmación financiera es posterior. Sin backend nuevo, IA, lectura automática de SMS ni acceso a notificaciones.

Release 0.1.3/código 4 instalada como actualización en Samsung SM-A546E/Android 16, firma y datos conservados; copia Descargas/Kaptal-0.1.3.apk y .local/releases/Kaptal-0.1.3.apk. Pruebas financieras en debug física separada: compartir/repetir/cancelar, persistencia sin red tras force-stop, envío solo de resumen revisado, aviso pendiente sin cambiar saldo, confirmación única de gasto sintético 42.00 y saldo 995.66; reintento no duplica. OTP rechazado y HTML inerte. 396 frontend y 3 instrumentadas nativas correctas; builds y auditoría correctos. PR #105 integrado a develop en 969b8fbc8becc59e925bcc2262363052cf8c23c7: CI 299/39883095963 y Android 16/39883095954 verdes sobre 03f732c, incluidos 33 E2E/API y 4 PWA con PostgreSQL.

Durante la prueba sin sesión se reprodujo recuperación de credenciales antiguas tras logout y muerte inmediata del proceso. Corregido con marca nativa persistida antes de completar login/logout y comprobada antes de crear AuthService; solo guarda cierre/identificador, no credenciales. Compartir antes de login y force-stop ya conserva intención sin recuperar sesión cerrada. El guard ahora intenta renovar al navegar con acceso vencido y conserva captura si falta red/cookie. Regresiones de expiración simulada en QA sobre hardware real correctas, además de renovaciones naturales anteriores; no confundir ambas evidencias.

Detalle, límites y huellas: docs/ANDROID_COMPARTIR_AVISOS_ETAPA_10.md. Estudio inicial de APIs y límites: docs/ANDROID_CANALES_VIABILIDAD_ETAPA_10.md; no acredita un lector universal de compras Wallet. No cerrar Etapa 10: queda implementar NotificationListener consentido con apps permitidas y pruebas de revocación/reinicio/bloqueo, validar accesos nativos y después Etapas 12/13. No examinar avisos reales ni activar permisos bancarios por iniciativa propia. Gmail deshabilitado y Etapa 6 omitida. Mantener pruebas prolongadas; segunda renovación natural y regresiones posteriores correctas.


## Histórico: Validación física y APK 0.1.2 (2026-10-22)

Rama `validacion/android-fisico-0-1-1`, desde develop c46d090; PR #104 pendiente de integrar. #102/#103 integrados en develop, main d39d899 sin despliegue nuevo.

Instalada release 0.1.2/código 3 en Samsung SM-A546E/Android 16, misma firma y fecha original de instalación. Copia en Descargas/Kaptal-0.1.2.apk y .local/releases/Kaptal-0.1.2.apk. Sin borrar datos ni modificar movimientos reales.

En Kaptal Pruebas separada, cuenta sintética y WebView física: registro/logout/login, renovación natural tras más de tres horas, gasto/ingreso/transferencia, edición/eliminación, saldos e historial correctos. Captura con Wi-Fi y datos realmente apagados, force-stop/reapertura sin red y sincronización única al recuperar conexión: correctos. Giro, letra grande, teclado real y retorno de segundo plano comprobados en formularios probados; ajustes del teléfono restaurados.

Corregidos permiso ACCESS_NETWORK_STATE (offline no detectado) y reinicio por fontScale (perdía importe sin guardar). ip-address de desarrollo actualizado a 10.7.4 por aviso nuevo que fallaba CI. Frontend 383 correctas, auditoría/build web y builds nativos correctos; instrumentación de arranque y permiso correcta. Código 81f86d7: CI 291/39875106382 y Android 11/39875106308 verdes, incluidos PostgreSQL/recuperación/E2E/PWA. Commits posteriores solo documentales; revisar también checks del head de #104 antes de integrar.

Evidencia y límites: docs/VALIDACION_ANDROID_FISICO.md. Asistente, evidencia de historial y contenido CSV de API coinciden en gasto sintético 12.34; guardado/compartición nativos del archivo pendientes. Finanzas probadas en debug física; actualización y firma en release. Una salida aislada por sesión expirada no se reprodujo: refresh 200 antes/después de force-stop tras relogin; conservar pendiente de sesiones prolongadas. Faltan pantalla bloqueada/reinicio, TalkBack, revisión total, voz/archivos/Google y privacidad. Backend nuevo de Etapa 11 sin despliegue. Preparación siguiente: .local/ETAPA_10_PREPARACION.md; aún sin implementación.

Siguiente: revisar e integrar #104 con autorización explícita; Etapa 10 sin Gmail en rama nueva desde develop actualizado → 12 → 13 → revisión final. Gmail deshabilitado, Etapa 6 omitida. No hacer merge ni despliegue por iniciativa propia.



## Histórico: Integración vigente (2026-10-22)

El propietario autorizó integrar #102/#103 y preparar todo lo posible sin teléfono. PR #102 integrado a develop mediante c8651d03de549b4f31a6c876dc825cf1d8f27edb. Rama Android actualizada con ese develop; conflictos limitados a cinco documentos, conservando los bloques históricos de ambas entregas. Sin despliegue a producción ni cambios en main.

Esta entrega unifica Etapa 11 y Android para develop mediante PR #103, con APK 0.1.1/código 2 firmada y preparada en `.local/releases/Kaptal-0.1.1.apk`. Backend: 503 correctas/6 omitidas; frontend: 383 correctas; build web y Android correctos. CI del código combinado `167f0da`: seis jobs correctos en ejecución 39825842507 y Android correcto en 39825842562, incluidos PostgreSQL, recuperación, E2E/API y PWA. Documentación final posterior sin cambios de aplicación. Ver `docs/INTEGRACION_ANDROID_0_1_1.md` para huellas, evidencia y checklist físico. Estado remoto del merge final y CI de develop: revalidar en GitHub y consultar `.local/CI_ANDROID_APK_CIERRE.md`.

Orden: integración → APK actualizada → validación física de sesión, operaciones y offline → Etapa 10 sin Gmail → 12 → 13 → revisión final. Etapa 9 completa provisionalmente; conserva sus pendientes físicos. Gmail deshabilitado y Etapa 6 omitida. Etapa 10 incluye compartir avisos/SMS seleccionados, notificaciones bancarias consentidas y estudio de Wallet/accesos; no supone lectura universal de SMS ni pagos Wallet.

Teléfono no disponible por decisión del propietario. No declarar login, renovación, segundo plano, operaciones, actualización u offline comprobados en Android físico. Sin movimientos financieros reales. Conservar firma privada y APK 0.1.0; instalar posteriormente como actualización con cuenta de prueba autorizada. Google nativo, voz/archivos Android, widgets y accesos nativos continúan pendientes.






### Historico Android

## Histórico: Avance vigente: base Android (2026-10-22)

Validación Android: APK release 0.1.0 firmada e instalada, copia en Descargas/Kaptal-0.1.0.apk y .local/releases/kaptal-release.apk. Prueba instrumentada física correcta en SM-A546E/Android 16: arranque local y health HTTPS, sin cuentas ni dinero reales. Frontend 382 y build/auditor?a correctos. PR #103 abierto hacia develop; CI del cierre pendiente de consultar. Sesi?n larga y capacidades nativas avanzadas siguen pendientes.

Rama `mejoras/android-apk` creada desde `origin/develop` revalidado `3af6e80`. Etapa 11 implementada en PR #102, abierto y sin integrar; CI final verde, ejecución 39731697875. Esta rama Android no incluye ese PR todav?a. Etapa 9 completada provisionalmente por decisi?n del propietario; conservar sus pendientes manuales para la revisi?n final.

Orden: 11 ? Capacitor/APK firmado descargable sin Play Store ? 10 sin Gmail ? 12 ? 13 ? revisi?n final. Base Capacitor 8.5.3 con Angular empaquetado, API HTTPS por transporte nativo, sin service worker Android ni GIS web en WebView. Firma local privada, script de build y CI debug. Gmail permanece fuera.

Ver alcance, comprobaciones y pendientes actuales en [ANDROID_APK_BASE.md](ANDROID_APK_BASE.md). No declarar widgets, SMS, notificaciones nativas, exportaciones, Google nativo o sesión larga terminados con esta base. Backend sin cambios. Sin merge ni despliegue de producción; prevalece este apartado sobre el historial siguiente.

### Historico Etapa 11

Correccion final del E2E remoto: esperar la respuesta HTTP del retiro antes de consultar saldos; tres repeticiones locales correctas. CI 275: cinco jobs verdes, unico fallo por esa espera en la prueba de metas. Revalidar el nuevo CI del PR #102. Comunicacion breve con Ponytail/Caveman; Graphify instalada sin grafo preparado, no se ejecuto; no se encontro una skill llamada agent-skills.


Tercera entrega de Etapa 11: metas propias con aportes/retiros por transferencias, cancelacion conservando fondos y respaldo v7; divisas con fuente manual y fecha aplicada en historial/CSV/respaldo. Revisadas liquidaciones y concurrencia existentes. Corregidas expectativas obsoletas del CI (respaldo y migraciones) y actualizado Vitest a 4.1.12; auditoria correcta. Frontend 382, build y cinco E2E distintos correctos; backend verify completo final: 509 ejecutadas, 503 correctas y 6 omitidas, sin fallos/errores. Consultar el resultado remoto actual de PostgreSQL/CI en PR #102 antes de integrar. Detalles en COMPARTIDO_DIVISAS_METAS_ETAPA_11.md. PR #102 sin integrar. Despues sigue Capacitor/APK; Gmail fuera.


Historico de la segunda entrega de Etapa 11: reparto de pareja por partes enteras, pesos e importes persistidos, respaldo v6/restauracion compatible con v1-v5 y migracion V11. Verificado: backend 493 correctas y 6 omitidas, frontend 382, build y E2E movil correctos. CI previo del PR #102 verde; nuevo CI/PostgreSQL pendiente de publicar esta ampliacion. Siguen pendientes divisas, metas y revision de liquidaciones; no cerrar Etapa 11. Gmail fuera.


## Histórico: Prioridad vigente: Etapa 11 (2026-10-21)

Orden autorizado: **11 -> base Android con Capacitor y APK firmado descargable -> 10 sin Gmail -> 12 -> 13 -> revision final**. Etapa 9 completada provisionalmente por el propietario; sus pruebas fisicas pendientes se revisan al final, sin certificarlas ahora. APK directo, sin Play Store; widgets y ajustes rapidos requieren componentes Android. Gmail excluido. Comercializacion opcional.

Rama nueva `mejoras/compartido-divisas-metas` desde `origin/develop` actualizado `6775c1e`. PR #101 fue integrado en develop por el propietario durante el trabajo; rama actualizada con origin/develop `3af6e80`, sin integrar el PR #102. Primera entrega de Etapa 11: cambio de rol editor/lector por el propietario, manteniendo movimientos y saldos. Detalles y pendientes en [COMPARTIDO_DIVISAS_METAS_ETAPA_11.md](COMPARTIDO_DIVISAS_METAS_ETAPA_11.md). Los bloques de roles, partes, metas y divisas estan implementados. Revisar el CI actual y el PR #102 antes del cierre y de continuar con Capacitor/APK.

Validacion de la primera entrega: backend verify 489 correctas y 6 omitidas; frontend 381 correctas tras actualizar develop; build correcto. Dos E2E de listas/roles y accesos de captura correctos tras actualizar develop. Corregida la actualizacion de participantes tras union desde otra sesion. H2/datos sinteticos; PostgreSQL y CI pendientes. PR #102 abierto como borrador hacia develop; sin integrar ni desplegar esta entrega.

Los apartados siguientes son el historial anterior; prevalece este orden.

## Histórico: Prioridad vigente: Etapa 9 Android/captura (2026-10-21)

Rama `mejoras/android-captura` publicada tras recuperar conexión. [PR #101 hacia develop](https://github.com/YaxcheItz/gestorfinanzas/pull/101) abierto como borrador; CI remoto pendiente de resultado. Sin merge ni despliegue de producción. Ampliación verificada: 381 unitarias frontend y tres E2E PWA; permisos sin solicitud automática y denegación segura. Reapertura offline con token vencido exige login y conserva la captura; con conexión renueva usando cookie real.

PR #99 integrado en develop `6775c1e` y PR #100 en main `d39d899`, confirmados por fetch. El propietario autoriza avanzar; las comprobaciones físicas/manuales pendientes de Etapa 8 se conservan sin declararlas resueltas. Rama nueva `mejoras/android-captura` en la carpeta principal desde develop actualizado; notas duplicadas de la raíz resguardadas y retiradas.

Primer incremento: accesos PWA gasto/ingreso/dictado que sobreviven al login y se consumen al abrir, sin destinos externos ni micrófono automático. Prueba del service worker real con reapertura offline y sincronización única. 378 unitarias frontend, 12 E2E de regresión y 1 E2E PWA correctas; build correcto. CI ampliado para la PWA de producción. Alcance y criterios pendientes en [ANDROID_CAPTURA_ETAPA_9.md](ANDROID_CAPTURA_ETAPA_9.md). No cerrar Etapa 9 sin comprobar Android físico, sesión larga y preferencias/recordatorios propios. Después corresponde Etapa 11; Gmail/Etapa 6 siguen fuera.

Histórico de Etapa 8: [PR #99](https://github.com/YaxcheItz/gestorfinanzas/pull/99) ya integrado por el propietario. Seguir pendientes manuales del informe; los apartados siguientes registran sesiones anteriores.

Entrega para PR a develop (2026-10-21), autorizada por el propietario: auditoría/tarjetas/calendario y regresiones de recurrencias. 366 frontend completas; backend verify 485 correctas + 6 omitidas; build/dependencias correctos. 22 escenarios E2E distintos entre la regresión de 20 y el conjunto final de 5 (3 repetidos). Cuentas usa día civil México. Ver [cierre técnico y pendientes](AUDITORIA_ETAPA_8.md). Publicar no cierra Android físico/producción autenticada ni autoriza merge. Etapa 9 después de cerrar Etapa 8; Gmail deshabilitado.

Fuentes y alcance: [TARJETAS_CALENDARIO_MX.md](TARJETAS_CALENDARIO_MX.md).

## Histórico: Revisión vigente (2026-10-21)

Etapa 7 integrada: GitHub confirma PR #97 y fetch sitúa develop en `a8ae7f3`, main en `f4b814e`. Web/API disponibles y Vercel success comprobados de nuevo; no confundirlo con validación autenticada completa en producción. Primer paso pendiente: smoke test de consultas, filtros, evidencia/historial/CSV, presupuesto y recurrencias en producción. Después sigue Etapa 8, auditoría funcional/visual, en la rama actual ya preparada. Etapa 9 Android/captura viene después. No reactivar Gmail ni la Etapa 6; conservar los cambios documentales existentes.

## Histórico: Avance y siguiente etapa (2026-10-20)

**Etapa 7 (asistente financiero con evidencias) completada e integrada.** PR #97 se integró a `develop` en `a8ae7f33695a9cd84d6a3d4bddea339eaa459e18`; CI quedó verde. `main` está en `f4b814e27de8a87a244d5cc5253e31a6fb1391bc`, también con CI verde. Vercel Production y el backend Render reportaron despliegue exitoso. La web pública respondió HTTP 200 y `/api/health` devolvió `UP`. Esto acredita disponibilidad, no un recorrido autenticado completo en producción.

El propietario validó en el preview filtros/evidencias, disponibilidad de presupuesto y recurrencias. La suite local final reportada fue backend: 480 correctas y 6 omitidas; frontend: 343; build de producción correcto. El detalle funcional está en [ASISTENTE_EVIDENCIAS.md](ASISTENTE_EVIDENCIAS.md). Aún se recomienda una comprobación manual autenticada de esos flujos en producción.

**Siguiente: Etapa 8, auditoría funcional y visual.** El trabajo se prepara en la rama nueva `auditoria/etapa-8-funcional-visual`, basada en `origin/develop` actualizado (`a8ae7f3`). Revisar la experiencia real y reportar fallos reproducibles antes de corregirlos; las pruebas en dispositivo físico requieren disponibilidad y validación real. No declarar completa una prueba que solo haya verificado health.

Gmail permanece deshabilitado y Etapa 6 omitida. No hacer nuevos merges ni despliegues sin autorización explícita.

## Histórico: Prioridad vigente: solo WhatsApp y asistente (2026-10-20)

Archivo solicitado posteriormente: el borrador Gmail se conserva mediante commit LOCAL en `mejoras/gmail-bancario-piloto`, sin subirlo ni integrarlo. Secretos y artefactos quedan fuera de Git; no reactivar Gmail al retomar este archivo. El PR #97 ya está integrado; la Etapa 8 inicia en la rama descrita arriba.

La última decisión del propietario sustituye el orden anterior: **solo WhatsApp como canal externo disponible**, Gmail deshabilitado y **Etapa 6 omitida**. No reactivar Gmail, sincronización de correo, conciliación multicanal, SMS ni lectores bancarios sin una nueva petición. La captura manual y el chat de la app se conservan. No se eliminan credenciales, historia, avisos ni el trabajo Gmail sin publicar.

Estado comprobado: Gmail local bloqueado por `gmailPaused: true`, reglas bancarias privadas deshabilitadas y revisión manual conservada; Worker Gmail pausado, sin sesión Kaptal importada y sin eventos. WhatsApp `/health` y `/ready` HTTP 200. La prueba inicial con urllib sin User-Agent fue rechazada; la comprobación con User-Agent operativo devolvió 200. No se cambiaron webhook ni Worker WhatsApp.

### Plan completo que queda, en el nuevo orden

1. **Asistente financiero con evidencias (Etapa 7, completada).**
   - Reutilizar el chat y las consultas WhatsApp existentes; reglas primero y proveedor IA solo para interpretación autorizada.
   - Consultas exactas por periodo, categoría, cuenta/lista autorizada y moneda; comparaciones equivalentes, presupuesto restante y recurrencias.
   - Mostrar periodo y alcance, monedas separadas, número de operaciones/filtros considerados y enlace al historial correspondiente; explicar cuando faltan datos.
   - No delegar cuentas ni cálculos al LLM; consultas de solo lectura, permisos por usuario y pruebas contra reportes/historial.
   - Incluye comparación mensual textual determinista con periodos equivalentes y sin movimientos nuevos; el bloque se integró y desplegó como parte de PR #97.
2. **Auditoría funcional y visual (Etapa 8, siguiente).**
   - Revisar en Android físico Inicio, formularios, teclado, voz/permisos, letra grande, temas y privacidad.
   - Verificar los mismos rangos y cifras entre Inicio, historial y reportes; tarjetas/cortes/vencimientos por cuenta, presupuestos y recurrencias idempotentes.
   - Revisar búsquedas, listas/etiquetas, paginación y rendimiento; corregir fallos demostrados sin rehacer funciones existentes.
   - Validar borradores y capturas offline, sincronización única y estados de error/pendiente claros.
3. **Android y captura desde el sistema (Etapa 9).**
   - Comprobar primero la PWA; evaluar envoltura de la app existente, autenticación, enlaces, safe areas, teclado y offline.
   - Acceso rápido para registrar y voz, incluyendo Quick Settings Tile si es viable; permisos al usar y protección con pantalla bloqueada.
   - Recordatorios propios de vencimientos/presupuestos/recurrencias y preferencias de privacidad; widgets solo al estabilizar sincronización.
   - Prueba real: capturar con app cerrada/sin red y sincronizar exactamente una vez. Esto no habilita lectura de SMS ni notificaciones bancarias ajenas.
4. **Compartido, divisas y metas (Etapa 11).**
   - Auditar y completar invitaciones, roles, autoría, salida y revocación de listas compartidas.
   - Repartos y liquidaciones con redondeo exacto y sin contar dos veces el gasto; pruebas de permisos y concurrencia.
   - Moneda original, tipo de cambio con fecha/fuente, equivalencias y saldos por moneda, sin convertir el pasado al cambiar la visualización.
   - Metas con aportes/retiros entre fondos propios, progreso y cancelación sin inflar ingresos/gastos.
5. **Onboarding, privacidad y acabado nativo (Etapa 12).**
   - Inicio guiado breve y omitible; accesibilidad, foco, lectores de pantalla, formatos y letra grande.
   - Bloqueo/biometría cuando exista soporte nativo real, privacidad al volver del fondo y ocultación de datos en vistas previas.
   - Interacciones táctiles, movimiento reducido, zonas de toque y alternativas a gestos.
   - Exportación/importación y restauración comprobadas; consentimiento y eliminación de datos según funciones realmente activas.
6. **Rendimiento, costes y operación (Etapa 13, transversal).**
   - Medir carga/bundle, consultas y respuestas IA, límites por usuario, cuotas y costes de proveedores.
   - Monitorización sin datos privados, alertas operativas, copias y restauración, recuperación tras sesiones vencidas/reinicios.
   - Pruebas de seguridad, dependencias, migraciones, aislamiento, CI y publicación; comprobar el despliegue servido, no solo un commit.
   - Revalidar WhatsApp con dos usuarios reales y escenarios de voz/cancelar/reintento cuando falte evidencia; no dar por pendiente una función ya comprobada por el propietario.
7. **Cierre de producto.**
   - Petición vigente27oct: revisar al final el diseño y los flujos sección por sección con el propietario. Incluir etiquetas: explicar su utilidad y replantear, simplificar, cambiar o añadir lo necesario; no conservar controles que no entienda solo porque ya existían.
   - Bloque funcional pendiente: categorizar automáticamente compras reconocidas usando reglas/categorías existentes (por ejemplo restaurante → Comida); si no hay coincidencia clara, Otros gastos. Revisar nombres, organización y corrección de categorías con el propietario; conservar decisiones manuales y no reclasificar historia sin autorización. No usar IA de pago por defecto ni transmitir el texto bancario completo.
   - Recorrido completo real, corrección de bloqueantes, documentación/ayuda y revisión de privacidad; integración develop → main y despliegue coordinado por entrega.
8. **Comercialización (Etapa 14, opcional).**
   - Solo si el propietario la solicita: requisitos de tiendas, soporte, eliminación de cuenta, límites, coste por usuario y precios sustentados. No añadir cobros/suscripciones por defecto.

Fuera del plan activo por decisión del propietario: piloto y autoservicio Gmail (Etapas 4/5) y conciliación multicanal (Etapa 6). Etapa 10 permanece activa únicamente para los canales Android/Sears consentidos y formatos comprobados; otros pagos no se consideran soportados por defecto. Mantener los apartados históricos como referencia, no como trabajo autorizado vigente. Los recordatorios de la propia app y la captura Android sí permanecen en el plan.

### Histórico: rama y entregas del asistente

Avance posterior: rama publicada y [PR #97](https://github.com/YaxcheItz/gestorfinanzas/pull/97) en borrador hacia develop. Se añade evidencia estructurada para comparación mensual y acceso al historial con fechas/tipo/moneda y alcance propio, también respetado en CSV. El resto de filtros y consultas sigue pendiente. Publicar una rama no implica merge ni despliegue.

Validación de la segunda entrega: 54 pruebas backend y 57 frontend correctas; build Angular y diff-check correctos. Sin escrituras financieras reales. CI remoto y despliegue deben comprobarse aparte.

Primer corte implementado y comprobado localmente: 76 pruebas relacionadas distintas correctas, incluidas consultas HTTP/persistencia H2 con aislamiento y ausencia de escrituras; diff-check correcto. Sin despliegue ni cambios frontend. El alcance y los pendientes están en [ASISTENTE_EVIDENCIAS.md](ASISTENTE_EVIDENCIAS.md).

Nueva rama `mejoras/asistente-evidencias` en `.local/asistente-worktree`, creada desde `origin/develop` comprobado (`211b457`). La rama principal del checkout conserva Gmail sin publicar. Primer corte: comparación mensual sin IA ni escrituras, reutilizando consultas agregadas existentes. Después: filtros completos, evidencia estructurada y enlaces al historial; presupuesto/restantes y categorías con validación de alcance. No anunciar nada como publicado hasta CI/integración/despliegue.

## Histórico: prioridad anterior al omitir conciliación (2026-10-20)

El propietario pide dejar Gmail en su estado actual y continuar con lo demás. Etapas 4/5 aplazadas: funciona la lectura local bajo demanda con revisión manual y un aviso Nu reconocido; Santander solo validado sintéticamente, sin correo real en la ventana. No hubo registro de dinero. El borrador Cloudflare fue desplegado PAUSADO, cola vacía y sin sesión Kaptal importada; no constituye sincronización automática operativa. `gmailReviewOnly` restaurado a true; no activar servicios ni repetir solicitudes OAuth.

Siguiente trabajo: **Etapa 6, conciliación común y aprendizaje**, sección 10. Auditar primero la bandeja/coincidencias ya existentes y realizar una entrega pequeña sobre razones de pendientes, vínculos al movimiento y distinción entre repetición y coincidencia. Crear una rama nueva desde develop actualizado; mantener intacto el trabajo Gmail sin publicar en su rama/worktree. Después continúa Etapa 7, asistente financiero con evidencias.

Fecha: 18 de octubre de 2026. Este documento es un plan solicitado por el propietario; no afirma que las funcionalidades propuestas esten implementadas. Plan versionado de continuidad; no incluye secretos.

## Histórico: Revision de continuidad (2026-10-20)

Guia operativa detallada: [GMAIL_PILOTO_PASO_A_PASO.md](GMAIL_PILOTO_PASO_A_PASO.md). Siguiente accion del propietario: cliente OAuth Desktop privado y etiqueta/filtros `Kaptal-Bancos`; despues consentimiento local y lectura piloto con revision manual. Sigue sin iniciarse OAuth ni leerse Gmail.

- Se contrasto el resumen del propietario con el diff y los llamadores del parser/colector/envio de Avisos. No se modifico codigo ni se inicio OAuth ni se consulto Gmail o la API financiera real durante esta revision.
- `git fetch origin` confirma `origin/develop = 211b457`; la rama actual `mejoras/gmail-bancario-piloto` parte de esa base y conserva cambios sin commit/push. `origin/main = ed71e36` integra develop mediante #96. WhatsApp/IA/experiencia ya estan en el historial integrado; no rehacer esas etapas ni asumir por ello pruebas reales detalladas o despliegues actuales.
- Pruebas repetidas: 37 en `test_canales.py` y 86 en toda la suite correctas, sin fallos. `compileall`, JSON de ejemplo y `git diff --check` correctos. El fallo previo de concurrencia de sesion Windows no se reprodujo en esta ejecucion; no se considera corregido ni se modifico su codigo.
- Comprobacion privada limitada a metadatos: dos reglas activas con alias configurados, `gmailReviewOnly` booleano true, fecha 2026-10-15; faltan archivos cliente OAuth/credenciales Gmail y etiqueta configurada. No se imprimieron IDs, saldos, terminaciones ni secretos. Esta comprobacion no revalida cuentas remotas ni acredita permiso Gmail concedido.
- No se encontraron fallos bloqueantes en lo revisado para el piloto manual. Tanto Nu como compra Santander usan identidad del mensaje Gmail cuando falta referencia; esto impide reprocesar el mismo correo, pero no demuestra que dos correos distintos sean operaciones distintas. Mantener revision y coincidencias. Ademas del piloto hay soporte generico de transferencias origen/destino y fixtures de otros formatos: no son reglas bancarias activadas ni amplian el alcance autorizado.
- Pendiente: crear cliente OAuth Desktop y etiqueta/filtros exclusivos, indicar su nombre, completar consentimiento local y resolver ID; despues lectura piloto y revision de Avisos, sin autoconfirmacion. Validacion con correos reales y E2E de este piloto aun pendientes. SPEI Santander y otros bancos fuera de alcance. Revisar/publicar los cambios en esta rama cuando corresponda; no se hizo commit/push en esta revision.
- Para otro chat: «Continua el piloto Gmail de Kaptal. Lee AGENTS.md, ESTADO_SESION.md, PLAN_MAESTRO_KAPTAL.md, BANDEJA_AVISOS.md y HERRAMIENTAS_CANALES_2026-10-17.md. Comprueba la rama mejoras/gmail-bancario-piloto y sus cambios sin publicar desde develop 211b457. Solo Nu recibido y compra TDC Santander, revision manual. La revision del 20 de octubre paso 37 pruebas especificas y 86 completas; el fallo intermitente de lock Windows no esta corregido. Faltan cliente OAuth Desktop, etiqueta/filtros y nombre de etiqueta; luego consentimiento y piloto real autorizado. No leas correo antes de eso ni registres dinero sin confirmacion. Conserva autoria exclusiva y actualiza los MD y el texto de continuidad.»


## Histórico: Seguimiento vigente (19 de octubre de 2026)

El propietario pidio actualizar este MD al terminar cada parte y recibir siempre un texto listo para continuar en otro chat. `AGENTS.md` conserva esa preferencia. Este seguimiento prevalece sobre las referencias historicas que siguen.

| Parte | Estado | Resultado / siguiente paso |
| --- | --- | --- |
| WhatsApp personal alojado | Funciona; confirmado por propietario | Cloudflare activo. PR #84/#85 integrados en develop y main mediante #86. |
| Preparacion de la etapa siguiente | Comprobada | `origin/develop = 7c3e2ad`; rama nueva `mejoras/whatsapp-multiusuario-base`. Receptor personal health/ready 200 durante esta entrega. |
| 1A: identidad y prueba del telefono | Integrada mediante #87; historial | API propia alta/estado/desconexion, desafio unico, HMAC Kapso y migracion V9. 434 pruebas PostgreSQL correctas, incluidas 18 nuevas; 15 pruebas nuevas H2 correctas. Ver `WHATSAPP_MULTIUSUARIO.md`. No emite permisos financieros ni cambia el Worker desplegado. |
| 1B: interfaz y runtime multiusuario | Integrada y desplegada; activa en Cloudflare | PR #87 y #88 integrados en develop y main (#89). Backend en Render con canal habilitado. D1 respaldada y migrada. Worker multiusuario desplegado y activo (`/health` y `/ready` 200). 39 pruebas pasadas. Pendiente prueba con dos personas reales. |
| 2: IA de respaldo | Integrada en `develop` mediante PR #93 | Reglas primero + rescate con AiProvider (`GroqAiProvider` / `GeminiAiProvider`). Validación estricta de cuentas/categorías del usuario, sanitización de Markdown, control de abusos y 10 pruebas unitarias nuevas (57 pruebas de WhatsApp verdes). |
| 3: experiencia y cierre de voz | Integrada en `develop` mediante PR #95 | El propietario confirma que WhatsApp ya funciona. La implementación pasó 60 pruebas backend WhatsApp y 9 pruebas Angular; no se registró desglose de cada escenario real. |
| 4: Gmail bancario personal real | En curso en `mejoras/gmail-bancario-piloto`, desde `origin/develop` `211b457` | Alcance actual: ingreso por transferencia recibida de Nu y compra con TDC Santander, en revisión manual. Las 37 pruebas del parser pasan; `config.example.json` mantiene reglas desactivadas y las dos reglas están habilitadas en la configuración privada. Las 86 pruebas completas pasaron al revisar el 20 de octubre; el error intermitente previo de lock Windows no se considera corregido. Falta OAuth y etiqueta Gmail exclusiva. El abono SPEI Santander queda pendiente; otros bancos y notificaciones móviles después. |
| 5 y posteriores | Pendientes según alcance original | Gmail autoservicio/multiusuario, conciliación, asistente con evidencias, Android y demás etapas de este plan. |

En la Etapa 3 (PR #95), «deshacer» primero presenta el movimiento identificado y solo lo elimina tras «confirmar deshacer» antes de 15 minutos; cancelar o dejar vencer la confirmación no altera el movimiento. La confirmación del audio acepta «confirmar» y exige el código si se usa «confirmar audio <codigo>». El PR está integrado y el propietario confirma que WhatsApp funciona; no se registró aquí el detalle por escenario de las pruebas reales.

### Estado de la Etapa 4: piloto Gmail

Corrección completada el 20 de octubre: extracción HTML inerte con preferencia por texto plano y reprocesado del aviso genérico mediante edición versionada del mismo ID. Validación real Nu: mismo aviso ahora INGRESO con datos y PENDIENTE; segunda lectura sin duplicación; cero movimientos registrados. 88 pruebas Python, compileall y diff-check correctos; Ruff no instalado. Santander cubierto con pruebas sintéticas HTML/texto, todavía sin validación real en la ventana. El colector sigue bajo demanda local; no se instaló ejecución continua ni se hizo commit/push/despliegue. Próximo: revisión del propietario y publicación de la rama.

Diagnóstico del aviso visible confirmado por el propietario: correo Nu solo HTML, autenticación/remitente/asunto válidos; el parser actual solo extrae texto plano y obtiene cuerpo vacío. Próxima parte: extracción HTML segura con pruebas y actualización de la propuesta existente sin duplicarla al reclasificar. Aún no registrar dinero ni afirmar validación real de Santander.

Aclaración: Configuración > Avisos gestiona Web Push; la revisión bancaria está en «Bandeja de avisos» (`/avisos`). Las claves Web Push no son requisito para Gmail. Publicar el colector local en Git sigue pendiente, pero no habilita ni es necesario para abrir la bandeja ya existente.

Acceso a revisión: ruta publicada `https://kaptalgf.vercel.app/avisos` comprobada con HTTP 200 y ruta presente en bundle principal. El colector local envió el aviso a la API de esa app; no se requiere desplegar el colector para abrir la bandeja existente. Pendiente revisión autenticada por el propietario.

Resultado operativo del 20 de octubre: OAuth readonly completado; identidad Gmail y propietario Kaptal comprobados, etiqueta Kaptal-Bancos resuelta en configuración privada. Primera lectura real desde 2026-10-15 entrega un aviso; segunda lectura mantiene el mismo conteo, sin duplicar entradas. Cero movimientos registrados en ambas; revisión manual activa y autoguardado deshabilitado en memoria. Pendiente revisión del propietario, validación real de ambos formatos y publicación de la rama. Un aviso no acredita por sí solo ambos bancos.

Preparación confirmada posteriormente el 20 de octubre: etiqueta y dos filtros creados según el propietario. Nuevo cliente Desktop encontrado en `.local/canales`, estructura validada y archivo renombrado a `google-client.private.json`, excluido de Git. Siguiente: consentimiento OAuth, resolución del ID de etiqueta y lectura piloto con revisión manual; todavía sin ejecutar.

Avance posterior del 20 de octubre: el JSON encontrado en Descargas no pasó la validación Desktop y no se copió ni modificó. Falta crear o localizar el cliente correcto. El propietario confirma etiqueta creada; ambos filtros aún sin confirmar. Siguen pendientes consentimiento, resolución de ID y lectura real con revisión manual.

Actualización del 20 de octubre: el propietario confirma que aún no ha realizado los pasos del navegador. Se proporciona explicación desde cero para Google Cloud, cliente OAuth Desktop, archivo JSON y etiqueta/filtros Gmail. No se ha iniciado consentimiento ni lectura en esta entrega; continúa pendiente la preparación manual y después la prueba real.

El alcance pedido ahora se limita al ingreso por transferencia recibida de Nu y la compra con TDC Santander; ambos se proponen para revisión, no se autoguardan. `config.example.json` contiene las plantillas desactivadas por defecto, y las pruebas sintéticas usan esas mismas reglas. Con autorización del propietario se consultaron las cuentas/listas propias en modo lectura y se configuró el archivo privado con los alias y esas dos reglas activas; no se mostraron IDs ni saldos. No se guardaron correos originales ni se inició OAuth. Aún faltan el cliente OAuth de escritorio, el consentimiento local y crear una etiqueta/filtro exclusivos en Gmail para resolver luego el ID de etiqueta. La fecha inicial solicitada es 2026-10-15. El aviso de abono SPEI Santander sigue pendiente: aunque se compartió el cuerpo, falta su remitente y asunto exactos; no reutilizar para él los metadatos del correo de transferencia saliente. El aviso Nu no trae referencia bancaria, así que la regla usa el ID Gmail para reintentos, manteniendo revisión y deduplicación local por huella. La compra Santander valida los últimos cuatro del correo contra `bankIdentifiers` de la cuenta de tarjeta configurada. Otros bancos y notificaciones móviles quedan para una etapa posterior. La etiqueta y fecha limitan mensajes consultados, no el alcance OAuth. `gmail.readonly` es restringido; Google contempla posibles excepciones para uso personal/desarrollo y requisitos de verificación/assessment según distribución y arquitectura. Revisar el caso antes de publicar.

Fuentes oficiales consultadas: [scopes Gmail](https://developers.google.com/workspace/gmail/api/auth/scopes), [OAuth para aplicaciones de escritorio](https://developers.google.com/identity/protocols/oauth2/native-app) y [verificación de scopes restringidos](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification).

No marcar la parte multiusuario completa por haber terminado 1A. No habilitar el nuevo flujo publico hasta conectar UI, Worker y permisos. No volver a configurar ni detener la conexion personal que funciona. Revision oficial del sandbox de Kapso: cada telefono de prueba necesita una sesion activa y su codigo del proveedor; el registro de Kaptal no sustituye esa activacion. Confirmar numero productivo/condiciones antes del alta publica de cualquier usuario.

Evidencia de 1A: `replica/whatsapp-multiusuario-base/verification.json`. Base de datos aislada con migraciones V1-V9; build `mvnw verify` correcto. No se desplego V9 ni se habilito la funcion en produccion. CI remoto: comprobar el PR de la rama, no asumir resultado por las pruebas locales.

## Histórico: Activación de WhatsApp multiusuario (19 de octubre de 2026)

Integración completada mediante [PR #87](https://github.com/YaxcheItz/gestorfinanzas/pull/87) y [PR #88](https://github.com/YaxcheItz/gestorfinanzas/pull/88) en `develop` y `main` (#89).

- Backend: desplegado en Render con variables `WHATSAPP_CHANNEL_ENABLED=true`, `WHATSAPP_CHANNEL_RUNTIME_ENABLED=true`, `BOT_PHONE=+56920403095`, `PHONE_NUMBER_ID=597907523413541` y secreto verificado; disponibilidad activa comprobada en `/api/canales/whatsapp/disponibilidad` (`data: true`).
- Worker Cloudflare: respaldada base D1 a `.local/canales-cloudflare/d1.pre-multiuser.1792434489673.private.sql`, aplicada migración 0002, desplegado y reanudado en modo multiusuario activo (`paused: false`). `/health` y `/ready` responden `200 OK` (`{"ok": true}`).
- Pruebas: 39 pruebas del Worker pasadas al 100%. `setup.mjs` optimizado con reintentos para conexiones con latencia y uso síncrono de `--command`.
- Rama actual: `mejoras/whatsapp-multiusuario-activacion`, registrada en [PR #90](https://github.com/YaxcheItz/gestorfinanzas/pull/90).
- Siguiente paso: Probar con dos personas reales desde la app (`https://kaptalgf.vercel.app/`), retirar la sesión personal antigua con `setup.mjs retire-personal-session`, y continuar con la Etapa 2 (IA rápida de respaldo).
- Texto para el siguiente chat: «Continua Kaptal desde AGENTS.md, ESTADO_SESION.md y PLAN_MAESTRO_KAPTAL.md. WhatsApp multiusuario ya esta desplegado y activo en Cloudflare Workers con /health y /ready en 200; backend disponible en produccion. Siguiente: probar vinculacion y consulta de dos personas reales (propietario y segunda cuenta) desde la app, luego ejecutar retire-personal-session y continuar con la Etapa 2 (IA de respaldo rapida). Conserva mi autoria exclusiva y actualiza los MD al cerrar cada paso.»

## 1. Objetivo y prioridad del propietario

Convertir Kaptal en una app de finanzas sencilla, bonita y rapida, con registro por texto/voz/automatizaciones y lenguaje visual inspirado en MonAi: blanco/coral, emojis pastel, barras redondeadas, mucho espacio, Inicio dominante y hojas contextuales. Conservar la identidad de Kaptal y su contabilidad.

Prioridad nueva expresa:

1. Cada usuario conecta su propio WhatsApp mediante un boton dentro de Kaptal, verifica su telefono y consulta/registra solo en su cuenta.
2. Reglas/diccionario primero; IA muy rapida solo cuando el motor actual no entiende. Medir rapidez y precision, no elegir por publicidad.
3. Gmail bancario, primero piloto real y despues autoservicio para otros usuarios.
4. Retomar el resto del plan previo, sin perder ni rehacer lo ya integrado.

El usuario pidio el plan completo antes de implementar estas nuevas etapas.

## 2. Estado comprobado al escribir este documento

- Proyecto: C:\Users\yaxti_cm5rg3t\Documents\MI LAP 2\APRENDER\Proyectos\GestionFinanzas.
- Stack a conservar: Angular, Spring Boot, PostgreSQL. Web publicada: https://kaptalgf.vercel.app/.
- WhatsApp PERSONAL funciona: usuario confirmo que responde. Kapso entrega a Cloudflare Workers; D1 conserva cola/contexto/sesion cifrados. El webhook existente ya apunta al Worker, con HTTPS y sesion Kaptal verificados. Receptor Python local detenido; no necesita tunel ni PC encendida.
- Cola original trasladada conservando 10 eventos, UUID y respuestas. No se crearon movimientos reales de prueba por iniciativa del agente. No afirmar que se probaron todas las variantes de audio/gasto reales por una confirmacion general de funcionamiento.
- PR #84 y #85 ya integrados en develop; develop integrado a main mediante PR #86. Fetch comprobado: origin/develop 7c3e2ad; origin/main c077b5e. El checkout local principal estaba en main 0d56d00 y quedo intacto: actualizarlo de forma segura al retomar, sin asumir que ya contiene los merges.
- Worktree de la entrega anterior: .local/whatsapp-cloudflare-worktree, rama mejoras/whatsapp-cloudflare. No reutilizarla para la etapa siguiente ni eliminarla sin comprobar dependencias de rutas privadas.
- Cambios del Worker en tools/whatsapp-worker/. 27 pruebas D1/contratos y E2E con API/PostgreSQL reales correctos; implementacion tuvo 14 checks remotos verdes. Revalidar checks del ultimo commit al retomar si importa para una publicacion.
- Ya hay rediseño, periodos flexibles, listas/etiquetas, busqueda, presupuestos/recurrencias y bandeja Avisos implementados en etapas previas. Auditar alcance y comportamiento antes de agregar; sus documentos viejos mezclan historial y pendientes.
- Ya existe integracion de IA en la app: AiProvider, GroqAiProvider, GeminiAiProvider y AiActionService, entre otros. GroqAiProvider usa por defecto openai/gpt-oss-20b. NO asumir que esta configurado en produccion ni que WhatsApp ya lo llama. El canal de WhatsApp actual interpreta por reglas.
- Gmail tiene preparacion local/OAuth y pruebas sinteticas, pero no una integracion bancaria real cerrada ni autoservicio multiusuario. No existen parsers reales de todos los bancos por haberlos mencionado en conversacion.

## 3. Lecturas y reglas para retomar

Leer AGENTS.md, docs/ESTADO_SESION.md, este archivo y docs/PLAN_CONTINUACION_MONAI.md. Despues: docs/WHATSAPP_CLOUDFLARE.md, WHATSAPP_CUENTAS_CONSULTAS.md, WHATSAPP_VINCULACION_GOOGLE.md, BANDEJA_AVISOS.md, PLAN_UI_MONAI.md y replica/monai-kesef/recon.md cuando corresponda.

Los estados viejos pueden decir que no hay webhook o cuenta Kapso, que se necesita Oracle o que PR #85 sigue abierto: son historicos. Prevalecen comprobacion remota actual y las decisiones posteriores del propietario.

Reglas:

- Espanol. Usar las skills pertinentes sin pedir al usuario elegirlas. No reinstalarlas ni ejecutar todas.
- Cada etapa en una rama nueva desde develop actualizado y comprobado contra origin. No implementar sobre develop/main ni reutilizar ramas anteriores. Un PR por etapa; no mezclar Gmail, IA y Android en un PR enorme.
- Autoria exclusiva YaxcheItz <yaxtibla1@gmail.com>; sin coautores automaticos.
- No perder cambios del usuario, mover datos financieros ni reiniciar servidores personales por rutina. Aislar pruebas en propietarios/esquemas sinteticos.
- Secrets/cookies/tokens/telefonos/identificadores privados estan bajo .local/canales/ y .local/canales-cloudflare/. Leer solo lo necesario; nunca copiarlos a Git, logs publicos o chat.
- No volver a ejecutar connect sin razon: la sesion actual funciona. No compartir cookies entre procesos ni arrancar Python junto al Worker.
- Toda escritura financiera pasa por la API autorizada y sus reglas/contabilidad; nunca escribir saldos con SQL ni permitir a una IA hacerlo.
- Preservar idempotencia, monedas, historial, aislamiento por usuario y recuperacion offline. Ambiguedades/posibles duplicados quedan pendientes.
- Separar desarrollo, CI y activacion real. Revisar autorizacion de despliegue concreta al cambiar produccion; no contratar planes por inferencia.
- Probar el cambio pertinente, documentar resultados reales y actualizar estado. No presentar capturas sinteticas como prueba en Android fisico ni pruebas locales como conexion real con un proveedor.

Skills orientativas, no obligacion de ejecutar todas: canales-personales; ponytail; api-and-interface-design; security-review; angular-developer; source-driven-development; debugging-and-error-recovery; ecc-verification-loop; apple-design/mobile-native/playwright-cli/ui-ux-pro-max para UI cuando toque. Graphify puede ayudar si existe un grafo vigente; un mapa viejo del backend no describe automaticamente Workers ni cambios nuevos. No generar un grafo enorme solo para ahorrar tokens.

## 4. Etapa cero: preparar el siguiente desarrollo

1. Comprobar git status, ramas, worktrees, fetch, PRs/CI y versiones desplegadas. Usar origin/develop como base verificada, con actualizacion segura del checkout elegido.
2. Verificar health/ready del Worker y sesion sin mostrar datos privados. Conservar servicio personal operativo.
3. Revisar codigo actual de vinculacion Google, interpretacion WhatsApp, Avisos y proveedores IA para reutilizarlo.
4. Revisar en Kapso si sigue usando sandbox y que se requiere para atender otros numeros: destinatarios permitidos, pruebas con otro usuario, numero productivo, limites y coste por mensajes. Un sandbox no equivale a servicio publico ilimitado.
5. Crear una matriz corta: hecho, parcial, pendiente, evidencia y siguiente criterio de cierre. Limpiar contradicciones del plan sin borrar el historial.

Cierre: base y alcance comprobados, nueva rama preparada y servicio actual intacto.

## 5. Etapa uno: WhatsApp multiusuario desde la app

Rama sugerida: mejoras/whatsapp-multiusuario. Si el cambio es grande, dividir en entregas secuenciales: contrato/modelo; vinculacion UI; procesamiento y migracion. Integrar cada una antes de crear la siguiente.

### Experiencia del usuario

Configuracion > Integraciones > WhatsApp:

- Estado: no conectado, pendiente, conectado, requiere volver a autorizar, desconectado.
- Boton Conectar WhatsApp.
- Captura/confirmacion de telefono con codigo de pais.
- Consentimiento claro: permitir consultas, registro y preferencias de autoguardado.
- Boton Abrir WhatsApp con mensaje de verificacion prellenado hacia el numero del bot.
- El usuario envia un codigo temporal generado por Kaptal; el webhook firmado comprueba que el remitente coincide con el numero esperado y consume el codigo una sola vez.
- La app confirma vinculado sin terminal ni copia manual de credenciales.
- Opciones: cuenta/lista predeterminada, moneda, autoguardado, consultas permitidas, acceso a voz/IA cuando esten disponibles, cambiar numero y desconectar.
- Indicar que cada usuario usa su propia cuenta financiera aunque todos escriban al mismo numero del bot. No necesita cuenta propia de Kapso para este modelo.

### Backend y seguridad

- Modelar conexion por usuario: identificador, usuario, proveedor/bot, telefono normalizado, estado, preferencias, verificaciones, revocacion y fechas. Definir politica inicial simple de un numero activo por usuario y una asociacion activa por numero; no habilitar duplicados ambiguos.
- Desafio aleatorio, corto en tiempo, de un uso, hash en persistencia, limites de intentos y de emision. No vincular solo porque alguien escribio un numero en un formulario.
- Normalizacion E.164 compatible con remitentes reales del proveedor; no anteponer o retirar digitos mexicanos a ciegas. Probar casos de formato.
- Endpoint autenticado para iniciar/ver estado/desconectar, y flujo del webhook para verificar propiedad. No exponer si un numero ajeno ya esta registrado.
- Resolver identidad solo desde sesion autenticada o evento Kapso verificado. Un userId/cuentaId enviado por cliente o modelo no concede acceso.
- Elegir autorizacion limitada de canal por conexion, revocable y auditable. Reutilizar el flujo Google existente cuando ayude, pero reemplazar el paso de terminal. No convertir la cookie del propietario actual en una credencial para todos.
- Revocar al desconectar/cambiar numero o borrar usuario, limpiar contexto y bloquear pendientes de conexiones revocadas segun politica explicita.
- Persistir eventos/borradores/voz/respuestas por conexion y usuario. Deduplicacion incluye identidad y evento externo. Nunca mezclar contexto de dos remitentes.

### Worker y migracion

- El Worker actual fija un propietario y telefono en variables globales y liga el cifrado a esa identidad. No basta agregar una lista de telefonos permitidos: hay que disenar enrutamiento y autorizacion por conexion.
- Mantener Cloudflare como receptor/cola y Kaptal como autoridad de identidad, permisos e importes. Decidir que mapa minimo queda en D1 y como se valida con el backend.
- Guardar credenciales minimas y cifradas, con separacion por conexion; si se necesita un secreto entre Worker y backend, limitarlo al contrato de canal, sin acceso administrativo general.
- Lease/limites por conexion, para que un usuario con errores no bloquee a todos. Cola durable, reintentos acotados, equidad y control de carga/lecturas D1.
- Migracion versionada de D1: respaldo, conservar UUID y respuestas de la conexion personal, migrar cifrado con compatibilidad o version explicita, validar en copia y tener retorno.
- No usar comandos remotos de importacion masiva de SQL como reemplazo de operaciones concurrentes de la aplicacion activa. El setup de mantenimiento anterior exige pausa.
- Cambios del webhook solo si realmente necesarios: mantener identificador/secretos y evitar receptores/procesadores duplicados.

### Aceptacion

Dos usuarios A/B con numeros y cuentas distintos se vinculan sin terminal, preguntan saldo y registran gastos solo propios. Numero desconocido no accede a finanzas. Codigo vencido/reutilizado/robado, asociacion repetida, revocacion, cambio de numero, reintentos, fallos y reconexion quedan probados. La conexion personal ya activa conserva sus datos y funcionamiento.

## 6. Etapa dos: IA rapida de respaldo

Rama sugerida: mejoras/whatsapp-ia-fallback.

### Flujo deseado

Mensaje > reglas/diccionario/aprendizaje confirmado > si no alcanza, IA > estructura validada por backend > aclaracion o Avisos > registro idempotente cuando corresponda > respuesta.

- Revisar/reutilizar AiProvider, GroqAiProvider, GeminiAiProvider, AiActionService, parsers y servicios de captura actuales. Un motor compartido para web/WhatsApp y, mas adelante, otros canales.
- Diferenciar no entendido, datos faltantes y error de infraestructura. No llamar IA si solo falta elegir cuenta, ni repetir IA para compensar un timeout del backend.
- Evaluar primero Groq con openai/gpt-oss-20b, ya presente, comparado con otros modelos realmente disponibles. No prometer el mas rapido universal: medir tiempo total p50/p95, exactitud de importe/fecha/cuenta, JSON valido, errores y coste por movimiento.
- Pruebas en espanol con faltas, expresiones coloquiales, ayer/antier, monedas, varias operaciones, ingresos, devoluciones y transferencias. Seleccionar modelo por precision minima y menor latencia real; dejarlo configurable.
- Salida estructurada con esquema cerrado. El modelo propone intencion/campos o solicita aclaracion; el backend resuelve IDs contra recursos autorizados y valida importes/fechas/monedas/tipos/listas.
- Nunca inventar cuenta, moneda o importe faltantes. La confianza declarada por el modelo no basta para autoguardar. Politica automatica explicita por usuario, validaciones verificables y confirmacion para casos inciertos.
- IA recibe solo mensaje y catalogo minimo necesario. No enviar historial completo, tokens, OTP, correo bancario bruto o saldos innecesarios. Preferencias y aviso de procesamiento externo.
- Limites por usuario, timeout corto, maximo de salida, circuit breaker y presupuesto global; sin cascada infinita de modelos. Sin IA configurada o si falla, mantener reglas y aclaracion/revision.
- Congelar propuesta/contexto minimo antes del registro. Reintentar confirmacion financiera sin volver a reinterpretar ni gastar IA de nuevo. No reutilizar respuestas entre usuarios.
- Aprendizaje de comercios/categorias/alias a partir de correcciones explicitas, por usuario y reversible. Diccionarios/indices antes de IA recurrente.
- Varias operaciones por mensaje con claves por elemento y manejo claro de exito parcial; no declarar todo guardado si una fallo.

Cierre: reglas siguen funcionando sin proveedor; fallback medido, validado y limitado; prueba de aislamiento e instrucciones maliciosas; coste visible y errores humanos. Consultas/IA no alteran datos por si solas.

Fuentes actuales: https://console.groq.com/docs/models y https://console.groq.com/docs/structured-outputs. Velocidad publicada de tokens no equivale a latencia total de Kaptal.

## 7. Etapa tres: cerrar voz y experiencia WhatsApp

Rama sugerida: mejoras/whatsapp-experiencia.

- Confirmar con pruebas reales el gasto autentico elegido por el propietario, nota de voz, cancelar y posible duplicado; una respuesta general correcta no prueba todo.
- Mantener transcripcion firmada/proveedor autorizado y confirmacion por codigo vigente. Alternativa por texto.
- Si Kapso no proporciona transcripcion suficiente, evaluar servicio de voz rapido y coste, con consentimiento; no descargar URLs arbitrarias recibidas por mensaje.
- Usar botones/listas interactivas si el proveedor/ventana lo permiten: elegir cuenta, confirmar/cancelar, abrir Avisos o movimiento mediante enlaces propios autorizados.
- Mensajes breves: importe, cuenta elegida, guardado/pendiente y alternativa de correccion. No afirmar entrega hasta confirmacion del proveedor.
- Acciones simples de correccion/anulacion requieren identificar operacion y confirmacion; no borrar por una frase ambigua.
- Estado en la app: conexion, ultima actividad, pendientes/error y reconectar. Alertas operativas sin mostrar contenido financiero sensible.

Cierre: dos personas completan flujo real desde sus telefonos; no depende del equipo del desarrollador y los reintentos no duplican dinero/respuestas.

## 8. Etapa cuatro: Gmail bancario personal real

Rama sugerida: mejoras/gmail-bancario-piloto.

- Revisar tools/canales/gmail_auth.py y recolector actual; reutilizar pruebas/contratos, no inventar una nueva contabilidad.
- Para ampliar Gmail a otros bancos o notificaciones móviles, confirmar primero las instituciones, formatos y permisos; el piloto actual solo cubre Nu/Santander y no se ha conectado a Gmail.
- OAuth con Google, acceso minimo necesario, cuenta esperada verificada, desconexion/revocacion. El login Google de Kaptal NO concede acceso a Gmail.
- Explicar alcance de gmail.readonly: una etiqueta o filtro no reduce el permiso OAuth al correo bancario. Verificar requisitos de scopes restringidos y excepciones aplicables antes de distribuir.
- Configurar etiqueta/filtro y fecha inicial para no importar todo el pasado automaticamente.
- Reglas por banco/remitente/plantilla, validacion de autenticidad, referencia, moneda, fecha y cuenta; ignorar enlaces/adjuntos/instrucciones y excluir OTP/promociones.
- Distinguir compra, ingreso, transferencia, devolucion, pago de tarjeta, autorizacion pendiente y cancelacion. Pagar una tarjeta no debe duplicar el gasto de sus compras.
- Cuenta ambigua: pedir mapeo explicito; no adivinar por una cuenta predeterminada incorrecta.
- Reusar Avisos y deduplicacion multicanal. Guardado automatico solo para reglas reconocidas sin ambiguedad ni coincidencias.
- Piloto con vista previa y pruebas de falsos positivos. No prometer IA como prueba de autenticidad bancaria.

Cierre: al menos bancos concretos cubiertos con fixtures representativos y reintentos sin duplicar, revocacion efectiva y registros reales autorizados verificados.

## 9. Etapa cinco: Gmail autoservicio y sincronizacion alojada

Rama sugerida: mejoras/gmail-multiusuario.

- Boton Conectar Gmail por usuario, OAuth propio de correo, estado, bancos/reglas activados, cuentas asociadas, fecha inicial, automatico/revision, pausa y desconexion.
- Tokens cifrados por usuario, sin mezclar buzones. Revisar verificacion de Google y necesidades de evaluacion de seguridad segun scopes, distribucion y arquitectura; no presentarlo como tramite gratuito ya resuelto.
- Elegir procesamiento incremental alojado: Gmail watch + Pub/Sub o polling controlado segun coste/complejidad. Si watch, renovar suscripcion antes de vencer, verificar notificaciones y usar historyId; la notificacion no contiene todos los datos del correo.
- Cursor durable, catch-up, historyId caducado, eventos repetidos/desordenados, refresh revocado, cuotas y trabajos por usuario. No perder avisos durante un reinicio.
- Retencion minima y borrado de conexion. Banco/regla desconocidos quedan pendientes sin autoimportacion.

Cierre: dos buzones aislados, sincronizacion recuperable sin PC y procedimiento de alta/revocacion probado.

Fuentes: https://developers.google.com/workspace/gmail/api/auth/scopes y https://developers.google.com/workspace/gmail/api/guides/push.

## 10. Etapa seis: conciliacion comun y aprendizaje

Rama sugerida: mejoras/conciliacion-canales.

- Una bandeja para manual, WhatsApp, Gmail y despues notificaciones/SMS. Cada evento conserva origen verificado, identificador y vinculo al movimiento.
- Distinguir evento repetido, mismo cargo visto en otro canal y dos compras reales identicas. Confirmar coincidencia cuando no haya evidencia suficiente.
- Mostrar razon del pendiente, propuesta corregible, registrada/descartada y acceso al movimiento. No hacer que un evento tardio guarde una fecha actual incorrecta.
- Ajustar mapeos de banco/comercio/categoria/cuenta por usuario a partir de correccion explicita.
- Edicion y reverso mediante servicios contables existentes; no borrar trazabilidad o cambiar saldos historicos silenciosamente.

Cierre: compra vista por WhatsApp/correo/notificacion termina en un movimiento o revision explicita; ninguna deduplicacion elimina una compra diferente sin confirmacion.

## 11. Etapa siete: asistente financiero con evidencias

Rama sugerida: mejoras/asistente-evidencias.

- Reutilizar chat, consultas WhatsApp y backend actual. Soportar rango/lista/moneda: gasto por categoria, comparacion, presupuesto restante y tendencias sencillas.
- Calculos exactos mediante consultas autorizadas, no calculos inventados por LLM. IA interpreta y explica, sin SQL libre ni acceso a otro usuario.
- Cada respuesta indica periodo, moneda y operaciones consideradas, con enlace a historial filtrado. Comparaciones con periodos equivalentes y tratamiento explicito de datos incompletos.
- Ejemplos: cuanto gaste en restaurantes; comparame con el mes anterior; cuanto queda de transporte; que cargos recurrentes tengo.
- Interfaz de conversacion ligera, bloques compactos de evidencia, sugerencias utiles y estados carga/vacio/error. Evitar otro dashboard lleno de tarjetas.
- Comenzar con consultas de solo lectura; cualquier futura accion requiere propuesta/autorizacion aparte.

Cierre: cifras coinciden con reportes/historial, aislamiento probado y ninguna consulta altera saldos.

## 12. Etapa ocho: auditoria funcional y visual pendiente

Varias ramas pequenas segun hallazgos, no otro rediseño completo sin diagnostico.

- Revisar en Android fisico Inicio simple/detallado, barras, teclado, giro, letra grande, microfono denegado/concedido, volver del fondo, listas largas, importes grandes, temas y privacidad.
- Conservar blanco/coral/emojis/barras, hojas y accion principal clara. No barra inferior de cinco opciones, menu Mas desordenado ni tarjetas para cada dato. Skip link accesible oculto salvo foco, no eliminar accesibilidad para ocultar un bug CSS.
- Verificar periodos flexibles integrados: 14 dias vs quincena, cruces de ano, mes corto, bisiesto, rangos de todo el historial; mismo rango/cifras en Home, historial y reportes.
- Fechas de tarjetas: reglas por tarjeta/estado de cuenta, corte y vencimiento reales; no asumir veinte dias universales ni modificar cargos historicos.
- Listas/etiquetas/busqueda: confirmar alcance real; buscar texto/importe/categoria/tag/lista/fechas, paginacion e indices. Busquedas guardadas solo si aportan valor y no estan hechas.
- Presupuestos: restante, umbrales, exceso, enlace desde categoria, periodo explicitamente mensual cuando corresponda. Revisar avisos sin spam.
- Recurrencias: instancia/futuras/todas, meses cortos, fin/cancelacion y ejecucion idempotente; no reescribir historia.
- Offline: captura y borrador durables, sincronizacion, errores y conflictos; que cada pantalla refleje guardado local, pendiente o sincronizado.

Cierre: recorrido fisico documentado, problemas reales corregidos y regresiones pertinentes verdes. No reimplementar listas/periodos/presupuestos por leer una tabla vieja que los marca futuros.

## 13. Etapa nueve: Android y registro desde el sistema

Rama sugerida: mejoras/android-captura; evaluar Capacitor u otra envoltura compatible antes de reescribir Angular.

- PWA actual primero comprobada; luego app empaquetada con autenticacion, enlaces propios, safe areas, teclado, borradores y offline.
- Quick Settings Tile para Anadir gasto desde la cortina. Separarlo de widget de escritorio, acceso directo y notificacion persistente.
- Permisos solo al usar la funcion; deep link a captura y respeto del bloqueo. Probar instalacion/actualizacion y dispositivo real.
- Notificaciones utiles: presupuesto, vencimiento y recurrencia; preferencias, frecuencia y enlaces a pantalla concreta. No exponer importes bloqueados sin opcion del usuario.
- Widgets de acceso rapido/voz y presupuesto solo cuando los datos/sincronizacion esten estables.

Cierre: agregar gasto desde el acceso del sistema funciona con app cerrada y sin red, y se sincroniza una sola vez.

## 14. Etapa diez: notificaciones bancarias, SMS y pagos

Separar ramas por canal.

- Android NotificationListener con consentimiento explicito y apps permitidas; filtrar en dispositivo y enviar solo datos minimos a Avisos. Probar actualizaciones/repeticiones, acceso revocado, pantalla bloqueada y reinicio.
- SMS: empezar por compartir un mensaje elegido. Lectura automatica solo tras revisar permisos y reglas vigentes de distribucion. Excluir OTP y conversaciones ajenas.
- Google Wallet/Google Pay: investigar APIs oficiales y las notificaciones disponibles; no asumir acceso universal a pagos de otras aplicaciones ni que pagar genere un evento accesible a Kaptal.
- Apple Pay/Atajos: etapa iOS separada, guia y automatizacion realmente soportadas, con prueba de usuario. No simularlo con un switch web ni prometer leer todo pago en iPhone.
- Google Assistant/atajos del sistema: comprobar capacidades vigentes en la plataforma objetivo; ofrecer deep links/acciones compatibles, sin comprometer una integracion no disponible.

Cierre: cada canal justifica su viabilidad, consentimiento y deteccion; sin cargos duplicados entre pago, correo y notificacion. Si una API no permite la funcion, documentar alternativa real.

## 15. Etapa once: compartido, divisas y metas

Revisar lo existente y dividir en entregas.

- Listas compartidas: invitaciones/roles/salida/revocacion, autor de cada movimiento y pruebas de permisos. No toda mejora requiere una nueva lista o modelo.
- Repartos: porcentajes/partes/importes, redondeo exacto y liquidaciones sin contar dos veces el mismo gasto. Concurrencia y permisos al editar.
- Divisas: conservar moneda original, tipo de cambio, fecha/fuente, equivalencia secundaria y saldos por moneda. Cambiar moneda visual no convierte el pasado.
- Metas: aportes/retiros entre saldos propios sin inflar ingresos/gastos; progreso y cancelacion claros.

Cierre: centavos y propiedad de fondos conservados, calculos trazables y ninguna suma engañosa de monedas distintas.

## 16. Etapa doce: onboarding, privacidad y acabado nativo

- Onboarding breve/omitible: registrar por texto/voz, categorias/presupuestos y automatizaciones. No pedir todos los permisos al entrar.
- Biometria nativa cuando exista app, bloqueo al volver del fondo y ocultacion de vistas previas; no presentar CSS como Face ID.
- Haptics y animaciones contenidas con reduced motion; controles de 44 px o mas y alternativas a gestos.
- Accesibilidad: foco, lectores de pantalla, formatos numericos/regionales, contraste, letra grande y privacidad en etiquetas accesibles.
- Widgets/notificaciones con preferencia de mostrar dinero sensible, nunca activada a escondidas.
- Importacion/exportacion CSV/respaldo: ensayar casos reales y restauracion; incluir nuevos datos de integraciones solo mediante contrato de respaldo definido y seguro.

Cierre: app util sin onboarding/voz/IA, accesible y coherente en situaciones reales.

## 17. Etapa trece: rendimiento, costes y operacion

Trabajo transversal desde etapas iniciales; cierre de producto al estabilizar funciones.

- Medir arranque/bundle, consultas p95, interpretacion p95, tasa de acierto de reglas, llamadas/coste IA, cola y errores por canal.
- Indices PostgreSQL/D1, paginacion y consultas acotadas. No cambiar lenguaje porque otro framework se anuncie mas rapido.
- Limites por usuario/canal y presupuesto global de IA; cuotas de Workers/D1/Kapso revisadas. Gratis dentro de cuota no equivale a ilimitado ni garantiza coste cero de proveedores externos.
- Monitorizacion sin cuerpos bancarios, metricas agregadas, alertas de sesion/cola/webhook, respaldos cifrados y restauracion verificada.
- Evaluar hosting Spring/PostgreSQL con necesidades y coste reales. Workers/D1 alojan el canal; Cloudflare Pages puede alojar frontend, pero no sustituye Spring Boot directamente.
- Convex: no migrar sin necesidad demostrada que compense portar permisos/contabilidad/migraciones. OmniRoute y Coucou tampoco se instalan solo por estar en una lista.
- Revisar dependencias y secretos en CI; probar aislamiento, migraciones, restauracion y despliegues/rollback.
- Documentar desarrollo, produccion y recuperacion; publicar artefacto correcto y comprobar la app realmente servida.

Cierre: funcionamiento medido, coste controlado, copia restaurable y mantenimiento entendible.

## 18. Etapa catorce: comercializacion opcional

Solo si el propietario decide distribuir/comercializar: requisitos de tiendas, privacidad/eliminacion de cuenta, soporte, costos por usuario, limites y planes reales. No inventar pantallas de suscripcion, periodos de prueba ni cobros porque la referencia MonAi los tenga.

## 19. Criterio de cierre comun de cada entrega

1. Contrato/alcance y riesgos concretos entendidos.
2. Implementacion funcional con estados vacio/carga/error y sin botones simulados.
3. Pruebas pertinentes de datos, permisos, monedas e idempotencia; CI verde.
4. Migracion/copia/retorno comprobados cuando afecte datos o servicio activo.
5. Revision movil real o del proveedor real cuando la entrega lo requiera, separada de mocks.
6. Documentacion y estado al dia con lo hecho y pendiente; commit/PR con autoria del propietario.
7. Integrar a develop; despues a main con pruebas correctas y despliegue coordinado. No llamar terminado a algo solo por publicar codigo.

## 20. Orden vigente de las siguientes partes

Este orden sustituye la antigua secuencia de arranque. Los bloques históricos no reabren Gmail ni convierten comprobaciones ya acreditadas en pendientes nuevos.

1. La entrega conjunta Amex/Revolut, IA gratuita, presupuesto compartido y consumo reportado ya está publicada y verificada. Al retomar, comprobar el HEAD/CI vigente y su evidencia; no repetir pruebas acreditadas por rutina. La instalación física de la APK sigue separada mientras el teléfono esté desconectado.
2. Cuando vuelva el teléfono, instalar0.1.16con la misma firma conservando datos y comprobar únicamente los cambios pendientes. Activar el consentimiento guardado de ingresos Revolut MXN sin cambiar destinos/Sears; si Amex exige tarjeta, no retirar la restricción sin que el propietario decida cómo asociar el formato sin tarjeta. No repetir login/bloqueo/reinicio o la recuperación de Santander por rutina.
3. Observar avisos habituales futuros para separar registro automático, movimiento único/cuenta correcta y primera categoría real. No comprar para probar, importar ejemplos ni recuperar descartados. Estos pendientes físicos no bloquean pruebas aisladas y trabajo operativo independiente.
4. Continuar Etapa13 con cuotas Free efectivas por cuenta, consumo/duración que los proveedores realmente reporten, alertas agregadas, p95 representativo y operación/recuperación restante. Mantener el presupuesto numérico sin inventar un tope; la política vigente es solo planes gratuitos, sin fallback de pago. No confundir solicitudes/tokens/errores con factura o gasto guardado.
5. Revisar funcionamiento de categorías con casos aislados: nombres/equivalentes, organización, archivado y corrección manual; corregir fallos demostrados sin duplicar categorías ni reclasificar historia. Validar otros pendientes funcionales del plan solo cuando falte evidencia actual, preservando comprobaciones ya confirmadas.
6. Al estabilizar las funciones, revisar el diseño completo con el propietario, sección por sección: Inicio, captura, Movimientos, cuentas, categorías, presupuestos/recurrencias, listas/etiquetas, reportes, Avisos, asistente y ajustes. Explicar para qué sirven las etiquetas y simplificar/cambiar/añadir lo que acuerde el propietario. Mantener accesibilidad y letra grande; TalkBack está omitido expresamente.
7. Comercialización (Etapa14) únicamente si el propietario la solicita. No añadir cobros, suscripciones, proveedores de pago o cambios de hosting por defecto.

Cada parte en una rama nueva desde develop remoto actualizado y comprobado. Publicación permanentemente autorizada tras checks; no destrucción/restauración productiva, QA financiera productiva, activación de Gmail o cambios a Desktop. Las funciones de compartido/divisas/metas y los canales ya existentes se auditan según su evidencia, sin declarar automáticamente pendientes todos los hitos históricos.


## 21. Instrucción lista para el siguiente chat

Continúa Kaptal leyendo AGENTS.md, docs/ESTADO_SESION.md, docs/PLAN_MAESTRO_KAPTAL.md, docs/AVISOS_AMEX_REVOLUT.md, docs/CATEGORIAS_COMPRAS_AUTOMATICAS.md, docs/IA_GRATUITA_PRESUPUESTO_ETAPA_13.md, docs/CONSUMO_TOKENS_IA_ETAPA_13.md, docs/AISLAMIENTO_IA_EN_PRUEBAS.md y .local/CONTINUAR_IA_GRATUITA_ETAPA_13.md. Consulta .local/ampliacion-cierre.json y los JSON de cada entrega; confirma Git/GitHub/producción/dispositivo. Main5bc2ae6 publicado con Render/Vercel/66estáticos/API/Google correctos, esquema V14 sin migraciones. Teléfono desconectado: APK0.1.16final preparada, no instalada; ingresos Revolut autorizados requieren opción nativa guardada al volver. Solo Groq/Gemini Free, sin API OpenAI/fallback de pago; no IA real para QA. La primera suite heredó clave y registró tres generaciones Gemini (coste no verificado); perfiltest corregido y protegido por pruebas. Sigue Etapa13 según sección20, en rama nueva desde develop actualizado/comprobado. Diseño completo al final con propietario por secciones, incluidas etiquetas. Santander solo gastos; conservar Sears física/digital; Gmail deshabilitado, Desktop intacto, TalkBack omitido. Producción autorizada tras checks; sin destrucción/restauración productiva, QA financiera productiva, compras de prueba ni recuperación de descartados.
