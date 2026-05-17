import { NavLink, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', label: '首页', icon: '🏠' },
  { to: '/lessons', label: '课程', icon: '📚' },
  { to: '/admin', label: '管理', icon: '⚙️' },
  { to: '/records', label: '记录', icon: '📊' },
];

export default function Navigation() {
  const location = useLocation();

  if (location.pathname.includes('/review') || location.pathname.includes('/quiz')) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom z-50">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = item.to === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-colors ${
                isActive
                  ? 'text-kid-primary bg-indigo-50'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
