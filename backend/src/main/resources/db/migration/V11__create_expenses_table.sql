create table expenses (
    id uuid primary key default gen_random_uuid(),
    amount numeric(10,2) not null,
    date date not null,
    category varchar(30) not null,
    description varchar(200) not null,
    notes text,
    receipt_storage_key varchar(512),
    receipt_content_type varchar(100),
    receipt_size_bytes bigint,
    created_at timestamptz not null default now()
);

create index idx_expenses_date on expenses (date desc);
