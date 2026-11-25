"use client";
import { useMemo, useState } from "react";

type Product = {id:string;name:string;brand:string;category:string;subcategory:string;merchant:string;country:string;oldPrice:string;newPrice:string;discount:string;url:string;note:string;icon:string};
const categories = [
 {name:"Appliances",icon:"▣",subs:["Fridges","Freezers","Televisions","Washing machines","Air conditioners","Cookers"]},
 {name:"Phones & tablets",icon:"▯",subs:["Smartphones","Feature phones","Tablets","Accessories"]},
 {name:"Computers",icon:"⌘",subs:["Laptops","Desktops","Monitors","Accessories"]},
 {name:"Fashion",icon:"◇",subs:["Men's clothing","Women's clothing","Shoes","Bags"]},
 {name:"Home & living",icon:"⌂",subs:["Furniture","Kitchenware","Bedding","Lighting"]},
 {name:"Groceries",icon:"＋",subs:["Food","Drinks","Household supplies"]},
 {name:"Automotive",icon:"⌁",subs:["Car parts","Tyres","Accessories"]},
 {name:"Beauty & health",icon:"✳",subs:["Skincare","Haircare","Personal care"]}
];
const demos:Product[]=[
 {id:"f1",name:"Double-door refrigerator",brand:"Hisense",category:"Appliances",subcategory:"Fridges",merchant:"Hisense Ghana",country:"Ghana",oldPrice:"GH₵ 6,800",newPrice:"GH₵ 5,999",discount:"12% off",url:"https://hisense.com.gh/",note:"Illustrative example — not a verified live promotion.",icon:"▣"},
 {id:"f2",name:"Top-freezer refrigerator",brand:"Samsung",category:"Appliances",subcategory:"Fridges",merchant:"Jumia Ghana",country:"Ghana",oldPrice:"GH₵ 5,400",newPrice:"GH₵ 4,860",discount:"10% off",url:"https://www.jumia.com.gh/catalog/?q=refrigerator",note:"Illustrative example — not a verified live promotion.",icon:"▣"},
 {id:"f3",name:"Side-by-side refrigerator",brand:"Midea",category:"Appliances",subcategory:"Fridges",merchant:"Jumia Ghana",country:"Ghana",oldPrice:"GH₵ 8,200",newPrice:"GH₵ 7,380",discount:"10% off",url:"https://www.jumia.com.gh/catalog/?q=fridge",note:"Illustrative example — not a verified live promotion.",icon:"▣"},
 {id:"t1",name:"Smart television",brand:"Hisense",category:"Appliances",subcategory:"Televisions",merchant:"Hisense Ghana",country:"Ghana",oldPrice:"GH₵ 4,200",newPrice:"GH₵ 3,780",discount:"10% off",url:"https://hisense.com.gh/",note:"Illustrative example — not a verified live promotion.",icon:"▣"},
 {id:"p1",name:"Android smartphone",brand:"Samsung",category:"Phones & tablets",subcategory:"Smartphones",merchant:"Jumia Ghana",country:"Ghana",oldPrice:"GH₵ 2,500",newPrice:"GH₵ 2,250",discount:"10% off",url:"https://www.jumia.com.gh/phones/",note:"Illustrative example — not a verified live promotion.",icon:"▯"},
 {id:"c1",name:"Everyday laptop",brand:"HP",category:"Computers",subcategory:"Laptops",merchant:"Jumia Ghana",country:"Ghana",oldPrice:"GH₵ 6,000",newPrice:"GH₵ 5,400",discount:"10% off",url:"https://www.jumia.com.gh/computing/",note:"Illustrative example — not a verified live promotion.",icon:"⌘"}
];
export default function Home(){
 const [category,setCategory]=useState("Appliances"),[subcategory,setSubcategory]=useState("Fridges"),[query,setQuery]=useState(""),[country,setCountry]=useState("Ghana");
 const active=categories.find(c=>c.name===category)||categories[0];
 const products=useMemo(()=>demos.filter(p=>p.category===category&&p.subcategory===subcategory&&p.country===country&&[p.name,p.brand,p.merchant].join(" ").toLowerCase().includes(query.toLowerCase())),[category,subcategory,country,query]);
 return <main>
  <header className="top"><div className="wrap topinner"><a className="brand" href="#">Promo<span>Finder</span></a><nav className="nav"><a href="#categories">Categories</a><a href="#how">How it works</a><span>Ghana ▾</span></nav></div></header>
  <section className="hero"><div className="wrap"><div className="eyebrow">Compare promotions from different sellers</div><h1>Find discounts across<br/>stores in one place.</h1><p>Choose what you want to buy. Compare promotions from retailers and brands, then visit the original seller to make your purchase.</p><div className="heroSearch"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search products or brands — e.g. fridge, Samsung…" /><select value={country} onChange={e=>setCountry(e.target.value)}><option>Ghana</option><option>Nigeria</option><option>Côte d’Ivoire</option><option>Senegal</option></select></div><div className="trustline">We do not sell products. Purchases happen on the seller's platform.</div></div></section>
  <section className="wrap browse" id="categories"><div className="sectionhead"><div><div className="eyebrow">Step 1</div><h2>Choose a category</h2></div><span className="muted">Browse by what you need</span></div><div className="categoryGrid">{categories.map(c=><button key={c.name} onClick={()=>{setCategory(c.name);setSubcategory(c.subs[0]);}} className={category===c.name?"category active":"category"}><span className="catIcon">{c.icon}</span><span>{c.name}</span><span className="catArrow">↗</span></button>)}</div>
  <div className="subhead"><div><div className="eyebrow">Step 2</div><h2>{category}</h2></div><span className="muted">Choose a product type</span></div><div className="chips">{active.subs.map(s=><button key={s} onClick={()=>setSubcategory(s)} className={subcategory===s?"chip selected":"chip"}>{s}</button>)}</div>
  <div className="resultsHead"><div><div className="eyebrow">Step 3</div><h2>{subcategory} promotions</h2><p className="muted">Compare prices and open the original seller's listing.</p></div><span className="count">{products.length} offers</span></div>
  {products.length>0?<div className="productGrid">{products.map(p=><article className="product" key={p.id}><div className="productVisual"><span className="productIcon">{p.icon}</span><span className="demoTag">DEMO DATA</span></div><div className="productBody"><div className="productMeta">{p.brand} · {p.country}</div><h3>{p.name}</h3><div className="priceRow"><strong>{p.newPrice}</strong><del>{p.oldPrice}</del><span className="discount">{p.discount}</span></div><div className="seller">Seller: <b>{p.merchant}</b></div><p className="disclaimer">{p.note}</p><a className="dealButton" href={p.url} target="_blank" rel="noreferrer">Visit seller ↗</a></div></article>)}</div>:<div className="empty"><div className="emptyIcon">⌕</div><h3>No matching offers in this category yet</h3><p>When a participating store or authorised promotion feed provides a matching deal, it will appear here with its original seller link.</p></div>}
  <section className="how" id="how"><div className="eyebrow">Simple and transparent</div><h2>One place to discover. The seller to purchase.</h2><div className="howGrid"><div><b>01</b><h3>Choose what you need</h3><p>Browse categories and specific product types.</p></div><div><b>02</b><h3>Compare promotions</h3><p>See the seller, discounted price, savings and offer details together.</p></div><div><b>03</b><h3>Buy from the original store</h3><p>Follow the link to the retailer or brand. PromoFinder does not process payments.</p></div></div></section>
  </section><footer className="footer"><div className="wrap">PromoFinder · Independent promotion discovery. Always confirm the final price, stock and promotion dates with the seller.</div></footer>
 </main>;
}
