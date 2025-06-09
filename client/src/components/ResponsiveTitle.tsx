import { useEffect, useRef, useState } from 'react';

interface ResponsiveTitleProps {
  title: string;
  className?: string;
}

export function ResponsiveTitle({ title, className = "" }: ResponsiveTitleProps) {
  const [truncatedTitle, setTruncatedTitle] = useState(title);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const adjustTitle = () => {
      if (!titleRef.current || !measureRef.current) return;

      const container = titleRef.current;
      const measurer = measureRef.current;
      const containerWidth = container.offsetWidth;
      
      // Reserve 24px minimum spacing from the right edge for action buttons
      const availableWidth = containerWidth - 24;

      // Reset to full title to measure
      measurer.textContent = title;
      let fullWidth = measurer.offsetWidth;

      if (fullWidth <= availableWidth) {
        setTruncatedTitle(title);
        return;
      }

      // Binary search for the right length
      let left = 0;
      let right = title.length;
      let bestFit = '';

      while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const testText = title.substring(0, mid) + '...';
        
        measurer.textContent = testText;
        const testWidth = measurer.offsetWidth;

        if (testWidth <= availableWidth) {
          bestFit = testText;
          left = mid + 1;
        } else {
          right = mid - 1;
        }
      }

      setTruncatedTitle(bestFit || title.substring(0, 1) + '...');
    };

    // Initial adjustment
    adjustTitle();

    // Create ResizeObserver to watch for container size changes
    const resizeObserver = new ResizeObserver(adjustTitle);
    if (titleRef.current) {
      resizeObserver.observe(titleRef.current);
    }

    // Also listen for window resize as fallback
    window.addEventListener('resize', adjustTitle);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', adjustTitle);
    };
  }, [title]);

  return (
    <>
      <h3 ref={titleRef} className={className} title={title}>
        {truncatedTitle}
      </h3>
      {/* Hidden measurer element */}
      <span
        ref={measureRef}
        className={`${className} absolute invisible whitespace-nowrap`}
        aria-hidden="true"
      />
    </>
  );
}