# Leaps

A collaborative trip planning application that helps users coordinate trips with friends, manage travel and lodging arrangements, and make group decisions efficiently.


## Getting Started

### Prerequisites
- Node.js: Download and install from nodejs.org
- PostgreSQL: Download and install version 14 from postgresql.org, or run:

brew install postgresql@14

to automatically download version 14

### Database Setup
Start PostgreSQL service:

##### For Mac:
   ```
   brew services start postgresql
   createdb leapsdb
   ```

When prompted for a password, use the password you created at setup for PostgreSQL

##### For Windows:
    psql -U postgres
    CREATE DATABASE leapsdb;
    \q



### Backend Setup (Server)
Navigate to the server directory and install dependencies:

    npm install express cors dotenv bcryptjs jsonwebtoken pg uuid react-calendar react-scroll

##Future installs after intial set up
   
   ```
   npm install nodemailer
   npm install socket.io
   ```
Create a .env file in the server directory with:

    PORT=3000
    // if no password just do user
    DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/[database]
    JWT_SECRET=secret-key
    EMAIL_USER= (your email you want it to come from -- will set up leaps gmail account in future)
    EMAIL_PASS= (GMAIL app key -- https://myaccount.google.com/apppasswords  )
    TICKETMASTER_API_KEY= (create a ticketmaster API key -- consumer key --- https://developer.ticketmaster.com/explore/  )



The server will run on http://localhost:3000.

### Frontend Setup (Client)
Navigate to the client directory and install dependencies:

    npm install
    npm install socket.io-client
    npm install react-calendar
    npm install react-scroll

Start the React development server:

    npm start
The frontend will run on http://localhost:3001.

### Start the server:
Navigate to the server directory
Start the server:
    npm run dev






If the server is not connecting to the client, most likely the above order was not followed.
