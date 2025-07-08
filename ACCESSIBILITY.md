# Accessibility Features Documentation

This document outlines the comprehensive accessibility features implemented in the Tank Monitoring application to ensure WCAG 2.1 AA compliance and optimal screen reader support.

## Overview

The application has been enhanced with extensive accessibility features including:
- Comprehensive ARIA labels and roles
- Keyboard navigation support
- Screen reader optimizations
- Live regions for status updates
- Semantic HTML structure
- Skip navigation links

## Key Accessibility Features

### 1. ARIA Labels and Roles

#### Tank Display Components
- **TankCard**: Uses `article` role with descriptive `aria-label`
- **TankListItem**: Proper semantic structure with status indicators
- **CompactTankCard**: Accessible compact view with all essential information
- **TankCylinder**: Visual tank representation with proper ARIA descriptions

#### Interactive Elements
- **ViewControls**: Radio group with proper keyboard navigation
- **AlarmSummary**: Status information with live regions
- **Progress Bars**: All tank level indicators use `progressbar` role

### 2. Live Regions

#### Status Updates
- Tank alarms use `aria-live="assertive"` for immediate announcements
- Normal status updates use `aria-live="polite"` for non-intrusive updates
- Connection status changes are announced to screen readers

#### Implementation
```typescript
// Example: Tank with alarm state
<article 
  aria-live={isAlarm ? 'assertive' : 'polite'}
  aria-atomic="true"
  role="region"
  aria-label={`Tank ${tank.name}`}
>
```

### 3. Keyboard Navigation

#### View Controls
- Arrow keys navigate between view options
- Enter/Space activates selected view
- Proper focus management and visual indicators

#### Tank Grid
- Tab navigation through all interactive elements
- Skip links to main content and controls
- Logical tab order maintained

#### Implementation
```typescript
// Custom hook for keyboard navigation
const useKeyboardNavigation = (options) => {
  // Handles arrow keys, enter, space, and escape
  // Returns container ref for keyboard event handling
};
```

### 4. Screen Reader Support

#### Announcements
- Custom hook for screen reader announcements
- Polite and assertive announcement priorities
- Automatic cleanup of announcement regions

#### Content Structure
- Proper heading hierarchy (h1 > h2 > h3)
- Semantic HTML elements (main, nav, section, article)
- Descriptive labels for all interactive elements

### 5. Focus Management

#### Skip Navigation
- Skip to main content link
- Skip to controls link
- Hidden until focused, then visible

#### Focus Indicators
- Clear visual focus indicators on all interactive elements
- Consistent focus ring styling
- Proper contrast ratios

### 6. Tank Status Accessibility

#### Visual Indicators
- Status dots include `aria-label` descriptions
- Not relying solely on color for information
- Text alternatives for all visual indicators

#### Progress Bars
```typescript
<div 
  role="progressbar"
  aria-valuenow={percentage}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label="Tank fill level"
>
```

#### Trend Indicators
- Trend icons include descriptive `aria-label`
- Speed information announced to screen readers
- Visual and textual representation of trends

### 7. Alarm Handling

#### Critical States
- Immediate announcement using `aria-live="assertive"`
- Visual and auditory indicators
- Clear description of required attention

#### Implementation
```typescript
{isAlarm && (
  <div role="alert" aria-live="assertive">
    <AlertTriangle aria-label="Warning" role="img" />
    <span>Attention Required</span>
  </div>
)}
```

## Component-Specific Features

### TankCard
- **Role**: `article` with region
- **Live Region**: Conditional based on alarm state
- **Progress Bar**: Tank level with proper ARIA attributes
- **Status Indicator**: Color-independent status communication
- **Trend Display**: Accessible trend information

### TankListItem
- **Structure**: Semantic list item with proper headings
- **Progress Bar**: Inline tank level indicator
- **Status**: Accessible status communication
- **Temperature**: Optional temperature display with units

### CompactTankCard
- **Compact Design**: All information accessible in smaller format
- **Status**: Visual and text-based status indicators
- **Level**: Accessible level information
- **Alerts**: Compact alarm presentation

### TankCylinder
- **Visual Tank**: Described visual representation
- **Progress Bar**: Cylinder fill level
- **Status**: Accessible status indicators
- **Trend**: Visual and text-based trend information

### ViewControls
- **Radio Group**: Proper radio button group behavior
- **Keyboard Nav**: Arrow key navigation
- **Focus Management**: Proper focus indicators
- **Descriptions**: Clear option descriptions

### AlarmSummary
- **Status Summary**: Overall system status
- **Count Display**: Accessible count information
- **Timestamp**: Last update information
- **Live Region**: Status change announcements

## Testing Guidelines

### Screen Reader Testing
1. **NVDA/JAWS**: Test with popular Windows screen readers
2. **VoiceOver**: Test with macOS screen reader
3. **Mobile**: Test with mobile screen readers

### Keyboard Testing
1. **Tab Navigation**: Verify logical tab order
2. **Arrow Keys**: Test arrow key navigation in controls
3. **Enter/Space**: Test activation of interactive elements
4. **Escape**: Test escape key functionality

### Automated Testing
- Use axe-core for automated accessibility testing
- Jest tests for ARIA attribute validation
- Cypress tests for keyboard navigation

## Best Practices Implemented

### 1. Semantic HTML
- Use proper HTML elements for their intended purpose
- Maintain logical heading hierarchy
- Group related elements appropriately

### 2. ARIA Usage
- Only use ARIA when necessary
- Prefer semantic HTML over ARIA when possible
- Ensure ARIA attributes are properly implemented

### 3. Focus Management
- Maintain logical focus order
- Provide clear focus indicators
- Manage focus during dynamic content changes

### 4. Content Strategy
- Provide text alternatives for visual content
- Use clear, concise language
- Ensure content is understandable without context

## Browser Support

The accessibility features are supported in:
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Future Improvements

1. **Voice Control**: Add voice control support
2. **High Contrast**: Implement high contrast mode
3. **Text Scaling**: Support for text scaling preferences
4. **Reduced Motion**: Respect reduced motion preferences
5. **Color Blindness**: Enhanced color blindness support

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Screen Reader Testing](https://webaim.org/articles/screenreader_testing/)
- [axe-core Documentation](https://github.com/dequelabs/axe-core)

## Contributing

When adding new features:
1. Consider accessibility from the start
2. Test with keyboard navigation
3. Verify screen reader compatibility
4. Add appropriate ARIA labels
5. Update this documentation