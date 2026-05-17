-- ============================================================
-- TABLAS
-- ============================================================

CREATE TABLE activos (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    clase         TEXT        NOT NULL,
    categoria     TEXT        NOT NULL,
    subcategoria  TEXT,
    institucion   TEXT        NOT NULL,
    nombre_producto TEXT      NOT NULL,
    moneda_base   TEXT        NOT NULL DEFAULT 'CLP',
    ticker        TEXT,
    estado        TEXT        NOT NULL DEFAULT 'activo'
                              CHECK (estado IN ('activo', 'inactivo')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tipos_cambio (
    fecha      DATE         PRIMARY KEY,
    uf         NUMERIC(12,4) NOT NULL,
    usd        NUMERIC(12,4) NOT NULL,
    utm        NUMERIC(12,4) NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE snapshots (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    activo_id        UUID         NOT NULL REFERENCES activos(id) ON DELETE CASCADE,
    fecha            DATE         NOT NULL,
    valor_original   NUMERIC(18,2) NOT NULL,
    tipo_cambio_clp  NUMERIC(12,4) NOT NULL DEFAULT 1,
    valor_clp        NUMERIC(18,2) NOT NULL,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_snapshot_activo_fecha UNIQUE (activo_id, fecha)
);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE activos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_cambio ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshots    ENABLE ROW LEVEL SECURITY;

-- activos: acceso exclusivo por usuario
CREATE POLICY "activos_select" ON activos
    FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "activos_insert" ON activos
    FOR INSERT WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "activos_update" ON activos
    FOR UPDATE USING (auth.uid() = usuario_id);

CREATE POLICY "activos_delete" ON activos
    FOR DELETE USING (auth.uid() = usuario_id);

-- tipos_cambio: dato compartido, acceso a cualquier usuario autenticado
CREATE POLICY "tipos_cambio_select" ON tipos_cambio
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "tipos_cambio_insert" ON tipos_cambio
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "tipos_cambio_update" ON tipos_cambio
    FOR UPDATE USING (auth.role() = 'authenticated');

-- snapshots: acceso via JOIN a activos (no tiene usuario_id directo)
CREATE POLICY "snapshots_select" ON snapshots
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM activos
            WHERE activos.id = snapshots.activo_id
              AND activos.usuario_id = auth.uid()
        )
    );

CREATE POLICY "snapshots_insert" ON snapshots
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM activos
            WHERE activos.id = snapshots.activo_id
              AND activos.usuario_id = auth.uid()
        )
    );

CREATE POLICY "snapshots_update" ON snapshots
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM activos
            WHERE activos.id = snapshots.activo_id
              AND activos.usuario_id = auth.uid()
        )
    );

CREATE POLICY "snapshots_delete" ON snapshots
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM activos
            WHERE activos.id = snapshots.activo_id
              AND activos.usuario_id = auth.uid()
        )
    );

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX idx_activos_usuario       ON activos(usuario_id);
CREATE INDEX idx_activos_estado        ON activos(estado);
CREATE INDEX idx_snapshots_activo_fecha ON snapshots(activo_id, fecha DESC);
CREATE INDEX idx_snapshots_fecha       ON snapshots(fecha DESC);
CREATE INDEX idx_tipos_cambio_fecha    ON tipos_cambio(fecha DESC);

-- ============================================================
-- SEED — activos reales (idempotente, usuario dinámico)
-- ============================================================

DO $$
DECLARE
    v_uid UUID;
BEGIN
    SELECT id INTO v_uid FROM auth.users LIMIT 1;

    IF v_uid IS NULL THEN
        RETURN;
    END IF;

    -- Consorcio: Cuenta vista Más
    INSERT INTO activos (usuario_id, clase, categoria, institucion, nombre_producto, moneda_base)
    SELECT v_uid, 'Caja', 'Caja y equivalentes', 'Consorcio', 'Cuenta vista Más', 'CLP'
    WHERE NOT EXISTS (
        SELECT 1 FROM activos
        WHERE usuario_id = v_uid AND institucion = 'Consorcio' AND nombre_producto = 'Cuenta vista Más'
    );

    -- Scotiabank: Cuenta corriente
    INSERT INTO activos (usuario_id, clase, categoria, institucion, nombre_producto, moneda_base)
    SELECT v_uid, 'Caja', 'Caja y equivalentes', 'Scotiabank', 'Cuenta corriente', 'CLP'
    WHERE NOT EXISTS (
        SELECT 1 FROM activos
        WHERE usuario_id = v_uid AND institucion = 'Scotiabank' AND nombre_producto = 'Cuenta corriente'
    );

    -- Betterplan: Independencia Rentas Inmobiliarias
    INSERT INTO activos (usuario_id, clase, categoria, institucion, nombre_producto, moneda_base, ticker)
    SELECT v_uid, 'Alternativo', 'Inversiones alternativas', 'Betterplan', 'Independencia Rentas Inmobiliarias', 'CLP', '107LIR'
    WHERE NOT EXISTS (
        SELECT 1 FROM activos
        WHERE usuario_id = v_uid AND institucion = 'Betterplan' AND nombre_producto = 'Independencia Rentas Inmobiliarias'
    );

    -- Betterplan: MBI Deuda Alternativa
    INSERT INTO activos (usuario_id, clase, categoria, institucion, nombre_producto, moneda_base, ticker)
    SELECT v_uid, 'Alternativo', 'Inversiones alternativas', 'Betterplan', 'MBI Deuda Alternativa', 'CLP', 'CFIMBIDA-A'
    WHERE NOT EXISTS (
        SELECT 1 FROM activos
        WHERE usuario_id = v_uid AND institucion = 'Betterplan' AND nombre_producto = 'MBI Deuda Alternativa'
    );

    -- Betterplan: Ameris Financiamiento Corto Plazo
    INSERT INTO activos (usuario_id, clase, categoria, institucion, nombre_producto, moneda_base, ticker)
    SELECT v_uid, 'Alternativo', 'Inversiones alternativas', 'Betterplan', 'Ameris Financiamiento Corto Plazo', 'CLP', 'CFIAMSLPA'
    WHERE NOT EXISTS (
        SELECT 1 FROM activos
        WHERE usuario_id = v_uid AND institucion = 'Betterplan' AND nombre_producto = 'Ameris Financiamiento Corto Plazo'
    );

    -- Betterplan: Caja en custodia
    INSERT INTO activos (usuario_id, clase, categoria, institucion, nombre_producto, moneda_base)
    SELECT v_uid, 'Caja', 'Caja en custodia', 'Betterplan', 'Caja en custodia', 'CLP'
    WHERE NOT EXISTS (
        SELECT 1 FROM activos
        WHERE usuario_id = v_uid AND institucion = 'Betterplan' AND nombre_producto = 'Caja en custodia'
    );

    -- Itaú: CFIETFCC
    INSERT INTO activos (usuario_id, clase, categoria, institucion, nombre_producto, moneda_base, ticker)
    SELECT v_uid, 'ETF', 'Inversiones financieras', 'Itaú', 'CFIETFCC', 'CLP', 'CFIETFCC'
    WHERE NOT EXISTS (
        SELECT 1 FROM activos
        WHERE usuario_id = v_uid AND institucion = 'Itaú' AND nombre_producto = 'CFIETFCC'
    );

    -- Itaú: CFIETFCD
    INSERT INTO activos (usuario_id, clase, categoria, institucion, nombre_producto, moneda_base, ticker)
    SELECT v_uid, 'ETF', 'Inversiones financieras', 'Itaú', 'CFIETFCD', 'CLP', 'CFIETFCD'
    WHERE NOT EXISTS (
        SELECT 1 FROM activos
        WHERE usuario_id = v_uid AND institucion = 'Itaú' AND nombre_producto = 'CFIETFCD'
    );

    -- Itaú: CFIETFGE
    INSERT INTO activos (usuario_id, clase, categoria, institucion, nombre_producto, moneda_base, ticker)
    SELECT v_uid, 'ETF', 'Inversiones financieras', 'Itaú', 'CFIETFGE', 'USD', 'CFIETFGE'
    WHERE NOT EXISTS (
        SELECT 1 FROM activos
        WHERE usuario_id = v_uid AND institucion = 'Itaú' AND nombre_producto = 'CFIETFGE'
    );

    -- Itaú: CFINASDAQ
    INSERT INTO activos (usuario_id, clase, categoria, institucion, nombre_producto, moneda_base, ticker)
    SELECT v_uid, 'ETF', 'Inversiones financieras', 'Itaú', 'CFINASDAQ', 'USD', 'CFINASDAQ'
    WHERE NOT EXISTS (
        SELECT 1 FROM activos
        WHERE usuario_id = v_uid AND institucion = 'Itaú' AND nombre_producto = 'CFINASDAQ'
    );

    -- Itaú: CHILE
    INSERT INTO activos (usuario_id, clase, categoria, institucion, nombre_producto, moneda_base, ticker)
    SELECT v_uid, 'Acción', 'Inversiones financieras', 'Itaú', 'CHILE', 'CLP', 'CHILE'
    WHERE NOT EXISTS (
        SELECT 1 FROM activos
        WHERE usuario_id = v_uid AND institucion = 'Itaú' AND nombre_producto = 'CHILE'
    );

    -- Itaú: ENELCHILE
    INSERT INTO activos (usuario_id, clase, categoria, institucion, nombre_producto, moneda_base, ticker)
    SELECT v_uid, 'Acción', 'Inversiones financieras', 'Itaú', 'ENELCHILE', 'CLP', 'ENELCHILE'
    WHERE NOT EXISTS (
        SELECT 1 FROM activos
        WHERE usuario_id = v_uid AND institucion = 'Itaú' AND nombre_producto = 'ENELCHILE'
    );

    -- Itaú: HABITAT
    INSERT INTO activos (usuario_id, clase, categoria, institucion, nombre_producto, moneda_base, ticker)
    SELECT v_uid, 'Acción', 'Inversiones financieras', 'Itaú', 'HABITAT', 'CLP', 'HABITAT'
    WHERE NOT EXISTS (
        SELECT 1 FROM activos
        WHERE usuario_id = v_uid AND institucion = 'Itaú' AND nombre_producto = 'HABITAT'
    );

    -- Itaú: ANDINA-B
    INSERT INTO activos (usuario_id, clase, categoria, institucion, nombre_producto, moneda_base, ticker)
    SELECT v_uid, 'Acción', 'Inversiones financieras', 'Itaú', 'ANDINA-B', 'CLP', 'ANDINA-B'
    WHERE NOT EXISTS (
        SELECT 1 FROM activos
        WHERE usuario_id = v_uid AND institucion = 'Itaú' AND nombre_producto = 'ANDINA-B'
    );

    -- Itaú: BCI
    INSERT INTO activos (usuario_id, clase, categoria, institucion, nombre_producto, moneda_base, ticker)
    SELECT v_uid, 'Acción', 'Inversiones financieras', 'Itaú', 'BCI', 'CLP', 'BCI'
    WHERE NOT EXISTS (
        SELECT 1 FROM activos
        WHERE usuario_id = v_uid AND institucion = 'Itaú' AND nombre_producto = 'BCI'
    );

    -- Itaú: Fondo de liquidez
    INSERT INTO activos (usuario_id, clase, categoria, institucion, nombre_producto, moneda_base)
    SELECT v_uid, 'Fondo mutuo', 'Inversiones financieras', 'Itaú', 'Fondo de liquidez', 'CLP'
    WHERE NOT EXISTS (
        SELECT 1 FROM activos
        WHERE usuario_id = v_uid AND institucion = 'Itaú' AND nombre_producto = 'Fondo de liquidez'
    );

    -- BCI: Fondo mutuo BCI Competitivo
    INSERT INTO activos (usuario_id, clase, categoria, institucion, nombre_producto, moneda_base)
    SELECT v_uid, 'Fondo mutuo', 'Inversiones financieras', 'BCI', 'Fondo mutuo BCI Competitivo', 'CLP'
    WHERE NOT EXISTS (
        SELECT 1 FROM activos
        WHERE usuario_id = v_uid AND institucion = 'BCI' AND nombre_producto = 'Fondo mutuo BCI Competitivo'
    );

    -- BCI: Cuenta corriente
    INSERT INTO activos (usuario_id, clase, categoria, institucion, nombre_producto, moneda_base)
    SELECT v_uid, 'Caja', 'Caja y equivalentes', 'BCI', 'Cuenta corriente', 'CLP'
    WHERE NOT EXISTS (
        SELECT 1 FROM activos
        WHERE usuario_id = v_uid AND institucion = 'BCI' AND nombre_producto = 'Cuenta corriente'
    );

    -- Soyfocus: APV arriesgado
    INSERT INTO activos (usuario_id, clase, categoria, institucion, nombre_producto, moneda_base)
    SELECT v_uid, 'Previsional', 'Ahorro previsional no corriente', 'Soyfocus', 'APV arriesgado', 'CLP'
    WHERE NOT EXISTS (
        SELECT 1 FROM activos
        WHERE usuario_id = v_uid AND institucion = 'Soyfocus' AND nombre_producto = 'APV arriesgado'
    );

    -- AFP Habitat: Ahorro previsional obligatorio
    INSERT INTO activos (usuario_id, clase, categoria, institucion, nombre_producto, moneda_base)
    SELECT v_uid, 'Previsional', 'Ahorro previsional no corriente', 'AFP Habitat', 'Ahorro previsional obligatorio', 'CLP'
    WHERE NOT EXISTS (
        SELECT 1 FROM activos
        WHERE usuario_id = v_uid AND institucion = 'AFP Habitat' AND nombre_producto = 'Ahorro previsional obligatorio'
    );

END $$;
