-- Fix stuck driver from order 53
-- First, let's see who the driver is and their current status
SELECT d.id, d.firstName, d.lastName, d.status, o.id as orderId, o.status as orderStatus
FROM Driver d
LEFT JOIN `Order` o ON o.driverId = d.id
WHERE o.id = 53 OR d.status != 'online';

-- Update the driver to be online (run this after checking the above query)
-- UPDATE Driver
-- SET status = 'online'
-- WHERE id IN (
--   SELECT driverId FROM `Order` WHERE id = 53
-- );
