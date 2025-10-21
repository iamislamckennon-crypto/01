/**
 * Loading spinner component
 */

export function LoadingSpinner({
  size = 'medium',
  color = 'primary',
  label = 'Loading...',
  className = ''
}) {
  const sizeClasses = {
    small: 'spinner-sm',
    medium: 'spinner-md',
    large: 'spinner-lg'
  };
  
  const colorClasses = {
    primary: 'spinner-primary',
    secondary: 'spinner-secondary',
    white: 'spinner-white'
  };
  
  const classes = [
    'spinner',
    sizeClasses[size],
    colorClasses[color],
    className
  ].filter(Boolean).join(' ');
  
  return (
    <div className="spinner-container" role="status">
      <div className={classes} aria-hidden="true"></div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
