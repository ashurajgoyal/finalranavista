import { Link } from 'react-router-dom';
import Money from '../components/Money';
import { AlertTriangle, ArrowRight, BadgeCheck, Building2, Coins, CreditCard, DollarSign, Gavel, Handshake, Inbox, Lock, Mail, PackageSearch, TimerOff } from 'lucide-react';
import useFetch from '../lib/useFetch';
import { useAuth } from '../lib/auth';
import { date, dual0, timeAgo } from '../lib/format';
import { Badge, Card, PageHeader, PageLoader, Stat, StatusBadge, cx } from '../components/ui';
import { useFx } from '../lib/currency';
import { StageBadge } from './Verifications';
import { SrcBadge } from './Sourcing';
import Bars from '../components/Bars';

const ORDER = ['pending', 'assigned', 'quoted', 'negotiating', 'accepted', 'closed', 'cancelled'];

export default function Dashboard() {
  const { user } = useAuth();
  const { data, loading } = useFetch('/admin/overview');
  const { data: ac } = useFetch('/admin/action-center');
  const { inr, data: fx } = useFx();
  if (loading || !data) return <PageLoader />;
  const k = data.kpis;
  const totalRfqs = Object.values(data.statusCounts).reduce((a, b) => a + b, 0) || 1;
  return (
    <>
      <PageHeader title={`Hello, ${user.name.split(' ')[0]}`} subtitle="Marketplace at a glance." />

      {ac?.verificationsTotal > 0 && (
        <Card className="mb-6 overflow-hidden border-gold/50 ring-2 ring-gold/30">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-gold/10 px-6 py-4">
            <h2 className="flex items-center gap-2 text-lg text-forest"><AlertTriangle className="h-5 w-5 text-gold-dark" /> {ac.verificationsTotal} supplier verification{ac.verificationsTotal > 1 ? 's' : ''} pending</h2>
            <Link to="/verifications" className="inline-flex items-center gap-1 text-sm font-medium text-forest hover:underline">Open verification queue <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <tbody>{ac.verifications.map((v) => (
                <tr key={v._id} className={cx(v.waitingDays >= 3 && 'bg-warning/5')}>
                  <td><Link to={`/verifications/${v._id}`} className="font-medium text-forest hover:underline">{v.companyName}</Link><span className="block text-xs text-ink-medium">{v.number} · {[v.city, v.country].filter(Boolean).join(', ')}</span></td>
                  <td><StageBadge stage={v.stage} /></td>
                  <td className="text-sm text-ink-medium">{v.physical?.status === 'scheduled' ? `Visit ${date(v.physical.scheduledAt)}` : v.virtual?.status === 'scheduled' ? `Call ${date(v.virtual.scheduledAt)}` : ''}</td>
                  <td className={cx('text-right text-sm', v.waitingDays >= 3 ? 'font-medium text-danger' : 'text-ink-medium')}>{v.waitingDays === 0 ? 'Today' : `${v.waitingDays} day${v.waitingDays > 1 ? 's' : ''} waiting`}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link to="/sourcing"><Stat label="Sourcing projects open" value={ac?.sourcingTotal ?? '…'} icon={PackageSearch} tone="gold" hint={k.sourcingNew ? `${k.sourcingNew} new / in review` : 'Buyer product requests'} /></Link>
        <Link to="/liaison?status=new"><Stat label="New liaison enquiries" value={k.liaisonNew ?? 0} icon={Handshake} tone="sage" /></Link>
        <Link to="/enquiries"><Stat label="Open contact enquiries" value={k.enquiriesOpen ?? 0} icon={Mail} tone="blue" /></Link>
        <Link to="/currency" className="card card-pad block transition hover:shadow-lift">
          <p className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-ink-medium">Live rate <Coins className="h-4 w-4 text-gold" /></p>
          <p className="mt-2 font-serif text-3xl text-ink">$1 = ₹{inr.toFixed(2)}</p>
          <p className="mt-1 text-xs text-ink-medium">{fx?.rates ? `€1 = ₹${(fx.rates.INR / fx.rates.EUR).toFixed(2)} · £1 = ₹${(fx.rates.INR / fx.rates.GBP).toFixed(2)} · AED 1 = ₹${(fx.rates.INR / fx.rates.AED).toFixed(2)}` : 'Loading…'}</p>
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link to="/queue"><Stat label="Unassigned RFQs" value={k.pending} icon={Inbox} tone="gold" hint="Waiting in the pending queue" /></Link>
        <Link to="/rfqs?overdue=1"><Stat label="Overdue leads" value={k.overdue} icon={TimerOff} tone="red" hint="Seller missed response window" /></Link>
        <Link to="/verifications"><Stat label="Sellers to verify" value={k.verificationsPending ?? k.sellersPending} icon={BadgeCheck} tone="blue" hint={k.sellersPending ? `${k.sellersPending} seller accounts not yet approved` : undefined} /></Link>
        <Link to="/disputes"><Stat label="Open disputes" value={k.openDisputes} icon={Gavel} tone="red" /></Link>
        <Stat label="Funds held (escrow)" value={<Money value={k.held} digits={0} stack />} icon={Lock} />
        <Stat label="Platform fees this month" value={<Money value={k.monthFees} digits={0} stack />} icon={DollarSign} tone="sage" />
        <Stat label="Subscription MRR" value={<Money value={k.mrr} digits={0} stack />} icon={CreditCard} tone="gold" />
        {k.overdue > 0 ? (
          <Link to="/rfqs?overdue=1" className="card card-pad flex items-center gap-3 border-danger/30 bg-danger/5 text-danger"><AlertTriangle className="h-6 w-6" /><span className="text-sm font-medium">{k.overdue} lead{k.overdue > 1 ? 's' : ''} need reassignment</span></Link>
        ) : <div className="card card-pad flex items-center text-sm text-ink-medium">All leads within response window ✓</div>}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="card-pad xl:col-span-2">
          <h2 className="mb-6 text-lg text-forest">Paid volume — last 6 months</h2>
          <Bars format={dual0} series={data.series.map((s) => ({ label: s.label, value: s.gmv, value2: s.fees }))} valueLabel="GMV" value2Label="Platform fees" />
        </Card>
        <Card className="card-pad">
          <h2 className="mb-4 text-lg text-forest">RFQ pipeline</h2>
          <div className="space-y-3">
            {ORDER.map((s) => (
              <div key={s}>
                <div className="mb-1 flex items-center justify-between text-sm"><StatusBadge status={s} /><span className="font-medium">{data.statusCounts[s] || 0}</span></div>
                <div className="h-1.5 rounded-full bg-mist"><div className="h-full rounded-full bg-forest" style={{ width: `${((data.statusCounts[s] || 0) / totalRfqs) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {ac?.sourcing?.length > 0 && (
        <Card className="mt-6 overflow-hidden">
          <div className="flex items-center justify-between border-b border-mist px-6 py-4"><h2 className="text-lg text-forest">Sourcing projects needing work</h2><Link to="/sourcing" className="text-sm font-medium text-forest hover:underline">View all</Link></div>
          <table className="table"><tbody>{ac.sourcing.map((s) => (
            <tr key={s._id}>
              <td><Link to={`/sourcing/${s._id}`} className="font-medium text-forest hover:underline">{s.number}</Link></td>
              <td className="max-w-xs truncate">{s.title}</td>
              <td className="text-ink-medium">{s.contact?.company || s.contact?.name}</td>
              <td><SrcBadge s={s.status} /></td>
              <td className="text-right text-xs text-ink-medium">needed by {date(s.requiredBy)}</td>
            </tr>
          ))}</tbody></table>
        </Card>
      )}

      <Card className="mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-mist px-6 py-4"><h2 className="text-lg text-forest">Latest RFQs</h2><Link to="/rfqs" className="text-sm font-medium text-forest hover:underline">View all</Link></div>
        <table className="table">
          <tbody>
            {data.recentRfqs.map((r) => (
              <tr key={r._id}>
                <td><Link to={`/rfqs/${r._id}`} className="font-medium text-forest hover:underline">{r.number}</Link></td>
                <td className="max-w-xs truncate">{r.title}</td>
                <td className="text-ink-medium">{r.buyer?.company || r.buyer?.name}</td>
                <td className="text-ink-medium">{r.category}</td>
                <td><StatusBadge status={r.status} /></td>
                <td className="text-right text-xs text-ink-medium">{timeAgo(r.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
