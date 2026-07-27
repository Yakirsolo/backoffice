alter table customers add column billing_interval_value integer not null default 1;
alter table customers add column billing_interval_unit varchar(10) not null default 'month';
