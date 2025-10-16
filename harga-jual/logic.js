function idr(x){return new Intl.NumberFormat('id-ID').format(Math.round(x||0));}
function val(id){return parseFloat(document.getElementById(id).value||"0");}
function calc(){
  const hpp=val('hpp'), price=val('price'), adsPct=val('adsPct')/100, affPct=val('affPct')/100, adminPct=val('adminPct')/100, procFlat=val('procFlat');
  const feesPct = adminPct + affPct + adsPct;
  const feePctValue = price * feesPct;
  const fee = feePctValue + procFlat;
  const profit = price - hpp - fee;
  const margin = price===0?0:profit/price;
  const out=document.getElementById('out');
  out.innerHTML = `
    <div>Harga Jual: <b>Rp ${idr(price)}</b></div>
    <div>Modal Produk: - <b>Rp ${idr(hpp)}</b></div>
    <div>Fee Persen: - Rp ${idr(feePctValue)} (${(feesPct*100).toFixed(2)}%)</div>
    <div>Biaya Proses: - Rp ${idr(procFlat)}</div>
    <div>Profit Kotor (sblm Iklan terpisah): <b>Rp ${idr(price - hpp - (price*(adminPct+affPct)+procFlat))}</b></div>
    <hr class="my-2"/>
    <div>Estimasi Keuntungan Akhir: <b>Rp ${idr(profit)}</b></div>
    <div>Persentase Keuntungan: <b>${(margin*100).toFixed(2)}%</b></div>
  `;
}
document.getElementById('calc').addEventListener('click', calc); calc();
