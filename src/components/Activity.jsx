import React from 'react';
import { Clock } from 'lucide-react';

const Activity = () => {

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold gradient-text">Activity</h1>
        <p className="text-xs text-gray-500">coming soon!</p>
      </div>

      <div className="glass-card p-16 text-center">
        <Clock className="w-20 h-20 text-gray-600 mx-auto mb-6" />
        <p className="text-white text-2xl font-semibold mb-3">Coming Soon</p>
        <p className="text-gray-500 text-base">
          Activity tracking will be available soon
        </p>
      </div>
    </div>
  );
};

export default Activity;
