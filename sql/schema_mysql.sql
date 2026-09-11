-- ============================================================
-- BANCO DE DADOS MYSQL / MARIADB PARA CPANEL - VAIVISTORIAR
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. TABELA DE USUÁRIOS E AUTENTICAÇÃO
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('ADMIN', 'BROKER', 'PJ') DEFAULT 'BROKER',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. TABELA DE PLANOS
CREATE TABLE IF NOT EXISTS plans (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    billing_cycle ENUM('Mensal', 'Anual') DEFAULT 'Mensal',
    status ENUM('Ativo', 'Inativo') DEFAULT 'Ativo',
    features JSON,
    max_inspections INT DEFAULT 10,
    max_photos INT DEFAULT 50,
    max_rooms INT DEFAULT 20,
    max_brokers INT DEFAULT 1,
    storage_gb DECIMAL(10,2) DEFAULT 1.0,
    subscribers INT DEFAULT 0,
    type ENUM('PF', 'PJ') DEFAULT 'PF',
    badge_text VARCHAR(100),
    duration_days INT DEFAULT 30,
    comparison_price DECIMAL(10,2),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 3. TABELA DE PERFIS DE CORRETORES / EMPRESAS
CREATE TABLE IF NOT EXISTS broker_profiles (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role ENUM('ADMIN', 'BROKER', 'PJ') DEFAULT 'BROKER',
    status ENUM('Ativo', 'Inativo', 'Pendente', 'Bloqueado') DEFAULT 'Ativo',
    phone VARCHAR(50),
    cpf_cnpj VARCHAR(50),
    creci VARCHAR(50),
    company_name VARCHAR(255),
    avatar_url TEXT,
    logo_url TEXT,
    subscription_plan_id VARCHAR(36),
    subscription_expires_at DATETIME,
    parent_pj_id VARCHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subscription_plan_id) REFERENCES plans(id) ON DELETE SET NULL
);

-- 4. TABELA DE CLIENTES
CREATE TABLE IF NOT EXISTS clients (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    cpf VARCHAR(50),
    address TEXT,
    type ENUM('Proprietário', 'Inquilino', 'Comprador', 'Outro') DEFAULT 'Inquilino',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. TABELA DE IMÓVEIS
CREATE TABLE IF NOT EXISTS properties (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    owner VARCHAR(255),
    type ENUM('Apartamento', 'Casa', 'Comercial') DEFAULT 'Apartamento',
    image TEXT,
    last_inspection DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 6. TABELA DE VISTORIAS
CREATE TABLE IF NOT EXISTS inspections (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    property VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    client VARCHAR(255),
    type ENUM('Entrada', 'Saída') DEFAULT 'Entrada',
    date DATE,
    status ENUM('Concluída', 'Pendente', 'Em andamento', 'Rascunho', 'Agendada', 'Finalizada', 'Cancelada', 'Enviada', 'Editando', 'Enviado por e-mail') DEFAULT 'Rascunho',
    image TEXT,
    pdf_url TEXT,
    email_sent_at DATETIME,
    whatsapp_sent_at DATETIME,
    data_json LONGTEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 7. TABELA DE CONFIGURAÇÕES DO SISTEMA (CHAVE / VALOR)
CREATE TABLE IF NOT EXISTS system_configs (
    `key` VARCHAR(255) PRIMARY KEY,
    `value` LONGTEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 8. TABELA DE AVALIAÇÕES / REVIEWS
CREATE TABLE IF NOT EXISTS system_reviews (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_approved TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 9. TABELA DE CONSENTIMENTO DE COOKIES
CREATE TABLE IF NOT EXISTS cookie_consents (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),
    ip_address VARCHAR(100),
    accepted_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- DADOS INICIAIS (PLANOS PADRÃO)
-- ============================================================

INSERT INTO plans (id, name, slug, price, billing_cycle, status, max_inspections, max_photos, max_rooms, max_brokers, storage_gb, subscribers, type, badge_text, duration_days)
VALUES 
('fd4c420f-09b2-40a7-b43f-972e21378368', 'CORRETOR START', 'corretor-start', 29.90, 'Mensal', 'Ativo', 15, 60, 20, 1, 5.0, 0, 'PF', 'Mais Popular', 30),
('5c09eeb7-100f-4f84-aaa7-9bcc5df05306', 'IMOBILIÁRIA START', 'imobiliaria-start', 149.90, 'Mensal', 'Ativo', 100, 200, 50, 5, 50.0, 0, 'PJ', 'Empresarial', 30)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- USUÁRIO E PROFILE DE ADMIN PADRÃO (Senha inicial: admin123)
-- Hash bcrypt de 'admin123': $2a$10$wT5HvhfK5i792M4Q40vM8eDpxkLKgJk8t6Oa1RjC6oGgXvXv7
INSERT INTO users (id, email, password_hash, role)
VALUES ('00000000-0000-0000-0000-000000000001', 'admin@vaivistoriar.com.br', '$2a$10$7rX.XvU11bM2XvHk8/JqHe/p4n1.r4lV.r.8V79s0R1c6s0q1.q1S', 'ADMIN')
ON DUPLICATE KEY UPDATE email=VALUES(email);

INSERT INTO broker_profiles (id, user_id, email, full_name, role, status, subscription_plan_id)
VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'admin@vaivistoriar.com.br', 'Administrador', 'ADMIN', 'Ativo', '5c09eeb7-100f-4f84-aaa7-9bcc5df05306')
ON DUPLICATE KEY UPDATE email=VALUES(email);
