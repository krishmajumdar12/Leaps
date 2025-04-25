import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import '../styles/TravelCostComparison.css';

const TravelCostComparison = ({ tripId }) => {
  const [costData, setCostData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchCostData = async () => {
      try {
        setLoading(true);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const sampleData = [
          {
            name: 'Driving',
            fuelCost: 120,
            maintenanceCost: 50,
            otherCosts: 80,
          },
          {
            name: 'Flying',
            ticketCost: 350,
            feesCost: 50,
            groundTransportCost: 75,
          },
          {
            name: 'Train',
            ticketCost: 180,
            foodCost: 40,
            otherCosts: 30,
          },
          {
            name: 'Bus',
            ticketCost: 100,
            foodCost: 30,
            otherCosts: 20,
          }
        ];
        
        setCostData(sampleData);
      } catch (err) {
        setError("Failed to load cost comparison data");
        console.error("Error loading cost data:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCostData();
  }, [tripId]);
  
  const calculateTotalCost = (item) => {
    return Object.keys(item)
      .filter(key => key !== 'name' && key !== 'totalCost')
      .reduce((sum, key) => sum + item[key], 0);
  };
  
  const dataWithTotal = costData.map(item => ({
    ...item,
    totalCost: calculateTotalCost(item)
  }));
  
  // Sort the data by total cost (lowest first)
  const sortedData = [...dataWithTotal].sort((a, b) => a.totalCost - b.totalCost);
  
  if (loading) return <div className="loading-spinner">Loading cost comparison...</div>;
  if (error) return <div className="error-message">{error}</div>;
  
  return (
    <div className="travel-cost-comparison">
      <h3>Travel Cost Comparison</h3>
      <p>Compare the total costs for different travel methods:</p>
      
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={sortedData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis label={{ value: 'Cost ($)', angle: -90, position: 'insideLeft' }} />
            <Tooltip 
              formatter={(value) => [`$${value}`, null]}
              labelFormatter={(label) => `Travel Method: ${label}`}
            />
            <Legend />
            {sortedData.length > 0 && Object.keys(sortedData[0])
              .filter(key => key !== 'name' && key !== 'totalCost')
              .map((key, index) => {
                const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe'];
                return (
                  <Bar 
                    key={key} 
                    dataKey={key} 
                    fill={colors[index % colors.length]} 
                    stackId="a"
                    name={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  />
                );
              })
            }
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="cost-table">
        <h4>Cost Breakdown</h4>
        <table>
          <thead>
            <tr>
              <th>Travel Method</th>
              <th>Total Cost</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((item, index) => (
              <tr key={index} className={index === 0 ? 'best-option' : ''}>
                <td>{item.name}</td>
                <td>${item.totalCost}</td>
                <td>
                  {Object.keys(item)
                    .filter(key => key !== 'name' && key !== 'totalCost')
                    .map(key => (
                      <div key={key}>
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: ${item[key]}
                      </div>
                    ))
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {sortedData.length > 0 && (
        <div className="recommendation">
          <p>
            <strong>Recommendation:</strong> Based on cost analysis, {sortedData[0].name} is your most economical option, 
            with a total cost of ${sortedData[0].totalCost}.
          </p>
          {sortedData[0].name === 'Driving' && (
            <p className="recommendation-note">
              Note: Driving costs include fuel, maintenance, and other expenses. Prices may vary based on your vehicle's fuel efficiency, 
              current gas prices, and actual route taken.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default TravelCostComparison;