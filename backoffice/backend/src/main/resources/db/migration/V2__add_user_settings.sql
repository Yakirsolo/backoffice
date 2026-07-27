alter table users add column business_name varchar(255);
alter table users add column phone varchar(50);
alter table users add column notify_payment_reminders boolean not null default true;
alter table users add column notify_follow_up boolean not null default true;
