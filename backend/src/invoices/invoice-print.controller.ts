import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Response } from 'express';
import { InvoicesService } from './invoices.service';
import { UsersService } from '../users/users.service';

@Controller('invoices')
export class InvoicePrintController {
  constructor(
    private invoices: InvoicesService,
    private jwt: JwtService,
    private users: UsersService,
  ) {}

  @Get(':id/print-page')
  async printPage(
    @Param('id') id: string,
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    let userId: string;
    try {
      const payload = this.jwt.verify<{ sub: string }>(token);
      userId = payload.sub;
    } catch {
      res.status(401).type('html').send(
        '<html><body style="font-family:sans-serif;padding:40px;color:red">Neautorizovaný prístup — prosím zatvorte toto okno a skúste znova.</body></html>',
      );
      return;
    }
    const [invoice, user] = await Promise.all([
      this.invoices.findOne(userId, id),
      this.users.findById(userId),
    ]);
    res.removeHeader('Content-Security-Policy');
    res.type('html').send(buildInvoiceHtml(invoice, user));
  }
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('sk-SK');
}

function eur(v: number | string) {
  return new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' }).format(+v);
}

function buildInvoiceHtml(inv: any, user: any): string {
  const items = (inv.items ?? [])
    .map(
      (it: any) => `
    <tr>
      <td>${it.description ?? ''}</td>
      <td class="r">${(+it.quantity).toFixed(2)} ${it.unit ?? ''}</td>
      <td class="r">${eur(it.unitPrice)}</td>
      <td class="r">${eur(it.total)}</td>
    </tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="sk">
<head>
<meta charset="utf-8">
<title>Faktúra${inv.documentNumber ? ' č. ' + inv.documentNumber : ''}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#1a1a1a;background:#fff}
  .wrap{max-width:800px;margin:40px auto;padding:40px}
  .hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:36px;padding-bottom:20px;border-bottom:2px solid #6366f1}
  h1{font-size:32px;font-weight:700;color:#6366f1;letter-spacing:2px}
  .docn{font-size:16px;color:#555;margin-top:4px}
  .hdr-r{text-align:right}
  .lbl{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.5px}
  .val{font-size:14px;font-weight:500}
  .parties{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:28px}
  .pt{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px}
  .pn{font-size:16px;font-weight:600;margin-bottom:4px}
  .period{background:#f5f5ff;border-left:3px solid #6366f1;padding:8px 14px;margin-bottom:24px;font-size:13px;color:#444}
  table{width:100%;border-collapse:collapse;margin-bottom:24px}
  th{background:#6366f1;color:#fff;padding:10px 12px;font-size:12px;font-weight:600;text-align:left}
  td{padding:10px 12px;border-bottom:1px solid #eee}
  .r{text-align:right}
  .totals{margin-left:auto;width:280px}
  .trow{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee;font-size:13px}
  .tfin{border-top:2px solid #6366f1;border-bottom:none;margin-top:4px;padding-top:10px;font-size:16px;font-weight:700;color:#6366f1}
  .print-btn{margin-bottom:16px}
  .print-btn button{padding:10px 24px;background:#6366f1;color:#fff;border:none;border-radius:6px;font-size:14px;font-weight:600;cursor:pointer}
  .print-btn button:hover{background:#4f46e5}
  @media print{.print-btn{display:none}@page{margin:15mm}.wrap{margin:0;padding:20px;max-width:none}}
</style>
</head>
<body>
<div class="wrap">
  <div class="print-btn">
    <button onclick="window.print()">🖨 Tlačiť / Uložiť ako PDF</button>
  </div>
  <div class="hdr">
    <div>
      <h1>FAKTÚRA</h1>
      ${inv.documentNumber ? `<div class="docn">č. ${inv.documentNumber}</div>` : ''}
    </div>
    <div class="hdr-r">
      <div class="lbl">Dátum vystavenia</div><div class="val">${fmt(inv.issueDate)}</div>
      <div class="lbl" style="margin-top:8px">Dátum splatnosti</div><div class="val">${fmt(inv.dueDate)}</div>
      ${inv.variableSymbol ? `<div class="lbl" style="margin-top:8px">Variabilný symbol</div><div class="val">${inv.variableSymbol}</div>` : ''}
    </div>
  </div>
  <div class="parties">
    <div>
      <div class="pt">Dodávateľ</div>
      ${user.supplierName ? `<div class="pn">${user.supplierName}</div>` : '<div class="pn" style="color:#aaa">— doplniť v nastaveniach —</div>'}
      ${user.supplierIco ? `<div>IČO: ${user.supplierIco}</div>` : ''}
      ${user.supplierDic ? `<div>DIČ: ${user.supplierDic}</div>` : ''}
      ${user.supplierIcDph ? `<div>IČ DPH: ${user.supplierIcDph}</div>` : ''}
      ${user.supplierAddress ? `<div style="margin-top:4px">${user.supplierAddress}</div><div>${user.supplierZip ?? ''} ${user.supplierCity ?? ''}</div>` : ''}
      ${user.supplierIban ? `<div style="margin-top:4px">IBAN: ${user.supplierIban}</div>` : ''}
    </div>
    <div>
      <div class="pt">Odberateľ</div>
      <div class="pn">${inv.client?.name ?? ''}</div>
      ${inv.client?.ico ? `<div>IČO: ${inv.client.ico}</div>` : ''}
      ${inv.client?.dic ? `<div>DIČ: ${inv.client.dic}</div>` : ''}
      ${inv.client?.icDph ? `<div>IČ DPH: ${inv.client.icDph}</div>` : ''}
      ${inv.client?.address ? `<div style="margin-top:4px">${inv.client.address}</div><div>${inv.client.zipCode ?? ''} ${inv.client.city ?? ''}</div>` : ''}
    </div>
  </div>
  <div class="period">Fakturačné obdobie: <strong>${fmt(inv.periodFrom)} – ${fmt(inv.periodTo)}</strong></div>
  <table>
    <thead><tr><th>Popis</th><th class="r">Množstvo</th><th class="r">J.cena</th><th class="r">Spolu</th></tr></thead>
    <tbody>${items}</tbody>
  </table>
  <div class="totals">
    <div class="trow"><span>Základ dane</span><span>${eur(inv.subtotal)}</span></div>
    <div class="trow"><span>DPH (${+inv.vatRate}%)</span><span>${eur(inv.vatAmount)}</span></div>
    <div class="trow tfin"><span>CELKOM K ÚHRADE</span><span>${eur(inv.total)}</span></div>
  </div>
  ${inv.notes ? `<div style="margin-top:28px;padding:12px 16px;background:#f9f9f9;border-radius:6px;font-size:13px;color:#555"><strong>Poznámka:</strong> ${inv.notes}</div>` : ''}
</div>
<script>window.addEventListener('load', function(){ setTimeout(function(){ window.print(); }, 300); });</script>
</body>
</html>`;
}
