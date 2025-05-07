import React, { useEffect, useState } from 'react';

const Debug = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  // Override console methods for debugging
  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    const captureLog = (type: string, ...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      setLogs(prev => [...prev, `[${type}] ${message}`]);
      
      return message;
    };

    console.log = (...args: any[]) => {
      const message = captureLog('LOG', ...args);
      originalLog.apply(console, args);
      return message;
    };

    console.error = (...args: any[]) => {
      const message = captureLog('ERROR', ...args);
      originalError.apply(console, args);
      return message;
    };

    console.warn = (...args: any[]) => {
      const message = captureLog('WARN', ...args);
      originalWarn.apply(console, args);
      return message;
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  return (
    <div className="fixed bottom-0 right-0 z-50">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="bg-gray-800 text-white p-2 m-2 rounded"
      >
        {isOpen ? "Close Debug" : "Open Debug"}
      </button>
      
      {isOpen && (
        <div className="bg-gray-800 text-white p-4 rounded-t-lg w-96 h-64 overflow-auto">
          <h3 className="text-lg font-bold mb-2">Debug Console</h3>
          <button 
            onClick={() => setLogs([])} 
            className="bg-red-500 text-white px-2 py-1 rounded text-xs mb-2"
          >
            Clear
          </button>
          <div className="text-xs font-mono">
            {logs.map((log, i) => (
              <div key={i} className="border-b border-gray-700 py-1">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Debug;
