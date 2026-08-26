create table signature_requests (
    id uuid primary key default gen_random_uuid(),
    customer_id uuid references customers(id) on delete cascade,
    token_hash varchar(64) not null unique,
    status varchar(20) not null default 'pending',
    customer_name varchar(255) not null,
    customer_id_number varchar(50) not null,
    customer_address varchar(500) not null,
    program varchar(255) not null,
    duration_months integer,
    price numeric(8,2),
    payment_terms varchar(255),
    agreement_date date not null,
    document_id uuid references documents(id) on delete set null,
    storage_key varchar(500),
    content_type varchar(100),
    size_bytes bigint,
    signed_at timestamptz,
    created_at timestamptz not null default now()
);

create index idx_signature_requests_token_hash on signature_requests(token_hash);
create index idx_signature_requests_customer on signature_requests(customer_id);