-- =========================================
-- BIOX - Esquema PostgreSQL para Supabase
-- Migración desde MongoDB
-- =========================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================
-- 1. TABLAS MAESTRAS (Datos de Referencia)
-- =========================================

-- Regiones y Comunas
CREATE TABLE regiones (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    codigo VARCHAR(10) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE comunas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    region_id INTEGER REFERENCES regiones(id) ON DELETE CASCADE,
    codigo VARCHAR(10) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Direcciones (normalizada)
CREATE TABLE direcciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(255) NOT NULL,
    direccion TEXT,
    comuna_id INTEGER REFERENCES comunas(id),
    latitud DECIMAL(10,8),
    longitud DECIMAL(11,8),
    es_matriz BOOLEAN DEFAULT false,
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dependencias y Sucursales
CREATE TABLE dependencias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL,
    tipo INTEGER NOT NULL, -- 1: sucursal, 10: bodega, 11: sucursal_bodega, 20: bodega_proveedor
    direccion_id UUID REFERENCES direcciones(id),
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sucursales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_interno INTEGER UNIQUE NOT NULL, -- Para mantener compatibilidad
    nombre VARCHAR(100) NOT NULL,
    dependencia_id UUID REFERENCES dependencias(id),
    direccion_id UUID REFERENCES direcciones(id),
    visible BOOLEAN DEFAULT true,
    prioridad INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- 2. GESTIÓN DE USUARIOS Y ROLES
-- =========================================

-- Personas (datos básicos)
CREATE TABLE personas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100),
    rut VARCHAR(12) UNIQUE NOT NULL,
    telefono VARCHAR(20),
    email VARCHAR(255),
    direccion_id UUID REFERENCES direcciones(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usuarios (compatible con Supabase Auth)
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    persona_id UUID REFERENCES personas(id),
    temporal_id VARCHAR(50),
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT,
    role_legacy INTEGER, -- Para compatibilidad temporal
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cargos (roles por sucursal/dependencia)
CREATE TABLE cargos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    sucursal_id UUID REFERENCES sucursales(id),
    dependencia_id UUID REFERENCES dependencias(id),
    tipo INTEGER NOT NULL, -- Enum de TIPO_CARGO
    desde DATE NOT NULL,
    hasta DATE,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- 3. CATÁLOGO DE PRODUCTOS
-- =========================================

-- Categorías de productos
CREATE TABLE categorias_catalogo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    temporal_id VARCHAR(50),
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    url_imagen VARCHAR(255),
    tipo INTEGER,
    gas VARCHAR(50),
    elemento VARCHAR(50),
    es_industrial BOOLEAN DEFAULT false,
    es_medicinal BOOLEAN DEFAULT false,
    seguir BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subcategorías de productos
CREATE TABLE subcategorias_catalogo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    categoria_id UUID REFERENCES categorias_catalogo(id) ON DELETE CASCADE,
    temporal_id VARCHAR(50),
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    cantidad DECIMAL(10,2),
    unidad VARCHAR(20),
    sin_sifon BOOLEAN DEFAULT false,
    precio_sugerido DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Items de catálogo (inventario físico)
CREATE TABLE items_catalogo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    temporal_id VARCHAR(50),
    codigo VARCHAR(100) UNIQUE,
    subcategoria_id UUID REFERENCES subcategorias_catalogo(id) ON DELETE CASCADE,
    estado INTEGER DEFAULT 0,
    nombre VARCHAR(255),
    descripcion TEXT,
    descripcion_corta VARCHAR(255),
    ficha_tecnica TEXT,
    url_ficha_tecnica VARCHAR(255),
    url_imagen VARCHAR(255),
    garantia_anual INTEGER DEFAULT 0,
    destacado BOOLEAN DEFAULT false,
    stock_minimo INTEGER DEFAULT 0,
    stock_actual INTEGER NOT NULL DEFAULT 0,
    visible BOOLEAN DEFAULT true,
    direccion_id UUID REFERENCES direcciones(id),
    propietario_id UUID, -- Referencia a clientes
    fecha_mantencion DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- 4. CLIENTES
-- =========================================

CREATE TABLE clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    temporal_id VARCHAR(50),
    creador_id UUID REFERENCES usuarios(id),
    nombre VARCHAR(255) NOT NULL,
    rut VARCHAR(12) NOT NULL,
    direccion_principal_id UUID REFERENCES direcciones(id),
    giro VARCHAR(255),
    telefono VARCHAR(20),
    email VARCHAR(255),
    email_intercambio VARCHAR(255),
    envio_factura BOOLEAN DEFAULT false,
    envio_reporte BOOLEAN DEFAULT false,
    seguimiento BOOLEAN DEFAULT false,
    orden_compra BOOLEAN DEFAULT false,
    reporte_deuda BOOLEAN DEFAULT false,
    arriendo BOOLEAN DEFAULT false,
    dias_de_pago INTEGER DEFAULT 1,
    notificacion BOOLEAN DEFAULT false,
    credito DECIMAL(12,2) DEFAULT 300000,
    url_web VARCHAR(255),
    comentario TEXT,
    contacto VARCHAR(255),
    activo BOOLEAN DEFAULT true,
    cilindros_min INTEGER DEFAULT 0,
    cilindros_max INTEGER DEFAULT 9999,
    en_quiebra BOOLEAN DEFAULT false,
    meses_aumento INTEGER[],
    documento_tributario_id UUID, -- Se define después
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(rut)
);

-- Direcciones de despacho por cliente
CREATE TABLE cliente_direcciones_despacho (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    direccion_id UUID REFERENCES direcciones(id) ON DELETE CASCADE,
    comentario TEXT,
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(cliente_id, direccion_id)
);

-- Actualizar items_catalogo para referenciar clientes
ALTER TABLE items_catalogo 
ADD CONSTRAINT fk_items_propietario 
FOREIGN KEY (propietario_id) REFERENCES clientes(id);

-- =========================================
-- 5. VENTAS Y TRANSACCIONES
-- =========================================

-- Documentos tributarios
CREATE TABLE documentos_tributarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    temporal_id VARCHAR(50),
    nombre VARCHAR(255),
    stock BOOLEAN DEFAULT false,
    afecto BOOLEAN DEFAULT false,
    compra BOOLEAN DEFAULT false,
    venta BOOLEAN DEFAULT false,
    operacion INTEGER,
    formato INTEGER;
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);



-- Actualizar clientes para referenciar documentos
ALTER TABLE clientes 
ADD CONSTRAINT fk_cliente_documento 
FOREIGN KEY (documento_tributario_id) REFERENCES documentos_tributarios(id);

-- Ventas principales
CREATE TABLE ventas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    temporal_id VARCHAR(50),
    tipo INTEGER NOT NULL, -- 1: Venta, 2: Traslado, 3: OT, 4: Cotización
    cliente_id UUID REFERENCES clientes(id) NOT NULL,
    codigo VARCHAR(100),
    vendedor_id UUID REFERENCES usuarios(id) NOT NULL,
    sucursal_id UUID REFERENCES sucursales(id) NOT NULL,
    dependencia_id UUID REFERENCES dependencias(id),
    -- Optional direct relation to a ruta_despacho to allow Supabase relationship embedding
    ruta_id UUID REFERENCES rutas_despacho(id),
    fecha DATE DEFAULT CURRENT_DATE,
    estado INTEGER NOT NULL,
    por_cobrar BOOLEAN DEFAULT false,
    
    -- Valores monetarios
    valor_neto DECIMAL(12,2),
    valor_exento DECIMAL(12,2),
    valor_iva DECIMAL(12,2),
    valor_bruto DECIMAL(12,2),
    valor_total DECIMAL(12,2),
    
    -- Documentación
    numero_documento VARCHAR(100),
    numero_vale VARCHAR(100),
    saldo DECIMAL(12,2) DEFAULT 0,
    documento_tributario_id UUID REFERENCES documentos_tributarios(id),
    direccion_despacho_id UUID REFERENCES direcciones(id),
    
    -- Configuraciones
    tasa_impuesto DECIMAL(5,2),
    tiene_ot BOOLEAN DEFAULT false,
    numero_orden VARCHAR(100),
    codigo_hes VARCHAR(100),
    tiene_arriendo BOOLEAN DEFAULT false,
    control_envase VARCHAR(255),
    medio_despacho VARCHAR(100),
    numero_traslado VARCHAR(100),
    
    -- Integración SII
    cantidad_consultas_sii INTEGER DEFAULT 0,
    cantidad_reenvios_sii INTEGER DEFAULT 0,
    
    comentario TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Detalle de ventas
CREATE TABLE detalle_ventas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    temporal_id VARCHAR(50),
    venta_id UUID REFERENCES ventas(id) ON DELETE CASCADE,
    subcategoria_id UUID REFERENCES subcategorias_catalogo(id),
    
    -- Descripción
    glosa VARCHAR(255),
    codigo VARCHAR(100),
    codigo_producto VARCHAR(100),
    codigo_cilindro VARCHAR(100),
    
    tipo INTEGER, -- 1: pedido, 2: retiro
    cantidad INTEGER NOT NULL,
    especifico INTEGER,
    
    -- Valores monetarios
    neto DECIMAL(12,2) NOT NULL,
    iva DECIMAL(12,2) NOT NULL,
    total DECIMAL(12,2) NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Items por detalle de venta (muchos a muchos)
CREATE TABLE detalle_venta_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    detalle_venta_id UUID REFERENCES detalle_ventas(id) ON DELETE CASCADE,
    item_catalogo_id UUID REFERENCES items_catalogo(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(detalle_venta_id, item_catalogo_id)
);

-- Historial de estados de venta
CREATE TABLE venta_historial_estados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venta_id UUID REFERENCES ventas(id) ON DELETE CASCADE,
    estado INTEGER NOT NULL,
    fecha TIMESTAMPTZ NOT NULL,
    usuario_id UUID REFERENCES usuarios(id),
    comentario TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comentarios de cobro
CREATE TABLE venta_comentarios_cobro (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venta_id UUID REFERENCES ventas(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES usuarios(id) NOT NULL,
    comentario TEXT NOT NULL,
    fecha TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Entregas en local
CREATE TABLE venta_entregas_local (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venta_id UUID REFERENCES ventas(id) ON DELETE CASCADE,
    nombre_recibe VARCHAR(255) NOT NULL,
    rut_recibe VARCHAR(12) NOT NULL,
    fecha_entrega TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Items entregados en local
CREATE TABLE entrega_local_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entrega_id UUID REFERENCES venta_entregas_local(id) ON DELETE CASCADE,
    item_catalogo_id UUID REFERENCES items_catalogo(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- 6. LOGÍSTICA Y DESPACHO
-- =========================================

-- Rutas de despacho
CREATE TABLE rutas_despacho (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehiculo_id UUID, -- Se referenciará después
    conductor_id UUID REFERENCES usuarios(id) NOT NULL,
    dependencia_id UUID REFERENCES dependencias(id),
    estado INTEGER NOT NULL,
    hora_inicio TIMESTAMPTZ,
    hora_destino TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Destinos por ruta
CREATE TABLE ruta_destinos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ruta_id UUID REFERENCES rutas_despacho(id) ON DELETE CASCADE,
    direccion_id UUID REFERENCES direcciones(id),
    fecha_arribo TIMESTAMPTZ,
    rut_quien_recibe VARCHAR(12),
    nombre_quien_recibe VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ventas por ruta
CREATE TABLE ruta_ventas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ruta_id UUID REFERENCES rutas_despacho(id) ON DELETE CASCADE,
    venta_id UUID REFERENCES ventas(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(ruta_id, venta_id)
);

-- Historial de estados de ruta
CREATE TABLE ruta_historial_estados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ruta_id UUID REFERENCES rutas_despacho(id) ON DELETE CASCADE,
    estado INTEGER NOT NULL,
    usuario_id UUID REFERENCES usuarios(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Historial de carga/descarga
CREATE TABLE ruta_historial_carga (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ruta_id UUID REFERENCES rutas_despacho(id) ON DELETE CASCADE,
    es_carga BOOLEAN NOT NULL,
    fecha TIMESTAMPTZ NOT NULL,
    usuario_id UUID REFERENCES usuarios(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Items movidos en carga/descarga
CREATE TABLE ruta_items_movidos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    historial_carga_id UUID REFERENCES ruta_historial_carga(id) ON DELETE CASCADE,
    item_catalogo_id UUID REFERENCES items_catalogo(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- 7. BUSINESS INTELLIGENCE & REPORTES
-- =========================================

-- Vista agregada de deudas por período
CREATE TABLE bi_deudas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sucursal_id UUID REFERENCES sucursales(id) NOT NULL,
    cliente_id UUID REFERENCES clientes(id) NOT NULL,
    fecha DATE NOT NULL,
    periodo CHAR(1) NOT NULL CHECK (periodo IN ('D', 'S', 'M', 'A')),
    monto DECIMAL(15,2) NOT NULL,
    ventas_por_cobrar INTEGER DEFAULT 0,
    ultima_venta_id UUID REFERENCES ventas(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(sucursal_id, cliente_id, fecha, periodo)
);

-- Vista principal de BI
CREATE TABLE bi_principal (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sucursal_id UUID REFERENCES sucursales(id) NOT NULL,
    cliente_id UUID REFERENCES clientes(id) NOT NULL,
    fecha DATE NOT NULL,
    periodo CHAR(1) NOT NULL CHECK (periodo IN ('D', 'S', 'M', 'A')),
    
    -- Montos
    monto_adeudado DECIMAL(15,2) NOT NULL,
    monto_vendido DECIMAL(15,2) NOT NULL,
    monto_arrendado DECIMAL(15,2) NOT NULL,
    
    -- Volúmenes
    m3_vendidos DECIMAL(10,3) DEFAULT 0,
    m3_envasados DECIMAL(10,3) DEFAULT 0,
    m3_por_envasar DECIMAL(10,3) DEFAULT 0,
    
    -- Peso
    kg_vendidos DECIMAL(10,2) DEFAULT 0,
    kg_envasados DECIMAL(10,2) DEFAULT 0,
    kg_por_envasar DECIMAL(10,2) DEFAULT 0,
    
    -- Cilindros
    cantidad_cilindros_prestados INTEGER DEFAULT 0,
    cantidad_cilindros_cliente INTEGER DEFAULT 0,
    
    estado INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(sucursal_id, cliente_id, fecha, periodo)
);

-- BI de cilindros
CREATE TABLE bi_cilindros (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sucursal_id UUID REFERENCES sucursales(id),
    cliente_id UUID REFERENCES clientes(id),
    categoria_id UUID REFERENCES categorias_catalogo(id),
    fecha DATE NOT NULL,
    periodo CHAR(1) NOT NULL CHECK (periodo IN ('D', 'S', 'M', 'A')),
    
    -- Métricas específicas
    cantidad_prestados INTEGER DEFAULT 0,
    cantidad_vendidos INTEGER DEFAULT 0,
    cantidad_retornados INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- 8. SISTEMA DE PRECIOS
-- =========================================

CREATE TABLE precios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subcategoria_id UUID REFERENCES subcategorias_catalogo(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES clientes(id), -- NULL para precio general
    sucursal_id UUID REFERENCES sucursales(id),
    tipo INTEGER NOT NULL, -- 1: mayorista, 2: minorista
    precio DECIMAL(12,2) NOT NULL,
    fecha_desde DATE NOT NULL,
    fecha_hasta DATE,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- 9. SISTEMA DE COMISIONES
-- =========================================

CREATE TABLE comisiones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID REFERENCES usuarios(id) NOT NULL,
    tipo INTEGER NOT NULL, -- 1: chofer, 2: retiro, 3: entrega, 4: nuevo cliente, 8: punto venta
    unidad INTEGER NOT NULL, -- 1: porcentaje, 2: monto
    valor DECIMAL(10,2) NOT NULL,
    subcategoria_id UUID REFERENCES subcategorias_catalogo(id),
    sucursal_id UUID REFERENCES sucursales(id),
    fecha_desde DATE NOT NULL,
    fecha_hasta DATE,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Registro de comisiones aplicadas
CREATE TABLE registro_comisiones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID REFERENCES usuarios(id) NOT NULL,
    venta_id UUID REFERENCES ventas(id) NOT NULL,
    comision_id UUID REFERENCES comisiones(id) NOT NULL,
    monto_base DECIMAL(12,2) NOT NULL,
    monto_comision DECIMAL(12,2) NOT NULL,
    fecha_calculo DATE NOT NULL,
    pagado BOOLEAN DEFAULT false,
    fecha_pago DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- 10. PAGOS Y COBRANZAS
-- =========================================

-- Formas de pago
CREATE TABLE formas_pago (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    codigo VARCHAR(10) UNIQUE,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pagos
CREATE TABLE pagos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venta_id UUID REFERENCES ventas(id) NOT NULL,
    forma_pago_id INTEGER REFERENCES formas_pago(id),
    monto DECIMAL(12,2) NOT NULL,
    fecha DATE NOT NULL,
    numero_comprobante VARCHAR(100),
    observaciones TEXT,
    usuario_registro_id UUID REFERENCES usuarios(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- 11. VEHÍCULOS
-- =========================================

CREATE TABLE vehiculos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    temporal_id VARCHAR(100),
    patente VARCHAR(10) NOT NULL UNIQUE,
    marca VARCHAR(50) NOT NULL,
    modelo VARCHAR(50) NOT NULL,
    numero_motor VARCHAR(100),
    numero_chasis VARCHAR(100),
    ano VARCHAR(4),
    empresa_id VARCHAR(100),
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    revision_tecnica DATE NOT NULL,
    fecha_vencimiento_extintor DATE,
    direccion_destino_id UUID REFERENCES direcciones(id),
    posicion_latitud DECIMAL(10,8),
    posicion_longitud DECIMAL(11,8),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de relación vehículo-conductores (many-to-many)
CREATE TABLE vehiculo_conductores (
    vehiculo_id UUID REFERENCES vehiculos(id) ON DELETE CASCADE,
    conductor_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    PRIMARY KEY (vehiculo_id, conductor_id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agregar foreign key que faltaba en rutas_despacho
ALTER TABLE rutas_despacho 
ADD CONSTRAINT fk_ruta_vehiculo 
FOREIGN KEY (vehiculo_id) REFERENCES vehiculos(id);

-- =========================================
-- 12. AUDITORÍA Y CHECKLIST
-- =========================================

CREATE TABLE checklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo INTEGER NOT NULL, -- 'personal', 'vehiculo', etc.
    usuario_id UUID REFERENCES usuarios(id),
    vehiculo_id UUID REFERENCES vehiculos(id),
    ruta_id UUID REFERENCES rutas_despacho(id),
    fecha DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- 13. ÍNDICES PARA PERFORMANCE
-- =========================================

-- Índices para búsquedas frecuentes
CREATE INDEX idx_ventas_cliente_fecha ON ventas(cliente_id, fecha DESC);
CREATE INDEX idx_ventas_sucursal_estado ON ventas(sucursal_id, estado);
CREATE INDEX idx_items_catalogo_codigo ON items_catalogo(codigo) WHERE codigo IS NOT NULL;
CREATE INDEX idx_items_catalogo_estado ON items_catalogo(estado);
CREATE INDEX idx_clientes_rut ON clientes(rut);
CREATE INDEX idx_detalle_ventas_venta ON detalle_ventas(venta_id);

-- Índices para vehículos
CREATE INDEX idx_vehiculos_patente ON vehiculos(patente);
CREATE INDEX idx_vehiculos_cliente_id ON vehiculos(cliente_id);
CREATE INDEX idx_vehiculos_marca_modelo ON vehiculos(marca, modelo);
CREATE INDEX idx_vehiculo_conductores_vehiculo ON vehiculo_conductores(vehiculo_id);
CREATE INDEX idx_vehiculo_conductores_conductor ON vehiculo_conductores(conductor_id);

-- Índices para BI
CREATE INDEX idx_bi_deudas_sucursal_periodo ON bi_deudas(sucursal_id, periodo, fecha DESC);
CREATE INDEX idx_bi_deudas_cliente_periodo ON bi_deudas(cliente_id, periodo, fecha DESC);
CREATE INDEX idx_bi_principal_fecha ON bi_principal(fecha DESC);

-- Índices para rutas
CREATE INDEX idx_rutas_conductor_estado ON rutas_despacho(conductor_id, estado);
CREATE INDEX idx_ruta_ventas_ruta ON ruta_ventas(ruta_id);

-- =========================================
-- 13. VISTAS MATERIALIZADAS PARA BI
-- =========================================

-- Vista materializada para dashboard de deudas
CREATE MATERIALIZED VIEW mv_resumen_deudas_clientes AS
SELECT 
    c.id as cliente_id,
    c.nombre as cliente_nombre,
    c.rut as cliente_rut,
    s.id as sucursal_id,
    s.nombre as sucursal_nombre,
    SUM(CASE WHEN bd.periodo = 'D' THEN bd.monto ELSE 0 END) as deuda_diaria,
    SUM(CASE WHEN bd.periodo = 'S' THEN bd.monto ELSE 0 END) as deuda_semanal,
    SUM(CASE WHEN bd.periodo = 'M' THEN bd.monto ELSE 0 END) as deuda_mensual,
    SUM(CASE WHEN bd.periodo = 'A' THEN bd.monto ELSE 0 END) as deuda_anual,
    SUM(bd.ventas_por_cobrar) as total_ventas_pendientes,
    MAX(bd.fecha) as ultima_actualizacion
FROM bi_deudas bd
JOIN clientes c ON bd.cliente_id = c.id
JOIN sucursales s ON bd.sucursal_id = s.id
WHERE bd.fecha >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY c.id, c.nombre, c.rut, s.id, s.nombre;

-- Índice para la vista materializada
CREATE UNIQUE INDEX idx_mv_resumen_deudas ON mv_resumen_deudas_clientes(cliente_id, sucursal_id);

-- Vista materializada para inventario en tiempo real
CREATE MATERIALIZED VIEW mv_inventario_tiempo_real AS
SELECT 
    ic.id,
    ic.codigo,
    ic.estado,
    sc.nombre as subcategoria_nombre,
    cc.nombre as categoria_nombre,
    cc.elemento,
    ic.stock_actual,
    d.nombre as ubicacion_actual,
    c.nombre as propietario_nombre,
    ic.updated_at as ultima_actualizacion
FROM items_catalogo ic
JOIN subcategorias_catalogo sc ON ic.subcategoria_id = sc.id
JOIN categorias_catalogo cc ON sc.categoria_id = cc.id
LEFT JOIN direcciones d ON ic.direccion_id = d.id
LEFT JOIN clientes c ON ic.propietario_id = c.id
WHERE ic.visible = true;

-- =========================================
-- 14. FUNCIONES Y TRIGGERS
-- =========================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger a todas las tablas relevantes
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON clientes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ventas_updated_at BEFORE UPDATE ON ventas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_items_catalogo_updated_at BEFORE UPDATE ON items_catalogo FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sucursales_updated_at BEFORE UPDATE ON sucursales FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehiculos_updated_at BEFORE UPDATE ON vehiculos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bi_deudas_updated_at BEFORE UPDATE ON bi_deudas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para refrescar vistas materializadas
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_resumen_deudas_clientes;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_inventario_tiempo_real;
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- 15. ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================

-- Habilitar RLS en tablas sensibles (deshabilitado hasta integrar Auth)
-- ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE items_catalogo ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE rutas_despacho ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (se refinan según roles específicos)
-- Los usuarios solo pueden ver sus propios datos (deshabilitado hasta integrar con Auth)
-- CREATE POLICY usuarios_own_data ON usuarios
--     FOR ALL USING (auth.uid() = id);

-- Las ventas se ven según la sucursal del usuario (deshabilitado hasta integrar con Auth)
-- CREATE POLICY ventas_by_sucursal ON ventas
--     FOR ALL USING (
--         sucursal_id IN (
--             SELECT c.sucursal_id 
--             FROM cargos c 
--             WHERE c.usuario_id = auth.uid() 
--             AND c.activo = true
--         )
--     );

-- Los conductores solo ven sus rutas (deshabilitado hasta integrar con Auth)
-- CREATE POLICY rutas_conductor_own ON rutas_despacho
--     FOR ALL USING (conductor_id = auth.uid());

-- =========================================
-- 16. DATOS MAESTROS INICIALES
-- =========================================

-- Insertar formas de pago básicas
INSERT INTO formas_pago (nombre, codigo) VALUES 
('Efectivo', 'EFEC'),
('Transferencia', 'TRAN'),
('Cheque', 'CHEQ'),
('Tarjeta de Crédito', 'TCRE'),
('Tarjeta de Débito', 'TDEB');

-- =========================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- =========================================

COMMENT ON TABLE ventas IS 'Tabla principal de ventas, cotizaciones, traslados y órdenes de trabajo';
COMMENT ON TABLE items_catalogo IS 'Inventario físico de cilindros y productos';
COMMENT ON TABLE bi_deudas IS 'Vista agregada de deudas por cliente, sucursal y período para BI';
COMMENT ON TABLE rutas_despacho IS 'Rutas de despacho para conductores con seguimiento de estado';
COMMENT ON MATERIALIZED VIEW mv_resumen_deudas_clientes IS 'Vista materializada para dashboard de cobranzas';

-- =========================================
-- FINALIZACIÓN
-- =========================================

-- Crear función para verificar integridad de datos post-migración
CREATE OR REPLACE FUNCTION verificar_integridad_migracion()
RETURNS TABLE (
    tabla VARCHAR(50),
    total_registros BIGINT,
    registros_huerfanos BIGINT,
    estado VARCHAR(20)
) AS $$
BEGIN
    -- Implementar verificaciones de integridad
    RETURN QUERY
    SELECT 'ventas'::VARCHAR(50), COUNT(*)::BIGINT, 0::BIGINT, 'OK'::VARCHAR(20) FROM ventas
    UNION ALL
    SELECT 'clientes'::VARCHAR(50), COUNT(*)::BIGINT, 0::BIGINT, 'OK'::VARCHAR(20) FROM clientes
    UNION ALL
    SELECT 'items_catalogo'::VARCHAR(50), COUNT(*)::BIGINT, 0::BIGINT, 'OK'::VARCHAR(20) FROM items_catalogo;
END;
$$ LANGUAGE plpgsql;