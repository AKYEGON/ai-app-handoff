import React from 'react';
import { useNavigate } from 'react-router-dom';

const TutorialsPage = () => {
  const navigate = useNavigate();

  const tutorials = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Inventory', path: '/inventory' },
    { name: 'Sales', path: '/sales' },
    { name: 'Credit', path: '/credit' },
    { name: 'Reports', path: '/reports' },
  ];

  const handleStartTutorial = (path: string) => {
    // Redirect to the page and pass startTutorial flag in state
    navigate(path, { state: { startTutorial: true } });
  };

  return (
    <div className="p-4">
      <h1 className="text-lg font-bold mb-4">Tutorials</h1>
      <ul className="space-y-3">
        {tutorials.map((tutorial) => (
          <li 
            key={tutorial.name} 
            className="flex flex-col sm:flex-row sm:items-center justify-between bg-white rounded-lg p-4 shadow-sm border border-gray-200"
          >
            <span className="text-base font-medium text-gray-900 mb-2 sm:mb-0">{tutorial.name}</span>
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors duration-200 whitespace-nowrap"
              onClick={() => handleStartTutorial(tutorial.path)}
            >
              Start Tutorial
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TutorialsPage;
