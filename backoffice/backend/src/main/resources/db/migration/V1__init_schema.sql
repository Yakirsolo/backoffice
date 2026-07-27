create table users (
    id uuid primary key default gen_random_uuid(),
    email varchar(255) not null unique,
    password_hash varchar(255) not null,
    name varchar(255) not null,
    role varchar(20) not null default 'ADMIN',
    created_at timestamptz not null default now()
);

create table customers (
    id uuid primary key default gen_random_uuid(),
    name varchar(255) not null,
    age integer,
    description text,
    phone varchar(50),
    instagram varchar(255),
    facebook varchar(255),
    source varchar(20) not null,
    status varchar(20) not null,
    program varchar(255) not null,
    start_date date not null,
    start_weight numeric(6,2) not null,
    target_weight numeric(6,2) not null,
    current_weight numeric(6,2) not null,
    photo_storage_key varchar(500),
    needs_follow_up boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create index idx_customers_status on customers(status);
create index idx_customers_name on customers(name);

create table progress_measurements (
    id uuid primary key default gen_random_uuid(),
    customer_id uuid not null references customers(id) on delete cascade,
    date date not null,
    weight numeric(6,2) not null,
    waist numeric(6,2),
    thigh numeric(6,2),
    hip numeric(6,2),
    created_at timestamptz not null default now()
);
create index idx_measurements_customer_date on progress_measurements(customer_id, date);

create table photos (
    id uuid primary key default gen_random_uuid(),
    customer_id uuid not null references customers(id) on delete cascade,
    measurement_id uuid references progress_measurements(id) on delete set null,
    type varchar(20) not null,
    storage_key varchar(500) not null,
    date date not null,
    created_at timestamptz not null default now()
);
create index idx_photos_customer_date on photos(customer_id, date);

create table documents (
    id uuid primary key default gen_random_uuid(),
    customer_id uuid not null references customers(id) on delete cascade,
    type varchar(20) not null,
    name varchar(255) not null,
    storage_key varchar(500) not null,
    date date not null,
    created_at timestamptz not null default now()
);
create index idx_documents_customer_date on documents(customer_id, date);

create table payments (
    id uuid primary key default gen_random_uuid(),
    customer_id uuid not null references customers(id) on delete cascade,
    amount numeric(8,2) not null,
    date date not null,
    status varchar(20) not null,
    created_at timestamptz not null default now()
);
create index idx_payments_customer_date on payments(customer_id, date);
create index idx_payments_status on payments(status);

create table meetings (
    id uuid primary key default gen_random_uuid(),
    customer_id uuid not null references customers(id) on delete cascade,
    date date not null,
    time time not null,
    type varchar(255) not null,
    duration_minutes integer,
    notes text,
    zoom_link varchar(500),
    completed boolean not null default false,
    reminder_enabled boolean not null default true,
    created_at timestamptz not null default now()
);
create index idx_meetings_customer_date on meetings(customer_id, date);
create index idx_meetings_date on meetings(date);

create table timeline_events (
    id uuid primary key default gen_random_uuid(),
    customer_id uuid not null references customers(id) on delete cascade,
    type varchar(30) not null,
    date date not null,
    description varchar(500),
    metadata text,
    created_at timestamptz not null default now()
);
create index idx_timeline_customer_date on timeline_events(customer_id, date);
