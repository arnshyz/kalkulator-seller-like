function idr(x){return new Intl.NumberFormat('id-ID').format(Math.round(x||0));}
function fv(id){return parseFloat(document.getElementById(id).value||"0");}
function fee(inputs){
  const pct = inputs.adminPct + inputs.programPct + inputs.livePct;
  const percentComponent = inputs.price * pct;
  const flatComponent = inputs.adminFlat;
  const feeTaxed = (percentComponent + flatComponent) * (1 + inputs.ppnFeePct);
  return feeTaxed + inputs.procFlat;
}
function profitGivenRoas(inputs, roas){
  const ad = roas<=0?Infinity:inputs.price/roas;
  const fees = fee(inputs);
  const profit = inputs.price - inputs.hpp - fees - ad;
  const margin = inputs.price===0?0:profit/inputs.price;
  return {adSpend: ad, profit, margin};
}
function roasBEP(inputs){
  const f = fee(inputs);
  const adBEP = inputs.price - inputs.hpp - f;
  if (adBEP<=0) return {roas: Infinity, f};
  return {roas: inputs.price/adBEP, f};
}
function targetRoas(inputs){
  const f = fee(inputs);
  const targetProfit = inputs.targetNetPct*inputs.price;
  const adTarget = inputs.price - inputs.hpp - f - targetProfit;
  if (adTarget<=0) return {roas: Infinity, f};
  return {roas: inputs.price/adTarget, f};
}
function render(){
  const inputs = {
    price: fv('price'), hpp: fv('hpp'), procFlat: fv('procFlat'),
    adminPct: fv('adminPct')/100, programPct: fv('programPct')/100, livePct: fv('livePct')/100,
    ppnFeePct: fv('ppnFeePct')/100, adminFlat: fv('adminFlat'),
    targetNetPct: fv('targetNetPct')/100
  };
  const bep = roasBEP(inputs);
  const tgt = targetRoas(inputs);
  const box = document.getElementById('results');
  function fmt(x){return (!isFinite(x)||x<=0)?"Tidak terdefinisi":x.toFixed(2)+" : 1";}
  box.innerHTML = `
    <div class="grid grid-cols-2 gap-2">
      <div>Fee marketplace/unit</div><div class="text-right">Rp ${idr(fee(inputs))}</div>
      <div>ROAS BEP</div><div class="text-right font-semibold">${fmt(bep.roas)}</div>
      <div>ROAS Target (${(inputs.targetNetPct*100).toFixed(1)}%)</div><div class="text-right font-semibold">${fmt(tgt.roas)}</div>
    </div>`;
  const tbody = document.querySelector('#simTable tbody'); tbody.innerHTML="";
  [50,20,10,5,2.8,2.2,1.0].forEach(r=>{
    const s = profitGivenRoas(inputs, r);
    let status = s.margin>=inputs.targetNetPct ? "Sesuai Target" : (s.profit>=0 ? "Profit Tipis" : "Rugi");
    const tr = document.createElement('tr'); tr.className="border-b";
    tr.innerHTML = `<td class="py-1 pr-4">${r.toFixed(2)} : 1</td>
      <td class="py-1 pr-4 text-right">Rp ${idr(s.adSpend)}</td>
      <td class="py-1 pr-4 text-right ${s.profit>=0?'text-emerald-600':'text-red-600'}">Rp ${idr(s.profit)}</td>
      <td class="py-1 pr-4 text-right">${(s.margin*100).toFixed(2)}%</td>
      <td class="py-1 pr-4 text-center">${status}</td>`;
    tbody.appendChild(tr);
  });
}
document.getElementById('btnCalc').addEventListener('click', render); render();
