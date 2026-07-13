-- =============================================================================
-- PROYECTO: KICKOFF CLUB 2026
-- CONFIGURACIÓN INICIAL, EXTENSIONES Y SEGURIDAD
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Limpieza de la estructura existente para recreación limpia
DROP TABLE IF EXISTS predictions CASCADE;
DROP TABLE IF EXISTS group_participants CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS match_status CASCADE;

-- =============================================================================
-- ENUMS (DOMINIOS DE DATOS CONTROLADOS)
-- =============================================================================

CREATE TYPE user_role AS ENUM ('USER', 'ADMIN');
CREATE TYPE match_status AS ENUM ('PENDING', 'ONGOING', 'FINISHED');

-- =============================================================================
-- TABLAS PRINCIPALES
-- =============================================================================

-- 1. Usuarios (Esquema de Identidad Avanzado)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) NOT NULL UNIQUE,          -- Identificador único legible para la comunidad
    email VARCHAR(150) NOT NULL UNIQUE,             -- Correo electrónico para autenticación y recuperación
    password_hash VARCHAR(255) NOT NULL,            -- Hash robusto de la contraseña
    name VARCHAR(50) NOT NULL,                      -- Primer Nombre
    middle_name VARCHAR(50) DEFAULT NULL,           -- Segundo Nombre (Opcional)
    last_name VARCHAR(50) NOT NULL,                 -- Apellido Paterno
    mother_last_name VARCHAR(50) DEFAULT NULL,      -- Apellido Materno (Opcional, adaptativo)
    role user_role NOT NULL DEFAULT 'USER',         -- Rol en el ecosistema
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- 2. Grupos Privados
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    invite_code VARCHAR(10) NOT NULL UNIQUE,
    creator_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    CONSTRAINT fk_groups_creator FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- 3. Participantes de Grupos (Relación M:N)
CREATE TABLE group_participants (
    group_id UUID NOT NULL,
    user_id UUID NOT NULL,
    accumulated_points INT NOT NULL DEFAULT 0,
    previous_position INT DEFAULT NULL,
    rank_delta INT NOT NULL DEFAULT 0,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    PRIMARY KEY (group_id, user_id),
    CONSTRAINT fk_participants_group FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    CONSTRAINT fk_participants_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Partidos
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_api_id VARCHAR(50) UNIQUE,             -- ID de sincronización con thesportsdb.com
    home_team VARCHAR(100) NOT NULL,
    away_team VARCHAR(100) NOT NULL,
    date_time TIMESTAMP WITH TIME ZONE NOT NULL,
    phase VARCHAR(50) NOT NULL,
    status match_status NOT NULL DEFAULT 'PENDING',
    home_score INT DEFAULT NULL,
    away_score INT DEFAULT NULL,
    stadium VARCHAR(150) NOT NULL,
    city VARCHAR(100) NOT NULL,
    home_team_badge VARCHAR(255) DEFAULT NULL,
    away_team_badge VARCHAR(255) DEFAULT NULL,
    stadium_image VARCHAR(255) DEFAULT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- 5. Pronósticos (Predictions)
CREATE TABLE predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    match_id UUID NOT NULL,
    predicted_home INT NOT NULL,
    predicted_away INT NOT NULL,
    points_earned INT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    CONSTRAINT fk_predictions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_predictions_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    CONSTRAINT uq_user_match UNIQUE (user_id, match_id)
);

-- =============================================================================
-- ÍNDICES OPTIMIZADOS PARA RENDIMIENTO DE CONSULTAS (DBA TUNING)
-- =============================================================================

-- Optimización de Login (Búsqueda insensible a mayúsculas/minúsculas)
CREATE INDEX idx_users_email_lower ON users (LOWER(email));
CREATE INDEX idx_users_username_lower ON users (LOWER(username));

-- Búsquedas biográficas / Clasificaciones por apellido
CREATE INDEX idx_users_last_name ON users (last_name);

-- Acceso rápido para unirse a grupos vía código
CREATE INDEX idx_groups_invite_code ON groups (invite_code);

-- Tabla de posiciones en tiempo real orden descendente
CREATE INDEX idx_group_participants_leaderboard ON group_participants (group_id, accumulated_points DESC);

-- Consultas de calendario y validación de bloqueos de tiempo en API
CREATE INDEX idx_matches_date_status ON matches (date_time, status);

-- Índices de llaves foráneas para acelerar los Joins del Dashboard
CREATE INDEX idx_predictions_user ON predictions (user_id);
CREATE INDEX idx_predictions_match ON predictions (match_id);

-- =============================================================================
-- PROCEDIMIENTOS ALMACENADOS Y TRIGGERS (BLINDAJE DE NEGOCIO)
-- =============================================================================

--------------------------------------------------------------------------------
-- REGLA 1: TIME-LOCK TRIGGER (Protección de datos ante fraude de apuestas)
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_check_prediction_time_lock()
RETURNS TRIGGER AS $$
DECLARE
    v_match_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Validación de soft delete
    IF EXISTS (
        SELECT 1 FROM matches 
        WHERE id = NEW.match_id AND deleted_at IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'No se pueden realizar pronósticos para partidos eliminados.' USING ERRCODE = 'P0001';
    END IF;

    SELECT date_time INTO v_match_time FROM matches WHERE id = NEW.match_id;
    
    IF v_match_time IS NULL THEN
        RAISE EXCEPTION 'Error de Integridad: El partido especificado no existe.' USING ERRCODE = 'P0002';
    END IF;

    -- Si la hora actual es mayor o igual a la hora del partido, se bloquea la transacción
    -- pero solo si se intenta crear un pronóstico o si se intentan modificar los marcadores pronosticados.
    IF TG_OP = 'INSERT' THEN
        IF NOW() >= v_match_time THEN
            RAISE EXCEPTION 'Restricción de Seguridad: No se permiten inserciones o modificaciones después de iniciado el partido.' USING ERRCODE = '45000';
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NOW() >= v_match_time AND (
            NEW.predicted_home IS DISTINCT FROM OLD.predicted_home OR
            NEW.predicted_away IS DISTINCT FROM OLD.predicted_away OR
            NEW.user_id IS DISTINCT FROM OLD.user_id OR
            NEW.match_id IS DISTINCT FROM OLD.match_id
        ) THEN
            RAISE EXCEPTION 'Restricción de Seguridad: No se permiten inserciones o modificaciones después de iniciado el partido.' USING ERRCODE = '45000';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_predictions_time_lock
BEFORE INSERT OR UPDATE ON predictions
FOR EACH ROW
EXECUTE FUNCTION fn_check_prediction_time_lock();

--------------------------------------------------------------------------------
-- REGLA 2: PROCESAMIENTO AUTOMÁTICO DE PUNTOS
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_process_match_results_and_points()
RETURNS TRIGGER AS $$
BEGIN
    -- Se activa únicamente si el estado cambia estrictamente a 'FINISHED'
    IF NEW.status = 'FINISHED' AND (OLD.status IS DISTINCT FROM 'FINISHED') THEN
        
        -- A) Evaluación de pronósticos y asignación de puntuación
        UPDATE predictions
        SET points_earned = CASE
            -- Exacto: Gana 3 puntos
            WHEN predicted_home = NEW.home_score AND predicted_away = NEW.away_score THEN 3
            -- Acierto de Ganador Local: 1 punto
            WHEN (NEW.home_score > NEW.away_score AND predicted_home > predicted_away) THEN 1
            -- Acierto de Ganador Visitante: 1 punto
            WHEN (NEW.home_score < NEW.away_score AND predicted_home < predicted_away) THEN 1
            -- Acierto de Empate: 1 punto
            WHEN (NEW.home_score = NEW.away_score AND predicted_home = predicted_away) THEN 1
            -- Falla absoluta: 0 puntos
            ELSE 0
        END,
        updated_at = CURRENT_TIMESTAMP
        WHERE match_id = NEW.id;

        -- B) Guardar posiciones previas antes de actualizar los puntos
        WITH current_ranks AS (
            SELECT 
                group_id, 
                user_id,
                ROW_NUMBER() OVER (PARTITION BY group_id ORDER BY accumulated_points DESC, joined_at ASC) as pos
            FROM group_participants
            WHERE group_id IN (
                SELECT DISTINCT group_id 
                FROM group_participants 
                WHERE user_id IN (SELECT user_id FROM predictions WHERE match_id = NEW.id)
            )
        )
        UPDATE group_participants gp
        SET previous_position = cr.pos
        FROM current_ranks cr
        WHERE gp.group_id = cr.group_id AND gp.user_id = cr.user_id;

        -- C) Recálculo masivo y actualización de la tabla intermedia de posiciones
        UPDATE group_participants gp
        SET accumulated_points = (
            SELECT COALESCE(SUM(p.points_earned), 0)
            FROM predictions p
            WHERE p.user_id = gp.user_id
        )
        WHERE gp.user_id IN (
            SELECT user_id FROM predictions WHERE match_id = NEW.id
        );

        -- D) Calcular nuevas posiciones y actualizar el rank_delta
        WITH new_ranks AS (
            SELECT 
                group_id, 
                user_id,
                ROW_NUMBER() OVER (PARTITION BY group_id ORDER BY accumulated_points DESC, joined_at ASC) as pos
            FROM group_participants
            WHERE group_id IN (
                SELECT DISTINCT group_id 
                FROM group_participants 
                WHERE user_id IN (SELECT user_id FROM predictions WHERE match_id = NEW.id)
            )
        )
        UPDATE group_participants gp
        SET rank_delta = COALESCE(gp.previous_position, nr.pos) - nr.pos
        FROM new_ranks nr
        WHERE gp.group_id = nr.group_id AND gp.user_id = nr.user_id;

    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_matches_calculate_points
AFTER UPDATE ON matches
FOR EACH ROW
EXECUTE FUNCTION fn_process_match_results_and_points();
