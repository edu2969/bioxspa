# 🚀 Plan de Migración MongoDB → Supabase PostgreSQL

## 📊 **Análisis del Esquema Actual vs Propuesto**

### **Mejoras Arquitectónicas Clave**

#### 1. **Normalización de Datos**
- ✅ **Subdocumentos → Tablas relacionadas**: `comentariosCobro`, `historialEstados`, `entregasEnLocal`
- ✅ **Referencias consistentes**: UUIDs en lugar de ObjectIds mixtos
- ✅ **Eliminación de redundancia**: Direcciones normalizadas, categorías estructuradas

#### 2. **Business Intelligence Optimizado**
- ✅ **Vistas materializadas**: `mv_resumen_deudas_clientes`, `mv_inventario_tiempo_real`
- ✅ **Particionamiento por período**: Índices optimizados para consultas temporales
- ✅ **Agregaciones precalculadas**: Mejora performance 100x en reportes
- ✅ **Refresh automático**: Función `refresh_materialized_views()`

#### 3. **Seguridad Declarativa**
- ✅ **Row Level Security (RLS)**: Acceso basado en roles automático
- ✅ **Integración auth.users**: Eliminación de NextAuth.js
- ✅ **Políticas granulares**: Por sucursal, por conductor, por cliente

## 🎯 **Estrategia de Migración por Fases**

### **Fase 1: Setup y Datos Maestros (Semana 1)**
```sql
-- 1. Crear proyecto Supabase
-- 2. Ejecutar schema-postgresql.sql
-- 3. Migrar datos de referencia:
```

**Orden de migración:**
1. `regiones` → `comunas`
2. `direcciones` 
3. `dependencias` → `sucursales`
4. `categorias_catalogo` → `subcategorias_catalogo`
5. `formas_pago`

### **Fase 2: Usuarios y Seguridad (Semana 2)**
```sql
-- 1. Migrar personas → usuarios
-- 2. Configurar Supabase Auth
-- 3. Migrar cargos y permisos
-- 4. Implementar RLS policies
```

**Cambios de código:**
- Reemplazar NextAuth → Supabase Auth
- Actualizar middleware de autorización
- Migrar `verificarAutorizacion()` → RLS policies

### **Fase 3: Clientes e Inventario (Semana 3)**
```sql
-- 1. Migrar clientes
-- 2. Migrar items_catalogo
-- 3. Actualizar referencias de propietarios
-- 4. Crear vista materializada de inventario
```

### **Fase 4: Ventas y Transacciones (Semana 4)**
```sql
-- 1. Migrar ventas principales
-- 2. Migrar detalle_ventas con relaciones
-- 3. Migrar historial_estados y comentarios
-- 4. Actualizar flujos de BI
```

### **Fase 5: Logística y Realtime (Semana 5)**
```sql
-- 1. Migrar vehiculos y rutas_despacho
-- 2. Implementar Supabase Realtime
-- 3. Reemplazar Socket.IO subscriptions
-- 4. Testing de funcionalidad completa
```

## 🔄 **Reemplazo de Tecnologías**

### **Auth: NextAuth.js → Supabase Auth**
```javascript
// ANTES (NextAuth)
const session = await getServerSession(authOptions);
if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// DESPUÉS (Supabase Auth + RLS)
const { data: { user }, error } = await supabase.auth.getUser();
// RLS automáticamente filtra según permisos
const { data: ventas } = await supabase.from('ventas').select('*');
```

### **Realtime: Socket.IO → Supabase Subscriptions**
```javascript
// ANTES (Socket.IO)
socket.emit("join-room", { room: "room-pedidos", userId: session.user.id });
socket.on("update-pedidos", () => fetchCargamentos());

// DESPUÉS (Supabase Realtime)
const subscription = supabase
  .channel('pedidos-changes')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'ventas' },
    (payload) => queryClient.invalidateQueries(['cargamentos-despacho'])
  )
  .subscribe();
```

### **Database: MongoDB → PostgreSQL**
```javascript
// ANTES (Mongoose)
const ventas = await Venta.find({ clienteId: { $in: clienteIds } })
  .populate('clienteId')
  .populate('detallesVenta');

// DESPUÉS (Supabase)
const { data: ventas } = await supabase
  .from('ventas')
  .select(`
    *, 
    cliente:clientes(*),
    detalle_ventas(*, subcategoria:subcategorias_catalogo(*))
  `)
  .in('cliente_id', clienteIds);
```

## 📊 **Beneficios Específicos para BI**

### **Performance de Reportes**
```sql
-- ANTES: Query compleja en runtime
db.ventas.aggregate([
  { $match: { fecha: { $gte: startDate } } },
  { $lookup: { from: "clientes", ... } },
  { $group: { _id: "$clienteId", total: { $sum: "$valorTotal" } } }
]);

-- DESPUÉS: Vista materializada precalculada
SELECT cliente_id, cliente_nombre, deuda_mensual 
FROM mv_resumen_deudas_clientes 
WHERE ultima_actualizacion >= CURRENT_DATE - 1;
```

### **Actualización Automática de BI**
```sql
-- Trigger automático en INSERT/UPDATE de ventas
CREATE TRIGGER actualizar_bi_deudas 
AFTER INSERT OR UPDATE ON ventas
FOR EACH ROW EXECUTE FUNCTION actualizar_bi_deudas_fn();
```

## 🛠️ **Scripts de Migración**

### **Script 1: Migración de Datos**
```javascript
// migration/migrate-clientes.js
const { MongoClient } = require('mongodb');
const { createClient } = require('@supabase/supabase-js');

async function migrateClientes() {
  const mongoClientes = await mongo.collection('clientes').find({}).toArray();
  
  for (const cliente of mongoClientes) {
    await supabase.from('clientes').insert({
      id: uuidv4(),
      temporal_id: cliente.temporalId,
      nombre: cliente.nombre,
      rut: cliente.rut,
      // ... resto de campos
    });
  }
}
```

### **Script 2: Verificación de Integridad**
```sql
-- Ejecutar después de cada fase
SELECT * FROM verificar_integridad_migracion();
```

## 🎯 **Checklist de Validación**

### **Funcionalidad Crítica**
- [ ] Login/Auth funciona con Supabase Auth
- [ ] Cargamentos se muestran correctamente
- [ ] Scan de cilindros actualiza inventario
- [ ] BI de deudas genera reportes correctos
- [ ] Realtime updates funcionan sin Socket.IO
- [ ] RLS protege datos por sucursal/usuario

### **Performance**
- [ ] Queries de dashboard < 200ms
- [ ] Vistas materializadas se refrescan < 5s
- [ ] Búsquedas de clientes/productos < 100ms
- [ ] Reportes BI se generan < 1s

### **Datos**
- [ ] 0% pérdida de datos en migración
- [ ] Relaciones intactas (ventas ↔ clientes)
- [ ] Historiales preservados
- [ ] Códigos únicos mantenidos

## 🚨 **Riesgos y Mitigación**

### **Riesgo Alto: Pérdida de Datos**
**Mitigación**: 
- Migración incremental por lotes
- Backup completo antes de cada fase
- Rollback automático si fallan validaciones

### **Riesgo Medio: Downtime Prolongado**
**Mitigación**:
- Migración en paralelo (dual-write)
- Switch atómico con feature flags
- Rollback inmediato si problemas críticos

### **Riesgo Bajo: Performance Degradation**
**Mitigación**:
- Load testing antes del switch
- Optimización de índices post-migración
- Monitoring continuo de queries

## ⏱️ **Timeline Detallado**

| Fase | Duración | Hitos Clave | Rollback Point |
|------|----------|-------------|----------------|
| Setup | 3 días | Schema creado, tests básicos | N/A |
| Maestros | 4 días | Datos ref migrados, validados | Rollback a MongoDB |
| Users/Auth | 5 días | Auth funcional, RLS activo | Rollback auth only |
| Clientes | 4 días | CRM completo en PostgreSQL | Rollback transaccional |
| Ventas | 6 días | Core business funcional | Rollback completo |
| Logística | 5 días | Realtime + despacho activo | Switch completo |
| **Total** | **27 días** | **Sistema 100% Supabase** | - |

## 🎉 **Resultado Final**

### **Tecnologías Eliminadas**
- ❌ MongoDB + Mongoose
- ❌ NextAuth.js
- ❌ Socket.IO Server
- ❌ Manual BI queries

### **Tecnologías Nuevas**
- ✅ Supabase PostgreSQL
- ✅ Supabase Auth
- ✅ Supabase Realtime
- ✅ Vistas materializadas + RLS

### **Beneficios Cuantificables**
- 📈 **Performance**: 10x más rápido en reportes BI
- 🔒 **Seguridad**: RLS automático vs manual checks
- 🚀 **Escalabilidad**: PostgreSQL + índices optimizados
- 🔄 **Realtime**: Nativo vs Socket.IO server separado
- 💰 **Costos**: Menor infraestructura (1 servicio vs 3)

¿Comenzamos con la **Fase 1** creando el proyecto Supabase? 🚀