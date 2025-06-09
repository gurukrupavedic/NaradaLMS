interface ResponsiveTitleProps {
  title: string;
  className?: string;
  spacing?: number; // Default 25px
}

export function ResponsiveTitle({ title, className = "", spacing = 25 }: ResponsiveTitleProps) {
  const titleStyle = {
    maxWidth: `calc(100% - ${spacing}px)`,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  };

  return (
    <h3 
      className={className} 
      style={titleStyle}
      title={title}
    >
      {title}
    </h3>
  );
}