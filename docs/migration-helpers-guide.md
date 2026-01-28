# 🚀 Guía de Uso: Funciones Helper de Supabase

## 📋 Funciones Creadas

### 1. **Archivo Principal: `lib/supabase-helpers.ts`**

#### **Reemplazo de `connectMongoDB()`**
```typescript
// ANTES (MongoDB)
await connectMongoDB();

// DESPUÉS (Supabase)
await connectSupabase(); // Opcional, no es necesario conexión explícita
```

#### **Reemplazo de `verificarAutorizacion()`**
```typescript
// ANTES (MongoDB + NextAuth)
const session = await getServerSession(authOptions);
if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// DESPUÉS (Supabase + RLS)
const auth = await verificarAutorizacionSupabase([TIPO_CARGO.gerente]);
if (!auth.authorized) {
    return APIResponse.unauthorized(auth.error);
}
```

#### **Operaciones CRUD Simplificadas**
```typescript
// Buscar por ID
const { data, error } = await SupabaseQuery.findById('clientes', clienteId);

// Buscar con filtros
const { data, error } = await SupabaseQuery.findMany('ventas', { 
    estado: 'PENDIENTE' 
});

// Crear nuevo registro
const { data, error } = await SupabaseQuery.create('clientes', {
    rut: '12345678-9',
    razon_social: 'Empresa Test'
});

// Actualizar registro
const { data, error } = await SupabaseQuery.update('clientes', id, {
    limite_credito: 1000000
});
```

#### **API Routes Autorizadas**
```typescript
// Crear API route con autorización automática
export const POST = createAuthorizedRoute(
    async (req: NextRequest, auth) => {
        // auth.user contiene el usuario autenticado
        // auth.cargo contiene el cargo activo
        const data = await req.json();
        
        // Tu lógica aquí...
        
        return APIResponse.success(result);
    },
    [TIPO_CARGO.gerente, TIPO_CARGO.encargado] // Roles permitidos
);
```

### 2. **Archivo de Utilidades: `lib/migration-utils.ts`**

#### **Migración Gradual**
```typescript
// Ejecutar operación con fallback automático
const result = await GradualMigration.routeOperation(
    'clientes',
    () => supabaseOperation(),    // Operación nueva
    () => mongoOperation(),       // Operación legacy
    '/api/clientes/create'
);
```

#### **Logging de Migración**
```typescript
MigrationLogger.info('Starting operation');
MigrationLogger.warning('Fallback used');
MigrationLogger.error('Operation failed', error);
MigrationLogger.success('Operation completed');
```

## 📝 **Patrón de Migración de APIs**

### **Pasos para Migrar una API:**

1. **Importar helpers**
```typescript
import { 
    verificarAutorizacionSupabase,
    SupabaseQuery,
    APIResponse,
    GradualMigration
} from "@/lib/supabase-helpers";
```

2. **Reemplazar autenticación**
```typescript
// ANTES
const session = await getServerSession(authOptions);
if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

// DESPUÉS  
const auth = await verificarAutorizacionSupabase([TIPO_CARGO.gerente]);
if (!auth.authorized) return APIResponse.unauthorized(auth.error);
```

3. **Reemplazar operaciones de base de datos**
```typescript
// ANTES (MongoDB)
await connectMongoDB();
const cliente = await Cliente.findById(clienteId);

// DESPUÉS (Supabase)
const { data: cliente, error } = await SupabaseQuery.findById('clientes', clienteId);
```

4. **Usar respuestas consistentes**
```typescript
// ANTES
return NextResponse.json({ ok: true, data: result });

// DESPUÉS
return APIResponse.success(result, 'Operación exitosa');
```

## 🔄 **Configuración de Variables de Entorno**

```env
# Habilitar Supabase gradualmente
USE_SUPABASE=false          # false = MongoDB, true = Supabase

# Migración por módulos
MIGRATE_CLIENTS=true        # Migrar gestión de clientes
MIGRATE_INVENTORY=false     # Mantener inventario en MongoDB
MIGRATE_SALES=false         # Mantener ventas en MongoDB

# Debug
MIGRATION_DEBUG=true
```

## 🎯 **Queries Específicas de BIOX**

```typescript
// Obtener resumen de deudas
const { data } = await BioxQueries.getResumenDeudas(clienteId, sucursalId);

// Obtener inventario en tiempo real  
const { data } = await BioxQueries.getInventarioTiempoReal(sucursalId);

// Obtener rutas activas
const { data } = await BioxQueries.getRutasDespachoActivas();

// Obtener pedidos pendientes
const { data } = await BioxQueries.getPedidosPendientes(sucursalId);
```

## ✅ **Ventajas de las Nuevas Funciones**

1. **RLS Automático**: No más verificaciones manuales de permisos
2. **Migración Gradual**: Transición sin downtime
3. **Fallback Automático**: Si Supabase falla, usar MongoDB
4. **Logging Detallado**: Seguimiento completo de la migración
5. **APIs Consistentes**: Respuestas y errores estandarizados
6. **TypeScript**: Tipado completo para mayor seguridad

## 🚀 **Próximos Pasos**

1. Configurar variables de entorno
2. Migrar APIs críticas una por una
3. Habilitar gradualmente `USE_SUPABASE=true`
4. Probar fallback en caso de errores
5. Migrar autenticación a Supabase Auth
6. Reemplazar Socket.IO con Supabase Realtime

¿Estás listo para empezar a migrar las primeras APIs?