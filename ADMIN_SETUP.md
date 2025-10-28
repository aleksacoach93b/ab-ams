# Admin Setup Guide - AB - Athlete Management System

## 🔐 Secure Admin Login System

This guide will help you set up the secure admin-only login system for your AB - Athlete Management System.

### 1. Environment Configuration

Create a `.env` file in your project root with the following configuration:

```env
# Database
DATABASE_URL="file:./prisma/dev.db"

# Authentication
JWT_SECRET="ultrax-wellness-jwt-secret-key-2024-secure"
NEXTAUTH_SECRET="ultrax-wellness-nextauth-secret-key-2024"
NEXTAUTH_URL="http://localhost:3000"

# Admin Credentials (KEEP THESE SECURE!)
ADMIN_EMAIL="admin@ultraxwellness.com"
ADMIN_PASSWORD="UltraX2024!Admin#Secure"

# Email Service (Resend)
RESEND_API_KEY="your-resend-api-key-here"

# File Storage (Vercel Blob)
BLOB_READ_WRITE_TOKEN="your-vercel-blob-token-here"

# App Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="AB - Athlete Management System"
```

**IMPORTANT:** Change the default admin credentials before deploying to production!

### 2. Initialize Admin User

Run the admin setup script to create your admin user in the database:

```bash
npx tsx scripts/seed-admin.ts
```

This will:
- Check if an admin user already exists
- Create a new admin user if none exists
- Set up proper permissions and role

### 3. Admin Login Access

Access the admin login at: **`http://localhost:3000/login`**

**Security Features:**
- ✅ Only the admin email can log in
- ✅ Failed login attempt tracking (max 3 attempts)
- ✅ Account lockout for 5 minutes after failed attempts
- ✅ Secure JWT tokens with 24-hour expiration
- ✅ Encrypted password storage
- ✅ All login attempts are logged

### 4. Login Credentials

Use the credentials from your `.env` file:
- **Email:** `admin@ultraxwellness.com` (or your custom email)
- **Password:** `UltraX2024!Admin#Secure` (or your custom password)

### 5. Admin Dashboard

After successful login, you'll be redirected to: **`/dashboard/admin`**

The admin dashboard includes:
- User Management
- System Settings
- Security & Access Controls
- Analytics & Reports
- Database Management
- Email & Notifications

### 6. Other Login Pages

The system now has separate login pages for different user types:

- **Admin Login:** `/login` (secure, admin-only)
- **Staff Login:** `/staff-login` (for coaches and staff)
- **Player Login:** `/player-login` (for athletes)

### 7. Security Best Practices

1. **Change Default Credentials:** Always update the admin email and password
2. **Use Strong Passwords:** Minimum 12 characters with mixed case, numbers, and symbols
3. **Environment Variables:** Never commit `.env` files to version control
4. **Regular Updates:** Periodically change admin credentials
5. **Monitor Access:** Check admin login logs regularly

### 8. Troubleshooting

**Problem:** "Invalid admin credentials" error
- **Solution:** Verify your `.env` file has the correct credentials

**Problem:** "Account locked" message
- **Solution:** Wait 5 minutes or clear localStorage in browser

**Problem:** Can't access admin dashboard
- **Solution:** Ensure you're using the correct admin email from `.env`

**Problem:** Admin user not found
- **Solution:** Run `npx tsx scripts/seed-admin.ts` to create the admin user

### 9. Next Steps

Now that your admin login is secure, you can:
1. Create coach accounts through the admin dashboard
2. Set up player accounts and profiles
3. Configure team settings and permissions
4. Customize the system for your specific needs

---

**⚠️ Security Note:** The admin login page is now exclusively for you as the system administrator. Coaches and players will have their own separate login systems that you'll set up through the admin dashboard.
