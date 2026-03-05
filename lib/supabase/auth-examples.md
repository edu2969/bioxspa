# 📘 Ejemplos de Uso - Supabase Auth v2.0

Este documento proporciona ejemplos prácticos de cómo usar las nuevas utilidades de autenticación en diferentes contextos del sistema BIOX.

## 🚀 Uso Básico en API Routes

### Protección Simple con Autenticación

```typescript
// app/api/users/route.ts
import { withAuth } from '@/lib/supabase/supabase-auth';

export async function GET() {
  return withAuth(async (authUser) => {
    // authUser.userData contiene roles y cargos completos
    return Response.json({
      ok: true,
      user: {
        id: authUser.userData.id,
        nombre: authUser.userData.nombre,
        email: authUser.userData.email,
        role: authUser.userData.role,
        cargos: authUser.userData.cargos
      }
    });
  });
}
```

### Protección por Roles Específicos

```typescript
// app/api/admin/route.ts
import { withRole } from '@/lib/supabase/supabase-auth';

export async function GET() {
  return withRole(['admin', 'gerente'], async (authUser) => {
    // Solo admins y gerentes pueden acceder
    return Response.json({
      ok: true,
      message: 'Acceso autorizado',
      userRole: authUser.userData.role
    });
  });
}
```

### Protección por Cargos del Sistema BIOX

```typescript
// app/api/despacho/route.ts
import { withCargo } from '@/lib/supabase/supabase-auth';

export async function POST() {
  return withCargo(['despacho', 'gerente'], async (authUser) => {
    // Solo personal de despacho y gerentes pueden acceder
    const cargos = authUser.userData.cargos || [];
    
    return Response.json({
      ok: true,
      message: 'Operación de despacho autorizada',
      cargosActivos: cargos.map(c => ({
        tipo: c.tipo,
        sucursal: c.sucursales?.nombre
      }))
    });
  });
}
```

## 🔧 Uso Avanzado

### Verificación Manual de Permisos

```typescript
// app/api/flexible/route.ts
import { getAuthenticatedUser } from '@/lib/supabase/supabase-auth';

export async function POST() {
  try {
    const authResult = await getAuthenticatedUser({ requireAuth: true });
    
    if (!authResult.success || !authResult.data) {
      return Response.json(
        { ok: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const authUser = authResult.data;

    // Verificaciones complejas personalizadas
    const canManageInventory = 
      authUser.hasRole('admin') || 
      authUser.hasCargoType('gerente') ||
      (authUser.hasCargoType('encargado') && authUser.userData.cargos?.some(
        c => c.sucursales?.id === '123'
      ));

    if (!canManageInventory) {
      return Response.json(
        { ok: false, error: 'Permisos insuficientes para gestionar inventario' },
        { status: 403 }
      );
    }

    return Response.json({
      ok: true,
      message: 'Acceso autorizado para gestión de inventario'
    });

  } catch (error) {
    return Response.json(
      { ok: false, error: 'Error interno' },
      { status: 500 }
    );
  }
}
```

## 🎯 Utilidades de Verificación

### En Componentes de React

```typescript
// components/AdminPanel.tsx
import { useAuth } from '@/context/AuthContext';

export function AdminPanel() {
  const { hasCargoType, HasCargo } = useAuth();

  if (!hasCargoType('gerente') && !hasCargo(['admin', 'encargado'])) {
    return <div>No tienes permisos para ver este panel</div>;
  }

  return (
    <div>
      <h1>Panel de Administración</h1>
      {/* Contenido del panel */}
    </div>
  );
}
```

### En Server Components

```typescript
// components/ServerProtectedComponent.tsx
import { requireAuth, hasCargoType } from '@/lib/supabase/supabase-auth';
import { redirect } from 'next/navigation';

export async function ServerProtectedComponent() {
  const authUser = await requireAuth().catch(() => null);
  
  if (!authUser) {
    redirect('/login');
  }

  const canViewReports = await hasCargoType('gerente');
  
  return (
    <div>
      <h1>Bienvenido, {authUser.userData.nombre}</h1>
      {canViewReports && (
        <div>
          <h2>Reportes Disponibles</h2>
          {/* Contenido de reportes */}
        </div>
      )}
    </div>
  );
}
```

## 🛡️ Middleware de Next.js

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/supabase-auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rutas protegidas que requieren autenticación
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
    const authResult = await getAuthenticatedUser();
    
    if (!authResult.success || !authResult.data) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Verificar acceso a rutas de admin
    if (pathname.startsWith('/admin')) {
      const isAdmin = authResult.data.hasRole('admin') || 
                     authResult.data.hasCargoType('gerente');
      
      if (!isAdmin) {
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*']
};
```

## 📋 Tipos Disponibles

### AuthenticatedUserResult

```typescript
interface AuthenticatedUserResult {
  user: User;                    // Usuario de Supabase Auth
  userData: UserData;            // Datos extendidos desde BD
  hasRole: (roleName: string) => boolean;
  hasCargoType: (cargoType: keyof typeof TIPO_CARGO) => boolean;
  hasCargo: (cargoTypes: (keyof typeof TIPO_CARGO)[]) => boolean;
}
```

### UserData

```typescript
interface UserData {
  id: string;
  email: string;
  nombre: string;
  role?: string;
  cargos?: Array<{
    id?: string;
    tipo: number;
    sucursal_id?: string;
    dependencia_id?: string;
    desde?: string;
    hasta?: string;
    sucursales?: {
      id: string;
      nombre: string;
      codigo?: string;
    } | null;
  }>;
}
```

## 🔑 Variables de Entorno Requeridas

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## ⚡ Mejores Prácticas

1. **Use `withAuth` para protección básica** de API routes
2. **Use `withRole` o `withCargo`** para permisos específicos
3. **Use `getBasicAuthenticatedUser`** cuando no necesite datos de BD
4. **Use `getAuthenticatedUser`** cuando necesite acceso completo a roles y cargos
5. **Siempre maneje errores** en las verificaciones de autenticación
6. **Cachée resultados** cuando sea posible para mejorar performance

## 🐛 Debugging

Las funciones incluyen logging detallado con emojis:
- 🔍 = Búsqueda/consulta
- ✅ = Éxito
- ⚠️ = Advertencia/fallback
- ❌ = Error

Revise la consola del servidor para información detallada sobre el flujo de autenticación.