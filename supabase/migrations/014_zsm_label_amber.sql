-- Change z.s.m. label from purple to amber (yellow)
UPDATE labels SET color = 'amber' WHERE slug = 'zsm' AND color = 'purple';
