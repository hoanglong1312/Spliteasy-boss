-- Allow member payment confirmations to flow through the existing bell inbox.

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (type IN (
    'expense_submitted',
    'expense_approved',
    'expense_declined',
    'settlement_created',
    'payment_submitted',
    'dispute_opened',
    'dispute_resolved',
    'dispute_dismissed'
  ));

DROP POLICY IF EXISTS notifications_insert_payment_submitted ON public.notifications;

CREATE POLICY notifications_insert_payment_submitted
  ON public.notifications FOR INSERT
  WITH CHECK (
    type = 'payment_submitted'
    AND actor_member_id = get_current_member_id()
  );
