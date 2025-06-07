# Marine Management System - Backend

## Project Overview

The Marine Management System backend provides API services for managing marine vessel documentation, project tracking, and document revision control. This server-side application handles database operations, file storage, authentication, and business logic for the Marine Management System.

## Technical Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB
- **Authentication:** JWT-based authentication
- **File Storage:** Local filesystem

## Key Features

### Document Tracking System

- **Document Storage:** File uploads are stored in the filesystem under `/uploads/documents`
- **Revision Control:** Maintains document history with versioning
- **Metadata Management:** Stores document metadata (type, project code, status, etc.)
- **File Management:** Supports various file formats including PDF, Office documents, CAD files, and images

### Project Management

- Project creation and tracking
- Assignment of documents to specific projects
- Project status monitoring

## System Architecture

The backend follows an MVC-like architecture:

- **Models:** MongoDB schemas defined using Mongoose
- **Routes:** REST API endpoints
- **Services:** Business logic and operations
- **Middleware:** Request processing, authentication, and validation

## Installation and Setup

### Prerequisites

- Node.js version 20.x or higher
- MongoDB 4.4 or higher
- npm or yarn package manager

### Installation Steps

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Configure environment variables (create a `.env` file)
   ```
   PORT=3000
   CONNECTION_STRING=mongodb://localhost:27017/marine_management
   ```
4. Start the server:
   ```
   npm start
   ```

## API Endpoints

### Document Management

- `GET /api/documents` - List documents with optional filters
- `POST /api/documents` - Create a new document with file upload
- `GET /api/documents/:id` - Get document details with revisions
- `PUT /api/documents/:id` - Update document metadata
- `POST /api/documents/:id/revisions` - Add a new revision with file

### File Operations

- `GET /uploads/documents/:fileName` - Serve document files

## Storage System

The system uses filesystem-based storage for document files. Files are stored in the `/uploads/documents` directory with unique filenames to prevent collisions. File metadata and paths are stored in the MongoDB database.

## Database Schema

### Document Collection

Stores document metadata with fields for:
- Document number
- Title
- Type
- Project code
- Status
- Approval status
- Creation and modification timestamps

### Revision Collection

Stores document revision data with:
- Reference to parent document
- Revision number
- File metadata (name, type, size)
- File path in filesystem
- Upload information and timestamps

## Development Notes

- Previously attempted to use GridFS for file storage but reverted to filesystem storage due to compatibility issues with Node.js v20 and third-party packages
- Static file serving is implemented for document downloads
- Multer is used for handling file uploads