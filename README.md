# Tool Website: All-in-One Online Tools

A collection of free online tools for PDF manipulation, image editing, code conversion, and media compression. Built with React for the frontend and Node.js/Express for the backend.

## Deployment Guide

This project is set up for deployment with:
- Frontend: Vercel
- Backend: Render

### Backend Deployment (Render)

1. Sign up or log in to [Render](https://render.com)
2. Click "New +" and select "Web Service"
3. Connect your GitHub repository
4. Configure your service:
   - Name: `toolwebsite-backend`
   - Root Directory: `backend`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Set the following environment variables:
   - `NODE_ENV`: production
   - `PORT`: 5000
   - `MONGO_URI`: Your MongoDB connection string
   - `EMAIL`: Your email address for contact form
   - `EMAIL_PASSWORD`: Your email app password
   - `FRONTEND_URL`: Your Vercel frontend URL (e.g., https://toolwebsite.vercel.app)
6. Click "Create Web Service"

### Frontend Deployment (Vercel)

1. Sign up or log in to [Vercel](https://vercel.com)
2. Click "New Project" and import your GitHub repository
3. Configure your project:
   - Framework Preset: Create React App
   - Root Directory: `frontend`
4. Add the following environment variables:
   - `REACT_APP_API_URL`: Your Render backend URL (e.g., https://toolwebsite-backend.onrender.com)
   - `REACT_APP_SITE_URL`: Your Vercel frontend URL (e.g., https://toolwebsite.vercel.app)
5. Click "Deploy"

## Environment Variables

### Backend (.env)
```
PORT=5000
MONGO_URI=your_mongodb_connection_string
NODE_ENV=production
EMAIL=your_email_address
EMAIL_PASSWORD=your_email_app_password
FRONTEND_URL=https://toolwebsite.vercel.app
```

### Frontend (.env)
```
REACT_APP_API_URL=https://toolwebsite-backend.onrender.com
REACT_APP_SITE_URL=https://toolwebsite.vercel.app
```

## Local Development

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm start
```

## Features

- PDF Merger: Combine multiple PDF files into one document
- Image Background Remover: Remove backgrounds from images with AI
- HTML to React Converter: Convert HTML code to React components
- Media Compressor: Compress audio, video, and image files

## Technology Stack

- Frontend: React, Bootstrap, React Router, Axios
- Backend: Node.js, Express, MongoDB
- Deployment: Vercel (frontend), Render (backend) 