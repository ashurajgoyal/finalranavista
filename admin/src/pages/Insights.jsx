import { Link } from 'react-router-dom';
import { AlertTriangle, BadgeCheck, Building2, ClipboardList, Clock, Globe2, PackageSearch, Receipt, Star, TrendingUp, UserPlus, Users, Wallet } from 'lucide-react';
import useFetch from '../lib/useFetch';
import { date, num } from '../lib/format';
import Money from '../components/Money';
import Bars from '../components/Bars';
import { Badge, Card, Empty, PageHeader, PageLoader, Stars, Stat, StatusBadge, cx } from '../components/ui';
import { StageBadge } from './Verifications';

/** Dashboard | list | verification tabs at the top of the Buyers and Sellers sections. */
export function SectionTabs({ role, active }) {
  const tabs = role === 'seller'
    ? [['/sellers/dashboard', 'Dashboard'], ['/sellers', 'All sellers'], ['/verifications', 'Verification']]
    : [['/buyers/dashboard', 'Dashboard'], ['/buyers', 'All buyers']];
  return (
    <div className="mb-5 inline-flex rounded-xl bg-white p-1 shadow-soft ring-1 ring-beige/80">
      {tabs.map(([to, l]) => <Link key={to} to={to} className={cx('rounded-lg px-4 py-2 text-sm transition', active === to ? 'bg-forest text-white' : 'text-ink-medium hover:bg-cream')}>{l}</Link>)}
    </div>
  );
}

function HBars({ rows, label = (r) => r._id, value = (r) => r.n, empty = 'No data yet' }) {
  const max = Math.max(1, ...rows.map(value));
  if (!rows.length) return <p className="text-sm text-ink-medium">{empty}</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r, i) => (
        <li key={i}>
          <div className="mb-1 flex justify-between gap-2 text-sm"><span className="truncate">{label(r)}</span><span className="font-medium">{num(value(r))}</span></div>
          <div className="h-1.5 rounded-full bg-mist"><div className="h-full rounded-full bg-forest" style={{ width: `${(value(r) / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

const Panel = ({ title, children, action, className }) => (
  <Card className={cx('card-pad', className)}>
    <div className="mb-4 flex items-center justify-between gap-2"><h2 className="text-lg text-forest">{title}</h2>{action}</div>
    {children}
  </Card>
);

/* ============================== BUYERS ============================== */
export function BuyerInsights() {
  const { data, loading } = useFetch('/admin/insights/buyers');
  if (loading || !data) return <><PageHeader title="Buyers" subtitle="Buyer dashboard" /><SectionTabs role="buyer" active="/buyers/dashboard" /><PageLoader /></>;
  const k = data.kpis;
  const rfqOrder = ['pending', 'assigned', 'quoted', 'negotiating', 'accepted', 'closed', 'cancelled'];
  const rfqTotal = Object.values(data.rfqStatus).reduce((a, b) => a + b, 0) || 1;
  return (
    <>
      <PageHeader title="Buyers" subtitle="Who is buying, from where, and how active they are." />
      <SectionTabs role="buyer" active="/buyers/dashboard" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link to="/buyers"><Stat label="Total buyers" value={num(k.total)} icon={Users} hint={`${num(k.verified)} verified email · ${num(k.suspended)} suspended`} /></Link>
        <Stat label="New buyers" value={num(k.newMonth)} icon={UserPlus} tone="gold" hint={`${num(k.newWeek)} in the last 7 days`} />
        <Stat label="Paying buyers" value={num(k.paying)} icon={TrendingUp} tone="sage" hint={k.total ? `${Math.round((k.paying / k.total) * 100)}% of all buyers` : undefined} />
        <Link to="/rfqs"><Stat label="Active RFQs" value={num(k.activeRfqs)} icon={ClipboardList} tone="blue" hint={`${num(k.rfqsMonth)} posted this month`} /></Link>
        <Link to="/sourcing"><Stat label="Open sourcing requests" value={num(k.sourcingOpen)} icon={PackageSearch} tone="gold" hint={`${num(k.sourcingTotal)} all-time`} /></Link>
        <Link to="/orders"><Stat label="Orders" value={num(k.orders)} icon={Receipt} /></Link>
        <Stat label="Buyer spend (GMV)" value={<Money value={k.gmv} digits={0} stack />} icon={Wallet} tone="sage" />
        <Stat label="In escrow now" value={<Money value={k.held} digits={0} stack />} icon={Clock} tone="blue" hint={k.idle ? `${num(k.idle)} buyers inactive 60+ days` : undefined} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel title="New buyers — last 6 months" className="xl:col-span-2"><Bars series={data.signups} valueLabel="New buyers" format={(n) => num(n)} /></Panel>
        <Panel title="RFQ pipeline">
          <div className="space-y-3">
            {rfqOrder.map((s) => (
              <div key={s}>
                <div className="mb-1 flex items-center justify-between text-sm"><StatusBadge status={s} /><span className="font-medium">{data.rfqStatus[s] || 0}</span></div>
                <div className="h-1.5 rounded-full bg-mist"><div className="h-full rounded-full bg-gold" style={{ width: `${((data.rfqStatus[s] || 0) / rfqTotal) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel title="Top countries" action={<Globe2 className="h-4 w-4 text-gold" />}><HBars rows={data.byCountry} /></Panel>
        <Panel title="Buyers by plan"><HBars rows={data.byPlan} label={(r) => r.name} /></Panel>
        <Panel title="Top buyers by spend">
          {!data.topBuyers.length ? <p className="text-sm text-ink-medium">No paid orders yet.</p> : (
            <ul className="divide-y divide-mist">{data.topBuyers.map((b) => (
              <li key={b._id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <Link to={`/buyers/${b._id}`} className="min-w-0 truncate text-forest hover:underline">{b.company || b.name}<span className="block text-xs text-ink-medium">{b.country || '—'} · {b.orders} orders</span></Link>
                <Money value={b.spend} digits={0} stack className="text-right" />
              </li>
            ))}</ul>
          )}
        </Panel>
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-mist px-6 py-4"><h2 className="text-lg text-forest">Newest buyers</h2><Link to="/buyers" className="text-sm font-medium text-forest hover:underline">All buyers</Link></div>
        {!data.recent.length ? <Empty icon={Users} title="No buyers yet" /> : (
          <div className="overflow-x-auto"><table className="table"><tbody>{data.recent.map((u) => (
            <tr key={u._id}>
              <td><Link to={`/buyers/${u._id}`} className="font-medium text-forest hover:underline">{u.company || u.name}</Link><span className="block text-xs text-ink-medium">{u.email}</span></td>
              <td>{u.address?.country || '—'}</td>
              <td className="capitalize">{u.subscription?.status === 'active' ? (u.subscription.plan || '').replace('buyer_', '') : 'free'}</td>
              <td>{u.emailVerified ? <Badge color="success">Verified</Badge> : <Badge color="amber">Unverified</Badge>}</td>
              <td className="text-right text-ink-medium">{date(u.createdAt)}</td>
            </tr>
          ))}</tbody></table></div>
        )}
      </Card>
    </>
  );
}

/* ============================== SELLERS ============================== */
const FUNNEL = ['submitted', 'under_review', 'info_requested', 'verification_scheduled', 'nda_sent', 'nda_signed', 'payment_pending', 'active', 'rejected'];

export function SellerInsights() {
  const { data, loading } = useFetch('/admin/insights/sellers');
  if (loading || !data) return <><PageHeader title="Sellers" subtitle="Seller dashboard" /><SectionTabs role="seller" active="/sellers/dashboard" /><PageLoader /></>;
  const k = data.kpis;
  const funnelMax = Math.max(1, ...FUNNEL.map((s) => data.stages[s] || 0));
  return (
    <>
      <PageHeader title="Sellers" subtitle="Supplier base, verification pipeline and performance." />
      <SectionTabs role="seller" active="/sellers/dashboard" />

      {k.verificationsOpen > 0 && (
        <Link to="/verifications" className="mb-5 flex items-center gap-3 rounded-xl2 border border-gold/40 bg-gold/10 px-5 py-4 text-sm text-gold-dark transition hover:bg-gold/15">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span><b>{k.verificationsOpen}</b> supplier verification{k.verificationsOpen > 1 ? 's are' : ' is'} pending — open the verification queue →</span>
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link to="/sellers?approval="><Stat label="Total sellers" value={num(k.total)} icon={Building2} hint={`${num(k.newMonth)} joined this month · ${num(k.newWeek)} this week`} /></Link>
        <Link to="/sellers?approval=approved"><Stat label="Active (approved)" value={num(k.approved)} icon={BadgeCheck} tone="sage" hint={`${num(k.rejected)} rejected · ${num(k.suspended)} suspended`} /></Link>
        <Link to="/verifications"><Stat label="Verification pending" value={num(k.verificationsOpen)} icon={Clock} tone={k.verificationsOpen ? 'red' : 'green'} hint="Registration → NDA → payment" /></Link>
        <Stat label="Avg. rating" value={k.avgRating ? k.avgRating.toFixed(1) : '—'} icon={Star} tone="gold" hint={k.responseRate != null ? `${k.responseRate}% lead response rate` : 'No leads yet'} />
        <Stat label="Leads waiting for a quote" value={num(k.leadsOpen)} icon={ClipboardList} tone="blue" />
        <Stat label="Paid out to sellers" value={<Money value={k.paidOut} digits={0} stack />} icon={Wallet} tone="sage" />
        <Stat label="Seller funds on hold" value={<Money value={k.held} digits={0} stack />} icon={Clock} />
        <Stat label="Registration fees received" value={data.registrationRevenue.length ? <span className="flex flex-col leading-tight">{data.registrationRevenue.map((r) => <Money key={r._id} value={r.t} currency={r._id === 'INR' ? 'INR' : 'USD'} digits={0} />)}</span> : '—'} icon={TrendingUp} tone="gold" hint={`${data.registrationRevenue.reduce((s, r) => s + r.n, 0)} paid registrations`} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel title="Verification pipeline" className="xl:col-span-1">
          <ul className="space-y-2.5">
            {FUNNEL.map((s) => (
              <li key={s}>
                <Link to={`/verifications?stage=${s}`} className="block">
                  <div className="mb-1 flex items-center justify-between text-sm"><StageBadge stage={s} /><span className="font-medium">{data.stages[s] || 0}</span></div>
                  <div className="h-1.5 rounded-full bg-mist"><div className={cx('h-full rounded-full', s === 'active' ? 'bg-success' : s === 'rejected' ? 'bg-danger' : 'bg-gold')} style={{ width: `${((data.stages[s] || 0) / funnelMax) * 100}%` }} /></div>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
        <Card className="overflow-hidden xl:col-span-2">
          <div className="flex items-center justify-between border-b border-mist px-6 py-4"><h2 className="text-lg text-forest">Pending verifications</h2><Link to="/verifications" className="text-sm font-medium text-forest hover:underline">Open queue</Link></div>
          {!data.pendingVerifications.length ? <Empty icon={BadgeCheck} title="All caught up" text="No supplier is waiting for verification." /> : (
            <div className="overflow-x-auto"><table className="table"><tbody>{data.pendingVerifications.map((v) => (
              <tr key={v._id} className={cx(v.waitingDays >= 3 && 'bg-warning/5')}>
                <td className="border-l-4 border-l-gold"><Link to={`/verifications/${v._id}`} className="font-medium text-forest hover:underline">{v.companyName}</Link><span className="block text-xs text-ink-medium">{v.number} · {[v.city, v.country].filter(Boolean).join(', ')}</span></td>
                <td><StageBadge stage={v.stage} /></td>
                <td className={cx('text-right text-sm', v.waitingDays >= 3 ? 'font-medium text-danger' : 'text-ink-medium')}>{v.waitingDays === 0 ? 'today' : `${v.waitingDays}d waiting`}</td>
              </tr>
            ))}</tbody></table></div>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel title="New sellers — last 6 months" className="xl:col-span-2"><Bars series={data.signups} valueLabel="New sellers" format={(n) => num(n)} /></Panel>
        <Panel title="Sellers by plan"><HBars rows={data.byPlan} label={(r) => r.name} /></Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel title="Top countries" action={<Globe2 className="h-4 w-4 text-gold" />}><HBars rows={data.byCountry} /></Panel>
        <Panel title="Top categories"><HBars rows={data.byCategory} /></Panel>
        <Panel title="Top-rated sellers">
          {!data.topSellers.length ? <p className="text-sm text-ink-medium">No approved sellers yet.</p> : (
            <ul className="divide-y divide-mist">{data.topSellers.map((s) => (
              <li key={s._id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <Link to={`/sellers/${s._id}`} className="min-w-0 truncate text-forest hover:underline">{s.company || s.name}<span className="block text-xs text-ink-medium">{s.seller?.supplierCode || s.seller?.country}</span></Link>
                <span className="flex shrink-0 items-center gap-1"><Stars value={s.seller?.rating} size="h-3 w-3" /><span className="text-xs text-ink-medium">({s.seller?.ratingCount || 0})</span></span>
              </li>
            ))}</ul>
          )}
        </Panel>
      </div>
    </>
  );
}
