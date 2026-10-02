# Prodigy · demo con selector de industrias

[Abre la demo](https://giqciklum.github.io/prodigy-cn-demo/). No requiere instalación ni cuenta. Conserva el diseño de Congelados de Navarra y añade maquinaria, banca, retail y cervecería. Incluye ESP/ENG, ocho pantallas por industria y modo presentador con la tecla P.

**Arquitectura:** esta web es una simulación estática independiente en HTML/CSS/JavaScript. No ejecuta el backend de Prodigy ni llama a un LLM. No incluye el framework privado. Los datos, procedimientos, conectores y efectos operativos son sintéticos. Una clave de IA por sí sola no completa la integración.

## Elegir un escenario

El selector **Industria**, arriba, conserva el idioma y la pantalla. Cambiar de industria abre su propia sesión; los workflows y las decisiones no se mezclan. **Reiniciar demo** borra solo la industria seleccionada. Sin parámetro se abre Congelados, conservando sus enlaces anteriores.

| Selector | Empresa | Enlace español | Caso central |
| --- | --- | --- | --- |
| Congelados | Congelados de Navarra | [Abrir](https://giqciklum.github.io/prodigy-cn-demo/?industry=frozen_food&lang=es) | Excursión de temperatura, lotes, bloqueo de Calidad |
| Maquinaria | Hidrotec (ficticia) | [Abrir](https://giqciklum.github.io/prodigy-cn-demo/?industry=industrial_machinery&lang=es) | Vibración, repuesto y orden de mantenimiento |
| Banca | Banca Meridia (ficticia) | [Abrir](https://giqciklum.github.io/prodigy-cn-demo/?industry=banking&lang=es) | Transferencias, evidencia KYC y revisión del analista |
| Retail | Supermercados Alba (ficticia) | [Abrir](https://giqciklum.github.io/prodigy-cn-demo/?industry=retail&lang=es) | Ola de calor, stock y propuesta de reposición |
| Cervecería | Cervezas Lúpulo Norte (ficticia) | [Abrir](https://giqciklum.github.io/prodigy-cn-demo/?industry=brewery&lang=es) | Fermentador, retención de lote y entregas |

Para inglés cambia `lang=es` por `lang=en`, o pulsa **ENG**. La elección se recuerda; los estados operativos permanecen. Los textos libres que hayas escrito o guardado no se traducen automáticamente.

[Manual de presentación, en español, 16 páginas](https://giqciklum.github.io/prodigy-cn-demo/manual.pdf). Páginas 3-14: guion de Congelados. Páginas 15-16: selector y recorrido para las industrias nuevas.

[Copia sin conexión](https://giqciklum.github.io/prodigy-cn-demo/demo-sin-conexion.zip): descomprime y abre `prodigy-cn-demo/index.html` con doble clic. Incluye ambos idiomas y las cinco industrias; sin red usa fuentes del sistema. Validación de esta entrega: Chrome, escritorio 1512 px y móvil 375 px, además de `file://` sin red. Otros navegadores requieren su propia comprobación.

## Recorrido en las industrias nuevas

1. **Resumen de operación:** mapa con áreas consultables, indicadores, evidencia y bandeja de decisiones.
2. **De palabras a workflow:** elige una plantilla; pulsa **Crear workflow**; revisa las frases, los agentes, la fuente y la aprobación; publica y confirma. Hay plantillas de alerta, reclamación y parte diario. La demo usa un intérprete de reglas para este catálogo, no generación libre con un modelo.
3. **Alerta en ejecución:** usa el último workflow de alerta publicado, o el del escenario si no has creado uno. Evalúa umbral y duración sobre las lecturas. Los agentes preparan una propuesta; el responsable aprueba o rechaza con motivo. Rechazar aplica cero efectos. La decisión permanece al recargar.
4. **Reclamación del cliente:** correo ficticio, evidencia, respuesta editable y revisión humana. La causa raíz queda pendiente si falta evidencia; no se envían correos reales.
5. **Trazabilidad e impacto:** busca la referencia precargada, concilia cantidades y exporta CSV. Una referencia desconocida devuelve «Registro no encontrado».
6. **Cuestionario con fuentes:** cinco respuestas respaldadas y dos preguntas sin evidencia. La aprobación no convierte lo pendiente en certificado ni envía el documento.
7. **Preguntar a procedimientos:** consulta por términos conocidos y abre las citas. Fuera de la biblioteca, muestra evidencia insuficiente.
8. **Cómo encaja en tu empresa:** sistemas, propuesta de piloto, alcance de la simulación, auditoría y enlace del escenario.

**P** abre las notas del presentador; el público las ve si compartes esa ventana. Las flechas cambian de escena. La barra lateral abre la auditoría y permite exportar JSON. Los registros de ejecución permiten acelerar o mostrar todo. Los tiempos de las animaciones no representan rendimiento real.

## Estructura del repositorio público

Este repositorio contiene el sitio en su raíz. No necesitas React, Vite, Node, Docker ni un servidor para presentarlo.

```text
index.html                       consola, selector, idioma y presentador
manual.pdf                       manual listo para presentar
demo-sin-conexion.zip             paquete offline
assets/css/tokens.css             paleta y tipografía originales
assets/css/app.css                componentes compartidos
assets/css/industries.css         selector, mapas y formularios de industrias
assets/i18n/en.js                 catálogo inglés de la demo original
assets/js/i18n.js                 idioma y traducción de presentación
assets/js/industries.js           perfiles bilingües, datos sintéticos y selección
assets/js/data.js                 datos originales de Congelados
assets/js/core.js                 navegación, componentes, estado, auditoría
assets/js/scenes/industries.js    motor compartido de las cuatro industrias nuevas
assets/js/scenes/*.js             escenas originales de Congelados
```

`industries.js` se carga después del idioma y antes del núcleo. El núcleo elige la clave de almacenamiento de la industria. Después de las escenas originales, el motor de industrias registra sus ocho vistas con los mismos identificadores. Congelados conserva sus escenas originales y sus claves antiguas.

Estado de Congelados: `cn-demo-v2`. Nuevas industrias: `cn-demo-v2-<industry>`. Preferencias del presentador: misma clave con sufijo `-ui`. El idioma usa una preferencia compartida. La información guardada pertenece al navegador, no a un servidor ni a una base de datos de Prodigy. No introducir datos personales o del cliente en esta web pública.

## Añadir una industria con el mismo diseño

1. Añade una entrada única a `profiles` en `assets/js/industries.js`, tomando una de las cuatro industrias nuevas como plantilla. **No reemplaces `frozen_food`.** El selector se crea desde esa colección.
2. Define `id`, etiqueta, empresa, iniciales, centro, rol e icono existente. Usa `b(es, en)` para textos visibles; conserva identificadores como cadenas estables.
3. Define evento, métrica, unidad, umbral, duración, pico, equipo y referencia. El gráfico genera trece lecturas a intervalos de cinco minutos. El disparador exige un tramo continuo estrictamente superior al umbral y a la duración. Si necesitas otra lógica, cambia el evaluador y sus pruebas; no simules un resultado incompatible con el gráfico.
4. Completa alcance, evidencia, riesgo, plan y límite de actuación; cinco sistemas y tres agentes. Separa la propuesta de lo que necesita otra autorización o intervención física. No conviertas una alerta en diagnóstico confirmado.
5. Aporta tres documentos sintéticos (`code`, título ES/EN, texto ES/EN y `terms` de búsqueda en ambos idiomas). El motor cita esos documentos. Las citas deben respaldar las respuestas; los términos no sustituyen la evidencia.
6. Añade seis áreas de mapa, cuatro indicadores, el balance (`total`, unidad y tres estados cuya suma cuadre), correo ficticio, hallazgo y borrador de respuesta. Usa dominios `.example`.
7. Define la pregunta adicional y la ventaja concreta del caso. Revisa las plantillas, las ocho vistas, la auditoría, los CSV y el manual en ambos idiomas.

El motor interpreta alertas con una referencia conocida, umbral positivo y duración de 1-180 minutos. Exige aprobación incluso si el texto la omite. Cambiar parámetros respecto al procedimiento exige un motivo al publicar. La prueba de frases usa coincidencias del catálogo; no expresa confianza de un LLM. Los workflows de reclamación y parte diario se publican como definiciones del escenario; sus vistas usan los expedientes preparados. La conexión entre esos workflows y un runtime real queda pendiente.

Para servirlo durante edición, desde la raíz de **este** repo: `python3 -m http.server 8801`. Abre `http://localhost:8801/`. El sitio publicado no contiene pruebas ni fuentes editoriales del PDF. No copies archivos privados, claves, notas o código del framework al repo público.

## Pasar de la simulación a una implementación

Acordar el caso y sus datos; configurar agentes y Routines en la instancia objetivo; integrar API y eventos con la interfaz; definir identidad, permisos y aprobadores; implementar conectores y sus errores; elegir modelo/proveedor con el cliente; evaluar respuestas, trazabilidad y aprobación con casos reales. Validar persistencia, rechazos, duplicados, reintentos y fallos antes de autorizar escrituras. La demo no acredita que la instancia de Manuel ya tenga estos escenarios implementados.

Las cinco industrias son una presentación reutilizable. Este repo no modifica el original de Manuel ni publica Prodigy privado.

Edición v2.2 · 02/10/2026 · preparado por Ciklum.
