import type { ReactNode } from 'react';

interface PageCanvasProps {
  children: ReactNode;
  className?: string;
}

export default function PageCanvas({ children, className }: PageCanvasProps) {
  return (
    <div
      className={`flex flex-col h-screen bg-gray-50 max-w-md mx-auto shadow-2xl overflow-hidden relative${
        className ? ` ${className}` : ''
      }`}
    >
      {children}
    </div>
  );
}
