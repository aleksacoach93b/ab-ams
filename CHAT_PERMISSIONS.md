# 💬 Chat Permissions - Admin Only Control

## 🎯 **Overview**

The chat system now implements **admin-only control** where only administrators can create chat rooms and manage participants. All other users (players, staff, coaches) can only participate in chats they are added to by admins.

## 🔐 **Permission Structure**

### **Admin Users (ADMIN role)**
- ✅ **Can create** new chat rooms
- ✅ **Can add members** to existing chat rooms
- ✅ **Can remove members** from chat rooms
- ✅ **Can rename** chat rooms
- ✅ **Can delete** chat rooms
- ✅ **Can participate** in all chats

### **Non-Admin Users (PLAYER, STAFF, COACH roles)**
- ❌ **Cannot create** new chat rooms
- ❌ **Cannot add members** to chat rooms
- ❌ **Cannot remove other members** from chat rooms
- ✅ **Can participate** in chats they are added to
- ✅ **Can leave** chats (remove themselves)
- ✅ **Can send messages** in chats they are part of

## 🛡️ **Security Implementation**

### **Backend API Protection**
1. **Chat Room Creation** (`POST /api/chat/rooms`)
   - Checks if user role is `ADMIN`
   - Returns `403 Forbidden` for non-admin users
   - Error message: "Only admins can create chat rooms"

2. **Add Members** (`POST /api/chat/rooms/[roomId]/participants`)
   - Checks if user is admin of the specific chat room
   - Returns `403 Forbidden` for non-admin users
   - Error message: "Only admins can add members to chat room"

3. **Remove Members** (`DELETE /api/chat/rooms/[roomId]/participants`)
   - Allows admins to remove any member
   - Allows users to remove themselves
   - Returns `403 Forbidden` for other cases

### **Frontend UI Protection**
1. **New Chat Button**
   - Only visible to users with `ADMIN` role
   - Hidden for players, staff, and coaches
   - Shows error message if non-admin tries to create chat

2. **Add Members Button**
   - Only visible to users with `ADMIN` role
   - Hidden for players, staff, and coaches
   - Shows error message if non-admin tries to add members

## 📋 **User Experience**

### **For Admin Users**
- See "New Chat" button in chat sidebar
- See "Add Members" button in chat header
- Can create unlimited chat rooms
- Can manage all chat participants
- Full control over chat system

### **For Non-Admin Users**
- No "New Chat" button visible
- No "Add Members" button visible
- Can only see chats they are added to
- Can send messages in existing chats
- Can leave chats if needed

## 🔧 **Technical Details**

### **Role-Based Access Control**
```typescript
// Backend check
if (user.role !== 'ADMIN') {
  return NextResponse.json(
    { message: 'Only admins can create chat rooms' },
    { status: 403 }
  )
}

// Frontend check
{user && user.role === 'ADMIN' && (
  <button>New Chat</button>
)}
```

### **Database Schema**
- `ChatRoom` model has `createdBy` field (admin user ID)
- `ChatRoomParticipant` model has `role` field ('admin' or 'member')
- Only users with 'admin' role in a chat can add/remove members

### **Error Handling**
- Clear error messages for permission violations
- Graceful fallback for non-admin users
- No exposure of admin-only functionality

## 🎯 **Benefits**

1. **Centralized Control**: Only admins can create and manage chats
2. **Security**: Prevents unauthorized chat creation
3. **Organization**: Ensures proper chat structure
4. **Compliance**: Meets organizational requirements
5. **User Experience**: Clear boundaries for different user types

## 📱 **Mobile Responsiveness**

- Admin buttons are hidden on mobile for non-admin users
- Chat functionality remains fully accessible
- Responsive design maintained across all user types

## 🚀 **Future Enhancements**

1. **Role-based chat types** (e.g., admin-only, staff-only)
2. **Chat room categories** (e.g., team chats, individual chats)
3. **Advanced permissions** (e.g., moderators, read-only access)
4. **Chat room templates** for common use cases
5. **Bulk member management** for large groups

---

**Last Updated**: 2025-01-21
**Version**: 1.0.0
**Status**: ✅ Implemented and Tested
