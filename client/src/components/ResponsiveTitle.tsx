interface ResponsiveTitleProps {
  title: string;
  className?: string;
}

export function ResponsiveTitle({ title, className = "" }: ResponsiveTitleProps) {
  return (
    <h3 
      className={`${className} overflow-hidden text-ellipsis whitespace-nowrap max-w-[calc(100%-15px)] sm:max-w-[calc(100%-25px)]`}
      title={title}
    >
      {title}
    </h3>
  );
}