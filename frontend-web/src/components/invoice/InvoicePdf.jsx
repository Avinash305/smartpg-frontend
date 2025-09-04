import html2pdf from 'html2pdf.js'

const formatDate = (s) => {
  if (!s) return '—'
  const d = new Date(s)
  if (isNaN(d)) return String(s)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}:${mm}:${yyyy}`
}

const formatMoney = (v) => `₹ ${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

function formatNowIST() {
  const now = new Date()
  // Asia/Kolkata time as string
  const fmt = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
  }).formatToParts(now)
  const get = (t) => fmt.find(p => p.type === t)?.value || ''
  const dd = get('day')
  const mm = get('month')
  const yyyy = get('year')
  const hh = get('hour')
  const mi = get('minute')
  const ss = get('second')
  const dayperiod = get('dayPeriod')?.toLowerCase() || ''
  return `${dd}:${mm}:${yyyy} ${hh}:${mi}:${ss} ${dayperiod}`
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function formatDMY(s) {
  if (!s) return '—'
  const d = new Date(s)
  if (isNaN(d)) return esc(s)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}:${mm}:${yyyy}`
}

export function buildInvoicePdfNode(invoice) {
  const d = invoice || {}
  const tenant = d.tenant || d.tenant_detail || {}
  const booking = d.booking || d.booking_detail || {}
  const org = d.org || d.organization || d.property || {}
  const payments = Array.isArray(d.payments) ? d.payments : []

  // Canonical totals to match UI
  const subtotal = Number(d.subtotal_amount ?? d.amount ?? 0)
  const tax = Number(d.tax_amount ?? d.tax ?? 0)
  const discount = Number(d.discount_amount ?? d.discount ?? 0)
  const total = Number(d.total_amount ?? d.total ?? (subtotal + tax - discount))
  const paidList = payments.reduce((s, p) => s + Number(p?.amount || 0), 0)
  const paid = Number(d.payments_total ?? d.amount_paid ?? d.paid_amount ?? paidList ?? (total - Number(d.balance_due ?? 0)))
  const balance = Number(d.balance_due ?? Math.max(0, total - paid))

  // Items: prefer given, else map expenses; add synthetic Rent if missing
  let items = Array.isArray(d.items) ? d.items.slice() : (Array.isArray(d.line_items) ? d.line_items.slice() : [])
  if (!items.length && Array.isArray(d.expenses) && d.expenses.length) {
    items = d.expenses.map(e => ({
      description: e.label,
      quantity: 1,
      rate: Number(e.amount || 0),
      amount: Number(e.amount || 0),
      tax_rate: e.tax_rate,
      hsn: e.hsn || e.hsn_sac || e.sac,
      notes: e.notes,
    }))
  }
  const hasRent = items.some(it => String(it.description || it.name || it.label || '').toLowerCase().includes('rent'))
  if (!hasRent && (d.amount ?? d.subtotal_amount)) {
    const rentAmount = Number(d.amount ?? d.subtotal_amount ?? 0)
    if (rentAmount > 0) items.unshift({ description: 'Rent', quantity: 1, rate: rentAmount, amount: rentAmount })
  }

  const hasHsn = items.some(it => it?.hsn || it?.hsn_sac || it?.sac)

  // Derive building name/address to match InvoiceDetails fallbacks
  const buildingName = (booking?.building_name)
    || (org?.name || org?.title || org?.property_name)
    || '—'
  const buildingAddress = (booking?.building_address)
    || (org?.address || (booking?.property && booking?.property?.address))
    || [
      booking?.building_address_line,
      booking?.building_city,
      booking?.building_state,
      booking?.building_pincode,
    ].filter(Boolean).join(', ')

  // Branding logo from possible sources
  const logoUrl = d.logo || d.logo_url || org.logo || org.logo_url || org.image || booking?.building_logo || ''

  // Status-aware badge styles
  const status = String(d.status || '').toLowerCase()
  const statusMap = {
    paid:   { bg: '#ECFDF5', color: '#065F46', border: '#34D399' },
    partial: { bg: '#FEF3C7', color: '#92400E', border: '#FBBF24' },
    partially_paid: { bg: '#FEF3C7', color: '#92400E', border: '#FBBF24' },
    pending: { bg: '#EFF6FF', color: '#1E40AF', border: '#93C5FD' },
    overdue: { bg: '#FEF2F2', color: '#991B1B', border: '#FCA5A5' },
    cancelled: { bg: '#F3F4F6', color: '#4B5563', border: '#D1D5DB' },
  }
  const st = statusMap[status] || { bg: '#F3F4F6', color: '#374151', border: '#E5E7EB' }

  const root = document.createElement('div')
  root.style.padding = '20px'
  root.style.fontFamily = 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"'
  root.style.color = '#111827'
  root.style.lineHeight = '1.35'
  root.style.fontSize = '14px'
  root.innerHTML = `
    <style>
      .inv-h1 { font-size: 26px; font-weight: 700; margin: 0; }
      .muted { color: #6B7280; font-size: 14px; }
      .sec { border: 1px solid #E5E7EB; border-radius: 10px; padding: 14px; background:#ffffff; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }
      .sec-sky { border: 1px solid #BAE6FD; background: #F0F9FF; border-radius: 10px; padding: 14px; box-shadow: 0 1px 2px rgba(12,74,110,0.06); }
      .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
      .kv { display: flex; justify-content: space-between; align-items: center; padding: 5px 0; }
      .table { width: 100%; border-collapse: collapse; }
      .table th, .table td { border-bottom: 1px solid #E5E7EB; padding: 12px; font-size: 14px; }
      .table thead th { text-align: left; color: #0C4A6E; font-weight: 700; background: #E0F2FE; }
      .table tbody tr:nth-child(odd) { background: #F8FAFC; }
      .table tbody tr:hover { background: #F1F5F9; }
      .tright { text-align: right; }
      .tstrong { font-weight: 600; }
      .badge { display:inline-flex; align-items:center; font-size: 13px; padding: 5px 12px; border-radius: 999px; border:1px solid transparent; }
      .pill { display:inline-block; padding:4px 12px; border-radius:999px; font-weight:700; }
      .logo { height: 40px; object-fit: contain; margin-bottom: 4px; }
      .nowrap { white-space: nowrap; }
      .desc { word-break: break-word; }
      .col-rate { width: 16%; }
      .col-amt { width: 18%; }
      .table th, .table td { font-variant-numeric: tabular-nums; }
      .divider { height:1px; background: linear-gradient(90deg, rgba(186,230,253,0), rgba(186,230,253,1), rgba(186,230,253,0)); margin: 10px 0 14px; }
      .title-block { margin-bottom: 6px; }
      .section-title { margin: 0 0 6px; }
    </style>
    <div style="text-align:center; margin-bottom:10px; padding-bottom:6px;">
      ${logoUrl ? `<img src="${esc(logoUrl)}" class="logo" alt="Logo" />` : ''}
      <div style="font-size:30px; font-weight:700; color:#0c4a6e; letter-spacing: .2px;">${esc(buildingName)}</div>
      ${buildingAddress ? `<div class="muted">${esc(buildingAddress)}</div>` : ''}
    </div>
    <div style="display:flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
      <div>
        <div class="inv-h1">Invoice ID #${d.id ?? ''}</div>
        <div class="muted nowrap">Issue: ${formatDate(d.issue_date || d.issued_on || d.created_at)}</div>
        <div class="muted nowrap">Next Due: ${formatDate(
          d.next_due_date || d.next_due_on || d.next_due_at ||
          d.due_date || d.due_on || d.due_at
        )}</div>
      </div>
      <div class="badge" style="background:${st.bg}; color:${st.color}; border-color:${st.border};">${String(d.status || '').toUpperCase()}</div>
    </div>
    <div class="divider" style="margin: 10px 0 14px;"></div>
    ${items.length ? `
    <div class="sec" style="padding:0; overflow:hidden;">
      <table class="table">
        <thead>
          <tr>
            <th class="desc">Description</th>
            ${hasHsn ? '<th>HSN/SAC</th>' : ''}
            <th class="tright col-rate">Rate</th>
            <th class="tright col-amt">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((it, idx) => {
            const qty = Number(it.quantity ?? it.qty ?? 1)
            const rate = Number(it.rate ?? it.price ?? it.unit_price ?? (it.amount ?? 0))
            const amt = Number(it.amount ?? (qty * rate))
            const desc = it.description ?? it.name ?? it.label ?? `Item ${idx + 1}`
            const hsn = it.hsn ?? it.hsn_sac ?? it.sac
            return `
              <tr>
                <td class="desc">${esc(desc)}</td>
                ${hasHsn ? `<td>${esc(hsn || '—')}</td>` : ''}
                <td class="tright col-rate">${formatMoney(rate)}</td>
                <td class="tright tstrong col-amt">${formatMoney(amt)}</td>
              </tr>
            `
          }).join('')}
        </tbody>
      </table>
    </div>` : ''}

    <div class="grid2" style="margin-top:14px;">
      <div class="sec-sky">
        <div class="section-title" style="font-size:16px; font-weight:600; color:#374151;">Tenant</div>
        <div style="font-size:14px;">
          <div style="color:#111827; font-weight:600;">${esc(tenant.full_name || tenant.name || tenant.email || '—')}</div>
          <div style="color:#374151;">${esc(tenant.phone || tenant.mobile || '—')}</div>
        </div>
      </div>
      <div class="sec-sky">
        <div class="section-title" style="font-size:16px; font-weight:600; color:#374151;">Location</div>
        <div style="font-size:14px;">
          <div style="color:#111827; font-weight:600;">${esc(buildingName)}</div>
          <div style="color:#374151;">
            ${(() => {
              const rn = booking?.room_number || booking?.room?.number || booking?.room_no || booking?.room || booking?.room_name
              const bn = booking?.bed_number || booking?.bed?.number || booking?.bed_no || booking?.bed
              let floor = booking?.floor_name || booking?.floor?.name || booking?.floor_label || booking?.floor_number || booking?.floor_no || booking?.floor
              let fLabel = ''
              if (floor != null && floor !== '') {
                const s = String(floor)
                fLabel = /floor/i.test(s) ? s : `Floor ${s}`
              }
              if (!rn && !bn && !fLabel) return '—'
              const rLabel = rn ? `Room ${rn}` : ''
              const bLabel = bn ? `Bed ${bn}` : ''
              const parts = [fLabel, rLabel, bLabel].filter(Boolean)
              return parts.join(' • ')
            })()}
          </div>
        </div>
      </div>
    </div>

    <div class="grid2" style="margin-top:14px;">
      <div class="sec-sky">
        <div class="section-title" style="font-size:16px; font-weight:600; color:#374151;">Notes / Terms</div>
        <div style="white-space: pre-line; font-size: 14px; color:#111827;">${esc(d.notes || d.remarks || d.terms || '—')}</div>
      </div>
      <div class="sec-sky">
        <div class="section-title" style="font-size:16px; font-weight:600; color:#374151;">Summary</div>
        <div class="kv"><div class="tstrong">Total</div><div class="tstrong">${formatMoney(total)}</div></div>
        <div class="kv"><div class="muted ">Paid</div><div style="color:#047857; font-size: 15px;">${formatMoney(paid)}</div></div>
        <div class="kv"><div class="tstrong">Balance Due</div><div class="pill" style="background:#FEF2F2;color:#991B1B;">${formatMoney(balance)}</div></div>
      </div>
    </div>

    ${(d.payment_instructions || d.bank || d.upi_id || d.qr_image) ? `
      <div class="sec" style="margin-top:14px;">
        <div style="font-size:16px; font-weight:600; color:#374151; margin-bottom: 4px;">Payment Instructions</div>
        ${d.payment_instructions ? `<div style="font-size:14px; white-space: pre-line;">${esc(d.payment_instructions)}</div>` : ''}
        ${d.bank ? `
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size:14px; margin-top:4px;">
            <div class="kv"><div class="muted">Account Name</div><div>${esc(d.bank.account_name || '—')}</div></div>
            <div class="kv"><div class="muted">Account Number</div><div>${esc(d.bank.account_no || d.bank.account_number || '—')}</div></div>
            <div class="kv"><div class="muted">IFSC</div><div>${esc(d.bank.ifsc || '—')}</div></div>
            <div class="kv"><div class="muted">Bank</div><div>${esc((d.bank.bank_name || '') + (d.bank.branch ? ` (${d.bank.branch})` : ''))}</div></div>
          </div>
        ` : ''}
        ${d.upi_id ? `<div style="font-size:14px; margin-top:4px;">UPI: ${esc(d.upi_id)}</div>` : ''}
        ${d.qr_image ? `<div style="margin-top:6px;"><img src="${esc(d.qr_image)}" alt="Payment QR" style="height:140px; width:140px; object-fit:contain; border:1px solid #E5E7EB; border-radius:8px;" /></div>` : ''}
      </div>
    ` : ''}

    ${payments.length ? `
      <div class="sec" style="margin-top:12px;">
        <div style="font-size:16px; font-weight:600; color:#374151; margin-bottom: 12px;">Payment History</div>
        <table class="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Method</th>
              <th>Reference</th>
              <th class="tright">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${payments.map(p => `
              <tr>
                <td style="font-size:14px;">${esc(formatDate(p.received_at || p.paid_on || p.date))}</td>
                <td style="font-size:14px;">${esc(p.method || '—')}</td>
                <td style="font-size:14px;">${esc(p.reference || '—')}</td>
                <td class="tright tstrong" style="font-size:14px;">${formatMoney(p.amount)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="text-align:right;font-weight:700;border-top:2px solid #D1FAE5;background:#ECFDF5;color:#065f46; font-size:18px;">Total Paid</td>
              <td class="tright" style="font-weight:700;border-top:2px solid #D1FAE5;background:#ECFDF5;color:#065f46; font-size:18px;">${formatMoney(paidList)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    ` : ''}
  `
  return root
}

export async function downloadInvoicePdf(invoice) {
  const node = buildInvoicePdfNode(invoice)
  const filename = `Invoice-${invoice?.id ?? 'document'}.pdf`
  const opt = {
    margin: [8, 8, 8, 8],
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 3, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'legacy'] },
  }
  await html2pdf().set(opt).from(node).save()
}