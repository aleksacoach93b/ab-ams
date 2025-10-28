# AB - Athlete Management System (Production)

## 🚀 Deployment Ready Application

This is the production-ready version of the AB Athlete Management System, configured for deployment on Vercel with Supabase database.

## 📋 Prerequisites

Before deployment, you need:

1. **Supabase Account** - PostgreSQL database
2. **Vercel Account** - Application hosting
3. **Resend Account** - Email service (optional)
4. **Vercel Blob** - File storage

## 🔧 Environment Variables

Configure these environment variables in Vercel:

### Database (Supabase)
```
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
```

### Authentication
```
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NEXTAUTH_SECRET=your-nextauth-secret-change-this-in-production
NEXTAUTH_URL=https://your-app.vercel.app
```

### File Storage (Vercel Blob)
```
BLOB_READ_WRITE_TOKEN=your-vercel-blob-token-here
```

### App Configuration
```
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_APP_NAME=AB - AMS
```

### Email Service (Resend - Optional)
```
RESEND_API_KEY=your-resend-api-key-here
```

## 🗄️ Database Setup

1. Create a new Supabase project
2. Get your database URL from Settings > Database
3. Run database migrations:
   ```bash
   npx prisma db push
   ```
4. Seed initial data:
   ```bash
   npm run db:seed
   ```

## 📁 File Storage Migration

The application is configured to use Vercel Blob for file storage. All uploaded files (avatars, reports, media) will be stored in Vercel Blob instead of local filesystem.

## 🔐 Security Features

- JWT-based authentication
- Role-based access control (ADMIN, COACH, STAFF, PLAYER)
- Middleware protection for all routes
- Password hashing with bcrypt
- Login attempt logging
- File access logging

## 🚀 Deployment Steps

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial production commit"
   git remote add origin https://github.com/yourusername/ab-ams.git
   git push -u origin main
   ```

2. **Deploy on Vercel**
   - Connect your GitHub repository
   - Configure environment variables
   - Deploy

3. **Database Setup**
   - Run migrations in Supabase SQL Editor
   - Seed initial admin user

## 📊 Features

- **Player Management**: CRUD operations, avatars, media, notes
- **Staff Management**: Role-based permissions
- **Event Management**: Calendar, Match Day Tags
- **Reports System**: Folders, visibility control, CSV export
- **Chat System**: Real-time messaging, file uploads
- **Analytics**: Daily data collection, CSV export
- **Notifications**: Real-time updates
- **Mobile Responsive**: Optimized for all devices

## 🔄 Local Development

For local development, use the original folder:
```
Aleksa Athlete Monitoring App/
```

This production folder is specifically configured for deployment.

## 📞 Support

For any issues or questions, contact the development team.

---

**Version**: 1.0.0  
**Last Updated**: October 27, 2025  
**Status**: Production Ready ✅# Force deploy Tue Oct 28 14:07:39 EET 2025

# Force rebuild Tue Oct 28 22:10:07 EET 2025
