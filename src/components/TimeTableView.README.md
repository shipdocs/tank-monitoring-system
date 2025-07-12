# TimeTableView Component

## Overview

The `TimeTableView` component displays an operational schedule for tanks with active flow rates, showing estimated completion times and progress tracking. It provides a collapsible panel that auto-refreshes every 30 seconds to keep the information current.

## Features

- **Collapsible Panel**: Collapsed by default with smooth expand/collapse animations
- **Auto-refresh**: Updates every 30 seconds to reflect current tank states
- **Color-coded Time Remaining**: 
  - Green: More than 2 hours remaining
  - Yellow: 1-2 hours remaining
  - Red: Less than 1 hour remaining
- **Smart Sorting**: Tanks sorted by completion time (earliest first)
- **Summary Statistics**: Shows total operating tanks and average time remaining
- **Responsive Design**: Works on mobile and desktop devices

## Props

```typescript
interface TimeTableViewProps {
  tanks: EnhancedTank[];                              // Array of enhanced tank data
  operationalData: Map<string, TankOperationalData>;  // Map of tank ID to operational data
  products: Product[];                                // Array of available products
}
```

### TankOperationalData Structure

```typescript
interface TankOperationalData {
  temperature: number;    // Current product temperature in °C
  setpoint: number;       // Target volume in liters
  flowRate: number;       // Flow rate in L/min (positive=filling, negative=emptying)
}
```

## Usage Example

```typescript
import { TimeTableView } from './components/TimeTableView';
import { useTankData } from './hooks/useTankData';
import { ProductService } from './services/ProductService';

function TankOperationsPanel() {
  const { tanks } = useTankData();
  const products = ProductService.getInstance().getProducts();
  
  // Create operational data from tank trends
  const operationalData = useMemo(() => {
    const data = new Map<string, TankOperationalData>();
    
    tanks.forEach(tank => {
      if (tank.trendValue && tank.trend !== 'stable') {
        const flowRate = tank.trend === 'loading' 
          ? tank.trendValue 
          : -tank.trendValue;
          
        data.set(tank.id.toString(), {
          temperature: tank.temperature || 20,
          setpoint: calculateSetpoint(tank), // Your logic here
          flowRate: flowRate
        });
      }
    });
    
    return data;
  }, [tanks]);
  
  return (
    <TimeTableView
      tanks={tanks}
      operationalData={operationalData}
      products={products}
    />
  );
}
```

## Integration with Tank Data

The component expects operational data to be provided as a Map. This data typically comes from:

1. **Tank Trend Values**: The `trendValue` property can be used as flow rate
2. **User Input**: Setpoints entered through forms or configuration panels
3. **Sensor Data**: Real-time temperature and flow rate measurements

## Display Columns

1. **Tank Name**: The display name of the tank
2. **Current Volume**: Current volume in liters
3. **Setpoint**: Target volume in liters
4. **Flow Rate**: Rate of change in L/min (green for filling, red for emptying)
5. **Time Remaining**: Formatted as "Xh Ym" or "Xm"
6. **Est. Completion**: Time of day when operation will complete (HH:MM format)

## Styling

The component follows the design patterns established in the ProductManagement component:
- Clean table layout with hover states
- Consistent color scheme
- Gray borders and backgrounds
- Blue accent colors for active states

## Performance Considerations

- Uses `useMemo` to optimize time table generation
- Only processes tanks with active flow rates
- Efficient 30-second refresh cycle
- Minimal re-renders through proper React optimization

## Future Enhancements

Consider these potential improvements:

1. **Alerts**: Notify when operations are nearing completion
2. **Historical View**: Show completed operations from the past X hours
3. **Export**: Allow exporting the time table to CSV/PDF
4. **Grouping**: Group by operation type (filling vs emptying)
5. **Pause/Resume**: Add controls to pause/resume operations
6. **Conflict Detection**: Highlight potential resource conflicts