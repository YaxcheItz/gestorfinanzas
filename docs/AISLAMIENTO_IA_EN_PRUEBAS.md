# Aislamiento de IA en pruebas locales

## Proteccion previa del destino PostgreSQL de pruebas

La configuracion de Playwright iniciaba el backend antes de que `rendimiento-local.spec.ts` validara el destino de PostgreSQL. Se reprodujo sin conexiones: `playwright test --list` aceptaba una URL remota ficticia. Ahora la configuracion rechaza antes del arranque las URL que no tengan host literal localhost o 127.0.0.1, puerto valido y base `kaptal_ci_e2e`, y no acepta parametros ni credenciales en la URL. H2 en memoria sigue como opcion predeterminada. El test `node --test scripts/check-e2e-database.test.cjs` comprueba configuraciones aceptadas y rechazadas sin iniciar servidores; se incorpora a CI. La prueba E2E con H2 local tambien paso.

El nombre de la base y localhost no demuestran que la instancia este vacia ni impiden un tunel a otro servidor; quien ejecute PostgreSQL debe garantizar una instancia y base de pruebas dedicadas. No se consultaron ni modificaron bases reales. CI e integracion pendientes al registrar.


La primera suite completa de la entrega bancaria se ejecutó con una clave Gemini heredada del proceso. Su log registró tres generaciones correctas desde pruebas de integración con datos financieros ficticios en H2. No corresponde afirmar que toda aquella ejecución utilizó únicamente HTTP simulado. No se hicieron escrituras financieras en producción.

No se consultó el panel de facturación ni se verificó el coste de esas generaciones; no se deduce un importe a partir del log. La confirmación del propietario de Groq/Gemini Free se refiere a sus cuentas del proyecto y no demuestra el plan de cualquier credencial heredada. No se conservó una huella de la clave usada inicialmente; no se imprime ni copia ninguna clave.

Las suites posteriores de IA gratuita, consumo y sus contratos retiraron las claves del proceso y utilizaron HTTP simulado. Se añade ahora protección en `src/test/resources/application-test.yml`: proveedores gratuitos desactivados y claves Gemini/Groq vacías para el perfil `test`. Las variables heredadas `GEMINI_API_KEY`/`GROQ_API_KEY` ya no activan esos proveedores en las pruebas Spring. Todos los tests SpringBoot de la suite declaran un perfil explícito.

`AiTestIsolationTest` simula nombres de variables heredadas con valores ficticios y comprueba que las propiedades no las adopten, el router/proveedores permanezcan desactivados y las solicitudes se rechacen antes de HTTP. Las pruebas directas de protocolo siguen usando MockRestServiceServer y claves ficticias. No reactivar proveedores en el perfil test para forzar una respuesta real.

Validación local posterior:595casos backend sin fallos/errores, ocho PostgreSQL reservados para CI. La corrección afecta recursos y clases de test; no cambia la configuración de producción ni requiere APK/publicación nueva. CI/integración del cierre se registran en `.local/ampliacion-cierre.json`.

Evidencia privada: `.local/test-isolation-incident.json`, `.local/avisos-formatos-backend-full.log` y `.local/ia-test-isolation-backend-full.log`. No subir logs originales, credenciales o fixtures privadas al repositorio. El control de coste de la app sigue dependiendo de conservar las cuentas aprobadas en Free sin facturación, junto con la retirada de la API OpenAI y del fallback de pago.
