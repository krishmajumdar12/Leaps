import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DrivingCostCalculator from '../components/DrivingCostCalculator';
import '../styles/ViewDriving.css';
import '../styles/DrivingCostCalculator.css';

const ViewDriving = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [drivingDetails, setDrivingDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const token = localStorage.getItem('token');
  
  useEffect(() => {
    const fetchDrivingDetails = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`http://localhost:3000/api/travel/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch driving details');
        }

        const data = await response.json();
        setDrivingDetails(data); // <-- now we have real data
      } catch (err) {
        console.error('Error fetching driving details:', err);
        setError('Failed to load driving details. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDrivingDetails();
  }, [id, token]);

  const handleBackClick = () => {
    navigate(-1);
  };
  
  if (isLoading) {
    return <div className="view-driving loading">Loading driving details...</div>;
  }
  
  if (error) {
    return <div className="view-driving error">{error}</div>;
  }
  
  return (
    <div className="view-driving">
      <button onClick={handleBackClick} className="back-button">
        &larr; Back
      </button>
      
      <h2>Driving Details</h2>
      
      {drivingDetails && (
        <div className="driving-details">
          <div className="route-info">
            <div className="route-card">
              <h3>Route Information</h3>
              <p><strong>From:</strong> {drivingDetails.departure_location}</p>
              <p><strong>To:</strong> {drivingDetails.arrival_location}</p>
              <p>
                <strong>Departure:</strong> {new Date(drivingDetails.departure).toLocaleString()}
              </p>
              <p>
                <strong>Arrival:</strong> {new Date(drivingDetails.arrival).toLocaleString()}
              </p>
              <p><strong>Notes:</strong> {drivingDetails.notes || 'No additional notes'}</p>
            </div>
          </div>
          
          <DrivingCostCalculator
            departure={drivingDetails.departure_location}
            destination={drivingDetails.arrival_location}
          />
          
        </div>
      )}
    </div>
  );
};

export default ViewDriving;