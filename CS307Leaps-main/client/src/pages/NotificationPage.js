import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../styles/NotificationPage.css";
import trashIcon from "../assets/trashIcon.png";

const NotificationPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
        return;
    }

    const fetchNotifications = async () => {
      try {
        const response = await fetch('/api/notifications/list', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch notifications!');
        }

        const data = await response.json();
        setNotifications(data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [token]);

  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }

      setNotifications(notifications.map(notif => 
        notif.id === notificationId ? { ...notif, is_read: true } : notif
      ));
    } catch (err) {
      setError(err.message);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }

      setNotifications(notifications.map(notif => ({ ...notif, is_read: true })));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleNotificationClick = (notification) => {
    // Mark as read when clicked
    markAsRead(notification.id);
    
    // Navigate based on notification type
    if (notification.type === 'friend_request' || notification.type === 'friend_request_accepted' || notification.type === 'friend_request_rejected') {
      navigate('/users');
    } else if (notification.type === 'trip_status') {
      navigate('/trips');
    } else if (notification.type === 'trip_update' || notification.type === 'ratio_changed' && notification.trip_id) {
      navigate(`/trips/${notification.trip_id}`);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
  
      if (!response.ok) {
        throw new Error('Failed to delete notification');
      }
  
      setNotifications(notifications.filter(n => n.id !== notificationId));
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div className="notification-container loading">Loading notifications...</div>;
  }

  if (error) {
    return <div className="notification-container error">Error: {error}</div>;
  }

  if (!token) {
    return <div className="text-container">Please login to view your notifications.</div>;
  }

  return (
    <div className="notification-page">
      <div className="notification-header">
        <h1>Notifications</h1>
        <div className="notification-actions">
          {notifications.length > 0 && (
            <button 
              className="mark-all-read-btn"
              onClick={markAllAsRead}
            >
              Mark all as read
            </button>
          )}
          <button 
            className="preferences-btn"
            onClick={() => navigate('/preferences')}
          >
            Notification Preferences
          </button>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="no-notifications">
          <p>You have no notifications.</p>
        </div>
      ) : (
        <div className="notification-list">
          {notifications.map((notification) => (
            <div 
              key={notification.id} 
              className={`notification-item ${notification.is_read ? 'read' : 'unread'}`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="notification-content">
                <p className="notification-message">{notification.message}</p>
                <p className="notification-date">
                  {new Date(notification.created_at).toLocaleString()}
                </p>
              </div>
              {!notification.is_read && (
                <div className="unread-indicator"></div>
              )}
              <button 
                className="delete-butn"
                onClick={(e) => {
                e.stopPropagation();
                deleteNotification(notification.id);
                }}>
                <img src={trashIcon} alt='delete button'></img>
            </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationPage;