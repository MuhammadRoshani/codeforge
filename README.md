# CodeForge

> A full-stack e-learning platform built with Next.js, TypeScript, React, Redux Toolkit, MongoDB Atlas, and a production-oriented API architecture.

CodeForge is a modern learning platform designed around the complete course lifecycle: authentication, course discovery, shopping cart, checkout, payment verification, purchased-course management, comments, and administrative content management.

### 🌐 Live Preview

**[View the live CodeForge preview](https://codeforgeapp.ir)**

The project was built with a strong focus on **real-world application architecture**, **secure authentication flows**, **server-side validation**, **role-based access control**, and **production deployment** rather than being limited to a simple CRUD demonstration.

---

## Overview

CodeForge provides two main experiences:

- **Student-facing platform** for discovering courses, viewing course details, adding courses to a cart, completing checkout, and accessing purchased courses.
- **Administrative platform** for managing courses, users, orders, and moderated comments.

The backend is implemented through **Next.js App Router API routes**, with **MongoDB Atlas + Mongoose** as the data layer and **JWT-based authentication** for protected resources.

The application also integrates external services for:

- OTP authentication via **FarazSMS**
- Online payments through ZarinPal
- Persistent course thumbnail storage through Vercel Blob

---

## Key Features

### Authentication & Authorization

- OTP-based authentication using SMS
- User registration and login through phone verification
- JWT access-token authentication
- Refresh-token flow for persistent sessions
- Automatic token refresh
- HTTP-only cookie-based authentication flow
- Role-based access control
- Separate access rules for regular users and administrators
- Protected `/profile` and `/admin` routes
- Secure OTP and refresh-token hashing with `bcrypt`
- Rate limiting for OTP request and verification endpoints

### Course Management

- Course creation and editing
- Draft, published, and coming-soon course states
- Course slugs for clean dynamic URLs
- Course pricing and discounted pricing
- Free and paid courses
- Course difficulty levels
- Course prerequisites
- Course support options
- Chapters and lessons
- Lesson duration and free-preview support
- Course statistics such as student and comment counts
- Rich-text course descriptions with CKEditor 5
- Course thumbnail uploads using Vercel Blob

### Student Experience

- Latest-course discovery
- Dynamic course detail pages
- Course chapters and lessons
- Rich course descriptions
- Student comments
- Comment moderation workflow
- Shopping cart
- Cart persistence
- Duplicate-course prevention inside the cart
- Purchased-course management
- User profile area

### Shopping & Payments

- Multi-course cart checkout
- Prevention of purchasing already-owned courses
- Order creation before payment
- Pending / paid / failed / cancelled order states
- Free-order handling
- ZarinPal payment request flow
- Payment callback handling
- Server-side payment verification
- Order finalization after successful payment verification
- Purchased-course updates after successful payment

### Comment & Moderation System

- Course-specific comments
- Approved/unapproved comment states
- Admin approval
- Admin editing
- Admin deletion
- Admin replies
- Nested replies through parent comments
- Public display of approved comments only
- Database indexing for common course-comment queries

### Admin Panel

- Course management
- Course creation
- Course editing
- User management
- Order management
- Order detail pages
- Comment moderation
- Admin replies to comments
- Protected admin routes through role-based authorization

---

## Technical Highlights

### Production-oriented authentication architecture

CodeForge separates page navigation authentication from API authentication:

```text
Browser
   │
   ├── Page navigation
   │      └── Next.js Proxy
   │
   └── API requests
          └── Axios
                 │
                 ├── Access Token
                 └── Refresh Token
```

When an access token expires, the application can use the refresh token to establish a new authenticated session instead of immediately forcing the user to log in again.

Refresh tokens are also hashed before being stored, adding an additional security layer to the session system.

### OTP abuse protection

OTP endpoints include rate limiting based on both phone number and IP address.

The rate-limit system is persisted through **MongoDB Atlas** rather than relying only on in-memory state, making the mechanism more suitable for a deployed application environment.

### Server-side validation and sanitization

Important operations are validated on the server before database writes.

Rich-text course descriptions created with CKEditor are sanitized with `sanitize-html` before being stored and rendered, reducing the risk of unsafe HTML and XSS-related issues.

### Payment integrity

The application does not treat the browser callback alone as proof of payment.

The payment flow is:

```text
Cart
  │
  ▼
Create Order
  │
  ▼
Request Payment
  │
  ▼
ZarinPal
  │
  ▼
Payment Callback
  │
  ▼
Server-side Verification
  │
  ├── Failed → Order remains unsuccessful
  │
  └── Successful
         │
         ├── Mark order as paid
         ├── Store payment reference
         ├── Add courses to purchasedCourses
         └── Complete the purchase flow
```

This keeps order finalization dependent on server-side payment verification.

### Database modeling

MongoDB Atlas data models are implemented with Mongoose and include explicit TypeScript document types.

Course chapters and lessons are modeled as embedded documents because they belong directly to their parent course.

The main domain models are:

```text
User
Course
Order
Comment
RateLimit
```

### TypeScript migration

The project has been migrated from JavaScript/JSX toward a TypeScript/TSX codebase while preserving the existing application architecture and behavior.

The migration includes:

- Typed Mongoose models
- Typed API request/response structures
- Typed authentication models
- Typed Redux state
- Typed React components
- Typed hooks and utilities
- Shared authentication types under `src/types`

---

## Tech Stack

### Frontend

- **Next.js 16** — App Router and full-stack application framework
- **React 19**
- **TypeScript**
- **CSS Modules**
- **Framer Motion** — UI animations
- **React Icons**
- **React Hot Toast**
- **SweetAlert2**
- **CKEditor 5** — rich-text course content

### State Management

- **Redux Toolkit**
- **React Redux**
- Custom hooks for cart and authentication state
- Cart persistence through a dedicated provider

### Backend

- **Next.js Route Handlers**
- **Node.js**
- **Axios**
- **JWT**
- **bcrypt**

### Database

- **MongoDB Atlas**
- **Mongoose**

### Security & Validation

- JWT access and refresh tokens
- HTTP-only cookie authentication
- OTP hashing
- Refresh-token hashing
- MongoDB-backed rate limiting
- Role-based authorization
- Server-side request validation
- HTML sanitization with `sanitize-html`

### External Services

- **ZarinPal** — payment gateway
- **FarazSMS** — OTP SMS delivery
- **Vercel Blob** — course thumbnail storage

### Deployment

- **Vercel** — application hosting and deployment
- **Cloudflare** — domain and DNS management
- **MongoDB Atlas** — production database
- **Vercel Blob** — persistent image storage

---

## Architecture

The project uses a feature-oriented structure on top of the Next.js App Router:

```text
src/
├── app/
│   ├── (admin)/
│   │   └── admin/
│   ├── (auth)/
│   │   └── auth/
│   ├── (public)/
│   │   ├── course/
│   │   ├── cart/
│   │   └── payment/
│   ├── (user)/
│   │   └── profile/
│   └── api/
│       ├── admin/
│       ├── auth/
│       ├── cart/
│       ├── courses/
│       ├── orders/
│       ├── payment/
│       └── profile/
│
├── components/
│   ├── common/
│   ├── features/
│   ├── layout/
│   ├── sections/
│   ├── shared/
│   └── ui/
│
├── configs/
│   └── db.ts
│
├── contexts/
│   └── AuthContext.tsx
│
├── hooks/
│
├── models/
│   ├── Comment.ts
│   ├── Course.ts
│   ├── Order.ts
│   ├── RateLimit.ts
│   └── User.ts
│
├── providers/
│
├── redux/
│   ├── slices/
│   └── store.ts
│
├── types/
│   └── auth.ts
│
└── utils/
    ├── auth.ts
    ├── axios.ts
    ├── courseValidation.ts
    └── rateLimit.ts
```

### Route organization

Next.js route groups are used to separate application concerns without affecting public URLs:

```text
(app groups)
│
├── (public)   → Public storefront and course pages
├── (auth)     → Authentication
├── (user)     → Authenticated student area
└── (admin)    → Protected administration area
```

Dynamic routes are used for resources such as:

```text
/course/[slug]
/admin/courses/[slug]/edit
/admin/orders/[_id]
```

---

## API Overview

The backend is implemented using Next.js Route Handlers.

### Authentication

```text
POST   /api/auth/sms/send
POST   /api/auth/sms/verify
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/auth/me
```

### Courses

```text
GET    /api/courses/latest
GET    /api/courses/[slug]/comments
POST   /api/courses/[slug]/comment
GET    /api/profile/courses
```

### Cart & Orders

```text
POST   /api/cart/checkout
POST   /api/orders
```

### Payments

```text
POST   /api/payment/request
POST   /api/payment/verify
```

### Admin — Courses

```text
GET    /api/admin/courses
POST   /api/admin/courses/add
GET    /api/admin/courses/add
GET    /api/admin/courses/[slug]
PUT    /api/admin/courses/[slug]
DELETE /api/admin/courses/[slug]
```

### Admin — Users

```text
GET    /api/admin/users
PATCH  /api/admin/users/[_id]
```

### Admin — Orders

```text
GET    /api/admin/orders
GET    /api/admin/orders/[_id]
```

### Admin — Comments

```text
GET    /api/admin/comments
PATCH  /api/admin/comments/[_id]/approve
PATCH  /api/admin/comments/[_id]/edit
POST   /api/admin/comments/[_id]/reply
DELETE /api/admin/comments/[_id]/delete
```

---

## Data Model

The main relationships can be summarized as:

```text
User
 │
 ├── purchasedCourses ──────► Course
 │
 ├── comments ───────────────► Comment
 │
 └── orders ──────────────────► Order
                                  │
                                  └── items ──► Course

Course
 │
 ├── chapters
 │     └── lessons
 │
 ├── teacher ─────────────────► User
 │
 └── comments ────────────────► Comment
```

### Course structure

A course contains embedded chapters, and each chapter contains embedded lessons:

```text
Course
 ├── Chapter
 │    ├── Lesson
 │    ├── Lesson
 │    └── ...
 ├── Chapter
 │    └── ...
 └── ...
```

This keeps tightly coupled course content within the course document.

---

## Project Structure Principles

The project separates responsibilities across several layers:

| Layer         | Responsibility                                                 |
| ------------- | -------------------------------------------------------------- |
| `app/`        | Routes, pages, layouts, and API route handlers                 |
| `components/` | Reusable UI and feature components                             |
| `models/`     | MongoDB/Mongoose data models                                   |
| `redux/`      | Global client-side state                                       |
| `contexts/`   | Authentication context                                         |
| `providers/`  | Application-level providers and persistence                    |
| `hooks/`      | Reusable React hooks                                           |
| `utils/`      | Authentication, validation, rate limiting, and Axios utilities |
| `types/`      | Shared TypeScript types                                        |

This separation keeps UI, application logic, persistence, and API concerns from becoming tightly coupled.

---

## Getting Started

### Prerequisites

Make sure you have:

- Node.js
- npm
- MongoDB Atlas
- Access to the external services used by the application if you want to test OTP and payment flows

### Installation

Clone the repository and install dependencies:

```bash
npm install
```

Create an environment file:

```text
.env.local
```

Add the required environment variables described below.

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## Environment Variables

The application expects the following environment variables:

```env
MONGO_URI=

ACCESS_TOKEN_SECRET=
REFRESH_TOKEN_SECRET=

IRANPAYAMAK_API_KEY=
IRANPAYAMAK_LINE_NUMBER=
IRANPAYAMAK_PATTERN_ID=

ZARINPAL_MERCHANT_ID=
ZARINPAL_CALLBACK_URL=

BLOB_READ_WRITE_TOKEN=
```

### Notes

- Never commit real credentials or secrets to source control.
- Payment and SMS integrations require valid provider credentials.
- ZarinPal payment requests in the current implementation use the sandbox gateway endpoints.
- `ZARINPAL_CALLBACK_URL` should point to the application's payment callback route.
- Vercel Blob requires its corresponding storage token in the deployment environment.

---

## Available Scripts

```bash
# Start development server
npm run dev

# Create a production build
npm run build

# Start the production server
npm run start

# Run ESLint
npm run lint
```

For TypeScript validation:

```bash
npx tsc --noEmit
```

---

## Production & Deployment

CodeForge is structured for deployment on Vercel.

A production deployment requires:

1. A MongoDB Atlas connection.
2. Production environment variables.
3. Vercel Blob configuration for uploaded course thumbnails.
4. SMS provider credentials for OTP authentication.
5. ZarinPal credentials and a valid callback URL for payment flows.

The application uses persistent external storage for uploaded course thumbnails instead of relying on the local deployment filesystem.

---

## Security Considerations

Several security-related mechanisms are implemented throughout the application:

- JWT authentication
- Access-token refresh flow
- Refresh-token hashing
- HTTP-only cookies
- `bcrypt` hashing for OTP and refresh tokens
- Role-based route protection
- Server-side authorization checks
- OTP rate limiting
- IP-based rate limiting
- Phone-based rate limiting
- Input validation
- HTML sanitization before rendering rich-text content
- Server-side payment verification
- Prevention of unauthorized access to admin APIs

Security-sensitive operations are intentionally handled on the server rather than relying only on client-side checks.

---

## What This Project Demonstrates

CodeForge demonstrates experience beyond basic frontend development.

It brings together:

- Full-stack Next.js development
- React application architecture
- TypeScript
- REST-style API design with Next.js Route Handlers
- MongoDB and Mongoose data modeling
- Authentication and authorization
- JWT access/refresh token flows
- OTP authentication
- Rate limiting
- Secure OTP and token handling
- E-commerce-style cart and order workflows
- Payment gateway integration
- Admin dashboard architecture
- Rich-text content management
- File/image storage
- Client-side state management with Redux Toolkit
- Server-side validation and sanitization
- Production deployment with Vercel

The main goal is to model a realistic e-learning product rather than a collection of isolated demo features.

---

## Future Improvements

Planned improvements for the next iterations of CodeForge include:

- **TanStack Query** for server-state management, caching, refetching, and API data synchronization where it provides a clear benefit.
- **Dark mode** with a consistent theme system across the application.
- **Full responsive design** across desktop, tablet, and mobile screen sizes.
- Expanding the remaining administration modules.
- Adding automated tests for API, authentication, and payment flows.
- Introducing more comprehensive API response types.
- Adding course search and filtering.
- Improving analytics and admin dashboard reporting.
- Adding pagination to large admin lists.
- Expanding the student learning experience.
- Adding more granular permissions for future staff roles.
- Introducing automated CI checks for type checking, linting, and production builds.

## Project Status

**Active full-stack project / portfolio application**

The core platform includes authentication, course management, cart and checkout, payment processing, user profiles, comments and moderation, and administrative workflows.

---

## License

This project is currently intended as a portfolio / demonstration project.

If you plan to reuse the source code, review the licensing and third-party service requirements for the specific deployment.
