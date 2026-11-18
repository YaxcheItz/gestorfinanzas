# Preparación de la publicación visual

La publicación de Kaptal se confirma con el propietario después de presentarle los cambios, el SHA y el destino. Esa confirmación cubre cualquier acción sobre `main` que active automáticamente la publicación. La preparación y las pruebas pueden avanzar en ramas de trabajo y borradores.

## Qué contiene PR271

El borrador `fec83cf` evitaba mostrar automáticamente el borrador del chat, pero guardaba copias locales con texto, contexto, propuestas y edición. Añadía una opción en Configuración para consultarlas, descargarlas como JSON o borrarlas. La descripción del PR señala que podían quedar copias en el dispositivo después de borrar la cuenta. GitHub indica conflictos con develop. [PR271](https://github.com/YaxcheItz/gestorfinanzas/pull/271).

La versión actual tomó otro enfoque en `eded8aa`. El chat conserva texto y conversación al reabrir la ventana en la misma sesión y dejó de guardar borradores persistentes. La migración elimina el almacén IndexedDB de borradores y conserva la cola de movimientos confirmados. El borrador PR271 queda fuera del contenido de esta publicación por su alcance y por el conflicto con ese comportamiento. Cualquier revisión futura de esa función es una decisión independiente.

## Candidato a publicar

PR290 reúne la cadena visual de PR288 y el parche de PR289 para revisión contra develop. Su head es `480c17606286b349588615d97ad2368054b431f7`, develop `fe13575532c8c055fe699374660988a888b01f6f` y main `1fd9402bb40012aba4c894b81ecceb09dcfb48a1`. La simulación con `git merge-tree` contra ambas bases produjo sin conflictos el mismo árbol `b9df1b9f45058c21c0de79b0e150028574262913` del candidato. Se revisó el diff frente a main. Los cambios son de interfaz web, pruebas, documentación y herramientas de desarrollo. Backend, migraciones, configuración de despliegue y archivos Android coinciden con main. [PR290](https://github.com/YaxcheItz/gestorfinanzas/pull/290).

El mismo SHA aprobó la CI de la rama con seis trabajos, 580 unitarias, 176 E2E y cuatro PWA. La compilación Android de PR290 aprobó y generó una APK de prueba. La CI adicional sobre develop aprobó cinco trabajos y continúa en E2E al registrar este estado. [CI de la rama](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/44227339081), [CI de PR290](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/44233571951), [Android de PR290](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/44233572233).

## Qué activaría la publicación

1. Con confirmación del propietario, integrar el candidato aprobado a develop conservando su árbol y comprobar el SHA y la CI de integración.
2. Preparar la promoción de develop a main. Verificar el diff, repetir las comprobaciones que falten y comprobar que el árbol coincide con el candidato aprobado. La confirmación debe indicar si abarca esta promoción automática a producción.
3. Integrar a main por el flujo Git aprobado. Vercel publica la web en `kaptalgf.vercel.app`. Render sirve la API y tiene configurada la rama main. Comprobar el resultado de ambos servicios y si Render generó un despliegue para este cambio. El despliegue de una APK o su instalación en el teléfono se trata por separado.
4. Verificar la identidad del SHA publicado, la web y `/api/health` con lecturas públicas. Si la publicación falla, detener la entrega y presentar el estado y la opción de volver al SHA productivo anterior para confirmación.

Como referencia, el último despliegue de producción comprobado de Vercel y Render corresponde a `1fd9402`. El endpoint público de salud respondió UP. El Preview automático de `480c176` de Vercel está registrado como exitoso. El Preview es un entorno distinto a producción.

La preparación actual utiliza únicamente fixtures sintéticos. Conserva calendario. Historial, lentitud y logout siguen aplazados.
