import React from 'react';
import { ProcessingStatus } from '../types';

interface ProgressBarProps {
  status: ProcessingStatus;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ status }) => {
  if (!status.isProcessing && !status.error) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white p-6 rounded-xl shadow-2xl">
        {status.error ? (
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="mt-2 text-lg font-medium text-gray-900">Error</h3>
            <p className="mt-1 text-sm text-gray-500">{status.message || status.error}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 text-center">{status.message}</h3>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
                style={{ width: `${status.progress}%` }}
              ></div>
            </div>
            <p className="text-right text-xs text-gray-500">{Math.round(status.progress)}%</p>
          </div>
        )}
      </div>
    </div>
  );
};
