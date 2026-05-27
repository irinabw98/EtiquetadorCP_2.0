# Etiquetador de fotos V2.1

Aplicación web estática para generar PowerPoint y fotos etiquetadas a partir de un protocolo con múltiples localidades.

## Estructura de trabajo

- Un protocolo general.
- Tratamientos comunes para todas las localidades.
- Cada localidad tiene su propio trial.
- Cada localidad puede tener momentos de evaluación diferentes.
- Las cajas de carga se generan por Localidad × Momento.

## Cambios V2.1

- Se agregó el campo `Trial` dentro de cada localidad.
- Localidad y trial viajan juntos en la carga de fotos, índice, PowerPoint, footers y nombres de fotos exportadas.
- Las cajas de Localidad × Momento ahora son horizontales y se muestran una debajo de la otra.
- Cada caja puede comprimirse/desplegarse.
- El botón `Autoasignar esta caja` queda dentro de cada caja y solo afecta a esa localidad × momento.
- Los paneles de `Control del proyecto` y `Descargables` se muestran debajo de todas las cajas de fotos.

## Archivos incluidos

```text
index.html
styles.css
app.js
pptxgen.bundle.js
fondo-default.jpg
README.md
```

## Uso recomendado

1. Completar el nombre del protocolo.
2. Cargar los tratamientos comunes, uno por línea.
3. Agregar localidades.
4. Completar el trial de cada localidad.
5. Cargar los momentos de evaluación de cada localidad, uno por línea. Si querés agregar fecha, usar `|`:

```text
10 DDA | 2026-05-20
20 DDA | 2026-06-03
```

6. Continuar a fotos y exportación.
7. Cargar fotos en cada caja Localidad × Momento.
8. Usar `Autoasignar esta caja` dentro de cada caja cuando corresponda.
9. Exportar fotos, PowerPoint o descarga completa.

## PowerPoint

El PowerPoint se genera con:

- Carátula general.
- Índice con localidad, trial, momentos y cantidad de fotos.
- Secciones por localidad.
- Bloque 1: fotos ordenadas por momento.
- Bloque 2: fotos ordenadas por tratamiento dentro de cada localidad.

El archivo exportado se nombra con el nombre del protocolo.

## Cambios de la versión V2.2

- Se eliminó el título superior en las slides de fotos del PowerPoint para no duplicar información con la etiqueta inferior.
- Se agregaron botones para subir y bajar localidades, manteniendo sus textos, trial, momentos y fotos asociadas.
- El PowerPoint ahora usa secciones reales de PptxGenJS: carátula/índice y una sección por localidad + trial.
- Se agregó guardado local por proyectos en IndexedDB: permite crear proyectos nuevos, guardar el actual y retomar proyectos recientes desde un selector.
- El guardado local conserva configuración, localidades, momentos, tratamientos y fotos cargadas. Al incluir fotos, puede ocupar espacio del navegador.

## Cambios de la versión V2.3

- Las cajas Localidad × Momento recuerdan si están abiertas o comprimidas.
- Al cargar fotos ya no se expanden todas las cajas automáticamente.
- Cada caja mantiene el orden en que se van agregando las fotos.
- Cada caja incluye botón propio para ordenar fotos por nombre.
- Cada caja incluye botón propio para vaciar únicamente sus fotos.
- Se mantienen los controles por foto para subir, bajar, rotar y eliminar.

## Cambios de la versión V2.4

- Optimización de carga para tandas grandes de fotos.
- La carga ahora trabaja por pequeñas tandas y libera el navegador entre bloques para evitar que la página se congele.
- Se generan miniaturas livianas solo para la vista previa, conservando la imagen original para exportación.
- El PowerPoint y el ZIP se generan desde la imagen completa, sin reducir resolución por defecto.
- Se agregaron mensajes de progreso durante la carga y la exportación.
- El guardado local queda desacoplado del renderizado para reducir bloqueos al cargar muchas fotos.
- La orientación se sigue fijando al exportar para evitar que PowerPoint rote imágenes por metadatos EXIF.
