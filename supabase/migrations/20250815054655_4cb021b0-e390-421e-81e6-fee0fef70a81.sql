-- Fix function search path security issue by updating existing functions
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

  -- Determine debt increment from payment_details->>'debtAmount' or payment method
  begin
    debt_inc := coalesce((NEW.payment_details->>'debtAmount')::numeric, 0);
  exception when others then
    debt_inc := 0;
  end;

  if debt_inc = 0 and lower(coalesce(NEW.payment_method, '')) = 'debt' then
    debt_inc := coalesce(NEW.total_amount, 0);
  end if;

  effective_ts := coalesce(NEW.timestamp, now());

  -- Update the matching customer's aggregates (RLS policy requires same user_id)
  update public.customers c
  set
    total_purchases = coalesce(c.total_purchases, 0) + purchase_inc,
    outstanding_debt = coalesce(c.outstanding_debt, 0) + debt_inc,
    last_purchase_date = greatest(coalesce(c.last_purchase_date, to_timestamp(0)), effective_ts)
  where c.id = NEW.customer_id
    and c.user_id = NEW.user_id;

  return NEW;
end;
$function$;

-- Update handle_new_user function to have proper search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, shop_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'shop_name', NEW.email);
  RETURN NEW;
END;
$function$;