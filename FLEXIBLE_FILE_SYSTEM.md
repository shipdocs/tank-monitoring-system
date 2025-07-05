# 🚀 Flexible File Import System

## 🎯 **Overview**

The Tank Monitoring System now includes a powerful flexible file import system that can automatically detect and parse multiple file formats, with support for extended tank properties including temperature, pressure, humidity, and custom fields.

## 📋 **Supported File Formats**

### **✅ Automatic Format Detection**
- **CSV** - Comma-separated values with auto-delimiter detection
- **TSV** - Tab-separated values  
- **JSON** - JavaScript Object Notation (nested objects supported)
- **XML** - Basic XML parsing for tank elements
- **TXT** - Space-separated text files
- **Fixed-Width** - Fixed-width column text files

### **🔧 Format-Specific Features**

#### **CSV/TSV Files:**
- Auto-detect delimiters: `,` `;` `\t` `|` `:`
- Header detection (with/without headers)
- Multiple encodings (UTF-8, Latin-1, etc.)
- Skip empty lines and trim values
- Custom delimiter override

#### **JSON Files:**
- Array of objects: `[{tank1}, {tank2}, ...]`
- Nested structure: `{"tanks": [{tank1}, {tank2}]}`
- Single object: `{tank1}` (converted to array)
- Automatic column extraction from all objects

#### **XML Files:**
- Tank elements: `<tank id="T001">...</tank>`
- Attribute and element parsing
- Nested tank data support

#### **Text Files:**
- Space-separated values
- Fixed-width column detection
- Line-by-line processing

## 🏗️ **Enhanced Tank Data Model**

### **Core Fields:**
- `id` - Tank identifier (required)
- `name` - Tank name/label
- `level` - Current level (required)

### **Capacity Fields:**
- `maxCapacity` - Maximum capacity
- `minLevel` - Minimum safe level
- `maxLevel` - Maximum safe level

### **🌡️ Environmental Fields (NEW):**
- `temperature` - Temperature reading
- `pressure` - Pressure reading  
- `humidity` - Humidity reading

### **📊 Status Fields:**
- `status` - Tank status (OK, WARNING, ERROR)
- `alarmState` - Boolean alarm state

### **📍 Metadata Fields:**
- `unit` - Unit of measurement
- `location` - Physical location
- `type` - Tank type (Fuel, Water, Chemical, Oil)
- `lastUpdated` - Last update timestamp

### **🔧 Custom Fields:**
- `custom1`, `custom2`, `custom3` - User-defined fields

## 🎛️ **Configuration Options**

### **Data Source Configuration:**
```json
{
  "id": "source1",
  "type": "file",
  "path": "/path/to/data.csv",
  "format": "auto",
  "encoding": "utf8",
  "polling": false,
  "pollInterval": 30000,
  "options": {
    "autoDetectDelimiter": true,
    "autoDetectHeaders": true,
    "skipEmptyLines": true,
    "trimValues": true,
    "delimiter": ",",
    "extensions": [".csv", ".json", ".txt", ".xml", ".tsv"]
  },
  "mapping": {
    "id": "tank_id",
    "name": "tank_name",
    "level": "level",
    "temperature": "temp",
    "pressure": "press",
    "status": "status"
  }
}
```

### **Source Types:**
- **`file`** - Monitor single file
- **`directory`** - Monitor all files in directory
- **`url`** - HTTP endpoint (future feature)

### **Monitoring Options:**
- **File Watching** - Real-time file change detection
- **Polling** - Regular interval checking
- **Mixed Mode** - Combine watching and polling

## 🔍 **Auto-Discovery Features**

### **Column Detection:**
- Automatically discovers available columns
- Infers data types (string, number, boolean, date)
- Suggests field mappings based on column names

### **Smart Mapping Suggestions:**
```javascript
// Automatic mapping suggestions based on column names
{
  "tank_id" → "id",
  "tank_name" → "name", 
  "level" → "level",
  "temp" → "temperature",
  "press" → "pressure",
  "status" → "status"
}
```

## 🖥️ **User Interface**

### **Flexible Settings Page:**
Access at: `http://localhost:3001/flexible-settings`

#### **📁 Data Sources Tab:**
- View all configured data sources
- Add/edit/delete sources
- Real-time status monitoring
- Error reporting

#### **🔍 File Validator Tab:**
- Test files before adding as sources
- Preview sample data
- View detected columns and types
- Get mapping suggestions

#### **🗺️ Field Mapping Tab:**
- Visual field mapping interface
- Drag-and-drop column assignment
- Preview mapped data
- Validation feedback

#### **📊 Live Monitor Tab:**
- Real-time source status
- Tank count and update times
- Error logs and diagnostics
- Performance metrics

## 📊 **Sample Data Files**

### **CSV with Temperature:**
```csv
tank_id,tank_name,level,max_capacity,temperature,pressure,status,location
T001,Alpha Tank,245.5,1000,22.5,1.2,OK,Zone A-1
T002,Beta Tank,678.2,1200,23.1,1.1,OK,Zone A-2
```

### **JSON Format:**
```json
{
  "tanks": [
    {
      "id": "T001",
      "name": "Alpha Tank",
      "level": 245.5,
      "temperature": 22.5,
      "pressure": 1.2,
      "status": "OK"
    }
  ]
}
```

### **XML Format:**
```xml
<tanks>
  <tank id="T001" name="Alpha Tank" status="OK">
    <level>245.5</level>
    <temperature>22.5</temperature>
    <pressure>1.2</pressure>
  </tank>
</tanks>
```

## 🔧 **API Endpoints**

### **Source Management:**
- `GET /api/flexible/sources` - List all sources
- `POST /api/flexible/sources` - Add new source
- `DELETE /api/flexible/sources/:id` - Remove source

### **File Validation:**
- `GET /api/flexible/validate?path=...&format=...` - Validate file
- `GET /api/flexible/fields` - Get available tank fields
- `POST /api/flexible/test-mapping` - Test field mapping

## 🚀 **Getting Started**

### **1. Access Flexible Settings:**
```
http://localhost:3001/flexible-settings
```

### **2. Validate Your Data File:**
- Go to "File Validator" tab
- Enter your file path
- Click "Validate File"
- Review detected format and columns

### **3. Configure Data Source:**
- Go to "Data Sources" tab  
- Click "Add New Data Source"
- Configure path, format, and mapping
- Enable monitoring

### **4. Monitor Live Data:**
- Go to "Live Monitor" tab
- View real-time updates
- Check for errors or issues

## 🎯 **Benefits**

### **🔄 Flexibility:**
- Support for multiple file formats
- Automatic format detection
- Custom field mapping
- Real-time monitoring

### **🌡️ Extended Data:**
- Temperature monitoring
- Pressure readings
- Environmental conditions
- Status tracking

### **⚡ Performance:**
- Efficient file watching
- Minimal resource usage
- Scalable to multiple sources
- Real-time WebSocket updates

### **🛠️ Ease of Use:**
- Visual configuration interface
- Auto-discovery features
- Validation and testing tools
- Comprehensive error reporting

## 🔧 **Migration from Legacy CSV**

Existing CSV configurations are automatically supported. The new system is backward compatible while providing enhanced features for new installations.

Your Tank Monitoring System now supports the most flexible and comprehensive file import system available! 🎉
