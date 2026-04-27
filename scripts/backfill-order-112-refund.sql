-- Backfill: order #112 had a SkipCash refund initiated on 2026-04-27 12:20 UTC
-- (refundId 7cb10d38-7e4d-4e86-8cc3-8045ea9cb164) for the 19.00 QAR Apple Pay
-- payment from customer 1, but the refund tracking columns didn't exist yet.
-- One-shot to mark it as pending so the admin panel shows the badge.

UPDATE orders
SET refundId = '7cb10d38-7e4d-4e86-8cc3-8045ea9cb164',
    refundStatus = 'pending',
    refundedAmount = 19.00
WHERE id = 112;

SELECT id, paidAmount, refundId, refundStatus, refundedAmount FROM orders WHERE id = 112;
