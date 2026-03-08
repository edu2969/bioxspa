# 📘 Ejemplos de Uso - Supabase Auth v2.0

Este documento proporciona ejemplos prácticos de cómo usar las nuevas utilidades de autenticación en diferentes contextos del sistema BIOX usando los valores numéricos de `USER_ROLE` y `TIPO_CARGO`.

## 🚀 Uso Básico en API Routes

### Protección Simple con Autenticación

```typescript
// app/api/users/route.ts
import { withAuth } from '@/lib/auth/apiAuthorization';

export async function GET() {
  return withAuth(async (authUser) => {
    // authUser contiene cargos y helpers de verificación
    return Response.json({
      ok: true,
      user: {
        id: authUser.id,
        email: authUser.email,
        cargos: authUser.cargos
      }
    });
  });
}
```

### Protección por Roles Específicos

```typescript
// app/api/admin/route.ts
import { withCargo } from '@/lib/auth/apiAuthorization';
import { TIPO_CARGO } from '@/app/utils/constants';

export async function GET() {
  return withCargo([TIPO_CARGO.gerente], async (authUser) => {
    // Solo gerentes pueden acceder
    return Response.json({
      ok: true,
      message: 'Acceso autorizado',
      cargos: authUser.cargos
    });
  });
}
```

### Protección por Cargos del Sistema BIOX

```typescript
// app/api/despacho/route.ts
import { withCargo } from '@/lib/auth/apiAuthorization';
import { TIPO_CARGO } from '@/app/utils/constants';

export async function POST() {
  return withCargo([TIPO_CARGO.despacho, TIPO_CARGO.gerente], async (authUser) => {
    // Solo personal de despacho y gerentes pueden acceder
    return Response.json({
      ok: true,
      message: 'Operación de despacho autorizada',
      cargosUsuario: authUser.cargos
    });
  });
}
```

## 🔧 Uso Avanzado

### Verificación Manual de Permisos

```typescript
// app/api/flexible/route.ts
import { withAuthorization } from '@/lib/auth/apiAuthorization';
import { TIPO_CARGO } from '@/app/utils/constants';

export async function POST() {
  return withAuthorization(async (req, authUser) => {
    // Verificaciones complejas personalizadas
    const canManageInventory = 
      authUser.hasCargoType(TIPO_CARGO.gerente) ||
      authUser.hasCargoType(TIPO_CARGO.encargado);

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
  });
}
```

## 🎯 Utilidades de Verificación

### En Componentes de React

```typescript
// components/AdminPanel.tsx
import { useAuth } from '@/context/AuthContext';
import { TIPO_CARGO } from '@/app/utils/constants';

export function AdminPanel() {
  const { hasCargoType, hasCargo } = useAuth();

  if (!hasCargoType(TIPO_CARGO.gerente) && !hasCargo([TIPO_CARGO.encargado])) {
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
import { authorize } from '@/lib/auth/apiAuthorization';
import { redirect } from 'next/navigation';
import { TIPO_CARGO } from '@/app/utils/constants';
import { headers } from 'next/headers';

export async function ServerProtectedComponent() {
  // Crear un request mock para usar authorize
  const headersList = headers();
  const mockReq = {
    headers: {
      get: (name: string) => headersList.get(name)
    }
  } as any;
  
  const authResult = await authorize(mockReq);
  
  if (!authResult.authorized || !authResult.user) {
    redirect('/login');
  }

  const canViewReports = authResult.user.hasCargoType(TIPO_CARGO.gerente);
  
  return (
    <div>
      <h1>Bienvenido, {authResult.user.email}</h1>
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
import { authorize } from '@/lib/auth/apiAuthorization';
import { TIPO_CARGO } from '@/app/utils/constants';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rutas protegidas que requieren autenticación
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
    const authResult = await authorize(request);
    
    if (!authResult.authorized || !authResult.user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Verificar acceso a rutas de admin
    if (pathname.startsWith('/admin')) {
      const isAdmin = authResult.user.hasCargoType(TIPO_CARGO.gerente);
      
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

### AuthorizedUser (para API routes)

```typescript
interface AuthorizedUser {
  id: string;
  email: string;
  cargos: number[];           // Valores numéricos de TIPO_CARGO
  hasCargoType: (cargoType: number) => boolean;
  hasCargo: (cargoTypes: number[]) => boolean;
  can: (resource: string, action: string) => boolean;
}
```

### UserData

```typescript
interface UserData {
  id: string;
  email: string;
  nombre: string;
  role?: number;              // Valor numérico del USER_ROLE
  cargos?: Array<{
    id?: string;
    tipo: number;             // Valor numérico del TIPO_CARGO
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
2. **Use `withRole` o `withCargo`** para permisos específicos con valores numéricos de `TIPO_CARGO`
3. **Use `getBasicAuthenticatedUser`** cuando no necesite datos de BD
4. **Use `getAuthenticatedUser`** cuando necesite acceso completo a roles y cargos
5. **Importe siempre las constantes** `TIPO_CARGO` y `USER_ROLE` para usar valores numéricos correctos
6. **Siempre maneje errores** en las verificaciones de autenticación
7. **Cachée resultados** cuando sea posible para mejorar performance

## 🐛 Debugging

Las funciones incluyen logging detallado con emojis:
- 🔍 = Búsqueda/consulta
- ✅ = Éxito
- ⚠️ = Advertencia/fallback
- ❌ = Error

Revise la consola del servidor para información detallada sobre el flujo de autenticación.