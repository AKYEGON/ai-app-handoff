
-- 1) Trigger function to atomically update customers when a sale is inserted
create or replace function public.update_customer_on_sale_insert()
returns trigger
language plpgsql
as $$
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
$$;

-- 2) Create or replace the AFTER INSERT trigger on sales
drop trigger if exists trg_update_customer_on_sale_insert on public.sales;

create trigger trg_update_customer_on_sale_insert
after insert on public.sales
for each row
execute function public.update_customer_on_sale_insert();

-- 3) Idempotency: prevent duplicate sale rows for the same checkout session
--    Allow multiple items but enforce uniqueness by (user_id, client_sale_id, product_id)
create unique index if not exists uq_sales_user_client_product
on public.sales (user_id, client_sale_id, product_id)
where client_sale_id is not null;
