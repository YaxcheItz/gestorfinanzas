# Aislamiento de IA en pruebas locales

La primera suite completa de la entrega bancaria se ejecutó con una clave Gemini heredada del proceso. Su log registró tres generaciones correctas desde pruebas de integración con datos financieros ficticios en H2. No corresponde afirmar que toda aquella ejecución utilizó únicamente HTTP simulado. No se hicieron escrituras financieras en producción.

No se consultó el panel de facturación ni se verificó el coste de esas generaciones; no se deduce un importe a partir del log. La confirmación del propietario de Groq/Gemini Free se refiere a sus cuentas del proyecto y no demuestra el plan de cualquier credencial heredada. No se conservó una huella de la clave usada inicialmente; no se imprime ni copia ninguna clave.

Las suites posteriores de IA gratuita, consumo y sus contratos retiraron las claves del proceso y utilizaron HTTP simulado. Se añade ahora protección en `src/test/resources/application-test.yml`: proveedores gratuitos desactivados y claves Gemini/Groq vacías para el perfil `test`. Las variables heredadas `GEMINI_API_KEY`/`GROQ_API_KEY` ya no activan esos proveedores en las pruebas Spring. Todos los tests SpringBoot de la suite declaran un perfil explícito.

`AiTestIsolationTest` simula nombres de variables heredadas con valores ficticios y comprueba que las propiedades no las adopten, el router/proveedores permanezcan desactivados y las solicitudes se rechacen antes de HTTP. Las pruebas directas de protocolo siguen usando MockRestServiceServer y claves ficticias. No reactivar proveedores en el perfil test para forzar una respuesta real.

Validación local posterior:595casos backend sin fallos/errores, ocho PostgreSQL reservados para CI. La corrección afecta recursos y clases de test; no cambia la configuración de producción ni requiere APK/publicación nueva. CI/integración del cierre se registran en `.local/ampliacion-cierre.json`.

Evidencia privada: `.local/test-isolation-incident.json`, `.local/avisos-formatos-backend-full.log` y `.local/ia-test-isolation-backend-full.log`. No subir logs originales, credenciales o fixtures privadas al repositorio. El control de coste de la app sigue dependiendo de conservar las cuentas aprobadas en Free sin facturación, junto con la retirada de la API OpenAI y del fallback de pago.
