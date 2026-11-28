export const CATEGORIES: Record<string, string[]> = {
  "Fridges": ["fridge", "refrigerator"],
  "Freezers": ["freezer", "deep freezer"],
  "Televisions": ["tv", "television", "smart tv", "led tv", "oled tv"],
  "Washing machines": ["washing machine", "washer"],
  "Air conditioners": ["air conditioner", "split ac"],
  "Cookers": ["cooker", "oven", "gas stove"],
  "Smartphones": ["smartphone", "mobile phone", "android phone", "iphone", "galaxy", "redmi", "tecno spark", "tecno camon", "infinix hot", "infinix note"],
  "Feature phones": ["feature phone", "keypad phone"],
  "Tablets": ["tablet", "ipad"],
  "Phone accessories": ["phone charger", "charger", "earbuds", "headphones", "phone case", "phone cable"],
  "Computer accessories": ["laptop charger", "computer mouse", "keyboard", "monitor", "usb hub", "webcam", "computer cable"],
  "Laptops": ["laptop", "notebook", "macbook", "chromebook"],
  "Desktops": ["desktop computer", "desktop pc"],
  "Monitors": ["computer monitor", "monitor"],
  "Men's clothing": ["men shirt", "men trousers", "men clothing", "men jacket"],
  "Women's clothing": ["women dress", "women clothing", "women blouse", "women skirt"],
  "Shoes": ["shoes", "sneakers", "boots", "sandals"],
  "Bags": ["handbag", "backpack", "travel bag"],
  "Furniture": ["sofa", "bed", "wardrobe", "chair", "table"],
  "Kitchenware": ["cookware", "blender", "kettle", "microwave", "kitchen"],
  "Bedding": ["bedsheet", "mattress", "pillow", "duvet"],
  "Lighting": ["lamp", "light bulb", "chandelier"],
  "Food": ["rice", "oil", "sugar", "flour", "food"],
  "Drinks": ["water", "juice", "soft drink", "beverage"],
  "Household supplies": ["detergent", "tissue", "cleaner", "soap"],
  "Car parts": ["brake pad", "filter", "car battery", "spark plug"],
  "Tyres": ["tyre", "tire"],
  "Automotive accessories": ["car accessories", "car charger", "floor mat"],
  "Skincare": ["skin care", "moisturizer", "sunscreen", "face cream"],
  "Haircare": ["shampoo", "conditioner", "hair cream"],
  "Personal care": ["toothpaste", "deodorant", "body lotion", "personal care"]
};

// Words that mean "not this category", even when a keyword above matches.
const EXCLUDE: Record<string, string[]> = {
  "Food": ["engine oil", "hair oil", "body oil", "rice cooker", "gear oil", "brake oil"],
  "Haircare": ["air conditioner"],
  "Smartphones": ["galaxy tab", "galaxy watch", "galaxy buds", "case", "charger", "cable", "screen protector"],
  "Televisions": ["tv stand", "tv mount", "tv bracket", "tv remote"],
  "Drinks": ["water heater", "water dispenser", "water pump"]
};

const normalise = (text: string) => text.toLowerCase().replace(/['’]s\b/g, "");
// Whole words only (plural allowed), so "oil" no longer matches "toilet".
const hasWord = (text: string, word: string) =>
  new RegExp("(?<![a-z0-9])" + word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?:s|es)?(?![a-z0-9])").test(text);

export function matchesCategory(name: string, subcategory: string): boolean {
  const text = normalise(name);
  if ((EXCLUDE[subcategory] || []).some(word => hasWord(text, word))) return false;
  return (CATEGORIES[subcategory] || []).some(word => hasWord(text, normalise(word)));
}
