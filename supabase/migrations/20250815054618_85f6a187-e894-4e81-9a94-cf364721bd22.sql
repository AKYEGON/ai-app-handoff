-- Create trigger to automatically update customer data when sales are inserted
CREATE OR REPLACE TRIGGER trigger_update_customer_on_sale_insert
  AFTER INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_customer_on_sale_insert();