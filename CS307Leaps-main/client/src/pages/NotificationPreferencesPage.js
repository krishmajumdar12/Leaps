import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/NotificationPreferencesPage.css";

const NotificationPreferencesPage = () => {
  const [preferences, setPreferences] = useState({
    friend_request: false,
    trip_update: false,
    trip_status: false,
    ratio_changed: false
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const response = await fetch('/api/notifications/preferences', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch preferences!');
        }

        const data = await response.json();
        setPreferences(data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchPreferences();
  }, [token]);

  const updatePreferences = async () => {
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preferences)
      });

      if (!response.ok) {
        throw new Error('Failed to update preferences!');
      }

      alert('Preferences updated successfully!');
      navigate('/notifications')
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div>Loading preferences...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="preferences-page">
      <h1>Notification Preferences</h1>
      <div className="preferences-form">
        <label>
          <input
            type="checkbox"
            checked={preferences.friend_request}
            onChange={(e) =>
              setPreferences({ ...preferences, friend_request: e.target.checked })
            }
          />
          Friend Request Notifications
        </label>
        <label>
          <input
            type="checkbox"
            checked={preferences.trip_update}
            onChange={(e) =>
              setPreferences({ ...preferences, trip_update: e.target.checked })
            }
          />
          Trip Update Notifications
        </label>
        <label>
          <input
            type="checkbox"
            checked={preferences.trip_status}
            onChange={(e) =>
              setPreferences({ ...preferences, trip_status: e.target.checked })
            }
          />
          Trip Status Update Notifications
        </label>
        <label>
          <input
            type="checkbox"
            checked={preferences.ratio_changed}
            onChange={(e) =>
              setPreferences({ ...preferences, ratio_changed: e.target.checked })
            }
          />
          Cost Split Update Notifications
        </label>
        <button onClick={updatePreferences}>Save Preferences</button>
      </div>
    </div>
  );
};

export default NotificationPreferencesPage;
