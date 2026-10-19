import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  BadgeCheck, BarChart3, Bell, Briefcase, Building2, ClipboardList, CreditCard, FileSpreadsheet, Gavel, Globe2, Handshake, Inbox, LayoutDashboard, LogOut, Mail, Menu,
  PackageSearch, Receipt, ScrollText, Settings, Star, Users, UsersRound, X, Coins,
} from 'lucide-react';
import Logo from './Logo';
import api from '../lib/api';
import { useAuth } from '../lib/auth';
import { useSocketEvent } from '../lib/socket';
import { timeAgo } from '../lib/format';
import { useFx } from '../lib/currency';
import { cx } from './ui';

const NAV = [
  { group: 'Operations' },
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true, area: 'overview' },
  { to: '/queue', label: 'Pending queue', icon: Inbox, area: 'rfqs', badge: 'pending' },
  { to: '/rfqs', label: 'All RFQs', icon: ClipboardList, area: 'rfqs' },
  { to: '/sourcing', label: 'Sourcing projects', icon: PackageSearch, area: 'sourcing', badge: 'sourcingNew' },
  { group: 'Suppliers & buyers' },
  { to: '/verifications', label: 'Seller verification', icon: BadgeCheck, area: 'verifications', badge: 'verificationsPending', alert: true },
  { to: '/sellers/dashboard', match: '/sellers', label: 'Sellers', icon: Building2, area: 'sellers' },
  { to: '/buyers/dashboard', match: '/buyers', label: 'Buyers', icon: Users, area: 'buyers' },
  { group: 'Money' },
  { to: '/orders', label: 'Transactions', icon: Receipt, area: 'orders' },
  { to: '/disputes', label: 'Disputes', icon: Gavel, area: 'disputes', badge: 'openDisputes' },
  { to: '/plans', label: 'Subscriptions', icon: CreditCard, area: 'plans' },
  { to: '/revenue', label: 'Revenue', icon: BarChart3, area: 'revenue' },
  { to: '/currency', label: 'Currency rates', icon: Coins, area: 'currency' },
  { to: '/reports', label: 'Reports', icon: FileSpreadsheet, area: 'reports' },
  { group: 'Website' },
  { to: '/countries', label: 'Countries & products', icon: Globe2, area: 'countries' },
  { to: '/liaison', label: 'Liaison enquiries', icon: Handshake, area: 'liaison', badge: 'liaisonNew' },
  { to: '/enquiries', label: 'Contact enquiries', icon: Mail, area: 'enquiries', badge: 'enquiriesOpen' },
  { to: '/careers', label: 'Careers', icon: Briefcase, area: 'careers' },
  { to: '/reviews', label: 'Reviews', icon: Star, area: 'reviews' },
  { group: 'Admin' },
  { to: '/audit', label: 'Audit log', icon: ScrollText, area: 'audit' },
  { to: '/team', label: 'Admin team', icon: UsersRound, area: 'team' },
  { to: '/settings', label: 'Settings', icon: Settings, area: 'settings' },
];

/** Live USD → INR rate in the top bar (links to the Currency rates page). */
function FxChip() {
  const { inr, data } = useFx();
  return (
    <NavLink to="/currency" className="hidden items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs text-ink-medium ring-1 ring-beige transition hover:text-forest sm:flex" title={data?.fetchedAt ? `Updated ${timeAgo(data.fetchedAt)} · ${data.source}` : 'Live rate'}>
      <span className={cx('h-1.5 w-1.5 rounded-full', data && !data.stale ? 'bg-success' : 'bg-warning')} />
      $1 = <b className="font-medium text-ink">₹{inr.toFixed(2)}</b>
    </NavLink>
  );
}

const ROLE_LABEL = { super: 'Super Admin', finance: 'Finance', support: 'Support', category: 'Category Manager' };

function Bellbox() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ list: [], unread: 0 });
  const load = useCallback(() => api.get('/notifications').then((r) => setData(r.data)).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);
  useSocketEvent('notification', useCallback((n) => setData((d) => ({ list: [n, ...d.list], unread: d.unread + 1 })), []));
  return (
    <div className="relative">
      <button onClick={() => { setOpen(!open); if (!open && data.unread) api.post('/notifications/read').then(() => setData((d) => ({ ...d, unread: 0 }))); }} className="relative rounded-lg p-2 text-ink-medium hover:bg-white" aria-label="Notifications">
        <Bell className="h-5 w-5" />
        {data.unread > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] text-white">{data.unread}</span>}
      </button>
      {open && (
        <div className="rise absolute right-0 z-50 mt-2 max-h-[70vh] w-[min(380px,calc(100vw-2rem))] overflow-y-auto rounded-xl bg-white shadow-lift ring-1 ring-beige">
          {!data.list.length && <p className="p-8 text-center text-sm text-ink-medium">No notifications</p>}
          {data.list.slice(0, 20).map((n) => (
            <NavLink key={n._id} to={n.link || '/'} onClick={() => setOpen(false)} className="block border-b border-mist px-4 py-3 hover:bg-cream/60">
              <p className="text-sm font-medium">{n.title}</p><p className="text-xs text-ink-medium">{n.body}</p><p className="mt-0.5 text-[11px] text-ink-medium">{timeAgo(n.createdAt)}</p>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminLayout() {
  const { user, signOut, can } = useAuth();
  const [open, setOpen] = useState(false);
  const [badges, setBadges] = useState({});
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => {
    if (!can('overview')) return;
    api.get('/admin/overview').then((r) => setBadges(r.data.kpis)).catch(() => {});
  }, [loc.pathname, can]);

  const Side = (
    <div className="flex h-full flex-col bg-forest text-white">
      <div className="px-5 pb-2 pt-5"><Logo light size="sm" tagline={false} /></div>
      <p className="px-6 pb-4 text-[10px] uppercase tracking-[0.3em] text-gold-light/70">Admin panel</p>
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {NAV.filter((n) => n.group || can(n.area)).map((n, i) =>
          n.group ? <p key={i} className="mb-1 mt-4 px-3 text-[10px] uppercase tracking-[0.2em] text-white/40">{n.group}</p> : (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cx('flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition', isActive || (n.match && loc.pathname.startsWith(n.match)) ? 'bg-gold text-white' : 'text-white/75 hover:bg-white/5 hover:text-white')}>
              <n.icon className="h-[18px] w-[18px]" /><span className="flex-1">{n.label}</span>
              {n.badge && badges[n.badge] > 0 && <span className={cx('rounded-full px-2 text-[11px]', n.alert ? 'animate-pulse bg-gold text-white' : 'bg-white/15')}>{badges[n.badge]}</span>}
            </NavLink>
          )
        )}
      </nav>
      <div className="border-t border-white/10 p-4">
        <p className="truncate text-sm">{user.name}</p>
        <p className="text-xs text-gold-light/80">{ROLE_LABEL[user.adminRole]}</p>
        <button onClick={signOut} className="mt-3 flex items-center gap-2 text-sm text-white/70 hover:text-white"><LogOut className="h-4 w-4" /> Sign out</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-cream">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 lg:block">{Side}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-forest-900/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64">{Side}</div>
          <button onClick={() => setOpen(false)} className="absolute right-4 top-4 rounded-full bg-white p-2" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
      )}
      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-beige/70 bg-cream/90 px-4 backdrop-blur sm:px-6">
          <button onClick={() => setOpen(true)} className="rounded-lg p-2 lg:hidden" aria-label="Menu"><Menu className="h-5 w-5" /></button>
          <span className="hidden text-xs uppercase tracking-[0.2em] text-ink-medium lg:block">manage.ranavista.com</span>
          <div className="flex items-center gap-2">
            <FxChip />
            <Bellbox />
          </div>
        </header>
        <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8"><Outlet /></main>
      </div>
    </div>
  );
}
