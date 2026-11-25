import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

export const runtime = "nodejs";
export const revalidate = 1800;

type Source = { name:string; url:string; country:string };
type Offer = { id:string; name:string; brand:string; merchant:string; country:string; oldPrice:number|null; newPrice:number; currency:string; discount:number|null; image:string; url:string; checkedAt:string; sourceStatus:string };
const SOURCES: Source[] = [
 {name:"Jumia Ghana",url:"https://www.jumia.com.gh/",country:"Ghana"},
 {name:"Melcom",url:"https://melcom.com/",country:"Ghana"},
 {name:"Mehia",url:"https://mehia.com.gh/",country:"Ghana"},
 {name:"Baahe",url:"https://baahe.org/",country:"Ghana"},
 {name:"Electromart",url:"https://www.electromart.com.gh/",country:"Ghana"},
 {name:"MaxMart",url:"https://maxmartonline.com/",country:"Ghana"},
 {name:"Palace Superstores",url:"https://palacesuperstores.com/",country:"Ghana"},
 {name:"UNA Agencies",url:"https://www.unaagencies.com/",country:"Ghana"},
 {name:"WiredWorld",url:"https://www.wiredworldgh.com/",country:"Ghana"}
];
const CATEGORIES:Record<string,string[]> = {
 "Fridges":["fridge","refrigerator"],
 "Freezers":["freezer","deep freezer"],
 "Televisions":["television","smart tv","led tv","oled tv"],
 "Washing machines":["washing machine","washer"],
 "Air conditioners":["air conditioner","split ac"],
 "Cookers":["cooker","oven","gas stove"],
 "Smartphones":["smartphone","mobile phone","android phone","iphone"],
 "Feature phones":["feature phone","keypad phone"],
 "Tablets":["tablet","ipad"],
 "Accessories":["charger","earbuds","headphones","phone case","cable"],
 "Laptops":["laptop","notebook"],
 "Desktops":["desktop computer","desktop pc"],
 "Monitors":["computer monitor","monitor"],
 "Men's clothing":["men shirt","men trousers","men clothing","men jacket"],
 "Women's clothing":["women dress","women clothing","women blouse","women skirt"],
 "Shoes":["shoes","sneakers","boots","sandals"],
 "Bags":["handbag","backpack","travel bag"],
 "Furniture":["sofa","bed","wardrobe","chair","table"],
 "Kitchenware":["cookware","blender","kettle","microwave","kitchen"],
 "Bedding":["bedsheet","mattress","pillow","duvet"],
 "Lighting":["lamp","light bulb","chandelier"],
 "Food":["rice","oil","sugar","flour","food"],
 "Drinks":["water","juice","soft drink","beverage"],
 "Household supplies":["detergent","tissue","cleaner","soap"],
 "Car parts":["brake pad","filter","car battery","spark plug"],
 "Tyres":["tyre","tire"],
 "Automotive accessories":["car accessories","car charger","floor mat"],
 "Skincare":["skin care","moisturizer","sunscreen","face cream"],
 "Haircare":["shampoo","conditioner","hair cream"],
 "Personal care":["toothpaste","deodorant","body lotion","personal care"]
};
const clean = (v:unknown) => typeof v==="string" ? v.replace(/\s+/g," ").trim() : "";
function priceFrom(s:string):{value:number;currency:string}|null {
 const patterns:[RegExp,string][]=[
  [/(?:GH₵|GHS|₵)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i,"GHS"],
  [/(?:₦|NGN)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i,"NGN"],
  [/(?:CFA|XOF|FCFA)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i,"XOF"],
  [/\$\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/,"USD"]
 ];
 for(const [re,currency] of patterns){const m=s.replace(/\u00a0/g," ").match(re);if(m)return {value:Number(m[1].replace(/,/g,"")),currency};}
 return null;
}
function brandFrom(name:string){return name.match(/\b(Hisense|Samsung|LG|Nasco|Midea|TCL|Bruhm|Akai|Chigo|Sigma|Roch|Legacy|Haier|Bosch|Toshiba|Panasonic|Defy|Nexus|Apple|Tecno|Infinix|Itel|HP|Dell|Lenovo|Acer|Asus|Nike|Adidas|Puma)\b/i)?.[0]||"Unspecified";}
function productNodes(v:any):any[]{if(!v||typeof v!=="object")return[];if(Array.isArray(v))return v.flatMap(productNodes);const own=String(v["@type"]||"").toLowerCase().includes("product")?[v]:[];return own.concat(Object.values(v).flatMap(productNodes));}
function isPromotion(text:string,old:number|null,now:number){return (old!==null&&old>now)||/sale|deal|promo|discount|special price|clearance|black friday|save\s*\d+|off\s*\d+%/i.test(text);}
function parsePage(html:string,source:Source,subcategory:string,checkedAt:string):Offer[]{
 const $=cheerio.load(html);const words=CATEGORIES[subcategory]||[subcategory.toLowerCase()];const matches=(name:string)=>words.some(w=>name.toLowerCase().includes(w));
 const found:Offer[]=[];
 const add=(item:Offer)=>{if(item.name&&matches(item.name)&&isPromotion(item.name,item.oldPrice,item.newPrice)&&item.newPrice>0&&item.url.startsWith("http"))found.push(item);};
 $('script[type="application/ld+json"]').each((_,el)=>{try{const parsed=JSON.parse($(el).contents().text());for(const p of productNodes(parsed)){const name=clean(p.name);const o=Array.isArray(p.offers)?p.offers[0]:p.offers;const now=Number(o?.price??o?.lowPrice??p.price);if(!Number.isFinite(now))continue;const oldN=Number(o?.priceSpecification?.price??p.priceSpecification?.price);const old=Number.isFinite(oldN)&&oldN>now?oldN:null;const image=Array.isArray(p.image)?p.image[0]:p.image;const url=clean(p.url)||clean(o?.url)||source.url;add({id:source.name+"|"+url,name,brand:clean(p.brand?.name||p.brand)||brandFrom(name),merchant:source.name,country:source.country,oldPrice:old,newPrice:now,currency:clean(o?.priceCurrency)||"GHS",discount:old?Math.round((1-now/old)*100):null,image:clean(image),url:new URL(url,source.url).toString(),checkedAt,sourceStatus:"Public structured product data"});}}catch{}});
 $("li.product,.product-item,.product-card,.product,[data-product-id],article").each((_,el)=>{const card=$(el);const name=clean(card.find("h2,h3,h4,.product-name,.product-title,[class*=name]").first().text()||card.find("a").first().attr("title"));if(!name||!matches(name))return;const all=clean(card.text());const price=priceFrom(card.find(".special-price,.price,.woocommerce-Price-amount,[class*=price]").first().text()||all);if(!price)return;const old=priceFrom(card.find("del,.old-price,.regular-price,[class*=old-price],[class*=regular]").text());const oldPrice=old&&old.value>price.value?old.value:null;if(!isPromotion(all,oldPrice,price.value))return;const href=card.find("a[href]").first().attr("href");if(!href)return;const image=card.find("img").first().attr("data-src")||card.find("img").first().attr("src")||"";add({id:source.name+"|"+href,name,brand:brandFrom(name),merchant:source.name,country:source.country,oldPrice,newPrice:price.value,currency:price.currency,discount:oldPrice?Math.round((1-price.value/oldPrice)*100):null,image:image?new URL(image,source.url).toString():"",url:new URL(href,source.url).toString(),checkedAt,sourceStatus:"Public product listing"});});
 return found.filter((o,i,a)=>a.findIndex(x=>x.url===o.url)===i);
}
export async function GET(req:NextRequest){
 const subcategory=req.nextUrl.searchParams.get("subcategory")||"Fridges";
 const country=req.nextUrl.searchParams.get("country")||"Ghana";
 const checkedAt=new Date().toISOString();
 if(!CATEGORIES[subcategory])return NextResponse.json({error:"Unsupported product category",offers:[],sources:[]},{status:400});
 const selected=SOURCES.filter(s=>s.country===country);
 const results=await Promise.all(selected.map(async source=>{try{const res=await fetch(source.url,{headers:{"User-Agent":"Mozilla/5.0 (compatible; PromoFinder/1.0)","Accept":"text/html,application/xhtml+xml"},signal:AbortSignal.timeout(7000),next:{revalidate:1800}});if(!res.ok)return{source:source.name,status:"blocked_or_unavailable",count:0,offers:[] as Offer[]};const type=res.headers.get("content-type")||"";if(!type.includes("html"))return{source:source.name,status:"not_html",count:0,offers:[] as Offer[]};const html=(await res.text()).slice(0,2_000_000);const offers=parsePage(html,source,subcategory,checkedAt);return{source:source.name,status:offers.length?"collected":"no_matching_public_promotions",count:offers.length,offers};}catch{return{source:source.name,status:"timeout_or_blocked",count:0,offers:[] as Offer[]};}}));
 const offers=results.flatMap(r=>r.offers).filter((o,i,a)=>a.findIndex(x=>x.url===o.url)===i);
 return NextResponse.json({category:subcategory,country,checkedAt,offers,sources:results.map(({source,status,count})=>({source,status,count})),total:offers.length});
}
