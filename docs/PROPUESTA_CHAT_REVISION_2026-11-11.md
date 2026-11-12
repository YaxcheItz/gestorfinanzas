# Primera sección propuesta: chat — revisión final local

Continuación de la auditoría visual. Se conserva la implementación actual; solo documentos y scripts de QA sintética. Evidencias: `.local/chat-review-final` del checkout principal, geometría reproducible en geometry.json y script `.local/chat-review-final.cjs`.

## Comprobación adicional
Chromium390x844, respuestas ficticias, red externa bloqueada. Tras esperar1800ms por estado: error503 permanece parcialmente fuera de vista; al desplazar el hilo al fondo aparece completo (error-settled.png / error-bottom.png). Propuesta accesible al desplazar; Desc ar tar sigue fragmentado (proposal-bottom.png). El editor permite llegar a Cancelar edición y Actualizar propuesta desplazando su propio formulario (editor-bottom.png). Corregir cualquier interpretación previa de inaccesibilidad total.
Cerrar/reabrir conserva “Segunda prueba ficticia”; recargar deja entrada vacía. Comportamiento aceptado conservado. No se guardó movimiento ni se llamó backend real. No prueba teclado físico Android ni contabilidad.

## Propuesta concreta para decidir primero
1. Mantener ventana compacta inicial y entrada por lápiz/micrófono actuales.
2. Expandir la ventana cuando hay propuesta o edición, con altura ajustada al espacio disponible. Reducir acceso manual a una acción secundaria compacta durante conversación. Probar en320/390px y escritorio antes de fijar altura.
3. Reservar una franja visible para error del envío junto al compositor. Conservar texto para reintentar y no enviar automáticamente. El aviso no debe depender de encontrar el final del hilo.
4. Evitar que palabras de acciones se rompan; si no caben, apilar Descartar y Guardar movimiento. Objetivos táctiles al menos44px.
5. Dar al editor la mayor parte del panel y mantener sus acciones finales accesibles sin desplazamientos anidados innecesarios. Preservar Actualizar propuesta y posterior confirmación de registro como dos pasos distintos.
6. Mostrar Ir al último mensaje cuando sea útil; garantizar que no tape el error ni el foco. Conservar posición del usuario si está revisando mensajes anteriores.

## Aceptación de la futura implementación
Propuestas, edición y error visibles/alcanzables a320x640 y390x844; viewport reducido390x480 como prueba geométrica adicional, sin llamarlo teclado real. Claro/oscuro, nombres largos y fuente ampliada. Navegación por teclado/foco y prueba Android aislada pendiente cuando sea posible sin tocar sesión real ni instalar durante auditoría. Mantener guardado explícito, reglas/Groq, idempotencia y texto solo de sesión. No ampliar alcance a persistencia ni PR271.

Siguiente sección después de decidir chat: controles flotantes y texto ampliado en toda la app. Todavía no se implementó este diseño.

Continuación: lee AGENTS.md, ESTADO_SESION.md, PLAN_MAESTRO_KAPTAL.md y PROPUESTA_CHAT_REVISION_2026-11-11.md; rama auditoria/visual-1111. Presentar/confirmar alcance de la primera sección antes de rediseñar; el usuario pidió revisión previa. Evidencia del principal .local/chat-review-final.
