# 🚀 BIOX - Guía de Setup Supabase

## ✅ **Checklist de Setup**

### **Paso 1: Crear Proyecto Supabase** ☐
1. Ve a [supabase.com](https://supabase.com) y crea una cuenta
2. Click "New Project" 
3. **Configuración recomendada:**
   - Name: `biox-production`
   - Database Password: **[GUARDA ESTE PASSWORD]**
   - Region: São Paulo (BR) - más cercana a Chile
   - Plan: Free (upgrade después)

### **Paso 2: Obtener Variables** ☐
Una vez creado el proyecto:

1. **Ve a Settings > API**
2. Copia estos valores:
   - **URL**: `https://[tu-proyecto-id].supabase.co`
   - **anon public**: `eyJ...` (key pública)
   - **service_role**: `eyJ...` (key privada - **¡NO COMPARTIR!**)

### **Paso 3: Configurar .env.local** ☐
```bash
# Copia .env.local.example a .env.local
cp .env.local.example .env.local

# Edita .env.local con tus valores reales
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aquí
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aquí
```

### **Paso 4: Ejecutar Setup Automático** ☐
```bash
# Instalar dependencias (ya hecho ✅)
npm install

# Ejecutar script de setup
npm run supabase:setup
```

Este script automáticamente:
- ✅ Ejecuta el schema PostgreSQL completo
- ✅ Configura Row Level Security (RLS)
- ✅ Inserta datos iniciales (regiones, tipos de cargo)
- ✅ Valida que todo esté funcionando

### **Paso 5: Verificar en Supabase Dashboard** ☐
1. Ve a tu proyecto en Supabase
2. Click en **"Table Editor"**
3. Deberías ver **40+ tablas** creadas:
   - ✅ usuarios, clientes, sucursales
   - ✅ item_catalogo, ventas, detalles_venta  
   - ✅ bi_deudas, bi_ventas, bi_inventario
   - ✅ documentos_tributarios
   - ✅ Todas las demás...

---

## 🔥 **¡Cuando esté listo!**

Una vez completados los pasos 1-5:

### **Opción A: Migrar Datos** 📊
```bash
npm run supabase:migrate
```
- Migra TODOS los datos de MongoDB a PostgreSQL
- Mantiene relaciones y estructura
- Proceso automático con validaciones

### **Opción B: Empezar desde Cero** 🆕  
- ¡Ya tienes la estructura completa!
- Empieza a usar la app con la nueva base
- Datos limpios y optimizados

---

## 🚨 **Si algo falla:**

### **Error de Permisos**
```bash
# Verifica que las variables estén configuradas
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### **Error de Schema**
1. Ve a Supabase Dashboard > SQL Editor
2. Ejecuta manualmente `database/schema-postgresql.sql`
3. Luego ejecuta `database/rls-policies.sql`

### **Error de Conexión**
- Verifica que la URL esté correcta
- Verifica que las keys no tengan espacios extra
- Verifica que el proyecto esté activo en Supabase

---

## 📞 **¿Necesitas ayuda?**

**Avísame cuando hayas:**
1. ✅ Creado el proyecto Supabase
2. ✅ Configurado las variables en .env.local
3. ✅ Ejecutado `npm run supabase:setup`

**Y continuamos con el siguiente paso según el resultado** 🚀