interface StatsCardProps {
  icon: string;
  value: number | string;
  label: string;
  color?: string;
}

export default function StatsCard({ icon, value, label, color = 'bg-kid-primary' }: StatsCardProps) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${color} text-white text-xl mb-2`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-gray-800">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}
