import React from 'react';
import { Plus, UserPlus, FileText, Calendar, Send, Zap } from 'lucide-react';

interface QuickActionsProps {
  onAction: (action: string) => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ onAction }) => {
  const actions = [
    {
      id: 'new-trip',
      label: 'New Trip',
      icon: Plus,
      color: 'bg-blue-500 hover:bg-blue-600',
      description: 'Create a new trip'
    },
    {
      id: 'add-driver',
      label: 'Add Driver',
      icon: UserPlus,
      color: 'bg-green-500 hover:bg-green-600',
      description: 'Register new driver'
    },
    {
      id: 'generate-report',
      label: 'Report',
      icon: FileText,
      color: 'bg-amber-500 hover:bg-amber-600',
      description: 'Generate quick report'
    },
    {
      id: 'send-notification',
      label: 'Notify',
      icon: Send,
      color: 'bg-pink-500 hover:bg-pink-600',
      description: 'Send notification'
    },
    {
      id: 'quick-assign',
      label: 'Quick Assign',
      icon: Zap,
      color: 'bg-cyan-500 hover:bg-cyan-600',
      description: 'Auto-assign trips'
    }
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Zap className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-bold text-gray-900">Quick Actions</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {actions.map(action => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => onAction(action.id)}
              className={`${action.color} text-white p-4 rounded-xl transition-all transform hover:scale-105 hover:shadow-lg group`}
              title={action.description}
            >
              <div className="flex flex-col items-center space-y-2">
                <Icon className="w-8 h-8" />
                <span className="text-sm font-semibold text-center">{action.label}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
