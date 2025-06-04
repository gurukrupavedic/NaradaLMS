import { cn } from "@/lib/utils";

interface InteractiveSegmentProps {
  segmentId: string;
  text: string;
  isActive: boolean;
  hasAudioMapping: boolean;
  onClick: () => void;
}

export default function InteractiveSegment({ 
  segmentId, 
  text, 
  isActive, 
  hasAudioMapping, 
  onClick 
}: InteractiveSegmentProps) {
  return (
    <span
      className={cn(
        "interactive-segment",
        {
          "active": isActive,
          "cursor-not-allowed opacity-60": !hasAudioMapping,
          "cursor-pointer": hasAudioMapping,
        }
      )}
      onClick={hasAudioMapping ? onClick : undefined}
      title={hasAudioMapping ? "Click to play audio" : "No audio mapping available"}
    >
      {text}
    </span>
  );
}
