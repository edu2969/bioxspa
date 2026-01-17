# BIOX - AI Coding Agent Instructions

BIOX is a Next.js-based business management system for a gas cylinder distribution company in Chile, featuring real-time communication, SII tax integration, and role-based access control.

## Architecture Overview

### Core Stack
- **Next.js 15** with App Router (`app/` directory structure)
- **MongoDB + Mongoose** for data persistence
- **NextAuth.js** for authentication with credentials provider
- **Socket.IO** for real-time features (separate server on port 3000)
- **TailwindCSS** for styling
- **TypeScript/JavaScript mix** (transitioning to TS)

### Key Structural Patterns

**API Routes**: Follow `app/api/[resource]/[action]/route.js` pattern
- All routes use `connectMongoDB()` before database operations
- Role-based authorization via `verificarAutorizacion()` function pattern
- Import `TIPO_CARGO` constants from `@/app/utils/constants` for role checking

**Authentication Flow**:
- Uses NextAuth with MongoDB adapter
- Role system based on `Cargo` model linking users to positions (`TIPO_CARGO`)
- Session management via JWT strategy
- Authorization check pattern in API routes:
```javascript
const auth = await verificarAutorizacion();
if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
}
```

**Real-time Communication**:
- Separate Socket.IO server in `server.mts` 
- Room-based messaging for chat functionality and driver tracking
- Build with: `npm run build:socket`, Run with: `npm run start:socket`

## Business Domain Knowledge

**Role Hierarchy** (`TIPO_CARGO` in constants.ts):
- `gerente` (1): Full system access
- `cobranza` (2): Collections management  
- `encargado` (8): Branch manager
- `responsable` (9): Area supervisor
- `despacho` (16): Dispatch operations
- `conductor` (32): Driver operations
- `proveedor` (64): Supplier access

**SII Integration** (`lib/sii/`):
- Chilean tax service (Servicio de Impuestos Internos) integration
- Electronic invoice generation with digital certificates
- Endpoints differ between CERT and PROD environments
- XML document processing for tax compliance

**Key Business Entities**:
- `Cliente`: Customer management with credit limits and delivery addresses
- `ItemCatalogo`: Gas cylinder inventory with status tracking
- `Sucursal`: Branch offices with location-based operations  
- `Cargo`: User role assignments tied to branches/dependencies
- `DocumentoTributario`: Tax document generation and tracking

## Development Patterns

**Model Structure**: 
- Mongoose schemas in `models/` directory
- Use `Schema.Types.ObjectId` for references
- Include `timestamps: true` for audit trails

**Component Organization**:
- Business logic components in `components/[domain]/`
- Reusable UI in `components/uix/`
- Context providers in `components/context/`

**Data Fetching**:
- React Query (`@tanstack/react-query`) for client-side state
- `ReactQueryProvider` wraps app in layout

**File Naming Convention**:
- API routes: `route.js` or `route.ts`
- Components: PascalCase `.jsx` or `.tsx`
- Models: camelCase `.js`
- Mixing JS/TS during migration - check existing file extensions

## Critical Commands

```bash
# Development
npm run dev              # Next.js development server
npm run dev:socket      # Socket.IO server with ts-node

# Production  
npm run build           # Build Next.js app
npm run build:socket    # Build both Next.js and Socket.IO server
npm run start:socket    # Start production with Socket.IO

# Database connection requires MONGODB_URI in .env.local
```

## Integration Notes

**Google Maps**: Uses `@react-google-maps/api` with custom `GoogleMapsProvider`
**PDF Generation**: `jspdf` + `html2canvas` for reports  
**Crypto Operations**: `node-forge` for digital certificates (SII integration)
**Real-time Features**: Socket.IO rooms for chat and location tracking

## Important Gotchas

- Always call `await connectMongoDB()` before database operations
- Check user authorization with role-specific `ROLES_PERMITIDOS` arrays
- Socket.IO server runs separately - ensure both servers are running for full functionality
- SII integration requires proper certificate management and XML processing
- Mixed JS/TS codebase - maintain consistency with existing file patterns in each directory