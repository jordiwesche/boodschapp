-- Add smart label "check" (yellow/amber, eye icon) for all households
INSERT INTO labels (household_id, name, color, type, slug, display_order)
SELECT h.id, 'check', 'amber', 'smart', 'check', 2
FROM households h
WHERE NOT EXISTS (SELECT 1 FROM labels l WHERE l.household_id = h.id AND l.slug = 'check');
