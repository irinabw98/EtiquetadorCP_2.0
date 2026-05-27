# Etiquetador de fotos V2 · Protocolos por localidad

Aplicación web estática para cargar fotos de ensayos por protocolo, localidad y momento de evaluación, asignar tratamientos y generar un PowerPoint ordenado automáticamente.

## Archivos incluidos

Subir todos estos archivos a la raíz del repositorio:

```text
index.html
styles.css
app.js
pptxgen.bundle.js
fondo-default.jpg
README.md
```

## Estructura de trabajo

La app organiza la información así:

```text
Protocolo
└── Tratamientos comunes
    └── Localidades
        └── Momentos de evaluación
            └── Fotos
```

Los tratamientos son comunes para todas las localidades. Cada localidad puede tener momentos de evaluación diferentes.

## Funciones principales

- Carga de múltiples localidades.
- Momentos independientes por localidad.
- Cajas de carga por combinación `Localidad × Momento`.
- Botón `Autoasignar` dentro de cada caja de momento.
- Rotación manual de fotos con botón `Rotar ↻`.
- Normalización de imágenes en canvas para reducir problemas de orientación EXIF.
- Exportación de fotos etiquetadas en ZIP.
- Exportación de PowerPoint 16:9.
- Descarga completa con fotos + PPT.
- Nombre de archivo basado en el protocolo.

## PowerPoint generado

El PowerPoint se arma con esta lógica:

1. Carátula general del protocolo.
2. Índice con tabla: `Localidad | Momentos incluidos | Fotos`.
3. Sección por localidad.
4. Bloque 1 por cada localidad: fotos ordenadas por momento y tratamiento.
5. Bloque 2 por cada localidad: fotos ordenadas por tratamiento y momento.

## Uso recomendado

1. Completar el nombre del protocolo.
2. Cargar los tratamientos, uno por línea.
3. Agregar las localidades necesarias.
4. Para cada localidad, cargar sus momentos de evaluación, uno por línea.
5. Continuar a fotos y exportación.
6. Arrastrar fotos dentro de cada caja `Localidad × Momento`.
7. Usar `Autoasignar` dentro de cada caja.
8. Revisar o corregir tratamientos manualmente.
9. Descargar PowerPoint, fotos o descarga completa.

## Formato para momentos

```text
10 DDA | 2026-05-20
20 DDA | 2026-06-03
```

La fecha es opcional. Si no se carga, el momento se usa igual.

## Publicación en GitHub Pages

1. Crear un repositorio nuevo, por ejemplo `etiquetadorCP-v2`.
2. Subir todos los archivos a la raíz.
3. Ir a `Settings > Pages`.
4. En `Branch`, elegir `main`.
5. En carpeta, elegir `/root`.
6. Guardar.
7. Abrir la URL publicada.

## Nota sobre fotos de iPhone

Si las fotos están en `.HEIC`, la app intenta convertirlas con `heic2any` desde CDN. Para evitar problemas, en iPhone conviene configurar:

```text
Ajustes > Cámara > Formatos > Más compatible
```

Así las nuevas fotos se guardan como JPG.
