create table todos (
    id uuid primary key default gen_random_uuid(),
    text varchar(500) not null,
    created_at timestamptz not null default now()
);
