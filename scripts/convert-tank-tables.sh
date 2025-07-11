#!/bin/bash

# Script to convert Tanktables.csv into our tank table import format
# Input: Tanktables.csv (tank volume data for M.t.s. Texas, Europanr. 7647)
# Output: tank-tables-converted.csv with our expected format
# Converts matrix format to calibration data format

# Check if input file is provided
if [ $# -ne 1 ]; then
    echo "Usage: $0 input.csv"
    exit 1
fi

INPUT_FILE="$1"
OUTPUT_FILE="tank-tables-converted.csv"

# Check if input file exists
if [ ! -f "$INPUT_FILE" ]; then
    echo "Error: Input file '$INPUT_FILE' not found"
    exit 1
fi

# Initialize output CSV with our expected header
echo "tank_id,tank_name,max_height_mm,max_volume_liters,tank_type,location,calibration_data,description,vessel_name,europanr" > "$OUTPUT_FILE"

# List of tank names and their locations
declare -A TANK_LOCATIONS=(
    ["BB1"]="Forward Port Ballast"
    ["SB1"]="Forward Starboard Ballast"
    ["BB2"]="Port Ballast 2"
    ["SB2"]="Starboard Ballast 2"
    ["BB3"]="Port Ballast 3"
    ["SB3"]="Starboard Ballast 3"
    ["BB4"]="Port Ballast 4"
    ["SB4"]="Starboard Ballast 4"
    ["BB5"]="Port Ballast 5"
    ["SB5"]="Starboard Ballast 5"
    ["BB6"]="Aft Port Ballast"
    ["SB6"]="Aft Starboard Ballast"
)

# Temporary file to store intermediate data
TEMP_FILE=$(mktemp)

# Process each tank
for TANK in "${!TANK_LOCATIONS[@]}"; do
    echo "🔍 Processing tank $TANK..."
    
    # Extract tank data and convert to calibration points
    awk -v tank="$TANK" '
        BEGIN { 
            RS="\n"; FS=","; 
            in_tank_section=0; 
            in_data_section=0;
            calibration_data="";
            max_volume=0;
            max_height=0;
        }
        
        # Detect tank header (e.g., "TANK TABLE BB1")
        /TANK TABLE/ && $0 ~ tank {
            in_tank_section=1;
            in_data_section=0;
            next;
        }
        
        # Detect column headers (start of data section)
        in_tank_section && /0,1,2,3 4 5 6/ && /7,8 9/ {
            in_data_section=1;
            next;
        }
        
        # Stop when we hit next tank or end of section
        in_tank_section && (/TANK TABLE/ && $0 !~ tank) {
            in_tank_section=0;
            in_data_section=0;
        }
        
        # Process data rows (height in cm, volumes in columns)
        in_data_section && $1 ~ /^[0-9]+$/ {
            base_height_cm = $1;
            
            # Process each column (0-9 cm offset)
            for (col = 2; col <= 11; col++) {
                if ($col != "" && $col !~ /^[ \t]*$/ && $col != "\"\"") {
                    # Calculate actual height: base + column offset
                    actual_height_cm = base_height_cm + (col - 2);
                    actual_height_mm = actual_height_cm * 10;
                    
                    # Extract first volume value (handle multiple values like "2307 2878 3509")
                    volume_str = $col;
                    gsub(/^[ \t]+|[ \t]+$/, "", volume_str); # trim
                    split(volume_str, volumes, /[ \t]+/);
                    volume = volumes[1];
                    
                    if (volume > 0) {
                        if (calibration_data != "") calibration_data = calibration_data ",";
                        calibration_data = calibration_data actual_height_mm ":" volume;
                        
                        if (volume > max_volume) max_volume = volume;
                        if (actual_height_mm > max_height) max_height = actual_height_mm;
                    }
                }
            }
        }
        
        END {
            if (calibration_data != "") {
                printf("%s|%d|%d|%s\n", tank, max_height, max_volume, calibration_data);
            }
        }
    ' "$INPUT_FILE" >> "$TEMP_FILE"
done

# Convert temporary data to final CSV format
while IFS='|' read -r tank_id max_height max_volume calibration_data; do
    if [ -n "$tank_id" ] && [ -n "$calibration_data" ]; then
        tank_name="${tank_id} Tank"
        location="${TANK_LOCATIONS[$tank_id]}"
        
        # Create CSV row
        echo "TANK_${tank_id},\"${tank_name}\",${max_height},${max_volume},ballast,\"${location}\",\"${calibration_data}\",\"${tank_id} tank from M.t.s. Texas tank tables\",\"M.t.s. Texas\",7647" >> "$OUTPUT_FILE"
        
        echo "✅ Tank $tank_id: ${max_height}mm max height, ${max_volume}L max volume"
    fi
done < "$TEMP_FILE"

# Remove temporary file
rm "$TEMP_FILE"

echo ""
echo "🎉 Conversion complete!"
echo "📁 Output written to $OUTPUT_FILE"
echo ""
echo "📊 Summary:"
wc -l "$OUTPUT_FILE"
echo ""
echo "🔍 Sample calibration data:"
head -2 "$OUTPUT_FILE" | tail -1 | cut -d',' -f7 | sed 's/"//g' | cut -d',' -f1-5
echo "..."
