# Math-Falta Backend API

This README documents the Math-Falta backend API (Express + MongoDB). It's intended for developers integrating the Math-Falta frontend or building clients. It lists all routes, request/response shapes, example MongoDB documents, validation rules, and example responses.

Base URL (local): http://localhost:PORT (default PORT is from env; server mounts APIs under `/api`)

API prefix: /api

Authentication: Cookie-based JWT. Successful sign-in/sign-up sets an httpOnly cookie `token`. Protected routes require this cookie and will infer the user from the token (see `auth.middleware`). Admin routes require an admin role (checked by `admin.middleware`).

Contents

- Models (valid MongoDB documents and validation notes)
- Public/Auth routes
- User routes (authenticated)
- Quiz routes (authenticated)
- Admin routes (authenticated + admin)
- Examples and sample responses
- Quick start

---

## Models / Schemas (summary)

All samples below are valid JSON documents as stored in MongoDB collections. Field types and validation are summarized from the Mongoose schemas.

### Users

Collection: `users`

Fields:

- name: string (required)
- password: string (hashed, required, minLength 6)
- email: string (required, unique, email format)
- role: string ("student" | "admin") default: "student"
- totalScore: number (optional, default 0)
- parentNumber: string (Egypt mobile format) required; regex: `^01[0,1,2,5][0-9]{8}$`
- grade: string (required) one of `"5" | "6" | "7" | "8" | "9"`
- timestamps: createdAt, updatedAt

Example document:
{
"\_id": "64b7f...",
"name": "Ahmed Ali",
"email": "ahmed@example.com",
"password": "<bcrypt-hash>",
"role": "student",
"totalScore": 5,
"parentNumber": "01234567890",
"grade": "7",
"createdAt": "2025-...",
"updatedAt": "2025-..."
}

Notes:

- `email` is unique.
- `grade` must match 5-9.

---

### Quizzes

Collection: `quizzes`

Fields:

- title: string (required)
- grade: string (required) one of 5-9
- questions: array of question subdocuments (required). Each question contains:
  - \_id: ObjectId (auto)
  - question: string (required unless image is present)
  - image: { url: string, publicId: string, format?: string } (optional)
  - options: array of 4 strings (required)
  - answer: string (required) - for image questions answers must be one of "A","B","C","D" and for image questions options are normalized with a prefix (e.g. "A) ...")
- isDeleted: boolean (soft delete)
- deletedAt: date | null
- timestamps

Example quiz document:
{
"\_id": "64c83...",
"title": "Fraction basics",
"grade": "6",
"questions": [
{
"\_id": "64c83q1...",
"question": "What is 1/2 + 1/3?",
"options": ["A) 5/6","B) 2/3","C) 3/4","D) 7/6"],
"answer": "A"
},
{
"\_id": "64c83q2...",
"image": { "url": "https://res.cloudinary.com/..../img.png", "publicId": "abc123" },
"options": ["A) 1","B) 0","C) -1","D) 2"],
"answer": "A"
}
],
"isDeleted": false
}

Notes:

- `questions.options` length is validated to be exactly 4.
- For image questions the `answer` must be one of 'A'..'D' (and options are normalized by the model pre-save hook).

---

### QuizzesAnswers

Collection: `quizzesanswers`

Fields:

- quizId: ObjectId (ref Quizzes) required
- title: string required
- userId: ObjectId (ref Users) required
- score: number (computed, default 0)
- questions: array of answered question objects:
  - questionId: ObjectId (required)
  - userAnswer: string (required)
  - isCorrect: boolean (computed)
- timestamps

Example stored answers document (created when a user submits answers):
{
"\_id": "64d0a...",
"quizId": "64c83...",
"title": "Fraction basics",
"userId": "64b7f...",
"score": 1,
"questions": [
{ "questionId": "64c83q1...", "userAnswer": "A", "isCorrect": true },
{ "questionId": "64c83q2...", "userAnswer": "B", "isCorrect": false }
],
"createdAt": "..."
}

Notes:

- `pre('save')` computes `score` by comparing provided `userAnswer` with the original quiz question `answer`.

---

### Lessons

Collection: `lessons`

Fields:

- title: string required
- grade: string required (5-9)
- topic: string required
- video: string (URL) required
- docs: array of { url, publicId, label, originalName }
- isDeleted: boolean
- deletedAt: date | null
- timestamps

Example lesson:
{
"\_id": "64e1...",
"title": "Decimals - intro",
"grade": "5",
"topic": "Decimals",
"video": "https://youtube.com/..",
"docs": [ { "url": "https://.../doc.pdf", "publicId": "doc123", "label": "Lesson Notes", "originalName": "notes.pdf" } ]
}

---

## Authentication & headers

- Authentication uses a JWT inside a cookie named `token` (httpOnly). Include the cookie in requests in your client.
- For admin routes, the token must be for a user with `role: 'admin'`.
- Content-Type:
  - JSON endpoints expect `application/json`.
  - Admin create/update quiz routes accept multipart/form-data (for images) with a `questions` field that contains JSON (stringified array) and image fields named `image0`, `image1`, … matching question indexes.

---

## Routes (detailed)

Note: All routes are prefixed with `/api` (e.g. full path `/api/auth/sign-up`).

### Auth routes (public)

1. POST /api/auth/sign-up

- Description: Create a new student user. Sets `role: 'student'`.
- Body (JSON):
  {
  "name": "Ahmed Ali",
  "email": "ahmed@example.com",
  "password": "password123",
  "parentNumber": "01234567890",
  "grade": "7"
  }
- Response 201 (success):
  {
  "success": true,
  "msg": "User created successfully",
  "data": { /_ created user document (password hashed) _/ }
  }
- Errors: 400 if email already exists or validation fails.
- Side effect: A cookie `token` is set in the response.

2. POST /api/auth/sign-in

- Description: Sign in existing user (student or admin).
- Body (JSON):
  { "email": "ahmed@example.com", "password": "password123" }
- Response 200:
  {
  "success": true,
  "msg": "User signed in successfully",
  "data": { /_ user document _/ }
  }
- Errors: 400 invalid email/password.
- Side effect: A cookie `token` is set in the response.

---

### User routes (requires authentication)

Base: /api/users

All these routes use `auth.middleware` which expects the JWT cookie.

1. GET /api/users/leaderboard

- Description: Returns list of users with their quizzes and computed `totalScore` (aggregation over `quizzesanswers`).
- Response 200:
  { "success": true, "data": [ { "name": "...", "grade": "7", "quizzes": [ { title, score } ], "totalScore": 10 }, ... ] }

2. GET /api/users/me

- Description: Returns the authenticated user's profile plus quizzes and computed totalScore.
- Response 200:
  { "success": true, "data": { "username": "...", "grade": "7", "totalScore": 5, "parentNumber": "...", "email": "...", "quizzes": [ { title, _id } ] } }
- Error 404 if user not found.

3. PUT /api/users/me

- Description: Update user profile (not implemented in controller — placeholder exists). Expect JSON with updatable fields (e.g. name, parentNumber). Controller currently empty; implement as needed.

---

### Lesson routes (requires authentication)

Base: /api/lessons

1. GET /api/lessons/

- Description: Returns all lessons for the authenticated user's grade (where isDeleted=false).
- Response 200:
  { "success": true, "data": [ lesson, ... ] }

2. GET /api/lessons/:id

- Description: Fetch a single lesson by id. Validates that lesson.grade === req.user.grade or returns 403.
- Response 200: { success: true, data: lesson }
- Errors: 400 missing id, 403 forbidden, 404 not found.

---

### Quiz routes (requires authentication)

Base: /api/quizzes

1. GET /api/quizzes/:id

- Description: Fetch quiz by id (without exposing the `answer` field — controller uses `.select("-answer")`). Ensures quiz grade matches user grade.
- Response 200: { success: true, data: quiz }
- Errors: 400 missing id, 403 forbidden, 404 not found.

2. GET /api/quizzes/titles

- Description: Returns quiz titles available for the authenticated user's grade (controller uses req.user.grade).
- Response 200: { success: true, data: ["Title A", "Title B"] }
- Errors: 404 if none found.

3. GET /api/quizzes/answers

- Description: Lists the authenticated user's quiz results (score, title, date). Useful for a "My quizzes" or results view.
- Response 200: { success: true, data: [ { "_id": "<quizAnswersId>", "score": 3, "title": "Fraction basics", "createdAt": "..." }, ... ] }
- Errors: 404 if none found.

4. GET /api/quizzes/answers/:quizAnswersId

- Description: Returns a user's submitted answers by `quizAnswersId` (requires user to own the answers). Response contains merged original questions with userAnswer and isCorrect.
- Response 200:
  { success: true, data: { quizId, title, userId, score, questions: [ { questionId, question, options, answer, userAnswer, isCorrect } ] } }
- Errors: 400, 404

5. POST /api/quizzes/answers

- Description: Submit a quiz answers document for the current user. The request body should be the quizAnswers object (matching QuizzesAnswers schema) — the controller expects a body with quizId (or \_id) and questions array.
- Body example:
  {
  "\_id": "<quizId>",
  "title": "Fraction basics",
  "questions": [ { "questionId": "<qId>", "userAnswer": "A" }, ... ]
  }
- Controller behavior: It sets `quizAnswers.quizId = quizAnswers._id`, sets `userId` from the authenticated user, deletes the incoming `_id` and `__v`, and creates a QuizzesAnswers document. `pre('save')` computes score.
- Response 201: { success: true, data: createdQuizAnswers }

---

### Admin routes (requires authentication + admin)

Base: /api/admin/

Note: All admin endpoints apply `auth.middleware` and `admin.middleware`.

#### Admin - Quizzes (/api/admin/quizzes)

1. GET /api/admin/quizzes/

- Get all quizzes (including all grades, not deleted only).
- Response 200: { success: true, data: [ quiz, ... ] }

2. GET /api/admin/quizzes/:id

- Get quiz by id.

3. GET /api/admin/quizzes/answers/:quizAnswersId/:id

- Get quiz answers of user `id` matching `quizAnswersId`. Responds with merged questions and user answers.

4. GET /api/admin/quizzes/trash

- Get all soft-deleted quizzes.

5. POST /api/admin/quizzes/

- Create a quiz. Multipart/form-data for images is supported.
- Fields:
  - `title` (string)
  - `grade` (string 5-9)
  - `questions` (stringified JSON array) — Example: `[ { "question": "...", "options": ["opt1","opt2","opt3","opt4"], "answer": "A" }, ... ]`
  - Image fields optional: `image0`, `image1`, ... files corresponding to question indexes.
- Response 201: { success: true, data: quiz }

6. PUT /api/admin/quizzes/:id

- Update quiz fields (title, grade) with JSON body.

7. PUT /api/admin/quizzes/:id/questions/add

- Add questions to an existing quiz. Accepts `questions` stringified JSON and optional image fields `image0`...

8. PUT /api/admin/quizzes/:quizId/questions/:questionId

- Update a single question. Accepts JSON fields `question`, `options`, `answer` and optional file `image`.

9. DELETE /api/admin/quizzes/:quizId/questions/:questionId

- Delete a single question from quiz (soft deletes image from cloudinary if present).

10. PUT /api/admin/quizzes/:id/delete

- Soft delete quiz (sets `isDeleted=true` and `deletedAt`)

11. PUT /api/admin/quizzes/:id/restore

- Restore soft-deleted quiz

12. DELETE /api/admin/quizzes/:id

- Permanently delete quiz (also removes images from Cloudinary for each question).

#### Admin - Lessons (/api/admin/lessons)

Endpoints supported (all admin-only):

- GET /api/admin/lessons/ - list all lessons
- GET /api/admin/lessons/:id - get lesson by id
- POST /api/admin/lessons/ - create lesson (multipart docs via `uploadDocs` util)
  - Body: multipart fields like `title`, `grade`, `topic`, `video`, and docs files
- PUT /api/admin/lessons/:id - update lesson fields
- PUT /api/admin/lessons/:id/restore - restore soft deleted
- PUT /api/admin/lessons/:id/delete - soft delete
- DELETE /api/admin/lessons/:id - permanent delete
- POST /api/admin/lessons/:id/docs - add docs (multipart)
- DELETE /api/admin/lessons/:lessonId/docs/:docId - delete a single doc
- PUT /api/admin/lessons/:lessonId/docs/:docId - update doc label
- PUT /api/admin/lessons/trash - list soft-deleted lessons

#### Admin - Users (/api/admin/users)

- GET /api/admin/users/ - list all users
- GET /api/admin/users/:id - get user by id
- POST /api/admin/users/ - create admin user (controller `createAdmin`)
- PUT /api/admin/users/:id - update user
- DELETE /api/admin/users/:id - delete user

---

## Example requests & example responses

### 1) Sign-up (POST /api/auth/sign-up)

Request JSON:
{
"name": "Aya Mohamed",
"email": "aya@example.com",
"password": "secret123",
"parentNumber": "01012345678",
"grade": "5"
}

Example success response (201):
{
"success": true,
"msg": "User created successfully",
"data": {
"\_id": "64b7f...",
"name": "Aya Mohamed",
"email": "aya@example.com",
"role": "student",
"parentNumber": "01012345678",
"grade": "5",
"createdAt": "...",
"updatedAt": "..."
}
}

Cookie: `token` httpOnly set in response.

### 2) Submit quiz answers (POST /api/quizzes/answers)

Request JSON (client should build this using the quiz data shown to user):
{
"\_id": "64c83...", // quiz id (controller will move this into quizId)
"title": "Fraction basics",
"questions": [
{ "questionId": "64c83q1...", "userAnswer": "A" },
{ "questionId": "64c83q2...", "userAnswer": "B" }
]
}

Example success response (201):
{
"success": true,
"data": {
"\_id": "64d0a...",
"quizId": "64c83...",
"title": "Fraction basics",
"userId": "64b7f...",
"score": 1,
"questions": [ { "questionId": "64c83q1...", "userAnswer": "A", "isCorrect": true }, ... ]
}
}

### 3) Get merged quiz answers (GET /api/quizzes/answers/:quizAnswersId)

Response 200 example:
{
"success": true,
"data": {
"quizId": "64c83...",
"title": "Fraction basics",
"userId": "64b7f...",
"score": 1,
"questions": [
{
"questionId": "64c83q1...",
"question": "What is 1/2 + 1/3?",
"options": ["A) 5/6","B) 2/3","C) 3/4","D) 7/6"],
"answer": "A",
"userAnswer": "A",
"isCorrect": true
},
...
]
}
}

---

## Quick start (run locally)

1. Copy environment variables into `.env.*` files. Required values (from code):

- PORT
- MONGODB_URI
- JWT_SECRET
- JWT_ENDS_IN
- Cloudinary and other config if using upload features

2. Install and run:

```powershell
npm install
npm run dev  # or npm start
```

3. The server will run and listen on http://localhost:PORT.

---

## Notes, tips & caveats

- The `PUT /api/users/me` controller is a stub and currently unimplemented.
- Updated: Quizzes now use `title` (not `topic`) and there is a new `GET /api/quizzes/answers` route that lists the authenticated user's quiz results.
- The `GET /api/quizzes/titles` route returns titles for the authenticated user's grade (it uses `req.user.grade`).
- Admin create/update quiz endpoints accept `questions` as a JSON-stringified array together with file uploads; make sure the client constructs the multipart body correctly and uses fields named `image0`, `image1`, ... for question images.
- When creating `Quizzes` with image questions, the model's pre-save hook enforces that options are formatted and answer is one of `A,B,C,D`.
- `QuizzesAnswers` pre-save computes the `score` automatically.

---

If you'd like, I can:

- Extend the README with OpenAPI/Swagger YAML.
- Generate Postman collection or sample curl commands for each route.
- Implement the missing `PUT /api/users/me` handler.
