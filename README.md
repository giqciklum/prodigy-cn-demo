# Prodigy · Congelados de Navarra

Consola web de Prodigy configurada para Congelados de Navarra (planta de Fustiñana): resumen del turno, workflows escritos en castellano, alarma de cámara con aprobación humana, reclamación de cliente con 8D, simulacro de retirada, cuestionario de cliente y preguntas a los procedimientos con citas.

Es una **demostración con datos sintéticos**: lotes, palés, lecturas, reclamaciones y procedimientos los ha preparado Ciklum y las acciones (bloqueos, tickets, envíos) se simulan dentro del navegador.

## Cómo abrirla

- **Enlace:** https://giqciklum.github.io/prodigy-cn-demo/ (GitHub Pages; sin cuenta ni instalación).
- **Sin conexión o en local:** `python3 -m http.server 8080 --directory site` y abrir http://localhost:8080/. También funciona abriendo `index.html` con doble clic; sin Internet usa las fuentes del sistema.
- **Navegador:** Chrome o Edge actualizados (también Safari y Firefox). Pensada para portátil o proyector de 1280 a 1920 px; en móvil se adapta.

## Antes de presentar (2 minutos)

1. Abrir el enlace con `?reset=1` al final (https://giqciklum.github.io/prodigy-cn-demo/?reset=1) o pulsar **Reiniciar demo** arriba a la derecha. La planta vuelve al martes 29/09/2026, 07:05.
2. Pantalla completa (F11 en Windows; Ctrl+Cmd+F en Mac). Zoom del navegador al 100 %; en proyector, 110 % si la sala es grande.
3. Pulsar **P** para abrir el modo presentador: «Qué decir», «Siguiente clic», cronómetro y ritmo de animaciones. **P** otra vez lo oculta.
4. El guion completo está en el manual de presentación (`manual.pdf`, también enlazado desde el panel del presentador y desde «Acerca de esta demo»).

## Durante la demostración

- **← →** cambian de escena (o los botones del panel del presentador).
- En los registros de ejecución: **Acelerar** y **Mostrar todo**. En el panel del presentador: animaciones **Rápidas**.
- Cualquier código de lote (fondo verde claro) abre su traza hacia atrás y hacia delante, con los SSCC.
- **Registro de auditoría** (barra lateral, abajo): todo lo que se ha hecho en la sesión, exportable a JSON.
- **Acerca de esta demo** (pie de página): qué es de serie en Prodigy, qué se ha construido para esta demo y qué está simulado.

## Qué es y qué no es

- Simulación de alta fidelidad de la consola de Prodigy con datos sintéticos coherentes entre sí.
- SAP (SAP QM), MES Mapex, Siemens Opcenter APS, Mecalux Easy WMS, Galileo/SCADA, Elara y Microsoft 365 aparecen como **conectores de demostración**: no hay conexión con sistemas de Congelados de Navarra. En un piloto se conectan uno o dos sistemas en modo lectura.
- La página no llama a ningún modelo de lenguaje: las respuestas están preparadas. En un piloto, Prodigy se instala en su infraestructura con el modelo que elijan (Azure OpenAI, Gemini o un modelo local).
- El estado de la sesión se guarda solo en este navegador y se borra con «Reiniciar demo».

## Estructura

```
index.html                 marco de la consola (barra lateral, barra superior, pie, modal, presentador)
robots.txt  .nojekyll      sin indexación; publicación estática en GitHub Pages
manual.pdf                 manual de presentación
assets/css/tokens.css      colores y medidas (identidad de Congelados de Navarra)
assets/css/app.css         componentes
assets/js/data.js          window.CN_DATA (generado desde el mundo sintético; no editar a mano)
assets/js/core.js          núcleo: navegación, estado, auditoría, componentes (API en assets/js/README-core.md)
assets/js/scenes/*.js      una escena por fichero
tests/                     pruebas Playwright y galería de componentes (no se publica)
```

## Pruebas

```bash
python3 -m http.server 8801 --directory site
node site/tests/smoke.cjs 8801      # todas las escenas en 1512×982 y 375×812, sin errores ni desplazamiento horizontal
node site/tests/turno.cjs 8801      # prueba funcional del resumen del turno
```

Preparado por Ciklum.
