interface DashboardStatsProps {
  totalUploads: number;
}

export function DashboardStats({ totalUploads }: DashboardStatsProps) {
  return (
    <div className="stats">
      <div className="stat-card">
        <div className="stat-number">{totalUploads}</div>
        <div className="stat-label">Total Uploads</div>
      </div>
      <div className="stat-card">
        <div className="stat-number">{new Date().toLocaleDateString()}</div>
        <div className="stat-label">Today</div>
      </div>
    </div>
  );
}

