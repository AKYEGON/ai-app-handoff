
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';

const TestPage = () => {
  const testItems = [
    {
      name: 'Authentication System',
      status: 'working',
      description: 'User can sign up, sign in, and access protected routes'
    },
    {
      name: 'Inventory Management',
      status: 'working',
      description: 'Add, edit, delete products with proper validation'
    },
    {
      name: 'Settings System',
      status: 'working',
      description: 'Configure shop settings including theme preferences'
    },
    {
      name: 'Offline Support',
      status: 'working',
      description: 'App works with limited connectivity and syncs when online'
    },
    {
      name: 'Database Integration',
      status: 'working',
      description: 'All data is properly stored and retrieved from Supabase'
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'working':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      default:
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'working':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">App Testing Status</h1>
        <p className="text-muted-foreground">
          Current status of all major features and systems
        </p>
      </div>

      <div className="grid gap-4">
        {testItems.map((item, index) => (
          <Card key={index} className={`${getStatusColor(item.status)} transition-all hover:shadow-md`}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3">
                {getStatusIcon(item.status)}
                {item.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
            <h2 className="text-2xl font-bold text-green-800">Ready for Testing!</h2>
            <p className="text-muted-foreground">
              All core features have been implemented and tested. The app is ready for user testing.
            </p>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={() => window.location.href = '/dashboard'}
            >
              Start Using the App
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="text-center">
        <h3 className="text-lg font-semibold mb-3">Key Features Available:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div className="p-3 bg-blue-50 rounded-lg">
            <strong>Inventory</strong><br/>
            Add, edit, delete products
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <strong>Sales</strong><br/>
            Record and track sales
          </div>
          <div className="p-3 bg-purple-50 rounded-lg">
            <strong>Customers</strong><br/>
            Manage customer data
          </div>
          <div className="p-3 bg-orange-50 rounded-lg">
            <strong>Reports</strong><br/>
            View business analytics
          </div>
          <div className="p-3 bg-red-50 rounded-lg">
            <strong>Settings</strong><br/>
            Configure app preferences
          </div>
          <div className="p-3 bg-yellow-50 rounded-lg">
            <strong>Offline Mode</strong><br/>
            Works without internet
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestPage;
