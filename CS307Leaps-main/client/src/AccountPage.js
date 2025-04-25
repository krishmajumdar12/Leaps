// will be using /pages/AccountPage.js


/*import React, { useState } from 'react';

function AccountPage() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [userId, setUserId] = useState('c8d2045d-c9bf-437c-b334-51a5c805f469'); // Assuming for now I will have a way to get the user's ID

    const handleUpdateUsername = async () => {
        try {
            const response = await fetch('/api/users/update/username', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id: userId, username }),
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.statusText}`);
            }

            const data = await response.json();
            console.log(data);
        } catch (error) {
            console.error('Error updating username:', error);
        }
    };

    const handleUpdateEmail = async () => {
        try {
            const response = await fetch('/api/users/update/email', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id: userId, email }),
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.statusText}`);
            }

            const data = await response.json();
            console.log(data);
        } catch (error) {
            console.error('Error updating email:', error);
        }
    };

    const handleUpdatePassword = async () => {
        try {
            const response = await fetch('/api/users/update/password', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id: userId, password }),
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.statusText}`);
            }

            const data = await response.json();
            console.log(data);
        } catch (error) {
            console.error('Error updating password:', error);
        }
    };

    const handleDelete = async () => {
        try {
            const response = await fetch('/api/users/delete', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id: userId }),
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.statusText}`);
            }

            const data = await response.json();
            console.log(data);
        } catch (error) {
            console.error('Error deleting account:', error);
        }
    };

    return (
        <div>
            <h1>Account Page</h1>
            <div>
                <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                <button onClick={handleUpdateUsername}>Update Username</button>
            </div>
            <div>
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <button onClick={handleUpdateEmail}>Update Email</button>
            </div>
            <div>
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <button onClick={handleUpdatePassword}>Update Password</button>
            </div>
            <div>
                <button onClick={handleDelete}>Delete Account</button>
            </div>
        </div>
    );
}

export default AccountPage; */