# 🔐 Migración Crítica: Sistema de Autenticación

## 🎯 **¿Qué hemos migrado?**

### **✅ APIs de Autenticación Creadas:**
1. **`/api/auth/login`** → Reemplaza NextAuth credentials provider
2. **`/api/auth/register`** → Registro de usuarios con Supabase Auth
3. **`/api/auth/session`** → Obtener sesión actual (compatible con ambos sistemas)

### **✅ Componentes Migrados:**
1. **`useAuth` Hook** → Maneja Supabase Auth y NextAuth según configuración
2. **`LoginFormMigrated`** → Componente de login compatible con ambos sistemas
3. **`AuthProvider`** → Context provider unificado

### **✅ Funcionalidades:**
- ✅ Login/logout con migración gradual
- ✅ Registro de usuarios
- ✅ Manejo de sesiones unificado
- ✅ Protección automática de rutas
- ✅ RLS automático en Supabase
- ✅ Fallback automático a NextAuth

## 🚀 **Cómo Implementar**

### **Paso 1: Configurar Variables de Entorno**

```bash
# Verificar estado actual
npm run migrate:status

# Verificar configuración de Supabase
npm run migrate:check-supabase
```

Configurar en `.env.local`:
```env
# Supabase (obtener desde dashboard de Supabase)
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJI...
SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJI...

# MongoDB (mantener durante transición)
MONGODB_URI=mongodb://localhost:27017/biox

# NextAuth (mantener durante transición)  
NEXTAUTH_SECRET=tu-nextauth-secret
NEXTAUTH_URL=http://localhost:3001
```

### **Paso 2: Habilitar Migración de Auth**

```bash
# Habilitar solo autenticación
npm run migrate:enable-auth

# O habilitar todo (no recomendado inicialmente)
npm run migrate:enable-all
```

### **Paso 3: Configurar Supabase Auth**

En el dashboard de Supabase:

1. **Ir a Authentication → Settings**
2. **Configurar Email templates** (opcional)
3. **Habilitar Confirm email** si lo deseas
4. **Configurar Site URL**: `http://localhost:3001`
5. **Configurar Redirect URLs**: `http://localhost:3001/**`

### **Paso 4: Aplicar Políticas RLS**

Ejecutar en Supabase SQL Editor:
```sql
-- Aplicar todas las políticas del archivo rls-policies.sql
-- (Ya está hecho si completaste la migración de datos)
```

### **Paso 5: Probar la Migración**

1. **Crear usuario de prueba:**
   ```bash
   curl -X POST http://localhost:3001/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"name":"Test User","email":"test@biox.cl","password":"123456"}'
   ```

2. **Hacer login:**
   ```bash
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@biox.cl","password":"123456"}'
   ```

3. **Verificar sesión:**
   ```bash
   curl http://localhost:3001/api/auth/session
   ```

## 🔄 **Uso en Componentes**

### **Reemplazar NextAuth:**

```tsx
// ANTES (NextAuth)
import { useSession, signIn, signOut } from 'next-auth/react';

function MiComponente() {
  const { data: session, status } = useSession();
  
  if (status === 'loading') return <Loading />;
  if (!session) return <Login />;
  
  return <div>Bienvenido {session.user.name}</div>;
}

// DESPUÉS (Hook migrado)
import { useAuth } from '@/hooks/useAuth';

function MiComponente() {
  const { user, loading, authenticated, signIn, signOut } = useAuth();
  
  if (loading) return <Loading />;
  if (!authenticated) return <Login />;
  
  return <div>Bienvenido {user.nombre}</div>;
}
```

### **Proteger Rutas:**

```tsx
import { useRequireAuth } from '@/hooks/useAuth';

function PaginaProtegida() {
  const { authenticated, loading } = useRequireAuth('/login');
  
  if (loading) return <Loading />;
  
  return <div>Contenido protegido</div>;
}
```

### **API Routes Migradas:**

```ts
// ANTES (NextAuth)
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/authOptions";

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ...resto del código
}

// DESPUÉS (Sistema migrado)
import { createAuthorizedRoute, APIResponse } from "@/lib/supabase-helpers";
import { TIPO_CARGO } from "@/app/utils/constants";

export const GET = createAuthorizedRoute(
  async (req, auth) => {
    // auth.user contiene el usuario autenticado
    // auth.cargo contiene el cargo activo
    // RLS automáticamente filtra los datos
    
    return APIResponse.success(data);
  },
  [TIPO_CARGO.gerente] // Roles permitidos (opcional)
);
```

## ⚠️ **Consideraciones Importantes**

### **Durante la Transición:**
- ✅ Ambos sistemas funcionan en paralelo
- ✅ Fallback automático si Supabase falla
- ✅ Usuarios existentes siguen funcionando
- ✅ Logs detallados para debugging

### **Funcionalidades Nuevas con Supabase:**
- 🔒 **RLS Automático**: No más verificaciones manuales de permisos
- ⚡ **Performance Mejorada**: Queries optimizadas
- 🔄 **Realtime**: Preparado para reemplazar Socket.IO
- 📊 **Mejor BI**: Vistas materializadas automáticas

### **Rollback si hay Problemas:**
```bash
# Deshabilitar migración de auth
npm run migrate:disable-all

# Verificar estado
npm run migrate:status
```

## 📊 **Testing de la Migración**

### **1. Test de Login:**
- [ ] Login con usuario existente funciona
- [ ] Login con credenciales incorrectas falla apropiadamente
- [ ] Sesión persiste correctamente
- [ ] Logout limpia sesión correctamente

### **2. Test de Registro:**
- [ ] Registro de nuevo usuario funciona
- [ ] Email duplicado es rechazado
- [ ] Contraseña débil es rechazada
- [ ] Usuario aparece en tabla `usuarios`

### **3. Test de APIs:**
- [ ] APIs protegidas requieren autenticación
- [ ] RLS filtra datos correctamente por usuario
- [ ] Fallback a MongoDB funciona si Supabase falla

### **4. Test de Frontend:**
- [ ] Hook `useAuth` funciona correctamente
- [ ] Protección de rutas funciona
- [ ] UI refleja estado de autenticación

## 🎉 **Resultado Final**

Una vez completada la migración de auth:

✅ **Login/Register** funcionan con Supabase Auth
✅ **RLS automático** protege todos los datos
✅ **Sesiones unificadas** entre frontend y backend
✅ **APIs simplificadas** sin verificaciones manuales
✅ **Fallback automático** a NextAuth si hay problemas

¿Estás listo para probar la migración de autenticación? 🚀