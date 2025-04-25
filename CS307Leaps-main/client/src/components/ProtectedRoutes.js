import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '../services/authService';
import AuthPrompt from './AuthPrompt'; // We'll create this next

const ProtectedRoute = ({ element }) => {
  if (isAuthenticated()) {
    return element;
  }
  
  // Show auth prompt instead of redirect
  return <AuthPrompt />;
};

export default ProtectedRoute;