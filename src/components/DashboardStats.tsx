import React from 'react';
import { RepairRequest } from '../types';
import { Clipboard, AlertTriangle, Play, CheckCircle2, DollarSign, Activity } from 'lucide-react';

interface DashboardStatsProps {
  requests: RepairRequest[];
  selectedOrgId: string;
  activeFilterStatus: string;
  onFilterStatusChange: (status: string) => void;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  requests,
  selectedOrgId,
  activeFilterStatus,
  onFilterStatusChange
}) => {
  const orgRequests = requests;

  // Status Counts
  const total = orgRequests.length;
  const pending = orgRequests.filter((r) => r.status === 'pending').length;
  const active = orgRequests.filter((r) => r.status === 'assigned' || r.status === 'in-progress').length;
  const completed = orgRequests.filter((r) => r.status === 'completed').length;
  const paid = orgRequests.filter((r) => r.status === 'paid').length;
  
  // Total Cost
  const totalCost = orgRequests.reduce((sum, r) => sum + (r.cost || 0), 0);

  // Category statistics
  const categories: Record<string, number> = {
    plumbing: 0,
    electrical: 0,
    hvac: 0,
    structural: 0,
    appliance: 0,
    safety: 0,
    other: 0
  };
  
  orgRequests.forEach((r) => {
    if (categories[r.category] !== undefined) {
      categories[r.category]++;
    } else {
      categories.other++;
    }
  });

  const maxCategoryCount = Math.max(...Object.values(categories), 1);

  // Urgency statistics
  const urgencyCounts = {
    low: orgRequests.filter(r => r.urgency === 'low').length,
    medium: orgRequests.filter(r => r.urgency === 'medium').length,
    high: orgRequests.filter(r => r.urgency === 'high').length,
    emergency: orgRequests.filter(r => r.urgency === 'emergency').length
  };

  const statCards = [
    { label: 'All Requests', count: total, value: 'all', icon: Clipboard, bg: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)' },
    { label: 'Pending Review', count: pending, value: 'pending', icon: AlertTriangle, bg: 'rgba(245, 158, 11, 0.1)', color: 'var(--status-pending-from)' },
    { label: 'In Progress', count: active, value: 'active', icon: Play, bg: 'rgba(139, 92, 246, 0.1)', color: 'var(--status-in-progress-from)' },
    { label: 'Completed', count: completed, value: 'completed', icon: CheckCircle2, bg: 'rgba(16, 185, 129, 0.1)', color: 'var(--status-completed-from)' },
    { label: 'Approved & Paid', count: paid, value: 'paid', icon: DollarSign, bg: 'rgba(20, 184, 166, 0.1)', color: 'var(--status-paid-from)' }
  ];

  return (
    <div className="animate-[fadeIn_0.3s_ease]">
      {/* Metric Cards Grid */}
      <div className="stats-grid">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          const isActive = activeFilterStatus === card.value;
          return (
            <div
              key={idx}
              className="stat-card"
              onClick={() => onFilterStatusChange(card.value)}
              style={{
                borderColor: isActive ? card.color : 'var(--border-color)',
                background: isActive ? `${card.bg}` : 'var(--bg-card)',
                boxShadow: isActive ? `0 8px 24px -10px ${card.color}` : 'none'
              }}
            >
              <div className="stat-card-icon" style={{ backgroundColor: card.bg, color: card.color }}>
                <Icon size={24} />
              </div>
              <div>
                <div className="stat-card-value">{card.count}</div>
                <div className="stat-card-label">{card.label}</div>
              </div>
              {isActive && (
                <div className="absolute bottom-3 right-3 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: card.color }} />
              )}
            </div>
          );
        })}

        {/* Cost summary card */}
        <div className="stat-card cursor-default">
          <div className="stat-card-icon bg-emerald-500/10 text-emerald-500">
            <Activity size={24} />
          </div>
          <div>
            <div className="stat-card-value">${totalCost.toLocaleString()}</div>
            <div className="stat-card-label">Total Repair Spending</div>
          </div>
        </div>
      </div>

      {/* Custom Charts Grid */}
      <div className="analytics-section">
        {/* Category distribution - Custom Chart Bar */}
        <div className="glass-panel mb-0">
          <h3 className="mb-4 text-[15px]">Request Distribution by Category</h3>
          <div className="chart-container">
            {Object.entries(categories).map(([cat, count]) => {
              const pct = total > 0 ? (count / maxCategoryCount) * 100 : 0;
              const displayPct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={cat} className="chart-bar-wrapper">
                  <div
                    className="chart-bar"
                    style={{
                      height: `${pct}%`,
                      background: count > 0 
                        ? 'linear-gradient(to top, var(--primary) 0%, #818cf8 100%)' 
                        : 'var(--border-color)'
                    }}
                  >
                    {count > 0 && <span className="chart-bar-value">{count}</span>}
                  </div>
                  <span className="chart-label text-[10px] capitalize">
                    {cat === 'hvac' ? 'HVAC' : cat}
                    <span className="block text-app-muted">{displayPct}%</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Urgency breakdown - Ring representation / Bar progression */}
        <div className="glass-panel mb-0">
          <h3 className="mb-4 text-[15px]">Urgency Breakdown</h3>
          <div className="flex h-[180px] flex-col justify-center gap-3 pt-2.5">
            {Object.entries(urgencyCounts).map(([urgency, count]) => {
              const pct = total > 0 ? (count / total) * 100 : 0;
              let barColor = 'var(--primary)';
              if (urgency === 'low') barColor = 'var(--urgency-low)';
              if (urgency === 'medium') barColor = 'var(--urgency-medium)';
              if (urgency === 'high') barColor = 'var(--urgency-high)';
              if (urgency === 'emergency') barColor = 'var(--urgency-emergency)';

              return (
                <div key={urgency}>
                  <div className="mb-1 flex justify-between text-xs capitalize">
                    <span style={{ fontWeight: '600', color: barColor }}>{urgency}</span>
                    <span className="text-app-subtle">
                      {count} ({Math.round(pct)}%)
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded border border-app-border bg-app-raised">
                    <div className="h-full rounded transition-[width] duration-500" style={{ width: `${pct}%`, background: barColor }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
