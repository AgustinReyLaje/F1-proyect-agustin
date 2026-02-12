## 📍 Cómo agregar la imagen de fondo de circuitos F1

### Paso 1: Localizar la imagen

La imagen de circuitos F1 2024 que quieres usar como fondo debe guardarse en:

```
frontend/public/images/f1-circuits-2024.jpg
```

### Paso 2: Guardar la imagen

1. Descarga o localiza la imagen de circuitos de F1 2024
2. Renómbrala a: `f1-circuits-2024.jpg`
3. Colócala en: `frontend/public/images/`

**Ruta completa:**
```
c:\Users\agusr\OneDrive\Escritorio\F1Agustin\frontend\public\images\f1-circuits-2024.jpg
```

### Paso 3: Verificar que funciona

Una vez guardada la imagen, recarga la página de Constructors en tu navegador:
- http://localhost:3000/constructors

Verás la imagen de fondo con:
- ✅ Imagen de circuitos F1 como fondo fijo
- ✅ Overlay oscuro para mejor contraste
- ✅ Tarjetas de equipos sobre el fondo
- ✅ Efectos de glow para top 3 equipos

### Formatos de imagen soportados

Puedes usar cualquiera de estos formatos:
- `.jpg` / `.jpeg` (recomendado)
- `.png`
- `.webp`

Si usas otro formato, actualiza el nombre en:
`frontend/src/app/constructors/page.tsx` línea ~52

### Resolución recomendada

Para mejor calidad visual:
- Mínimo: 1920x1080 (Full HD)
- Recomendado: 2560x1440 (2K) o superior
- Óptimo: 3840x2160 (4K)

### Si la imagen no aparece

1. **Verifica la ruta:** 
   ```bash
   ls frontend/public/images/f1-circuits-2024.jpg
   ```

2. **Reinicia el frontend:**
   ```bash
   cd docker
   docker-compose restart frontend
   ```

3. **Limpia la caché del navegador:**
   - Ctrl + Shift + R (Windows/Linux)
   - Cmd + Shift + R (Mac)

### Cambiar imagen

Si quieres usar otra imagen de fondo:

1. Guarda tu nueva imagen en `frontend/public/images/`
2. Edita `frontend/src/app/constructors/page.tsx`
3. Línea ~52, cambia:
   ```tsx
   backgroundImage: 'url(/images/TU-NUEVA-IMAGEN.jpg)',
   ```

---

**Nota:** El código ya está actualizado y funcionando. Solo falta agregar la imagen física en la carpeta indicada.
