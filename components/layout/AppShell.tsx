
import React, { useState } from 'react';
import { NavLink, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Activity,
  FileText,
  Settings,
  Search,
  Bell,
  Library,
  Database,
  Trash2,
  Menu,
  X
} from 'lucide-react';

const SidebarItem = ({ to, icon: Icon, label, state }: { to: string; icon: any; label: string; state?: any }) => {
  return (
    <NavLink
      to={to}
      state={state}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          isActive && !state
            ? 'bg-gray-100 text-gray-900'
            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
        }`
      }
    >
      <Icon size={18} />
      {label}
    </NavLink>
  );
};

export const AppShell: React.FC = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/': return '热点雷达';
      case '/pipeline': return '生产流水线';
      case '/editor': return '内容工坊';
      case '/library': return '内容文库';
      case '/settings': return '系统设置';
      case '/sources': return '数据源配置';
      default: return '仪表盘';
    }
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="flex h-screen bg-white">
      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`w-64 border-r border-gray-200 flex flex-col fixed inset-y-0 z-50 bg-gray-50/50 backdrop-blur-xl transition-transform duration-300 lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">C</div>
            <span className="font-semibold text-gray-900 tracking-tight">ContentOS</span>
          </div>
          <button
            onClick={closeMobileMenu}
            className="lg:hidden p-1 hover:bg-gray-100 rounded"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1" onClick={closeMobileMenu}>
          <div className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">核心功能</div>
          <SidebarItem to="/" icon={Search} label="热点雷达" />
          <SidebarItem to="/pipeline" icon={Activity} label="内容流水线" />
          <SidebarItem to="/editor" icon={FileText} label="内容工坊" />
          <SidebarItem to="/library" icon={Library} label="内容文库" />

          <div className="mt-8 px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">辅助工具</div>
          <SidebarItem to="/library" icon={Trash2} label="回收站" state={{ tab: 'trash' }} />
          <SidebarItem to="/sources" icon={Database} label="数据源配置" />
          <SidebarItem to="/settings" icon={Settings} label="系统设置" />
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <img src="https://picsum.photos/id/64/100/100" className="w-9 h-9 rounded-full border border-gray-200" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">Alex Chen</p>
              <p className="text-xs text-gray-500 truncate">主编 (Editor)</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 lg:ml-64 flex flex-col min-h-0 overflow-hidden">
        <header className="h-16 border-b border-gray-200 flex items-center justify-between px-4 md:px-8 bg-white/80 backdrop-blur-sm sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg text-gray-600"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-lg md:text-xl font-semibold text-gray-900">{getPageTitle()}</h1>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <button className="text-gray-400 hover:text-gray-600"><Bell size={20} /></button>
            <div className="h-4 w-px bg-gray-200 hidden md:block"></div>
            <span className="text-xs md:text-sm text-gray-500 hidden md:inline">v2.4.0 (PRD)</span>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
