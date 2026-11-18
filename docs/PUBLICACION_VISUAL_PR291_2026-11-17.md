# Publicación web de las mejoras visuales

El usuario aprobó publicar el candidato descrito en [la preparación de PR290](PREPARACION_PUBLICACION_VISUAL_PR290_2026-11-17.md). La entrega reúne ajustes de legibilidad y Avisos, más el control temporal de picomatch con el parche y las pruebas de PR289. El prototipo de borradores del chat de PR271 queda fuera de este candidato. El alcance de la aprobación es web.

PR290 se integró en develop como `0ed4cc7410f351992334bf419486a47080c33c2c`. El árbol `b9df1b9f45058c21c0de79b0e150028574262913` coincide con el candidato `480c17606286b349588615d97ad2368054b431f7`. Antes de promover, se simuló el merge con main `1fd9402bb40012aba4c894b81ecceb09dcfb48a1` y se obtuvo el mismo árbol. Backend, migraciones, archivos Android y configuración de despliegue coinciden con el main anterior. [Integración PR290](https://github.com/YaxcheItz/gestorfinanzas/pull/290) · [Promoción PR291](https://github.com/YaxcheItz/gestorfinanzas/pull/291).

Las comprobaciones previas aprobaron para ambos PR y para develop. [CI de PR290](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/44233571951) · [Android de PR290](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/44233572233) · [CI de develop](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/44239536207) · [Android de develop](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/44239536116) · [CI de PR291](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/44239590695) · [Android de PR291](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/44239590516).

La compilación local del árbol candidato terminó con 489,19 kB iniciales. Se conserva el build para contrastar los recursos públicos de Vercel por nombre y SHA-256 tras la publicación. La comprobación previa de salud pública respondió HTTP 200 y UP.

## Producción verificada

PR291 se integró en main como `73fe866ef72cd098a577690a33b504a070c2e9b9`. El SHA remoto coincide con el merge y su árbol sigue siendo `b9df1b9f45058c21c0de79b0e150028574262913`. La rama develop conserva `0ed4cc7`. GitHub marcó PR288 como integrado al entrar el historial de PR290. El contenido del parche de PR289 entró en el mismo merge, aunque su PR apilado conservó su estado abierto.

Vercel registró éxito para el despliegue 7874750815 y Render para 7874740629, ambos asociados a `73fe866`. Después de los dos despliegues, el dominio público devolvió HTTP 200 y los 12 recursos iniciales JS/CSS coincidieron por nombre y SHA-256 con el build local. /api/health respondió HTTP 200 y UP desde el dominio web y desde el servicio de Render. Las comprobaciones fueron lecturas públicas. [Kaptal](https://kaptalgf.vercel.app).

El workflow Android de main aprobó y generó un artefacto de pruebas. La publicación de la web y una instalación en el teléfono son entregas separadas. [Android de main](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/44241875669).

La CI general 44241875666 del SHA `73fe866` aprobó sus seis trabajos el 18 de noviembre de 2026 a las 05:25:04 UTC. Se verificaron 19 pruebas de seguridad, 580 unitarias, 176 E2E normales y cuatro PWA en su proyecto dedicado. También aprobaron el arranque 200/401/503 y la navegación con datos sintéticos. [CI de main](https://github.com/YaxcheItz/gestorfinanzas/actions/runs/44241875666).

El cierre documental se publica en la rama `revision/publicacion-visual-pr291`, creada desde develop verificado `0ed4cc7` en el worktree `.local/worktrees/mitigacion-picomatch-pr288`. En la próxima etapa, revisar por secciones la web publicada empezando por Avisos y el editor con texto ampliado. Usar datos ficticios para pruebas de operaciones. Cuando existan versiones oficiales corregidas compatibles, verificar la actualización de picomatch y retirar su mitigación temporal.
