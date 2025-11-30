type AnalogClockProps = {
  hour: number;
  minute: number;
  size?: number;
};

export function AnalogClock({ hour, minute, size = 200 }: AnalogClockProps) {
  const center = size / 2;
  const radius = size / 2 - 10;
  
  // Calculate hand angles
  // Hour hand: 360/12 = 30 degrees per hour, plus minute contribution
  const hourAngle = ((hour % 12) + minute / 60) * 30 - 90;
  // Minute hand: 360/60 = 6 degrees per minute
  const minuteAngle = minute * 6 - 90;
  
  // Hand lengths
  const hourHandLength = radius * 0.5;
  const minuteHandLength = radius * 0.75;
  
  // Calculate hand end positions
  const hourX = center + hourHandLength * Math.cos((hourAngle * Math.PI) / 180);
  const hourY = center + hourHandLength * Math.sin((hourAngle * Math.PI) / 180);
  const minuteX = center + minuteHandLength * Math.cos((minuteAngle * Math.PI) / 180);
  const minuteY = center + minuteHandLength * Math.sin((minuteAngle * Math.PI) / 180);
  
  // Hour markers
  const hourMarkers = Array.from({ length: 12 }, (_, i) => {
    const angle = (i * 30 - 90) * (Math.PI / 180);
    const outerR = radius - 5;
    const innerR = radius - 15;
    const textR = radius - 28;
    return {
      x1: center + innerR * Math.cos(angle),
      y1: center + innerR * Math.sin(angle),
      x2: center + outerR * Math.cos(angle),
      y2: center + outerR * Math.sin(angle),
      textX: center + textR * Math.cos(angle),
      textY: center + textR * Math.sin(angle),
      label: i === 0 ? '12' : String(i),
    };
  });
  
  // Minute markers (small dots)
  const minuteMarkers = Array.from({ length: 60 }, (_, i) => {
    if (i % 5 === 0) return null; // Skip hour positions
    const angle = (i * 6 - 90) * (Math.PI / 180);
    const r = radius - 8;
    return {
      cx: center + r * Math.cos(angle),
      cy: center + r * Math.sin(angle),
    };
  }).filter(Boolean);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="block"
      aria-label={`Clock showing ${hour}:${minute.toString().padStart(2, '0')}`}
    >
      {/* Clock face */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        className="text-border"
      />
      
      {/* Inner circle for depth */}
      <circle
        cx={center}
        cy={center}
        r={radius - 2}
        fill="currentColor"
        className="text-card"
      />
      
      {/* Hour markers */}
      {hourMarkers.map((marker, i) => (
        <g key={i}>
          <line
            x1={marker.x1}
            y1={marker.y1}
            x2={marker.x2}
            y2={marker.y2}
            stroke="currentColor"
            strokeWidth="2"
            className="text-foreground"
          />
          <text
            x={marker.textX}
            y={marker.textY}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={size / 14}
            fontWeight="500"
            fill="currentColor"
            className="text-foreground"
          >
            {marker.label}
          </text>
        </g>
      ))}
      
      {/* Minute markers */}
      {minuteMarkers.map((marker, i) => (
        <circle
          key={i}
          cx={marker!.cx}
          cy={marker!.cy}
          r={1.5}
          fill="currentColor"
          className="text-muted-foreground"
        />
      ))}
      
      {/* Hour hand */}
      <line
        x1={center}
        y1={center}
        x2={hourX}
        y2={hourY}
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        className="text-foreground"
      />
      
      {/* Minute hand */}
      <line
        x1={center}
        y1={center}
        x2={minuteX}
        y2={minuteY}
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="text-primary"
      />
      
      {/* Center dot */}
      <circle
        cx={center}
        cy={center}
        r={5}
        fill="currentColor"
        className="text-primary"
      />
    </svg>
  );
}

