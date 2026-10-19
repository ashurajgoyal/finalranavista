import { useState } from 'react';
import { ExternalLink, Globe2, ImagePlus, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import api, { errMsg, fileUrl, uploadFiles } from '../lib/api';
import useFetch from '../lib/useFetch';
import { useAuth } from '../lib/auth';
import { CATEGORIES } from '../lib/format';
import { Alert, Badge, Button, Card, Empty, Field, Input, Modal, PageHeader, PageLoader, Select, Textarea, cx } from '../components/ui';

const SITE = import.meta.env.VITE_SITE_URL || '';
const blank = { name: '', slug: '', code: '', flag: '', region: '', currency: '', intro: '', strengths: '', hubs: '', ports: '', leadTime: '', sellerCountries: '', products: [], active: true, sort: 50 };
const join = (a) => (Array.isArray(a) ? a.join(', ') : a || '');

export default function Countries() {
  const { can, user } = useAuth();
  const { data, loading, reload } = useFetch('/admin/countries');
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const canEdit = can('countriesEdit');

  const open = (c) => setEdit(c ? { ...blank, ...c, strengths: join(c.strengths), hubs: join(c.hubs), ports: join(c.ports), sellerCountries: join(c.sellerCountries), products: c.products.map((p) => ({ ...p })) } : { ...blank, products: [] });
  const set = (k) => (e) => setEdit({ ...edit, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const setP = (i, k, v) => setEdit({ ...edit, products: edit.products.map((p, j) => (j === i ? { ...p, [k]: v } : p)) });
  const save = async () => {
    setBusy(true); setErr('');
    try { edit._id ? await api.patch(`/admin/countries/${edit._id}`, edit) : await api.post('/admin/countries', edit); setEdit(null); reload(); } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  };
  const toggle = async (c) => { await api.patch(`/admin/countries/${c._id}`, { active: !c.active }); reload(); };
  const remove = async (c) => { if (window.confirm(`Delete ${c.name} and its ${c.products.length} products?`)) { await api.delete(`/admin/countries/${c._id}`); reload(); } };
  const uploadImg = async (i, file) => { try { const [f] = await uploadFiles([file]); setP(i, 'image', f.url); } catch (x) { setErr(errMsg(x)); } };

  return (
    <>
      <PageHeader title="Countries & products" subtitle="What the website shows under Products → By country. Seller counts come from verified sellers in each country."
        actions={canEdit && <Button onClick={() => open(null)}><Plus className="h-4 w-4" /> Add country</Button>} />
      {loading ? <PageLoader /> : !data?.length ? <Card><Empty icon={Globe2} title="No countries yet" text="Restart the API once — the default 21 sourcing countries are added automatically." /></Card> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((c) => (
            <Card key={c._id} className={cx('card-pad flex flex-col', !c.active && 'opacity-60')}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3"><span className="text-4xl" aria-hidden>{c.flag}</span><div><h3 className="text-xl text-forest">{c.name}</h3><p className="text-xs text-ink-medium">{c.region} · {c.currency}</p></div></div>
                {canEdit && <button onClick={() => open(c)} className="rounded-md p-1.5 hover:bg-mist" aria-label="Edit"><Pencil className="h-4 w-4" /></button>}
              </div>
              <p className="mt-3 line-clamp-2 flex-1 text-sm text-ink-medium">{c.intro}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge color="green">{c.products.length} products</Badge>
                <Badge color="gold">{c.approvedSellers} verified sellers</Badge>
                {c.sellers > c.approvedSellers && <Badge color="gray">{c.sellers - c.approvedSellers} pending</Badge>}
                {!c.active && <Badge color="red">Hidden</Badge>}
              </div>
              <div className="mt-4 flex flex-wrap gap-3 border-t border-mist pt-3 text-sm">
                {canEdit && <button onClick={() => toggle(c)} className="text-forest hover:underline">{c.active ? 'Hide from website' : 'Show on website'}</button>}
                {SITE && <a href={`${SITE}/products/country/${c.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-forest hover:underline"><ExternalLink className="h-3.5 w-3.5" /> View</a>}
                {user.adminRole === 'super' && <button onClick={() => remove(c)} className="ml-auto text-danger hover:underline">Delete</button>}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal wide open={!!edit} onClose={() => setEdit(null)} title={edit?._id ? `Edit ${edit.name}` : 'Add country'}
        footer={<><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button loading={busy} onClick={save}>Save</Button></>}>
        {edit && (
          <div className="space-y-5">
            {err && <Alert type="error">{err}</Alert>}
            <div className="grid gap-4 sm:grid-cols-4">
              <Field label="Name" className="sm:col-span-2"><Input value={edit.name} onChange={set('name')} /></Field>
              <Field label="Flag (emoji)"><Input value={edit.flag} onChange={set('flag')} placeholder="🇮🇳" /></Field>
              <Field label="ISO code"><Input value={edit.code} onChange={set('code')} maxLength={3} /></Field>
              <Field label="URL slug"><Input value={edit.slug} onChange={set('slug')} placeholder="auto" /></Field>
              <Field label="Region"><Input value={edit.region} onChange={set('region')} /></Field>
              <Field label="Currency"><Input value={edit.currency} onChange={set('currency')} maxLength={3} /></Field>
              <Field label="Typical lead time"><Input value={edit.leadTime} onChange={set('leadTime')} placeholder="30–60 days" /></Field>
              <Field label="Introduction" className="sm:col-span-4"><Textarea rows={2} value={edit.intro} onChange={set('intro')} /></Field>
              <Field label="Strengths (comma separated)" className="sm:col-span-2"><Input value={edit.strengths} onChange={set('strengths')} /></Field>
              <Field label="Manufacturing hubs" className="sm:col-span-2"><Input value={edit.hubs} onChange={set('hubs')} /></Field>
              <Field label="Ports" className="sm:col-span-2"><Input value={edit.ports} onChange={set('ports')} /></Field>
              <Field label="Seller countries counted here" hint="Leave empty to use the name. e.g. Europe → Germany, Italy…" className="sm:col-span-2"><Input value={edit.sellerCountries} onChange={set('sellerCountries')} /></Field>
              <Field label="Sort order"><Input type="number" value={edit.sort} onChange={set('sort')} /></Field>
              <label className="flex items-center gap-2 self-end pb-3 text-sm"><input type="checkbox" className="accent-forest" checked={edit.active} onChange={set('active')} /> Show on website</label>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between"><p className="label mb-0">Products ({edit.products.length})</p><Button size="sm" variant="outline" onClick={() => setEdit({ ...edit, products: [...edit.products, { name: '', category: '', description: '', moq: '', priceRange: '', featured: false }] })}><Plus className="h-3.5 w-3.5" /> Add product</Button></div>
              <div className="space-y-3">
                {edit.products.map((p, i) => (
                  <div key={p._id || i} className="grid gap-2 rounded-xl bg-cream/60 p-3 ring-1 ring-beige sm:grid-cols-[72px_1fr_1fr]">
                    <label className="row-span-2 flex h-[72px] w-[72px] cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-beige" title="Product photo">
                      {p.image ? <img src={fileUrl(p.image)} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-5 w-5 text-ink-medium" />}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImg(i, e.target.files[0])} />
                    </label>
                    <Input value={p.name} onChange={(e) => setP(i, 'name', e.target.value)} placeholder="Product name" />
                    <Select value={p.category || ''} onChange={(e) => setP(i, 'category', e.target.value)} options={CATEGORIES} placeholder="Category" />
                    <Input value={p.description || ''} onChange={(e) => setP(i, 'description', e.target.value)} placeholder="Short description" className="sm:col-span-2" />
                    <div className="flex flex-wrap items-center gap-2 sm:col-span-3">
                      <Input value={p.moq || ''} onChange={(e) => setP(i, 'moq', e.target.value)} placeholder="MOQ" className="max-w-[160px]" />
                      <Input value={p.priceRange || ''} onChange={(e) => setP(i, 'priceRange', e.target.value)} placeholder="Price range e.g. $4 – $20" className="max-w-[200px]" />
                      <button type="button" onClick={() => setP(i, 'featured', !p.featured)} className={cx('inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs ring-1', p.featured ? 'bg-gold text-white ring-gold' : 'bg-white ring-line')}><Star className="h-3.5 w-3.5" /> Featured</button>
                      <button type="button" onClick={() => setEdit({ ...edit, products: edit.products.filter((_, j) => j !== i) })} className="ml-auto rounded p-1.5 text-ink-medium hover:bg-white hover:text-danger" aria-label="Remove product"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
