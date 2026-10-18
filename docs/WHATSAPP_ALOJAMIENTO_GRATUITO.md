# WhatsApp sin la PC: alternativa gratuita

Preferencia del propietario: alojamiento sin coste. Investigacion oficial del 2026-10-18; revisar los limites mostrados en la cuenta al crear recursos. No se ha creado ninguna cuenta, contratado nada ni movido el webhook.

## Resultado

| Opcion | Resultado para este receptor |
| --- | --- |
| Render Free | No adecuada sin redisenar almacenamiento: duerme tras 15 minutos y no admite disco persistente. Se perderian cola y cookie en el filesystem efimero. |
| Northflank Sandbox | Publica servicios gratuitos siempre activos y una base gratuita, pero el almacenamiento en volumen tiene tarifa. No se ha verificado un volumen gratis para SQLite; no presentarlo como alojamiento gratuito listo. |
| Oracle Always Free | Alternativa compatible con el contenedor actual: VM elegible, almacenamiento persistente y una IP publica en la forma micro documentada. Sujeta a cupo disponible y recuperacion de instancias inactivas. |

Propuesta gratuita: una VM `VM.Standard.E2.1.Micro`, Ubuntu elegible, disco de arranque dentro de la cuota Always Free, Docker Compose y Caddy para HTTPS. No requiere mover Angular, Spring Boot ni las finanzas a otro proveedor. La configuracion ARM tambien puede funcionar, pero no es la arquitectura probada localmente; no sobredimensionar basandose en cuotas antiguas de Oracle.

No se promete continuidad garantizada: Oracle puede recuperar maquinas inactivas y no siempre tiene capacidad en la region de la cuenta. No generar carga artificial para evitarlo. Si no hay cupo, decidir otra alternativa; no cambiar a recursos de pago automaticamente. El coste del canal Kapso/Meta es independiente del alojamiento.

## Preparacion disponible

`tools/canales/compose.yaml` levanta un receptor, su disco persistente y un proxy HTTPS. Solo publica 80/443; Python queda en la red interna. Caddy guarda sus certificados en otro volumen y el contenedor de WhatsApp usa UID/GID 10001. Los reinicios conservan la cola. No ejecutar replicas adicionales ni borrar volumenes para solucionar errores.

Se necesita una cuenta Oracle creada por el propietario y acceso privado a la VM. No enviar contrasenas, claves SSH ni datos de pago al chat. El registro/verificacion de cuenta se completa en la pagina oficial. Revisar que cada recurso figure como Always Free, no solo cubierto por creditos temporales, y que no se habilite una ampliacion de pago.

## Crear primero la cuenta

1. Abrir [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/) y elegir Start for free.
2. Registrar datos reales y verificar el correo. El propietario completa identidad y tarjeta exclusivamente en Oracle; no compartir esos datos con Codex.
3. Oracle puede pedir tarjeta y efectuar una retencion temporal de verificacion. Revisar su FAQ y las condiciones mostradas durante el registro.
4. Elegir la region principal con cuidado, porque los recursos gratuitos se crean alli y el cupo puede agotarse. No prometer disponibilidad en Mexico ni elegir una region sin ver las opciones reales de la cuenta.
5. Entrar en la consola y detenerse antes de crear recursos. Revisar Always Free, disco y forma elegible; no activar Pay As You Go para sortear un error de capacidad. Los creditos de prueba no convierten cualquier recurso en gratuito permanente.

Fuente: [FAQ oficial de registro](https://www.oracle.com/cloud/free/faq/).

## Pasos cuando exista la VM

1. Crear la instancia elegible en la region principal con clave SSH y Ubuntu elegible. Mantener el disco dentro de la cuota gratuita disponible, incluyendo otros recursos de esa cuenta. No crear balanceadores ni bases adicionales para este puente.
2. Instalar Docker Engine y Compose siguiendo la guia oficial de Ubuntu; usar SSH por clave. Restringir SSH a la IP administrativa y permitir 80/443 en la red de Oracle y firewall de la VM. El puerto 10000 no debe exponerse.
3. Preparar un nombre DNS que apunte a la IP publica. Si no hay dominio propio, Duck DNS ofrece subdominios gratuitos; registrarlo en su web y configurar la IP. El token de Duck DNS no es necesario para Caddy con los desafios HTTP/TLS y no va en el repositorio. Comprobar resolucion antes de activar HTTPS.
4. Llevar el codigo revisado a una carpeta privada del servidor. Crear un archivo privado de entorno (permisos 600, carpeta 700) con `KAPTAL_BRIDGE_CONFIG` (JSON de una linea), `KAPSO_API_KEY` y `KAPSO_WEBHOOK_SECRET`. El JSON usa los valores reales ya verificados y la nueva URL `https://DOMINIO/webhooks/kapso`. No colocar este archivo en la carpeta publica ni ejecutar `docker compose config` sin `--quiet`, porque podria imprimir secretos interpolados.
5. Desde la raiz del proyecto en la VM, definir rutas/dominio (los valores siguientes son marcadores, no credenciales):

```sh
export KAPTAL_WHATSAPP_ENV_FILE=/ruta/privada/whatsapp.env
export KAPTAL_WHATSAPP_DOMAIN=tu-subdominio.duckdns.org
docker compose -f tools/canales/compose.yaml config --quiet
docker compose -f tools/canales/compose.yaml up -d --build
```

6. Antes de cambiar Kapso, detener el receptor local. Migrar un respaldo consistente de SQLite para conservar deduplicacion, siguiendo `WHATSAPP_OPERACION.md`. Si se restaura con una tarea temporal, detener antes el contenedor receptor de la VM. No crear otra cola vacia para ocultar pendientes.
7. Con el servicio receptor de la VM detenido para el mantenimiento, autorizar una sesion nueva desde una tarea que monte el mismo volumen:

```sh
docker compose -f tools/canales/compose.yaml stop whatsapp
docker compose -f tools/canales/compose.yaml run --rm --no-deps whatsapp python whatsapp_host.py connect
docker compose -f tools/canales/compose.yaml up -d
```

Abrir el enlace mostrado en el navegador personal, entrar con Google y pegar el codigo solo en la terminal SSH. No hay que instalar un navegador en el servidor. La cola migrada y la sesion nueva deben pertenecer al mismo propietario/API. Se puede ejecutar de la misma forma `disconnect` durante mantenimiento para revocar esa sesion sin borrar la cola.

8. Comprobar HTTPS valido, `/health` y `/ready`, luego actualizar el webhook existente de Kapso (no crear duplicados). Probar consulta, gasto elegido por el propietario, nota de voz y reinicio del servicio. Cerrar el tunel solo tras verificar la nueva entrega real. Seguir el procedimiento de corte y retorno en `WHATSAPP_OPERACION.md`.
9. Mantener respaldo privado externo de la cola y configuracion, sin copiar SQLite mientras esta en uso salvo mediante su API `backup`. Monitorizar `/ready`; una VM gratuita puede dejar de estar disponible. No guardar tokens o mensajes financieros en evidencias publicas.

Hasta crear la cuenta/VM y probar el corte, esta es una preparacion comprobada localmente, no un despliegue activo.

Fuentes: [Render Free](https://render.com/docs/free), [Northflank precios](https://northflank.com/pricing), [Oracle Always Free y sus limitaciones](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm), [Docker en Ubuntu](https://docs.docker.com/engine/install/ubuntu/), [Duck DNS](https://www.duckdns.org/why.jsp), [HTTPS automatico de Caddy](https://caddyserver.com/docs/automatic-https).
