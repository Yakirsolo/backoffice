alter table users add column meeting_cadence_value integer not null default 1;
alter table users add column meeting_cadence_unit varchar(10) not null default 'month';
