"use client";
import { useEffect, useMemo, useState } from "react";
import { buildCatalogue } from "@/lib/catalogue";
import type { Offer, SourceResult } from "@/lib/types";

type Data = { offers: Offer[]; sources: SourceResult[]; checkedAt: string };
const categories = [
 {name:"Appliances",icon:"▣",subs:["Fridges","Freezers","Televisions","Washing machines","Air conditioners","Cookers"]},
 {name:"Phones & tablets",icon:"▯",subs:["Smartphones","Feature phones","Tablets","Phone accessories"]},
 {name:"Computers",icon:"⌘",subs:["Laptops","Desktops","Monitors","Computer accessories"]},
 {name:"Fashion",icon:"◇",subs:["Men's clothing","Women's clothing","Shoes","Bags"]},
 {name:"Home & living",icon:"⌂",subs:["Furniture","Kitchenware","Bedding","Lighting"]},
 {name:"Groceries",icon:"＋",subs:["Food","Drinks","Household supplies"]},
 {name:"Automotive",icon:"⌁",subs:["Car parts","Tyres","Automotive accessories"]},
 {name:"Beauty & health",icon:"✳",subs:["Skincare","Haircare","Personal care"]}
];
const money = (n:number,currency:string) => {
 try { return new Intl.NumberFormat("en", {style:"currency",currency: /^[A-Z]{3}$/.test(currency) ? currency : "GHS", maximumFractionDigits:2}).format(n); }
 catch { return (currency || "") + " " + n.toFixed(2); }
};
export default function Home(){
 const [category,setCategory]=useState("Appliances");
 const [subcategory,setSubcategory]=useState("Fridges");
 const [query,setQuery]=useState("");
 const [brand,setBrand]=useState("");
 const [store,setStore]=useState("");
 const [sort,setSort]=useState("price");
 const [data,setData]=useState<Data|null>(null);
 const [failed,setFailed]=useState(false);
 const [open,setOpen]=useState("");
 const [picked,setPicked]=useState<string[]>([]);

 useEffect(()=>{
  const controller=new AbortController();
  setData(null);setFailed(false);setBrand("");setStore("");setOpen("");setPicked([]);
  fetch("/api/offers?subcategory="+encodeURIComponent(subcategory),{signal:controller.signal})
   .then(r=>{if(!r.ok)throw new Error();return r.json();})
   .then(setData)
   .catch(()=>{if(!controller.signal.aborted)setFailed(true);});
  return ()=>controller.abort();
 },[subcategory]);

 const catalogue=useMemo(()=>buildCatalogue(data?.offers||[]),[data]);
 const brands=[...new Set(catalogue.map(p=>p.brand))].sort();
 const stores=[...new Set((data?.offers||[]).map(o=>o.merchant))].sort();
 const shown=catalogue
  .filter(p=>(!brand||p.brand===brand)&&(!store||p.offers.some(o=>o.merchant===store)))
  .filter(p=>[p.brand,...p.offers.flatMap(o=>[o.name,o.merchant])].join(" ").toLowerCase().includes(query.trim().toLowerCase()))
  .sort((a,b)=>sort==="discount"?(b.bestDiscount??0)-(a.bestDiscount??0):sort==="high"?b.lowest-a.lowest:a.lowest-b.lowest);
 const compared=picked.flatMap(key=>catalogue.find(p=>p.key===key)||[]);
 const toggle=(key:string)=>setPicked(list=>list.includes(key)?list.filter(k=>k!==key):list.length<3?[...list,key]:list);
 const active=categories.find(c=>c.name===category)||categories[0];
 const loading=!data&&!failed;

 return <main>
  <header className="top"><div className="wrap topinner"><a className="brand" href="#">Promo<span>Finder</span></a><nav className="nav"><a href="#categories">Catalogue</a><a href="#how">How it works</a><span>Ghana</span></nav></div></header>
  <section className="hero"><div className="wrap"><div className="eyebrow">Compare promotions from different sellers</div><h1>Find discounts across<br/>stores in one place.</h1><p>Browse the catalogue, compare prices and versions, then buy from the original seller.</p><div className="trustline">We do not sell products. Purchases happen on the seller&apos;s platform.</div></div></section>
  <section className="wrap browse" id="categories">
   <div className="sectionhead"><h2>Catalogue</h2><span className="muted">Choose a category, then a product type</span></div>
   <div className="categoryGrid">{categories.map(c=><button key={c.name} onClick={()=>{setCategory(c.name);setSubcategory(c.subs[0]);}} className={category===c.name?"category active":"category"}><span className="catIcon">{c.icon}</span><span>{c.name}</span></button>)}</div>
   <div className="chips subhead">{active.subs.map(s=><button key={s} onClick={()=>setSubcategory(s)} className={subcategory===s?"chip selected":"chip"}>{s}</button>)}</div>
   <div className="resultsHead"><h2>{subcategory}</h2><span className="count">{loading?"Collecting…":shown.length+" products"}</span></div>
   <div className="filters">
    <input aria-label="Search this product type" placeholder={"Search in "+subcategory.toLowerCase()+"…"} value={query} onChange={e=>setQuery(e.target.value)}/>
    <select aria-label="Brand" value={brand} onChange={e=>setBrand(e.target.value)}><option value="">All brands</option>{brands.map(b=><option key={b}>{b}</option>)}</select>
    <select aria-label="Store" value={store} onChange={e=>setStore(e.target.value)}><option value="">All stores</option>{stores.map(s=><option key={s}>{s}</option>)}</select>
    <select aria-label="Sort" value={sort} onChange={e=>setSort(e.target.value)}><option value="price">Lowest price</option><option value="high">Highest price</option><option value="discount">Biggest discount</option></select>
   </div>
   {data&&<p className="sourceSummary">Last checked: {new Date(data.checkedAt).toLocaleString()}</p>}

   {compared.length>0&&<div className="compare"><div className="compareHead"><b>Comparing {compared.length} of 3</b><button className="chip" onClick={()=>setPicked([])}>Clear</button></div>
    <div className="tableScroll"><table><tbody>
     <tr><th>Product</th>{compared.map(p=><td key={p.key}><b>{p.name}</b></td>)}</tr>
     <tr><th>Brand</th>{compared.map(p=><td key={p.key}>{p.brand}</td>)}</tr>
     <tr><th>Size / capacity</th>{compared.map(p=><td key={p.key}>{p.specs.join(", ")||"Not stated"}</td>)}</tr>
     <tr><th>Lowest price</th>{compared.map(p=><td key={p.key}>{money(p.lowest,p.currency)}</td>)}</tr>
     <tr><th>Best discount</th>{compared.map(p=><td key={p.key}>{p.bestDiscount===null?"Not stated":p.bestDiscount+"%"}</td>)}</tr>
     <tr><th>Cheapest at</th>{compared.map(p=><td key={p.key}><a href={p.offers[0].url} target="_blank" rel="noreferrer">{p.offers[0].merchant} ↗</a></td>)}</tr>
    </tbody></table></div></div>}

   {loading?<div className="empty"><h3>Collecting current promotions</h3><p>Checking public retailer pages.</p></div>
   :shown.length===0?<div className="empty"><h3>{failed?"Could not load promotions":"No matching promotions"}</h3><p>{failed?"Please try again.":"We only show offers actually collected from retailer pages."}</p></div>
   :<div className="productGrid">{shown.map(p=>{
     const versions=catalogue.filter(v=>v.key!==p.key&&p.brand!=="Unspecified"&&v.brand===p.brand);
     const isOpen=open===p.key;
     return <article className="product" key={p.key}>
      <div className="productVisual">{p.image?<img src={p.image} alt={p.name}/>:<span className="productIcon">▣</span>}</div>
      <div className="productBody">
       <div className="productMeta">{[p.brand,...p.specs].join(" · ")}</div><h3>{p.name}</h3>
       <div className="priceRow"><strong>{p.stores>1?"From ":""}{money(p.lowest,p.currency)}</strong>{p.offers[0].oldPrice&&<del>{money(p.offers[0].oldPrice,p.currency)}</del>}{p.offers[0].discount!==null&&<span className="discount">{p.offers[0].discount}% off</span>}</div>
       <div className="seller">{p.stores>1?p.stores+" stores, cheapest at ":"Seller: "}<b>{p.offers[0].merchant}</b></div>
       <div className="actions"><button className="chip" aria-expanded={isOpen} onClick={()=>setOpen(isOpen?"":p.key)}>{isOpen?"Hide":"Prices & versions"}</button><label><input type="checkbox" checked={picked.includes(p.key)} disabled={!picked.includes(p.key)&&picked.length>=3} onChange={()=>toggle(p.key)}/> Compare</label></div>
       {isOpen&&<div className="detail">
        {p.offers.map(o=><div className="sourceRow" key={o.id}><span>{o.merchant}: <b>{money(o.newPrice,o.currency)}</b></span><a href={o.url} target="_blank" rel="noreferrer">Go to store ↗</a></div>)}
        {versions.length>0&&<><h4>Other {p.brand} versions</h4>{versions.slice(0,5).map(v=><div className="sourceRow" key={v.key}><span>{v.name}</span><a href={v.offers[0].url} target="_blank" rel="noreferrer">{money(v.lowest,v.currency)} ↗</a></div>)}</>}
       </div>}
       <a className="dealButton" href={p.offers[0].url} target="_blank" rel="noreferrer">Buy at {p.offers[0].merchant} ↗</a>
       <p className="disclaimer">Confirm price and availability with the seller.</p>
      </div>
     </article>;})}</div>}

   {data&&<section className="sourceList"><h3>Retailer collection status</h3>{data.sources.map(s=><div className="sourceRow" key={s.source}><span>{s.source}</span><span>{s.status==="collected"?"Collected "+s.count+" offers":s.status==="blocked_or_unavailable"?"Blocked or unavailable":"No matching promotions found"}</span></div>)}</section>}
  <section className="how" id="how"><div className="eyebrow">Simple and transparent</div><h2>One place to discover. The seller to purchase.</h2><div className="howGrid"><div><b>01</b><h3>Choose what you need</h3><p>Browse categories and specific product types.</p></div><div><b>02</b><h3>Compare promotions</h3><p>See individual offers from different retailers together.</p></div><div><b>03</b><h3>Buy from the original store</h3><p>Follow the link to the retailer or brand. PromoFinder does not process payments.</p></div></div></section>
  </section>
  <footer className="footer"><div className="wrap">PromoFinder · Independent promotion discovery. Always confirm the final price, stock and promotion dates with the seller.</div></footer>
 </main>;
}
