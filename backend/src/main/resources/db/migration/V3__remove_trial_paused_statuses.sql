update customers set status = 'active' where status in ('trial', 'paused');
