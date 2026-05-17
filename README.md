# Event Management System

A full-stack event management project built with HTML, Tailwind CSS, AngularJS, jQuery, Express, and MongoDB.

## Features

- Create, edit, delete, search, filter, and sort events
- Register attendees with duplicate-email and capacity checks
- Dashboard metrics for total events, upcoming events, booked seats, and revenue
- Grid and table views
- CSV export
- MongoDB persistence with a Mongoose schema
- Optional seed data

## Project Structure

```text
.
├── models/
│   └── Event.js
├── public/
│   ├── app.js
│   ├── index.html
│   └── styles.css
├── scripts/
│   └── seed.js
├── .env.example
├── package.json
├── README.md
└── server.js
```

## How MongoDB Is Added

MongoDB must be connected from the backend, not directly from HTML, AngularJS, or jQuery. This project uses:

- `mongoose` to connect Node.js with MongoDB
- `models/Event.js` to define the event and attendee database schema
- `server.js` to expose REST API routes such as `GET /api/events` and `POST /api/events`
- The frontend calls those API routes with AngularJS `$http`

## Setup

1. Install Node.js from <https://nodejs.org/>.

2. Install project dependencies:

```bash
npm install
```

If PowerShell blocks `npm`, use:

```bash
npm.cmd install
```

3. Create your environment file:

```bash
copy .env.example .env
```

4. Add MongoDB.

Option A: Local MongoDB

- Install MongoDB Community Server from <https://www.mongodb.com/try/download/community>.
- Start MongoDB on your computer.
- Keep this value in `.env`:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/event_management_system
```

If you use Docker, this starts MongoDB locally:

```bash
docker run -d --name event-mongo -p 27017:27017 -v event_mongo_data:/data/db mongo:7
```

Option B: MongoDB Atlas

- Go to <https://www.mongodb.com/atlas>.
- Create a free cluster.
- Create a database user.
- Add your IP address in Network Access.
- Open Connect > Drivers and copy the connection string.
- Put it in `.env`, replacing `<password>` with your database user password:

```env
MONGODB_URI=mongodb+srv://username:<password>@cluster-name.mongodb.net/event_management_system
```

If your Atlas connection string does not include a database path, for example it ends with
`.mongodb.net/?retryWrites=true...`, the app will use `MONGODB_DB_NAME` and default to
`event_management_system`. Without an explicit database name, MongoDB tools often show writes under
the default `test` database, which makes it look like entries are disappearing.

5. Add demo data:

```bash
npm run seed
```

The seed command now skips if events already exist, so it will not wipe entries you created in the
app. To deliberately replace everything with demo data, run:

```bash
npm run seed -- --reset
```

6. Start the app:

```bash
npm start
```

If PowerShell blocks `npm`, use:

```bash
npm.cmd start
```

7. Open:

```text
http://localhost:3000
```

The page can open without MongoDB, but creating, editing, deleting, and registering events require MongoDB to be connected.

## API Routes

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Check server and database status |
| GET | `/api/events` | List events with filters |
| GET | `/api/events/:id` | Get one event |
| POST | `/api/events` | Create an event |
| PUT | `/api/events/:id` | Update an event |
| DELETE | `/api/events/:id` | Delete an event |
| POST | `/api/events/:id/register` | Register an attendee |

## MongoDB Notes

The event documents are stored in the `events` collection. Each document contains event details and an embedded `attendees` array.

Important fields:

- `title`, `description`, `category`, `location`
- `eventDate`, `startTime`, `endTime`
- `capacity`, `price`, `status`
- `organizer`, `contactEmail`
- `attendees`

If the server says `MongoDB connection failed`, check:

- MongoDB is running locally, or your Atlas cluster is active
- `.env` has the correct `MONGODB_URI`
- Atlas username and password are correct
- Your current IP address is allowed in Atlas Network Access
