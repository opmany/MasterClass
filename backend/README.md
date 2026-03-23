# LingoBridge Backend

Node.js + Express + PostgreSQL REST API.

## Project Structure

```
backend/
├── src/
│   ├── index.js              # Entry point
│   ├── db/
│   │   ├── pool.js           # PostgreSQL connection pool
│   │   └── migrate.js        # One-time table creation script
│   ├── middleware/
│   │   ├── auth.js           # JWT requireAuth / requireAdmin
│   │   └── validate.js       # express-validator error handler
│   └── routes/
│       ├── auth.js           # POST /register, POST /login, GET/PATCH /me
│       ├── classes.js        # CRUD /api/classes
│       ├── memberships.js    # CRUD /api/memberships
│       ├── exams.js          # CRUD /api/exams
│       ├── words.js          # CRUD /api/words  (+ /bulk)
│       ├── users.js          # Admin: list users, change roles
│       └── upload.js         # POST /api/upload, POST /api/extract
└── uploads/                  # Uploaded files stored here
```

## Setup & Run

### 1. Install dependencies
```bash
cd backend
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env — set DATABASE_URL, JWT_SECRET, OPENAI_API_KEY, etc.
```

### 3. Create PostgreSQL database
```sql
CREATE DATABASE lingobridge;
```

### 4. Run migrations (creates all tables)
```bash
npm run migrate
```

### 5. Start the server
```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

Server runs on `http://localhost:4000` by default.

---

## API Overview

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Register new user, returns JWT |
| POST | /api/auth/login | Login, returns JWT |
| GET | /api/auth/me | Get current user (auth required) |
| PATCH | /api/auth/me | Update profile (auth required) |

### Classes
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/classes | List classes (own or all for admin) |
| GET | /api/classes/:id | Get single class |
| POST | /api/classes | Create class |
| PATCH | /api/classes/:id | Update class (teacher/admin) |
| DELETE | /api/classes/:id | Delete class (teacher/admin) |

### Memberships
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/memberships?class_id= | List memberships |
| POST | /api/memberships | Join request |
| PATCH | /api/memberships/:id | Approve/reject (teacher/admin) |
| DELETE | /api/memberships/:id | Remove membership |

### Exams
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/exams?class_id= | List exams |
| POST | /api/exams | Create exam (teacher/admin) |
| PATCH | /api/exams/:id | Update exam |
| DELETE | /api/exams/:id | Delete exam |

### Words
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/words?exam_id= | List words |
| POST | /api/words | Add word |
| POST | /api/words/bulk | Bulk add words |
| PATCH | /api/words/:id | Update word |
| DELETE | /api/words/:id | Delete word |

### Upload / AI Extract
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/upload | Upload Excel/CSV file → { file_url } |
| POST | /api/extract | AI parse file into word list |

---

## Authentication

All routes except `/api/auth/register` and `/api/auth/login` require:
```
Authorization: Bearer <jwt_token>
```

Admin role is required for `/api/users` routes.