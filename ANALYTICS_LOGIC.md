# 📊 Analytics Logic - Flexible CSV Links

## 🎯 **Overview**

The CSV analytics system now implements a **hybrid approach** that combines:
- **Fixed historical data** (past days)
- **Live current data** (today)

## 🔄 **How It Works**

### **During the Day (00:01 - 23:59)**
- CSV links show **live data** for today
- Data updates in real-time as events/availability changes
- Past days show **saved analytics** (fixed)

### **At Midnight (00:00)**
- App automatically saves today's data as "historical"
- Today becomes a "past day" with fixed data
- New day starts with live data

## 📅 **Data Structure**

### **Event Analytics CSV**
```csv
Date,Event Type,Event Title,Count,Duration (minutes)
2025-10-17,TRAINING,"Morning Training",2,120
2025-10-17,MEAL,"Team Lunch",1,60
2025-10-18,TRAINING,"Evening Training",1,90
```

### **Player Analytics CSV**
```csv
Date,Player Name,Availability Status
2025-10-17,"Boris Cmiljanic","FULLY_AVAILABLE"
2025-10-17,"Dino Skorup","FULLY_AVAILABLE"
2025-10-17,"Mihajlo Neskovic","INDIVIDUAL_WORK"
```

## 🗄️ **Database Models**

### **DailyEventAnalytics**
- Stores fixed event data for past days
- Unique constraint: `[date, eventType]`
- Fields: `date`, `eventType`, `count`, `totalDuration`, `avgDuration`

### **DailyPlayerAnalytics**
- Stores fixed player availability for past days
- Unique constraint: `[date, playerId, activity]`
- Fields: `date`, `playerId`, `playerName`, `activity`, `count`

## ⚙️ **Technical Implementation**

### **CSV Endpoint Logic**
1. **Fetch saved analytics** for past days (`date < today`)
2. **Fetch live data** for today (`date >= today`)
3. **Combine** both datasets
4. **Generate CSV** with all data

### **Daily Scheduler**
- Runs at **00:00** every day
- Collects current day's data
- Saves to `DailyEventAnalytics` and `DailyPlayerAnalytics`
- Makes today's data "historical"

## 🎯 **Benefits**

1. **Real-time updates** during the day
2. **Historical accuracy** for past days
3. **Power BI compatibility** with consistent data structure
4. **Automatic data collection** without manual intervention

## 📋 **Usage**

### **For Power BI**
1. Use the CSV link from Admin Dashboard → Analytics Links
2. Data updates automatically throughout the day
3. Historical data remains consistent
4. No need to refresh manually

### **For Manual Collection**
- Use "Trigger Collection" button in Admin Dashboard
- Manually collect data for any date
- Useful for testing or data recovery

## 🔧 **Configuration**

### **Scheduler Settings**
- **Frequency**: Daily at 00:00
- **Data Retention**: All-time (no automatic deletion)
- **Collection Scope**: All events and player availability

### **CSV Settings**
- **Format**: Standard CSV with headers
- **Encoding**: UTF-8
- **Date Format**: YYYY-MM-DD
- **Access**: Public (no authentication required for Power BI)

## 🚀 **Future Enhancements**

1. **Data retention policies** (e.g., keep only last 2 years)
2. **Compression** for large datasets
3. **Incremental updates** for better performance
4. **Data validation** and error handling
5. **Custom date ranges** for CSV export

---

**Last Updated**: 2025-01-21
**Version**: 1.0.0
