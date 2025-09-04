-- Create a comprehensive test to validate split payment functionality
-- Insert a test split payment sale to verify the trigger works correctly

DO $$
DECLARE
    test_user_id uuid := 'b8f8f8f8-f8f8-f8f8-f8f8-f8f8f8f8f8f8'::uuid;
    test_customer_id uuid := gen_random_uuid();
    test_product_id uuid := gen_random_uuid();
    test_sale_id uuid := gen_random_uuid();
    initial_debt numeric := 100.00;
    sale_amount numeric := 200.00;
    debt_portion numeric := 75.00;
BEGIN
    -- Clean up any existing test data first
    DELETE FROM public.sales WHERE product_name = 'SPLIT_PAYMENT_TEST_PRODUCT';
    DELETE FROM public.customers WHERE name = 'SPLIT_PAYMENT_TEST_CUSTOMER';
    DELETE FROM public.products WHERE name = 'SPLIT_PAYMENT_TEST_PRODUCT';

    -- Create test customer with initial debt
    INSERT INTO public.customers (
        id, user_id, name, phone, outstanding_debt, total_purchases, 
        created_date, credit_limit, risk_rating
    ) VALUES (
        test_customer_id, test_user_id, 'SPLIT_PAYMENT_TEST_CUSTOMER', 
        '+254700000000', initial_debt, initial_debt, now(), 1000, 'low'
    );

    -- Create test product
    INSERT INTO public.products (
        id, user_id, name, category, cost_price, selling_price, current_stock
    ) VALUES (
        test_product_id, test_user_id, 'SPLIT_PAYMENT_TEST_PRODUCT', 
        'Test Category', 50.00, 200.00, 10
    );

    -- Insert test split payment sale (this should trigger customer debt update)
    INSERT INTO public.sales (
        id, user_id, product_id, product_name, quantity, selling_price, cost_price,
        profit, total_amount, customer_id, customer_name, payment_method, 
        payment_details, timestamp, synced
    ) VALUES (
        test_sale_id, test_user_id, test_product_id, 'SPLIT_PAYMENT_TEST_PRODUCT',
        1, sale_amount, 50.00, 150.00, sale_amount, test_customer_id, 
        'SPLIT_PAYMENT_TEST_CUSTOMER', 'split',
        jsonb_build_object(
            'cashAmount', 50.00,
            'mpesaAmount', 75.00, 
            'debtAmount', debt_portion,
            'discountAmount', 0.00
        ),
        now(), true
    );

    -- Log the test results
    RAISE NOTICE 'Split payment test completed. Expected customer debt: %, actual: %',
        initial_debt + debt_portion,
        (SELECT outstanding_debt FROM public.customers WHERE id = test_customer_id);
        
    RAISE NOTICE 'Expected total purchases: %, actual: %',
        initial_debt + sale_amount,
        (SELECT total_purchases FROM public.customers WHERE id = test_customer_id);
END $$;