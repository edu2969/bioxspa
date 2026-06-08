-- ============================================================================
-- Migración: agregar cliente_id a dependencias
-- ----------------------------------------------------------------------------
-- Asocia (opcionalmente) cada dependencia a un cliente. Necesario para el
-- editor de sucursales (componente ClienteSearch / campo cliente por
-- dependencia). Sin esta columna + FK, el embed `cliente:clientes(...)` de
-- PostgREST falla con PGRST200 ("no relationship found").
--
-- Idempotente: se puede ejecutar varias veces sin error.
-- ============================================================================

ALTER TABLE dependencias
    ADD COLUMN IF NOT EXISTS cliente_id UUID;

-- FK a clientes. ON DELETE SET NULL: si se borra el cliente, la dependencia
-- permanece pero queda sin cliente asociado (no se borra en cascada).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'dependencias_cliente_id_fkey'
    ) THEN
        ALTER TABLE dependencias
            ADD CONSTRAINT dependencias_cliente_id_fkey
            FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_dependencias_cliente_id ON dependencias(cliente_id);
