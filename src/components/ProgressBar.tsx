interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  color?: string;
}

export default function ProgressBar({ value, max, label, color = 'bg-kid-primary' }: ProgressBarProps) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;

  return (
    <div className="w-full">
      {(label || true) && (
        <div className="flex justify-between text-sm mb-1">
          {label && <span className="text-gray-600">{label}</span>}
          <span className="text-gray-400 font-medium">{pct}%</span>
        </div>
      )}
      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
