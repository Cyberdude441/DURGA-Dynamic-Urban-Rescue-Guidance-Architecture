import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import { LocationProvider } from './context/LocationContext.jsx';
import ErrorBoundary from './components/common/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <LocationProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </LocationProvider>
    </ErrorBoundary>
  );
}
