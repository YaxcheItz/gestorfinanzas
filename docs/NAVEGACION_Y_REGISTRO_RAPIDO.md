# Navegación y registro rápido

El acceso habitual es **Añadir → monto → Guardar**. La cuenta y categoría anteriores de ese tipo se recuperan si siguen activas. Ingresos y transferencias están en el mismo panel; el destino de transferencia se propone distinto al origen. Fecha, notas y opciones avanzadas se despliegan solo cuando hacen falta.

La barra inferior contiene Inicio, Actividad, Añadir, Planes y Reportes. Cuentas tiene acceso en la cabecera del dashboard. Configuración agrupa el resto de las herramientas financieras. El ojito aparece en la cabecera y los paneles; conserva una sola preferencia para toda la aplicación.

El registro por voz se abre desde **Dictar o escribir una frase**. Grabar pide permiso para enviar el audio y acceso al micrófono. Detener prepara una propuesta que se revisa y confirma. Se puede cancelar durante transcripción o categorización. La entrada manual funciona sin consentimiento de IA.

El guardado evita doble envío y repite la misma clave de idempotencia cuando la respuesta es incierta. Ese reintento se conserva al cerrar y reabrir el panel durante la sesión. Se necesita conexión para cargar el catálogo y confirmar el nuevo registro rápido; la gestión previa de pendientes offline del dashboard sigue disponible.

Verificación: 170 pruebas frontend, compilación y cuatro configuraciones Chromium con API sintética. Las pruebas de voz simulan el grabador y permisos. No sustituyen la prueba de micrófono físico. Evidencias en `replica/navegacion-captura/`.
