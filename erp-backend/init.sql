-- 步骤 1: (如果存在) 删除旧的数据库
DROP DATABASE IF EXISTS gnucash_db;

-- 步骤 2: 创建新的数据库
CREATE DATABASE gnucash_db;
USE gnucash_db;

-- 步骤 3: 运行完整的建表脚本

CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user' NOT NULL
);

CREATE TABLE customers (
    guid CHAR(32) PRIMARY KEY NOT NULL,
    -- (已移除) ar_account_guid CHAR(32),
    name TEXT NOT NULL,
    id TEXT NOT NULL,
    notes TEXT NOT NULL,
    active INT NOT NULL,
    discount_num BIGINT NOT NULL,
    discount_denom BIGINT NOT NULL,
    credit_num BIGINT NOT NULL,
    credit_denom BIGINT NOT NULL,
    -- (已移除) currency CHAR(32) NOT NULL,
    tax_override INT NOT NULL,
    addr_name TEXT,
    addr_addr1 TEXT,
    addr_addr2 TEXT,
    addr_addr3 TEXT,
    addr_addr4 TEXT,
    addr_phone varchar(128),
    addr_fax varchar(128),
    addr_email TEXT,
    shipaddr_name TEXT,
    shipaddr_addr1 TEXT,
    shipaddr_addr2 TEXT,
    shipaddr_addr3 TEXT,
    shipaddr_addr4 TEXT,
    shipaddr_phone varchar(128),
    shipaddr_fax varchar(128),
    shipaddr_email TEXT,
    terms CHAR(32),
    tax_included INT,
    taxtable CHAR(32)
);

CREATE TABLE vendors (
    guid CHAR(32) PRIMARY KEY NOT NULL,
    -- (已移除) ap_account_guid CHAR(32),
    name TEXT NOT NULL,
    id TEXT NOT NULL,
    notes TEXT NOT NULL,
    -- (已移除) currency CHAR(32) NOT NULL,
    active INT NOT NULL,
    tax_override INT NOT NULL,
    addr_name TEXT,
    addr_addr1 TEXT,
    addr_addr2 TEXT,
    addr_addr3 TEXT,
    addr_addr4 TEXT,
    addr_phone varchar(128),
    addr_fax varchar(128),
    addr_email TEXT,
    terms CHAR(32),
    tax_inc TEXT,
    tax_table CHAR(32)
);

CREATE TABLE gnclock (
    Hostname varchar(255),
    PID INT
);

CREATE TABLE versions (
    table_name varchar(50) NOT NULL,
    table_version INT NOT NULL
);

CREATE TABLE books (
    guid CHAR(32) PRIMARY KEY NOT NULL,
    root_account_guid CHAR(32) NOT NULL,
    root_template_guid CHAR(32) NOT NULL
);

CREATE TABLE commodities (
    guid CHAR(32) PRIMARY KEY NOT NULL,
    namespace TEXT NOT NULL,
    mnemonic TEXT NOT NULL,
    fullname TEXT,
    cusip TEXT,
    fraction INT NOT NULL,
    quote_flag INT NOT NULL,
    quote_source TEXT,
    quote_tz TEXT
);

CREATE TABLE prices (
    guid CHAR(32) PRIMARY KEY NOT NULL,
    commodity_guid CHAR(32) NOT NULL,
    currency_guid CHAR(32) NOT NULL,
    date DATETIME NOT NULL,
    source TEXT,
    type TEXT,
    value_num BIGINT NOT NULL,
    value_denom BIGINT NOT NULL
);

CREATE TABLE accounts (
    guid CHAR(32) PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    account_type TEXT NOT NULL,
    commodity_guid CHAR(32) NOT NULL,
    commodity_scu INT NOT NULL,
    non_std_scu INT NOT NULL,
    parent_guid CHAR(32),
    code TEXT,
    description TEXT,
    hidden INT NOT NULL,
    placeholder INT NOT NULL
);

CREATE TABLE slots (
    id INT PRIMARY KEY AUTO_INCREMENT NOT NULL,
    obj_guid CHAR(32) NOT NULL,
    name TEXT NOT NULL,
    slot_type INT NOT NULL,
    int64_val BIGINT,
    string_val TEXT,
    double_val DOUBLE,
    timespec_val CHAR(14),
    guid_val CHAR(32),
    numeric_val_num BIGINT,
    numeric_val_denom BIGINT,
    gdate_val DATE
);

CREATE TABLE transactions (
    guid CHAR(32) PRIMARY KEY NOT NULL,
    currency_guid CHAR(32) NOT NULL,
    num TEXT NOT NULL,
    post_date DATETIME NOT NULL,
    enter_date DATETIME NOT NULL,
    description TEXT
);

CREATE TABLE splits (
    guid CHAR(32) PRIMARY KEY NOT NULL,
    tx_guid CHAR(32) NOT NULL,
    account_guid CHAR(32) NOT NULL,
    memo TEXT NOT NULL,
    action TEXT NOT NULL,
    reconcile_state CHAR(1) NOT NULL,
    reconcile_date DATETIME,
    value_num BIGINT NOT NULL,
    value_denom BIGINT NOT NULL,
    quantity_num BIGINT NOT NULL,
    quantity_denom BIGINT NOT NULL,
    lot_guid CHAR(32)
);

CREATE TABLE lots (
    guid CHAR(32) PRIMARY KEY NOT NULL,
    account_guid CHAR(32),
    is_closed INT NOT NULL
);

CREATE TABLE budgets (
    guid CHAR(32) PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    num_periods INT NOT NULL
);

CREATE TABLE budget_amounts (
    id INT PRIMARY KEY AUTO_INCREMENT NOT NULL,
    budget_guid CHAR(32) NOT NULL,
    account_guid CHAR(32) NOT NULL,
    period_num INT NOT NULL,
    amount_num BIGINT NOT NULL,
    amount_denom BIGINT NOT NULL
);

CREATE TABLE recurrences (
    obj_guid CHAR(32) NOT NULL,
    recurrence_mult INT NOT NULL,
    recurrence_period_type TEXT NOT NULL,
    recurrence_period_start CHAR(8) NOT NULL
);

CREATE TABLE schedxactions (
    guid CHAR(32) PRIMARY KEY NOT NULL,
    name TEXT,
    enabled INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    last_occur DATE,
    num_occur INT NOT NULL,
    rem_occur INT NOT NULL,
    auto_create INT NOT NULL,
    auto_notify INT NOT NULL,
    adv_creation INT NOT NULL,
    adv_notify INT NOT NULL,
    instance_count INT NOT NULL,
    template_act_guid CHAR(32) NOT NULL
);

CREATE TABLE entries (
    guid CHAR(32) PRIMARY KEY NOT NULL,
    date CHAR(14) NOT NULL,
    date_entered CHAR(14),
    description TEXT,
    action TEXT,
    notes TEXT,
    quantity_num BIGINT,
    quantity_denom BIGINT,
    i_acct CHAR(32),
    i_price_num BIGINT,
    i_price_denom BIGINT,
    i_discount_num BIGINT,
    i_discount_denom BIGINT,
    invoice CHAR(32),
    i_disc_type TEXT,
    i_disc_how TEXT,
    i_taxable INT,
    i_taxincluded INT,
    i_taxtable CHAR(32),
    b_acct CHAR(32),
    b_price_num BIGINT,
    b_price_denom BIGINT,
    bill CHAR(32),
    b_taxable INT,
    b_taxincluded INT,
    b_taxtable CHAR(32),
    b_paytype INT,
    billable INT,
    billto_type INT,
    billto_guid CHAR(32),
    order_guid CHAR(32)
);

CREATE TABLE employees (
    guid CHAR(32) PRIMARY KEY NOT NULL,
    username TEXT NOT NULL,
    id TEXT NOT NULL,
    language TEXT NOT NULL,
    acl TEXT NOT NULL,
    active INT NOT NULL,
    currency CHAR(32) NOT NULL,
    ccard_guid CHAR(32),
    workday_num BIGINT NOT NULL,
    workday_denom BIGINT NOT NULL,
    rate_num BIGINT NOT NULL,
    rate_denom BIGINT NOT NULL,
    addr_name TEXT,
    addr_addr1 TEXT,
    addr_addr2 TEXT,
    addr_addr3 TEXT,
    addr_addr4 TEXT,
    addr_phone varchar(128),
    addr_fax varchar(128),
    addr_email TEXT
);

CREATE TABLE orders (
    guid CHAR(32) PRIMARY KEY NOT NULL,
    id TEXT NOT NULL,
    notes TEXT NOT NULL,
    reference TEXT NOT NULL,
    active INT NOT NULL,
    date_opened CHAR(14) NOT NULL,
    date_closed CHAR(14) NOT NULL,
    owner_type INT NOT NULL,
    owner_guid CHAR(32) NOT NULL
);

CREATE TABLE jobs (
    guid CHAR(32) PRIMARY KEY NOT NULL,
    id TEXT NOT NULL,
    name TEXT NOT NULL,
    reference TEXT NOT NULL,
    active INT NOT NULL,
    owner_type INT,
    owner_guid CHAR(32)
);

CREATE TABLE invoices (
    guid CHAR(32) PRIMARY KEY NOT NULL,
    id TEXT NOT NULL,
    date_opened DATETIME,
    date_posted DATETIME,
    notes TEXT NOT NULL,
    active INT NOT NULL,
    currency CHAR(32) NOT NULL,
    owner_type INT,
    owner_guid CHAR(32),
    terms CHAR(32),
    billing_id TEXT,
    post_txn CHAR(32),
    post_lot CHAR(32),
    post_acc CHAR(32),
    billto_type INT,
    billto_guid CHAR(32),
    charge_amt_num BIGINT,
    charge_amt_denom BIGINT
);

CREATE TABLE billterms (
    guid CHAR(32) PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    refcount INT NOT NULL,
    invisible INT NOT NULL,
    parent CHAR(32),
    type TEXT NOT NULL,
    duedays INT,
    discountdays INT,
    discount_num BIGINT,
    discount_denom BIGINT,
    cutoff INT
);

CREATE TABLE taxtables (
    guid CHAR(32) PRIMARY KEY NOT NULL,
    name varchar(50) NOT NULL,
    refcount BIGINT NOT NULL,
    invisible INT NOT NULL,
    parent CHAR(32)
);

CREATE TABLE taxtable_entries (
    id INT PRIMARY KEY AUTO_INCREMENT NOT NULL,
    taxtable CHAR(32) NOT NULL,
    account CHAR(32) NOT NULL,
    amount_num BIGINT NOT NULL,
    amount_denom BIGINT NOT NULL,
    type INT NOT NULL
);

-- ----------------------------
-- 步骤 4: 插入基础数据 (货币和科目)
-- ----------------------------

-- 货币 (Currencies) 和 商品 (Commodities)
INSERT INTO commodities (guid, namespace, mnemonic, fullname, cusip, fraction, quote_flag, quote_source, quote_tz)
VALUES
    ('ade56487e45e41219b5810c14b76c11d', 'CURRENCY', 'USD', 'US Dollar', NULL, 100, 1, NULL, NULL),
    ('f4b3e81a3d3e4ed8b46a7c06f8c4c7b8', 'CURRENCY', 'CNY', 'Chinese Yuan', NULL, 100, 1, NULL, NULL),
    ('8e7f1a8f9d6f4c8e9b6c1e5d7f6a5b4c', 'CURRENCY', 'EUR', 'Euro', NULL, 100, 1, NULL, NULL),
    ('9a8f7c6e5d4b3c2a1b9e8f7a6b5c4d3e', 'CURRENCY', 'JPY', 'Japanese Yen', NULL, 1, 1, NULL, NULL), 
    
    ('f0000000000000000000000000000001', 'TEMPLATE', 'WIDGET-001', 'Standard Widget', NULL, 100, 0, NULL, NULL),
    ('f0000000000000000000000000000002', 'TEMPLATE', 'GADGET-002', 'Premium Gadget', NULL, 100, 0, NULL, NULL);

-- 会计科目表 (Accounts)
INSERT INTO accounts (guid, name, account_type, commodity_guid, commodity_scu, non_std_scu, parent_guid, code, description, hidden, placeholder)
VALUES
    -- 顶层占位符
    ('a0000000000000000000000000000001', 'Assets', 'ASSET', 'ade56487e45e41219b5810c14b76c11d', 100, 0, NULL, '1', 'Root Asset Account', 0, 1),
    ('a0000000000000000000000000000002', 'Liabilities', 'LIABILITY', 'ade56487e45e41219b5810c14b76c11d', 100, 0, NULL, '2', 'Root Liability Account', 0, 1),
    ('a0000000000000000000000000000003', 'Income', 'INCOME', 'ade56487e45e41219b5810c14b76c11d', 100, 0, NULL, '4', 'Root Income Account', 0, 1),
    ('a0000000000000000000000000000004', 'Expenses', 'EXPENSE', 'ade56487e45e41219b5810c14b76c11d', 100, 0, NULL, '5', 'Root Expense Account', 0, 1),

    -- 子级占位符 (用于 A/R 和 A/P)
    ('a0000000000000000000000000000005', 'Accounts Receivable', 'ASSET', 'ade56487e45e41219b5810c14b76c11d', 100, 0, 'a0000000000000000000000000000001', '1200', 'Parent account for all customer A/R', 0, 1),
    ('a0000000000000000000000000000006', 'Accounts Payable', 'LIABILITY', 'ade56487e45e41219b5810c14b76c11d', 100, 0, 'a0000000000000000000000000000002', '2000', 'Parent account for all vendor A/P', 0, 1),
    
    -- (修改) 库存总占位符 (现在有多个)
    ('a0000000000000000000000000000007', 'Inventory (USD)', 'ASSET', 'ade56487e45e41219b5810c14b76c11d', 100, 0, 'a0000000000000000000000000000001', '1300', 'Parent account for all USD stock assets', 0, 1),
    ('a0000000000000000000000000000023', 'Inventory (CNY)', 'ASSET', 'f4b3e81a3d3e4ed8b46a7c06f8c4c7b8', 100, 0, 'a0000000000000000000000000000001', '1301', 'Parent account for all CNY stock assets', 0, 1),

    -- 可用的子账户 (Placeholder = 0)
    ('b0000000000000000000000000000001', 'Checking Account (USD)', 'ASSET', 'ade56487e45e41219b5810c14b76c11d', 100, 0, 'a0000000000000000000000000000001', '1010', NULL, 0, 0),
    ('b0000000000000000000000000000002', 'Checking Account (CNY)', 'ASSET', 'f4b3e81a3d3e4ed8b46a7c06f8c4c7b8', 100, 0, 'a0000000000000000000000000000001', '1011', NULL, 0, 0),
    ('b0000000000000000000000000000003', 'Checking Account (EUR)', 'ASSET', '8e7f1a8f9d6f4c8e9b6c1e5d7f6a5b4c', 100, 0, 'a0000000000000000000000000000001', '1012', NULL, 0, 0),
    ('b0000000000000000000000000000004', 'Checking Account (JPY)', 'ASSET', '9a8f7c6e5d4b3c2a1b9e8f7a6b5c4d3e', 1, 0, 'a0000000000000000000000000000001', '1013', NULL, 0, 0),

    ('b0000000000000000000000000000005', 'Product Sales (USD)', 'INCOME', 'ade56487e45e41219b5810c14b76c11d', 100, 0, 'a0000000000000000000000000000003', '4010', NULL, 0, 0),
    ('b0000000000000000000000000000012', 'Product Sales (CNY)', 'INCOME', 'f4b3e81a3d3e4ed8b46a7c06f8c4c7b8', 100, 0, 'a0000000000000000000000000000003', '4011', NULL, 0, 0),
    ('b0000000000000000000000000000014', 'Product Sales (EUR)', 'INCOME', '8e7f1a8f9d6f4c8e9b6c1e5d7f6a5b4c', 100, 0, 'a0000000000000000000000000000003', '4012', NULL, 0, 0),
    ('b0000000000000000000000000000015', 'Product Sales (JPY)', 'INCOME', '9a8f7c6e5d4b3c2a1b9e8f7a6b5c4d3e', 1, 0, 'a0000000000000000000000000000003', '4013', NULL, 0, 0),

    ('b0000000000000000000000000000006', 'Office Supplies (USD)', 'EXPENSE', 'ade56487e45e41219b5810c14b76c11d', 100, 0, 'a0000000000000000000000000000004', '5010', NULL, 0, 0),
    ('b0000000000000000000000000000011', 'Office Supplies (CNY)', 'EXPENSE', 'f4b3e81a3d3e4ed8b46a7c06f8c4c7b8', 100, 0, 'a0000000000000000000000000000004', '5011', NULL, 0, 0),
    ('b0000000000000000000000000000016', 'Office Supplies (EUR)', 'EXPENSE', '8e7f1a8f9d6f4c8e9b6c1e5d7f6a5b4c', 100, 0, 'a0000000000000000000000000000004', '5012', NULL, 0, 0),
    ('b0000000000000000000000000000017', 'Office Supplies (JPY)', 'EXPENSE', '9a8f7c6e5d4b3c2a1b9e8f7a6b5c4d3e', 1, 0, 'a0000000000000000000000000000004', '5013', NULL, 0, 0),

    ('b0000000000000000000000000000007', 'Cost of Goods Sold (USD)', 'EXPENSE', 'ade56487e45e41219b5810c14b76c11d', 100, 0, 'a0000000000000000000000000000004', '5020', NULL, 0, 0),
    ('b0000000000000000000000000000022', 'Cost of Goods Sold (CNY)', 'EXPENSE', 'f4b3e81a3d3e4ed8b46a7c06f8c4c7b8', 100, 0, 'a0000000000000000000000000000004', '5021', NULL, 0, 0),
    ('b0000000000000000000000000000018', 'Cost of Goods Sold (EUR)', 'EXPENSE', '8e7f1a8f9d6f4c8e9b6c1e5d7f6a5b4c', 100, 0, 'a0000000000000000000000000000004', '5022', NULL, 0, 0),
    ('b0000000000000000000000000000019', 'Cost of Goods Sold (JPY)', 'EXPENSE', '9a8f7c6e5d4b3c2a1b9e8f7a6b5c4d3e', 1, 0, 'a0000000000000000000000000000004', '5023', NULL, 0, 0),

    ('b0000000000000000000000000000009', 'Inventory Adjustment (USD)', 'EXPENSE', 'ade56487e45e41219b5810c14b76c11d', 100, 0, 'a0000000000000000000000000000004', '5030', 'Account for inventory write-downs (USD)', 0, 0),
    ('b0000000000000000000000000000010', 'Inventory Adjustment (CNY)', 'EXPENSE', 'f4b3e81a3d3e4ed8b46a7c06f8c4c7b8', 100, 0, 'a0000000000000000000000000000004', '5031', 'Account for inventory write-downs (CNY)', 0, 0),
    ('b0000000000000000000000000000020', 'Inventory Adjustment (EUR)', 'EXPENSE', '8e7f1a8f9d6f4c8e9b6c1e5d7f6a5b4c', 100, 0, 'a0000000000000000000000000000004', '5032', 'Account for inventory write-downs (EUR)', 0, 0),
    ('b0000000000000000000000000000021', 'Inventory Adjustment (JPY)', 'EXPENSE', '9a8f7c6e5d4b3c2a1b9e8f7a6b5c4d3e', 1, 0, 'a0000000000000000000000000000004', '5033', 'Account for inventory write-downs (JPY)', 0, 0),
    
    -- (修改) 库存资产 (Stock Asset) 科目
    ('b0000000000000000000000000000008', 'Inventory - Widgets (USD)', 'STOCK', 'f0000000000000000000000000000001', 100, 0, 'a0000000000000000000000000000007', '1310', 'Tracks WIDGET-001 quantity', 0, 0),
    ('b0000000000000000000000000000013', 'Inventory - Gadgets (USD)', 'STOCK', 'f0000000000000000000000000000002', 100, 0, 'a0000000000000000000000000000007', '1311', 'Tracks GADGET-002 quantity', 0, 0);

-- ----------------------------
-- 步骤 5: (新增) 插入汇率
-- ----------------------------
INSERT INTO prices (guid, commodity_guid, currency_guid, date, source, type, value_num, value_denom)
VALUES
    ('p0000000000000000000000000000001', 'ade56487e45e41219b5810c14b76c11d', 'f4b3e81a3d3e4ed8b46a7c06f8c4c7b8', '2020-01-01 00:00:00', 'manual', 'last', 72500, 10000);

INSERT INTO prices (guid, commodity_guid, currency_guid, date, source, type, value_num, value_denom)
VALUES
    ('p0000000000000000000000000000002', '8e7f1a8f9d6f4c8e9b6c1e5d7f6a5b4c', 'f4b3e81a3d3e4ed8b46a7c06f8c4c7b8', '2020-01-01 00:00:00', 'manual', 'last', 78000, 10000);

INSERT INTO prices (guid, commodity_guid, currency_guid, date, source, type, value_num, value_denom)
VALUES
    ('p0000000000000000000000000000003', '9a8f7c6e5d4b3c2a1b9e8f7a6b5c4d3e', 'f4b3e81a3d3e4ed8b46a7c06f8c4c7b8', '2020-01-01 00:00:00', 'manual', 'last', 48, 1000);