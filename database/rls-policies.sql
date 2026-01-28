-- =========================================
-- BIOX - Row Level Security Policies
-- =========================================
-- Este archivo configura las políticas de seguridad a nivel de fila
-- para proteger los datos según los roles de usuario

-- Habilitar RLS en todas las tablas principales
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_catalogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalles_venta ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos_tributarios ENABLE ROW LEVEL SECURITY;

-- =========================================
-- POLÍTICAS PARA USUARIOS
-- =========================================

-- Los usuarios pueden ver su propia información
CREATE POLICY "usuarios_select_own" ON usuarios
    FOR SELECT USING (auth.uid()::text = id::text);

-- Los usuarios pueden actualizar su propia información básica
CREATE POLICY "usuarios_update_own" ON usuarios
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Solo gerentes pueden ver todos los usuarios
CREATE POLICY "usuarios_select_admin" ON usuarios
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM cargos c 
            WHERE c.usuario_id = auth.uid()::text 
            AND c.tipo = 1  -- TIPO_CARGO.gerente
        )
    );

-- Solo gerentes pueden insertar/eliminar usuarios
CREATE POLICY "usuarios_insert_admin" ON usuarios
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM cargos c 
            WHERE c.usuario_id = auth.uid()::text 
            AND c.tipo = 1
        )
    );

-- =========================================
-- POLÍTICAS PARA CLIENTES
-- =========================================

-- Usuarios con acceso de cobranza o superior pueden ver clientes
CREATE POLICY "clientes_select_authorized" ON clientes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM cargos c 
            WHERE c.usuario_id = auth.uid()::text 
            AND c.tipo IN (1, 2, 8, 9)  -- gerente, cobranza, encargado, responsable
        )
    );

-- Solo gerentes y encargados pueden crear/modificar clientes
CREATE POLICY "clientes_modify_admin" ON clientes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM cargos c 
            WHERE c.usuario_id = auth.uid()::text 
            AND c.tipo IN (1, 8)  -- gerente, encargado
        )
    );

-- =========================================
-- POLÍTICAS PARA SUCURSALES
-- =========================================

-- Usuarios pueden ver sucursales según su nivel de acceso
CREATE POLICY "sucursales_select_by_access" ON sucursales
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM cargos c 
            WHERE c.usuario_id = auth.uid()::text 
            AND (
                c.tipo = 1  -- gerente ve todas
                OR c.sucursal_id = id  -- usuarios ven su sucursal
                OR c.tipo IN (2, 8)  -- cobranza y encargados ven todas
            )
        )
    );

-- Solo gerentes pueden modificar sucursales
CREATE POLICY "sucursales_modify_admin" ON sucursales
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM cargos c 
            WHERE c.usuario_id = auth.uid()::text 
            AND c.tipo = 1
        )
    );

-- =========================================
-- POLÍTICAS PARA ITEM_CATALOGO
-- =========================================

-- Usuarios de despacho y superiores pueden ver inventario
CREATE POLICY "inventario_select_dispatch" ON item_catalogo
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM cargos c 
            WHERE c.usuario_id = auth.uid()::text 
            AND c.tipo IN (1, 2, 8, 9, 16)  -- todos menos conductor y proveedor
        )
    );

-- Solo encargados y gerentes pueden modificar inventario
CREATE POLICY "inventario_modify_manager" ON item_catalogo
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM cargos c 
            WHERE c.usuario_id = auth.uid()::text 
            AND c.tipo IN (1, 8, 9)
        )
    );

-- =========================================
-- POLÍTICAS PARA VENTAS
-- =========================================

-- Usuarios pueden ver ventas según su rol y sucursal
CREATE POLICY "ventas_select_by_role" ON ventas
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM cargos c 
            JOIN sucursales s ON (c.sucursal_id = s.id OR c.tipo = 1)
            WHERE c.usuario_id = auth.uid()::text 
            AND (
                c.tipo = 1  -- gerente ve todas
                OR ventas.sucursal_id = c.sucursal_id  -- usuarios ven de su sucursal
                OR c.tipo = 2  -- cobranza ve todas
            )
        )
    );

-- Usuarios de despacho y superiores pueden crear ventas
CREATE POLICY "ventas_insert_dispatch" ON ventas
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM cargos c 
            WHERE c.usuario_id = auth.uid()::text 
            AND c.tipo IN (1, 8, 9, 16)
        )
    );

-- Solo encargados y gerentes pueden modificar ventas
CREATE POLICY "ventas_update_manager" ON ventas
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM cargos c 
            WHERE c.usuario_id = auth.uid()::text 
            AND c.tipo IN (1, 8, 9)
        )
    );

-- =========================================
-- POLÍTICAS PARA DOCUMENTOS TRIBUTARIOS
-- =========================================

-- Usuarios autorizados pueden ver documentos tributarios
CREATE POLICY "dtes_select_authorized" ON documentos_tributarios
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM cargos c 
            WHERE c.usuario_id = auth.uid()::text 
            AND c.tipo IN (1, 2, 8, 9)
        )
    );

-- Solo gerentes y encargados pueden modificar DTEs
CREATE POLICY "dtes_modify_admin" ON documentos_tributarios
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM cargos c 
            WHERE c.usuario_id = auth.uid()::text 
            AND c.tipo IN (1, 8)
        )
    );

-- =========================================
-- POLÍTICAS PARA BI_DEUDAS
-- =========================================

-- Usuarios de cobranza y superiores pueden ver reportes BI
CREATE POLICY "bi_deudas_select_collections" ON bi_deudas
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM cargos c 
            WHERE c.usuario_id = auth.uid()::text 
            AND c.tipo IN (1, 2, 8, 9)
        )
    );

-- Solo el sistema puede insertar/actualizar reportes BI (via service role)
-- Los usuarios no pueden modificar directamente estos datos

-- =========================================
-- FUNCIONES DE SEGURIDAD
-- =========================================

-- Función para verificar si un usuario tiene un tipo de cargo específico
CREATE OR REPLACE FUNCTION user_has_role(required_role INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM cargos c
        WHERE c.usuario_id = auth.uid()::text
        AND c.tipo = required_role
    );
END;
$$;

-- Función para verificar si un usuario pertenece a una sucursal
CREATE OR REPLACE FUNCTION user_in_sucursal(sucursal_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM cargos c
        WHERE c.usuario_id = auth.uid()::text
        AND (c.sucursal_id = sucursal_id OR c.tipo = 1)  -- gerente accede a todas
    );
END;
$$;

-- =========================================
-- TRIGGERS DE AUDITORÍA
-- =========================================

-- Función para auditoría automática
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Registrar la operación en tabla de auditoría (si existe)
    -- Por ahora solo actualizar timestamps
    IF TG_OP = 'UPDATE' THEN
        NEW.updated_at = NOW();
        RETURN NEW;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Aplicar triggers de auditoría a tablas principales
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT LIKE 'bi_%'
        AND tablename NOT LIKE '%_history'
    LOOP
        -- Solo aplicar si la tabla tiene columna updated_at
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = t AND column_name = 'updated_at'
        ) THEN
            EXECUTE format('
                CREATE TRIGGER audit_%s_trigger
                    BEFORE UPDATE ON %I
                    FOR EACH ROW
                    EXECUTE FUNCTION audit_trigger_function()
            ', t, t);
        END IF;
    END LOOP;
END $$;