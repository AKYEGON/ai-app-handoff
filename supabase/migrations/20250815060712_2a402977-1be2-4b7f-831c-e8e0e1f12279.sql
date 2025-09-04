-- Phase 1: Fix the missing database trigger for customer debt updates
-- This is the critical fix - no triggers exist on the sales table currently

-- First, ensure we have the trigger function (recreate it to be safe)
CREATE OR REPLACE FUNCTION public.update_customer_on_sale_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  debt_inc numeric := 0;
  purchase_inc numeric := 0;
  effective_ts timestamptz;
begin
  -- No customer? Nothing to update.
  if NEW.customer_id is null then
    return NEW;
  end if;

  -- Always increment total_purchases by sale total
  purchase_inc := coalesce(NEW.total_amount, 0);

  -- Enhanced debt detection for split payments and regular debt
  begin
    -- Check payment_details->>'debtAmount' first (for split payments)
    debt_inc := coalesce((NEW.payment_details->>'debtAmount')::numeric, 0);
  exception when others then
    debt_inc := 0;
  end;

  -- If no debt amount in payment_details, check payment method
  if debt_inc = 0 and lower(coalesce(NEW.payment_method, '')) = 'debt' then
    debt_inc := coalesce(NEW.total_amount, 0);
  end if;

  -- Enhanced logging for debugging
  RAISE LOG 'Trigger executing for sale_id: %, customer_id: %, payment_method: %, payment_details: %, debt_increment: %, purchase_increment: %', 
    NEW.id, NEW.customer_id, NEW.payment_method, NEW.payment_details, debt_inc, purchase_inc;

  effective_ts := coalesce(NEW.timestamp, now());

  -- Update the matching customer's aggregates (RLS policy requires same user_id)
  update public.customers c
  set
    total_purchases = coalesce(c.total_purchases, 0) + purchase_inc,
    outstanding_debt = coalesce(c.outstanding_debt, 0) + debt_inc,
    last_purchase_date = greatest(coalesce(c.last_purchase_date, to_timestamp(0)), effective_ts),
    updated_at = now()
  where c.id = NEW.customer_id
    and c.user_id = NEW.user_id;

  -- Log the update result
  if FOUND then
    RAISE LOG 'Customer updated successfully for sale_id: %, customer_id: %, debt_added: %', 
      NEW.id, NEW.customer_id, debt_inc;
  else
    RAISE LOG 'No customer found to update for sale_id: %, customer_id: %', 
      NEW.id, NEW.customer_id;
  end if;

  return NEW;
end;
$function$;

-- Create the missing trigger (this is the critical fix)
CREATE TRIGGER trigger_update_customer_on_sale_insert
  AFTER INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_customer_on_sale_insert();