import "./styles/AccountPage.css";
import "./styles/auth.css";
import "./index.css";
import './styles/Comparison.css';

/////////////////////////////////////////

import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import AccountPage from "./pages/AccountPage";
import CreateTrip from "./pages/CreateTrip";
import Trips from "./pages/Trips";
import TripDetails from "./pages/TripDetails";
import RecommendationPage from "./pages/RecommendationPage";
import ResetPassword from "./pages/ResetPassword";
import Friends from './pages/Friends';
import Users from './pages/Users';
import ViewEvent from "./pages/ViewEvent";
import ViewLodging from "./pages/ViewLodging";
import ViewDriving from "./pages/ViewDriving";
import Events from "./pages/Events";
import CustomEvents from "./pages/CustomEvents";
import CreateNewEvent from "./pages/CreateNewEvent";
import Search from './pages/SearchPage';
import Share from './pages/Share';
import Lodgings from "./pages/Lodgings";
import Travel from "./pages/Travel";
import NotificationPage from "./pages/NotificationPage";
import NotificationPreferencesPage from './pages/NotificationPreferencesPage';
import { isAuthenticated } from "./services/authService"; 
import { useState, useEffect } from "react";
import './App.css';
// import AccountPage from "./AccountPage";

function App() {
  const [auth, setAuth] = useState(isAuthenticated());
  const [theme, setTheme] = useState("light");
  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedTheme = localStorage.getItem("theme");
    if (token && savedTheme) {
      setTheme(savedTheme);
    } else {
      setTheme("light"); // fallback default
    }
  }, []);  

  useEffect(() => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <div
      style={{
        backgroundColor: "var(--bg-color)",
        color: "var(--text-color)",
        minHeight: "100vh",
      }}
    >
      <Router>
        <Navbar />
        <div /*style={{ padding: "1rem" }}*/>          
          <Routes>
            <Route path="/" element={<Navigate to="/home" />} />
            <Route path="/login" element={<Login setAuth={setAuth} setTheme={setTheme} />} />
            <Route path="/signup" element={<SignUp setAuth={setAuth} />} />

            {/* Public routes that allow guest access */}
            <Route path="/home" element={<HomePage />} />
            <Route path="/events" element={<Events />} />
            <Route path="/customevents" element={<CustomEvents />} />
            <Route path="/create-event" element={<CreateNewEvent />} />
            <Route path="/users" element={<Users />} /> 
            <Route path="/search" element={<Search />} />
            <Route path="/lodgings" element={<Lodgings />} />
            <Route path="/search" element={<Search />} />
            <Route path="/travel" element={<Travel />} />
            <Route path="/users" element={<Users />} /> 
            <Route path="/viewevent/:id" element={<ViewEvent />} />
            <Route path="/viewdriving/:id" element={<ViewDriving />} />

            {/* Protected routes */}
            <Route path="/accountpage" element={
              <AccountPage theme={theme} setTheme={setTheme} />
            } />
            <Route path="/createtrip" element={
              auth ? <CreateTrip /> : <Navigate to="/login" />
            } />
            <Route path="/notifications" element={
              <NotificationPage />
            } />
            <Route path="/preferences" element={<NotificationPreferencesPage />} />
            <Route path="/trips" element={
              <Trips />
            } />
            <Route path="/trips/:id" element={
              auth ? <TripDetails /> : <Navigate to="/login" />
            } />
            <Route path="/trips/:id/recommendation" element={
              auth ? <RecommendationPage /> : <Navigate to="/login" />
            } />
            <Route path="/trips/:id/share" element={
              auth ? <Share /> : <Navigate to="/login" />
            } />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/friends" element={
              auth ? <Friends /> : <Navigate to="/login" />
            } />
          </Routes>
        </div>
      </Router>
    </div>
  );
}

export default App;

////////////////////////////////////

// import AccountPage from "./pages/AccountPage"; // Ensure the path is correct
// function App() {
//     return (
//         <div>
//             <AccountPage />
//         </div>
//     );
// }

// export default App;

