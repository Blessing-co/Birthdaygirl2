"use client";
import { useEffect, useMemo, useState } from "react";

type Offer = { id:string; name:string; brand:string; merchant:string; country:string; oldPrice:number|null; newPrice:number; currency:string; discount:number|null; image:string; url:string; checkedAt:string; sourceStatus:string };
type Source = { source:string; status:string; count:number };
const categories = [
 {name:"Appliances",icon:"▣",subs:["Fridges","Freezers","Televisions","Washing machines","Air conditioners","Cookers"]},
 {name:"Phones & tablets",icon:"▯",subs:["Smartphones","Feature phones","Tablets","Accessories"]},
 {name:"Computers",icon:"⌘",subs:["Laptops","Desktops","Monitors","Accessories"]},
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
 const [category,setCategory]=useState("Appliances"),[subcategory,setSubcategory]=useState("Fridges"),[query,setQuery]=useState(""),[country,setCountry]=useState("Ghana");
 const [offers,setOffers]=useState<Offer[]>([]),[sources,setSources]=useState<Source[]>([]),[loading,setLoading]=useState(false),[checkedAt,setCheckedAt]=useState(""),[message,setMessage]=useState(""),[loadError,setLoadError]=useState("");
 useEffect(()=>{
   if(!subcategory){setOffers([]);setSources([]);return;}
   let active=true;setLoading(true);setLoadError("");setMessage("");
   fetch("/api/offers?subcategory="+encodeURIComponent(subcategory)+"&country="+encodeURIComponent(country)).then(r=>{if(!r.ok)throw new Error("Could not collect offers");return r.json();}).then(data=>{if(active){setOffers(data.offers||[]);setSources(data.sources||[]);setCheckedAt(data.checkedAt||"");setMessage(data.message||"");}}).catch(()=>{if(active){setOffers([]);setSources([]);setLoadError("Could not load promotions. Please try again.");}}).finally(()=>{if(active)setLoading(false);});
   return ()=>{active=false;};
 },[subcategory,country]);
 const active=categories.find(c=>c.name===category)||categories[0];
 const products=useMemo(()=>offers.filter(p=>[p.name,p.brand,p.merchant].join(" ").toLowerCase().includes(query.toLowerCase())),[offers,query]);
 const workingSources=sources.filter(s=>s.status==="collected").length;
 return <main>
  <header className="top"><div className="wrap topinner"><a className="brand" href="#">Promo<span>Finder</span></a><nav className="nav"><a href="#categories">Categories</a><a href="#how">How it works</a><span>{country} ▾</span></nav></div></header>
  <section className="hero"><div className="wrap"><div className="eyebrow">Compare promotions from different sellers</div><h1>Find discounts across<br/>stores in one place.</h1><p>Choose what you want to buy. Compare promotions from retailers and brands, then visit the original seller to make your purchase.</p><div className="heroSearch"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search products or brands — e.g. fridge, Samsung…" /><select value={country} onChange={e=>setCountry(e.target.value)}><option>Ghana</option><option>Nigeria</option><option>Côte d’Ivoire</option><option>Senegal</option></select></div><div className="trustline">We do not sell products. Purchases happen on the seller's platform.</div></div></section>
  <section className="wrap browse" id="categories"><div className="sectionhead"><div><div className="eyebrow">Step 1</div><h2>Choose a category</h2></div><span className="muted">Browse by what you need</span></div><div className="categoryGrid">{categories.map(c=><button key={c.name} onClick={()=>{setCategory(c.name);setSubcategory(c.subs[0]);}} className={category===c.name?"category active":"category"}><span className="catIcon">{c.icon}</span><span>{c.name}</span><span className="catArrow">↗</span></button>)}</div>
  <div className="subhead"><div><div className="eyebrow">Step 2</div><h2>{category}</h2></div><span className="muted">Choose a product type</span></div><div className="chips">{active.subs.map(s=><button key={s} onClick={()=>setSubcategory(s)} className={subcategory===s?"chip selected":"chip"}>{s}</button>)}</div>
  <div className="resultsHead"><div><div className="eyebrow">Step 3</div><h2>{subcategory} promotions</h2><p className="muted">Each card is an individual offer from its original seller.</p></div><span className="count">{loading?"Collecting…":products.length+" offers"}</span></div>
  {<div className="sourceSummary"><b>Retailers checked:</b> {workingSources} of {sources.length} returned matching promotions. {checkedAt&&<span>Last checked: {new Date(checkedAt).toLocaleString()}</span>}</div>}
  {loading?<div className="empty"><h3>Collecting current promotions</h3><p>Checking public product and promotion pages across multiple retailers.</p></div>:products.length>0?<div className="productGrid">{products.map(p=><article className="product" key={p.id}><div className="productVisual">{p.image?<img src={p.image} alt={p.name}/>:<span className="productIcon">▣</span>}</div><div className="productBody"><div className="productMeta">{p.brand} · {p.country}</div><h3>{p.name}</h3><div className="priceRow"><strong>{money(p.newPrice,p.currency)}</strong>{p.oldPrice&&<del>{money(p.oldPrice,p.currency)}</del>}{p.discount!==null&&<span className="discount">{p.discount}% off</span>}</div><div className="seller">Seller: <b>{p.merchant}</b></div><p className="disclaimer">Collected from the seller's public page. Confirm price and availability before purchase.</p><a className="dealButton" href={p.url} target="_blank" rel="noreferrer">View original offer ↗</a></div></article>)}</div>:<div className="empty"><div className="emptyIcon">⌕</div><h3>{subcategory==="Fridges"?"No public promotions were collected for this product type":"No matching public promotions were collected"}</h3><p>{loadError || message || (subcategory==="Fridges"?"Some retailers may block automated requests or have no matching discounted listings. Their collection status is shown below.":"No sample prices are shown. We only display offers actually collected from retailer pages.")}</p></div>}
  {sources.length>0&&<section className="sourceList"><h3>Retailer collection status</h3><div>{sources.map(s=><div className="sourceRow" key={s.source}><span>{s.source}</span><span>{s.status==="collected"?"Collected "+s.count+" offers":s.status==="no_matching_public_promotions"?"No matching promotions found":s.status==="blocked_or_unavailable"||s.status==="timeout_or_blocked"?"Blocked or unavailable":"No product page detected"}</span></div>)}</div></section>}
  <section className="how" id="how"><div className="eyebrow">Simple and transparent</div><h2>One place to discover. The seller to purchase.</h2><div className="howGrid"><div><b>01</b><h3>Choose what you need</h3><p>Browse categories and specific product types.</p></div><div><b>02</b><h3>Compare promotions</h3><p>See individual offers from different retailers together.</p></div><div><b>03</b><h3>Buy from the original store</h3><p>Follow the link to the retailer or brand. PromoFinder does not process payments.</p></div></div></section>
  </section><footer className="footer"><div className="wrap">PromoFinder · Independent promotion discovery. Always confirm the final price, stock and promotion dates with the seller.</div></footer>
 </main>;
}
