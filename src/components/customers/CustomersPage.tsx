import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, User, Users, DollarSign } from 'lucide-react';
import { useUnifiedCustomers } from '../../hooks/useUnifiedCustomers';
import { Customer } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { useToast } from '../../hooks/use-toast';
import { TooltipWrapper } from '../TooltipWrapper';
import { useIsMobile } from '../../hooks/use-mobile';
import CustomersHeader from './CustomersHeader';
import CustomerCard from './CustomerCard';
import CustomerFormModal from './CustomerFormModal';
import PaymentModal from './PaymentModal';
import DeleteCustomerModal from './DeleteCustomerModal';
import { useContactsImport } from '../../hooks/useContactsImport';
import { useSupabaseDebtPayments } from '../../hooks/useSupabaseDebtPayments';
import { useAuth } from '../../hooks/useAuth';
import CustomerHistoryModal from './CustomerHistoryModal';

const CustomersPage = () => {
  const { 
    customers, 
    loading, 
    createCustomer, 
    updateCustomer, 
    deleteCustomer,
    isOnline, 
    pendingOperations 
  } = useUnifiedCustomers();
  const { createDebtPayment } = useSupabaseDebtPayments();
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [operationsInProgress, setOperationsInProgress] = useState<{
    deleting: string | null;
    recordingPayment: string | null;
  }>({
    deleting: null,
    recordingPayment: null,
  });

  // Filter customers based on search query
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone.includes(searchQuery) ||
    customer.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate stats
  const totalCustomers = customers.length;
  const totalOutstandingDebt = customers.reduce((sum, c) => sum + (c.outstandingDebt || 0), 0);

  const handleAddCustomer = () => {
    setSelectedCustomer(null);
    setIsEditing(false);
    setShowFormModal(true);
  };

  const { importContactsDirectly } = useContactsImport();

  const handleImportFromContacts = async () => {
    try {
      const contactsData = await importContactsDirectly();
      
      if (contactsData.length > 0) {
        // Convert to Customer format by adding missing fields
        const customersToImport = contactsData.map(contact => ({
          ...contact,
          lastPurchaseDate: null,
        }));
        
        await handleImportCustomers(customersToImport);
      }
    } catch (error) {
      console.error('Error importing contacts:', error);
      toast({
        title: "Error",
        description: "Failed to import contacts. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsEditing(true);
    setShowFormModal(true);
  };

  const handleRecordPayment = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowPaymentModal(true);
  };

  const handleViewHistory = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowHistoryModal(true);
  };

  const handleDeleteCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDeleteModal(true);
  };

  const handleSaveCustomer = async (customerData: Omit<Customer, 'id' | 'createdDate'>) => {
    try {
      if (isEditing && selectedCustomer) {
        await updateCustomer(selectedCustomer.id, customerData);
        toast({
          title: "Success",
          description: isOnline ? "Customer updated successfully" : "Customer updated (will sync when online)",
        });
      } else {
        await createCustomer(customerData);
        toast({
          title: "Success",
          description: isOnline ? "Customer created successfully" : "Customer created (will sync when online)",
        });
      }
      setShowFormModal(false);
      setSelectedCustomer(null);
    } catch (error) {
      console.error('Failed to save customer:', error);
      toast({
        title: "Error",
        description: "Failed to save customer. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedCustomer) return;
    
    setOperationsInProgress(prev => ({ ...prev, deleting: selectedCustomer.id }));
    try {
      await deleteCustomer(selectedCustomer.id);
      toast({
        title: "Success",
        description: isOnline ? "Customer deleted successfully" : "Customer deleted (will sync when online)",
      });
      setShowDeleteModal(false);
      setSelectedCustomer(null);
    } catch (error) {
      console.error('Failed to delete customer:', error);
      toast({
        title: "Error",
        description: "Failed to delete customer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setOperationsInProgress(prev => ({ ...prev, deleting: null }));
    }
  };

  const handlePaymentComplete = async (paymentData: { 
    amount: number; 
    method: string; 
    notes?: string; 
    splitPaymentData?: import('@/types/cart').SplitPaymentData 
  }) => {
    if (!selectedCustomer) return;
    
    setOperationsInProgress(prev => ({ ...prev, recordingPayment: selectedCustomer.id }));
    try {
      let totalPaymentAmount = paymentData.amount;
      
      // Handle split payment - create multiple debt payment records
      if (paymentData.splitPaymentData && paymentData.method === 'split') {
        const splitData = paymentData.splitPaymentData;
        const splitReference = `debt_split_${Date.now()}`;
        
        // Create individual payment records for each method in the split
        const paymentPromises = [];
        
        if (splitData.methods.cash && splitData.methods.cash.amount > 0) {
          paymentPromises.push(createDebtPayment({
            user_id: user?.id || '',
            customer_id: selectedCustomer.id,
            customer_name: selectedCustomer.name,
            amount: splitData.methods.cash.amount,
            payment_method: 'cash',
            reference: `${splitReference}_cash`,
            timestamp: new Date().toISOString(),
          }));
        }
        
        if (splitData.methods.mpesa && splitData.methods.mpesa.amount > 0) {
          paymentPromises.push(createDebtPayment({
            user_id: user?.id || '',
            customer_id: selectedCustomer.id,
            customer_name: selectedCustomer.name,
            amount: splitData.methods.mpesa.amount,
            payment_method: 'mpesa',
            reference: `${splitReference}_mpesa`,
            timestamp: new Date().toISOString(),
          }));
        }
        
        // Handle discount if present (record as negative adjustment)
        if (splitData.methods.discount && splitData.methods.discount.amount > 0) {
          paymentPromises.push(createDebtPayment({
            user_id: user?.id || '',
            customer_id: selectedCustomer.id,
            customer_name: selectedCustomer.name,
            amount: splitData.methods.discount.amount,
            payment_method: 'cash', // Discount recorded as cash for simplicity
            reference: `${splitReference}_discount`,
            timestamp: new Date().toISOString(),
          }));
        }
        
        // Execute all payment records
        await Promise.all(paymentPromises);
        totalPaymentAmount = splitData.total;
      } else {
        // Single payment method
        await createDebtPayment({
          user_id: user?.id || '',
          customer_id: selectedCustomer.id,
          customer_name: selectedCustomer.name,
          amount: paymentData.amount,
          payment_method: paymentData.method,
          reference: paymentData.notes || undefined,
          timestamp: new Date().toISOString(),
        });
      }
      
      // Calculate new outstanding debt using total payment amount
      const newOutstandingDebt = Math.max(0, selectedCustomer.outstandingDebt - totalPaymentAmount);
      
      // Update customer with new debt amount
      await updateCustomer(selectedCustomer.id, {
        outstandingDebt: newOutstandingDebt,
        lastPurchaseDate: new Date().toISOString()
      });

      toast({
        title: "Payment Recorded",
        description: isOnline 
          ? `Payment of ${formatCurrency(totalPaymentAmount)} recorded successfully`
          : `Payment of ${formatCurrency(totalPaymentAmount)} recorded (will sync when online)`,
      });
      
      setShowPaymentModal(false);
      setSelectedCustomer(null);
    } catch (error) {
      console.error('Failed to record payment:', error);
      toast({
        title: "Error",
        description: "Failed to record payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setOperationsInProgress(prev => ({ ...prev, recordingPayment: null }));
    }
  };

  const handleImportCustomers = async (customersData: Omit<Customer, 'id' | 'createdDate'>[]) => {
    try {
      // Create all customers
      const promises = customersData.map(customerData => createCustomer(customerData));
      await Promise.all(promises);
      
      toast({
        title: "Success",
        description: isOnline 
          ? `${customersData.length} customers imported successfully`
          : `${customersData.length} customers imported (will sync when online)`,
      });
      
      // Import completed successfully
    } catch (error) {
      console.error('Failed to import customers:', error);
      toast({
        title: "Error",
        description: "Failed to import customers. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isMobile) {
    return (
      <TooltipWrapper>
        <div className="min-h-screen bg-background">
          <div className="space-y-6">
            {/* Mobile Header */}
            <CustomersHeader
              totalCustomers={totalCustomers}
              totalOutstandingDebt={totalOutstandingDebt}
              pendingOperations={pendingOperations}
              isOnline={isOnline}
              onAddCustomer={handleAddCustomer}
              onImportFromContacts={handleImportFromContacts}
            />

            {/* Search Bar */}
            <div className="px-4">
              <Card className="bg-card rounded-xl border border-border shadow-sm">
                <CardContent className="p-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      type="search"
                      placeholder="Search customers..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-background rounded-lg border border-border"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Customer List */}
            {loading ? (
              <div className="text-center py-8 px-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                <p className="mt-3 text-sm text-muted-foreground">Loading customers...</p>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="px-4">
                <Card className="bg-card rounded-xl border border-border shadow-sm">
                  <CardContent className="text-center py-8">
                    <User className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
                    <h3 className="text-lg font-semibold text-card-foreground mb-2">
                      {searchQuery ? 'No customers found' : 'No customers yet'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {searchQuery ? 'Try adjusting your search terms' : 'Get started by adding your first customer'}
                    </p>
                    {!searchQuery && (
                      <Button onClick={handleAddCustomer} className="mt-4 bg-primary hover:bg-primary/90">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Customer
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="space-y-4 px-4">
                {filteredCustomers.map((customer) => (
                  <CustomerCard
                    key={customer.id}
                    customer={customer}
                    onEdit={handleEditCustomer}
                    onDelete={handleDeleteCustomer}
                    onRecordPayment={handleRecordPayment}
                    onViewHistory={handleViewHistory}
                    isDeleting={operationsInProgress.deleting === customer.id}
                    isRecordingPayment={operationsInProgress.recordingPayment === customer.id}
                  />
                ))}
              </div>
            )}

            {/* Modals */}
            <CustomerFormModal
              isOpen={showFormModal}
              onClose={() => {
                setShowFormModal(false);
                setSelectedCustomer(null);
              }}
              customer={selectedCustomer}
              isEditing={isEditing}
              onSave={handleSaveCustomer}
            />

            <PaymentModal
              isOpen={showPaymentModal}
              onClose={() => {
                setShowPaymentModal(false);
                setSelectedCustomer(null);
              }}
              customer={selectedCustomer}
              onPayment={handlePaymentComplete}
              isRecording={operationsInProgress.recordingPayment === selectedCustomer?.id}
            />

            <DeleteCustomerModal
              isOpen={showDeleteModal}
              onClose={() => {
                setShowDeleteModal(false);
                setSelectedCustomer(null);
              }}
              customer={selectedCustomer}
              onDelete={handleConfirmDelete}
              isDeleting={operationsInProgress.deleting === selectedCustomer?.id}
            />

            <CustomerHistoryModal
              isOpen={showHistoryModal}
              onClose={() => setShowHistoryModal(false)}
              customer={selectedCustomer}
            />

          </div>
        </div>
      </TooltipWrapper>
    );
  }

  return (
    <TooltipWrapper>
      <div className="min-h-screen bg-background font-['Inter']">
        <div className="container mx-auto px-6 space-y-8">
          {/* Desktop Header using CustomersHeader */}
          <CustomersHeader
            totalCustomers={totalCustomers}
            totalOutstandingDebt={totalOutstandingDebt}
            pendingOperations={pendingOperations}
            isOnline={isOnline}
            onAddCustomer={handleAddCustomer}
            onImportFromContacts={handleImportFromContacts}
          />

          {/* Search Bar */}
          <Card className="bg-card rounded-3xl border border-border shadow-sm">
            <CardContent className="p-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" strokeWidth={1.5} />
                <Input
                  type="search"
                  placeholder="Search customers by name, phone, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-muted rounded-xl pl-12 pr-4 py-4 placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring border-0 text-base font-['Inter']"
                />
              </div>
            </CardContent>
          </Card>

          {/* Customer List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-base text-muted-foreground font-['Inter']">Loading customers...</p>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <Card className="bg-card rounded-3xl border border-border shadow-sm">
              <CardContent className="text-center py-12">
                <User className="mx-auto h-12 w-12 text-muted-foreground mb-4" strokeWidth={1.5} />
                <h3 className="text-xl font-semibold text-card-foreground mb-2 font-['Inter']">
                  {searchQuery ? 'No customers found' : 'No customers yet'}
                </h3>
                <p className="text-base text-muted-foreground font-['Inter']">
                  {searchQuery ? 'Try adjusting your search terms' : 'Get started by adding your first customer'}
                </p>
                {!searchQuery && (
                  <Button onClick={handleAddCustomer} className="mt-6 bg-primary hover:bg-primary/90 font-['Inter']">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Customer
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredCustomers.map((customer) => (
                <CustomerCard
                  key={customer.id}
                  customer={customer}
                  onEdit={handleEditCustomer}
                  onDelete={handleDeleteCustomer}
                  onRecordPayment={handleRecordPayment}
                  onViewHistory={handleViewHistory}
                  isDeleting={operationsInProgress.deleting === customer.id}
                  isRecordingPayment={operationsInProgress.recordingPayment === customer.id}
                />
              ))}
            </div>
          )}

          {/* Modals */}
          <CustomerFormModal
            isOpen={showFormModal}
            onClose={() => {
              setShowFormModal(false);
              setSelectedCustomer(null);
            }}
            customer={selectedCustomer}
            isEditing={isEditing}
            onSave={handleSaveCustomer}
          />

          <PaymentModal
            isOpen={showPaymentModal}
            onClose={() => {
              setShowPaymentModal(false);
              setSelectedCustomer(null);
            }}
            customer={selectedCustomer}
            onPayment={handlePaymentComplete}
            isRecording={operationsInProgress.recordingPayment === selectedCustomer?.id}
          />

            <DeleteCustomerModal
              isOpen={showDeleteModal}
              onClose={() => {
                setShowDeleteModal(false);
                setSelectedCustomer(null);
              }}
              customer={selectedCustomer}
              onDelete={handleConfirmDelete}
              isDeleting={operationsInProgress.deleting === selectedCustomer?.id}
            />

            <CustomerHistoryModal
              isOpen={showHistoryModal}
              onClose={() => setShowHistoryModal(false)}
              customer={selectedCustomer}
            />

        </div>
      </div>
    </TooltipWrapper>
  );
};

export default CustomersPage;
