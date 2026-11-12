# Revisión acumulada y listas compartidas

Revisión del 11 de noviembre de 2026, finalizada el 12 de noviembre UTC. Rama `mejoras/revision-integral-listas`, creada desde origin/develop 74a85bb e incorporando fb07f9e por fast-forward. Sin integración a develop/main ni instalación o despliegue.

## Comprobaciones del trabajo anterior

- Se revisó el diff acumulado de chat, controles, Inicio, cuentas, presupuestos, avisos y pareja. Los cambios son de presentación, etiquetas accesibles y cierre del diálogo; no hay cambios en backend ni servicios financieros. Esto no constituye una auditoría integral de seguridad.
- Los seis worktrees anteriores y el principal estaban limpios. Se verificaron por ls-remote los commits de chat 0fd3f6a, controles 7e67ec0, formularios 183e4a0, detalles fdcb20a, avisos fb07f9e y respaldo 50f8fee. La rama de respaldo antigua no se integró en develop.
- Build aprobado; 65 archivos y 569 pruebas frontend aprobados antes de los ajustes exclusivos de listas.
- Nueva configuración acumulada ejecuta seis casos previos y uno de listas: 7 aprobados. Suite adicional de Avisos: 7 aprobados. Tras el último ajuste del selector se repitieron build y caso de listas, aprobados. No se midió cobertura ni existe script lint en package.json; compilación verifica tipos/plantillas. No se verificó CI remota.
- Un intento inicial del caso nuevo falló por un selector de prueba que confundía texto visible con nombre accesible; corregido y repetido. No fue un fallo de la aplicación.

## Hallazgos de listas e invitaciones

| Prioridad | Observación renderizada | Impacto y corrección |
|---|---|---|
| Alta | A 320 px y fuente raíz 200%, el nombre del participante queda letra por letra junto a Hacer lector/Retirar. | Nombre en fila completa y acciones envolventes con altura mínima 44 px. Verificada anchura del nombre mayor de 180 px y ausencia de overflow del diálogo. |
| Media | Etiquetas, campos y explicaciones mantienen 13–16 px al ampliar fuente. | Tamaños relativos rem para respetar ampliación; campos llegan a 32 px. |
| Media | La explicación de Lector queda cortada dentro del select al ampliar. | Opciones breves Editor/Lector y explicación visible asociada con aria-describedby. |

Observación adicional del código: textarea y summary no tenían el mismo selector explícito de foco que los demás controles. Se añadió; no se afirma que antes carecieran de todo foco nativo.

Probados con API interceptada y red externa bloqueada: selector a320, vista oscura a390/escritorio1280, miembros, invitación ficticia, error503 al unirse conservando código, Escape/restauración de foco, Tab dentro del diálogo y opciones restringidas para lector. No se envió ninguna invitación real, no se cambiaron roles reales ni se tocaron saldos. Los permisos del servidor no se verifican con mocks.

Evidencias locales bajo el worktree: `frontend/.local/revision-listas-evidencia/test-results-listas/` contiene el antes; `frontend/.local/revision-listas-evidencia/final/` contiene el después. Subcarpeta de caso `listas-visual-local-listas-48722-maños-permisos-error-y-foco`, imágenes participantes-200.png, invitacion-200.png, union-error-200.png y listas-dark-390.png. Capturas anteriores acumuladas en frontend/test-results/. No contienen datos reales.

## Pendientes y orden recomendado

1. Inicio/Movimientos: comprobar y resolver el solapamiento restante del dock flotante al desplazar, sin rediseñar el historial.
2. Accesibilidad transversal: contraste medido, navegación completa con teclado, texto ampliado, vacíos/errores de secciones aún no cubiertas.
3. Android aislado: teclado real, áreas seguras, TalkBack, orientación y voz. No basta Chromium; versión instalada no se reconsultó en esta etapa.
4. Aceptación visual por secciones, revisión de importes largos de pareja y presupuestos CSS pendientes (Avisos4.49kB y automatic-bank5.01kB frente a4kB). No se aumentaron límites para esconder avisos.

Conservar calendario, historial aplazado, reglas/Groq/idempotencia y sesión temporal del chat; no borradores persistentes ni PR271. Copiar código al portapapeles, carga prolongada de listas, invitación real y entrega Android quedan sin comprobar.

Continuar: leer AGENTS.md, docs/ESTADO_SESION.md, docs/PLAN_MAESTRO_KAPTAL.md, este informe y los planes/prompts locales. Crear la siguiente rama desde develop remoto comprobado e incorporar esta dependencia; trabajar primero el dock de Inicio/Movimientos con fixtures.
