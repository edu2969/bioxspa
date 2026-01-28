# 🔄 BIOX - Guía de Migración MongoDB → Supabase

## 📋 **Resumen de la Migración**

Esta guía migra todos los datos de MongoDB a PostgreSQL (Supabase) para los siguientes modelos:

✅ **Modelos incluidos:**
- `User` → `usuarios` 
- `Cargo` → `cargos`
- `Sucursal` → `sucursales`  
- `Dependencia` → `dependencias`
- `Cliente` → `clientes`
- `CategoriaCatalogo` → `categorias_catalogo`
- `SubcategoriaCatalogo` → `subcategorias_catalogo` 
- `ItemCatalogo` → `items_catalogo`
- `Vehiculo` → `vehiculos` + `vehiculo_conductores`

## 🚨 **ANTES DE EMPEZAR**

### **⚠️ Backup Obligatorio**
```bash
# 1. Backup MongoDB completo
mongodump --uri="TU_MONGODB_URI" --out=./backup-mongodb-$(date +%Y%m%d)

# 2. Comprimir backup
tar -czf backup-mongodb-$(date +%Y%m%d).tar.gz ./backup-mongodb-$(date +%Y%m%d)
```

### **📁 Verificar Archivos Necesarios**
Asegúrate de tener estos archivos creados:
- ✅ `database/schema-postgresql.sql` 
- ✅ `database/rls-policies.sql`
- ✅ `scripts/setup-supabase.mjs`
- ✅ `scripts/migrate-to-supabase.mjs`
- ✅ `scripts/validate-migration.mjs`
- ✅ `lib/supabase.ts`

---

## 🚀 **PROCESO DE MIGRACIÓN**

### **Paso 1: Configurar Supabase** ☐

Si ya no lo hiciste, completa el setup inicial:

```bash
# Configurar variables en .env.local
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
MONGODB_URI=mongodb://tu-mongo-connection

# Ejecutar setup inicial
npm run supabase:setup
```

### **Paso 2: Validar Conexiones** ☐

```bash
# Probar que ambas conexiones funcionan
node -e "
import mongoose from 'mongoose';
import { createClient } from '@supabase/supabase-js';

console.log('🧪 Probando conexiones...');

// Probar MongoDB
try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB: Conectado');
    await mongoose.disconnect();
} catch (error) {
    console.log('❌ MongoDB: Error -', error.message);
}

// Probar Supabase
try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase.from('usuarios').select('count').limit(1);
    if (error && !error.message.includes('does not exist')) throw error;
    console.log('✅ Supabase: Conectado');
} catch (error) {
    console.log('❌ Supabase: Error -', error.message);
}
"
```

### **Paso 3: Ejecutar Migración** ☐

```bash
# MIGRACIÓN PRINCIPAL - Esto puede tomar varios minutos
npm run supabase:migrate

# Si hay errores, puedes ejecutarlo de nuevo - es seguro
# El script usa upsert, no duplicará datos
```

**📊 Salida esperada:**
```
🚀 Iniciando migración de datos MongoDB → Supabase...

✅ Conectado a MongoDB  
✅ Conectado a Supabase

👥 Migrando usuarios...
   Encontrados: 25 usuarios
✅ Usuarios migrados: 25/25

🏢 Migrando sucursales...
   Encontradas: 8 sucursales  
✅ Sucursales migradas: 8/8

... (continúa para cada modelo)

🎉 ¡Migración completada!
📊 Estadísticas:
   Total procesados: 1,250
   Migrados: 1,248
   Errores: 2
   Saltados: 0
```

### **Paso 4: Validar Migración** ☐

```bash
# VALIDACIÓN COMPLETA
npm run supabase:validate
```

**📈 Salida esperada:**
```
🔍 Validando migración MongoDB → Supabase...

📊 Validando Usuarios...
   MongoDB: 25 registros
   Supabase: 25 registros
   Migración: 100.0%
   ✅ Migración completa

📊 Validando Clientes...
   MongoDB: 180 registros
   Supabase: 180 registros
   Migración: 100.0%
   ✅ Migración completa

... (continúa para cada tabla)

🔗 Validando integridad referencial...
   ✅ Cargos huérfanos (sin usuario): OK
   ✅ Items sin subcategoría: OK
   ✅ Subcategorías sin categoría: OK
   ✅ Vehículos sin cliente: OK

📈 RESUMEN DE VALIDACIÓN
==================================
Total validaciones: 9
Exitosas: 9
Con errores: 0

🎉 ¡Migración validada exitosamente!
```

---

## 🔧 **RESOLUCIÓN DE PROBLEMAS**

### **❌ Error: "Variables de entorno faltantes"**
```bash
# Verificar que estén todas configuradas
echo $MONGODB_URI
echo $NEXT_PUBLIC_SUPABASE_URL  
echo $SUPABASE_SERVICE_ROLE_KEY

# Si faltan, agregar a .env.local
```

### **❌ Error: "Error conectando MongoDB"**
```bash
# Verificar URI de MongoDB
echo $MONGODB_URI

# Probar conexión manual
mongosh "$MONGODB_URI"
```

### **❌ Error: "No se pudo conectar a Supabase"**
```bash  
# Verificar en Supabase Dashboard que el proyecto esté activo
# Regenerar keys si es necesario en Settings > API
```

### **❌ Error: "Table does not exist"**
```bash
# El schema no se ejecutó correctamente
# Re-ejecutar setup
npm run supabase:setup

# O ejecutar manualmente en Supabase SQL Editor:
# 1. Copia database/schema-postgresql.sql
# 2. Ejecuta en SQL Editor
# 3. Copia database/rls-policies.sql  
# 4. Ejecuta en SQL Editor
```

### **❌ Migración Parcial (algunos registros fallaron)**
```bash
# Es normal, puede ser por:
# - Datos inconsistentes en MongoDB
# - Restricciones de validación
# - Referencias faltantes

# El script es seguro de re-ejecutar
npm run supabase:migrate

# Verificar detalles específicos en los logs
```

---

## 📊 **POST-MIGRACIÓN**

### **Verificaciones Manuales** ☐

1. **Dashboard Supabase:**
   - Ve a Table Editor
   - Verifica que las tablas tengan datos
   - Revisa algunas relaciones manualmente

2. **Ejecutar consultas de prueba:**
```sql
-- Usuarios con cargos
SELECT u.nombre, u.email, c.tipo 
FROM usuarios u
JOIN cargos c ON u.id = c.usuario_id
WHERE c.activo = true
LIMIT 10;

-- Clientes con vehículos  
SELECT cl.nombre, cl.rut, v.patente, v.marca, v.modelo
FROM clientes cl
JOIN vehiculos v ON cl.id = v.cliente_id
LIMIT 10;

-- Items del catálogo con categorías
SELECT ic.codigo, ic.nombre, sc.nombre as subcategoria, cc.nombre as categoria
FROM items_catalogo ic
JOIN subcategorias_catalogo sc ON ic.subcategoria_id = sc.id  
JOIN categorias_catalogo cc ON sc.categoria_id = cc.id
LIMIT 10;
```

3. **Probar App con Nueva Base:**
   - Cambiar la app para usar Supabase temporalmente
   - Probar login, navegación básica  
   - Verificar que no hay errores críticos

### **Switch Definitivo** ☐

Una vez validado todo:

1. **Actualizar configuración producción**
2. **Desactivar MongoDB** (pero mantener backup)
3. **Monitorear aplicación** primeros días
4. **Configurar backup automático Supabase**

---

## 🎯 **COMANDOS RÁPIDOS**

```bash
# Setup completo desde cero
npm run supabase:setup

# Migración de datos  
npm run supabase:migrate

# Validación completa
npm run supabase:validate

# Re-intentar solo migración (seguro)
npm run supabase:migrate

# Verificar un modelo específico
node -e "
import { validateSpecific } from './scripts/validate-migration.mjs';
await validateSpecific('usuarios'); // o cualquier tabla
"
```

---

## 💡 **TIPS IMPORTANTES**

- ✅ **La migración es idempotente** - puedes ejecutarla múltiples veces
- ✅ **Mantén relaciones** - el script preserva todas las referencias  
- ✅ **IDs se mapean automáticamente** - de ObjectId a UUID
- ✅ **Datos temporales preservados** - temporalId mantiene referencias originales
- ⚠️  **Siempre haz backup** antes de cualquier cambio mayor
- ⚠️  **Valida después de migrar** - no asumas que todo migró correctamente

**¿Listo para migrar? ¡Empezemos!** 🚀