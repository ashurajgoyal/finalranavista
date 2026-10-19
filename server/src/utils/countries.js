import { SourcingCountry } from '../models/Marketplace.js';

/*
 * Default "Products by country" catalogue (website → Products → By country).
 * Everything is editable in Admin → Countries & products; bump COUNTRY_VERSION only if you want
 * these defaults pushed into databases that were never edited by an admin.
 */
export const COUNTRY_VERSION = 1;

const P = (name, category, description, moq, priceRange, featured = false) => ({ name, category, description, moq, priceRange, featured });

const EUROPE = ['Germany', 'France', 'Italy', 'Spain', 'Portugal', 'Netherlands', 'Belgium', 'Poland', 'Austria', 'Denmark', 'Sweden', 'Finland', 'Greece', 'Czech Republic', 'Romania', 'Hungary', 'Ireland', 'Lithuania', 'Latvia', 'Estonia', 'Slovakia', 'Slovenia', 'Croatia', 'Bulgaria', 'Luxembourg', 'Malta', 'Cyprus'];

export const DEFAULT_COUNTRIES = [
  {
    slug: 'india', name: 'India', code: 'IN', flag: '🇮🇳', region: 'South Asia', currency: 'INR', sort: 1,
    intro: 'Our deepest maker network — hand-made textiles, rugs, brass, wood and jewellery from clusters with centuries of craft.',
    strengths: ['Home textiles', 'Handicrafts', 'Rugs', 'Brass & metal', 'Jewellery'],
    hubs: ['Jaipur', 'Moradabad', 'Panipat', 'Bhadohi', 'Karur', 'Jodhpur', 'Surat'], ports: ['Nhava Sheva', 'Mundra', 'Chennai'], leadTime: '30–75 days',
    products: [
      P('Block-printed cotton bedding', 'Home Textiles', 'Hand block-printed duvet covers, quilts and cushion covers in natural dyes.', '300 pcs per design', '$6 – $28', true),
      P('Hand-knotted & hand-tufted rugs', 'Rugs & Carpets', 'Wool, jute and viscose rugs in custom sizes and colourways.', '20 pcs', '$40 – $450', true),
      P('Brass & metal decor', 'Home Decor', 'Candle holders, bowls, trays and planters in brass, copper and iron.', '200 pcs', '$3 – $40'),
      P('Mango & sheesham wood furniture', 'Furniture', 'Solid-wood tables, consoles and stools — KD options for container efficiency.', '50 pcs', '$35 – $320'),
      P('Fashion & fine jewellery', 'Jewelry', 'Kundan, polki, silver and gold-plated sets; private label available.', '100 pcs', '$4 – $120', true),
      P('Kitchen & serveware', 'Kitchen & Dining', 'Enamelware, wooden boards, hammered steel and copper serveware.', '300 pcs', '$2 – $25'),
      P('Leather bags & accessories', 'Leather Goods', 'Full-grain leather bags, wallets and home leather accents.', '100 pcs', '$8 – $90'),
      P('Organic cotton apparel', 'Apparel', 'GOTS cotton basics, kurtas and resort wear.', '500 pcs', '$4 – $30'),
    ],
  },
  {
    slug: 'usa', name: 'USA', code: 'US', flag: '🇺🇸', region: 'North America', currency: 'USD', sort: 2, sellerCountries: ['United States'],
    intro: 'Domestic makers for short lead times, small runs and “Made in USA” collections for North American retailers.',
    strengths: ['Upholstered furniture', 'Candles', 'Packaging', 'Print-on-demand textiles'],
    hubs: ['North Carolina', 'California', 'Texas', 'Ohio'], ports: ['Los Angeles / Long Beach', 'Savannah', 'New York / New Jersey'], leadTime: '2–6 weeks',
    products: [
      P('Upholstered sofas & chairs', 'Furniture', 'Custom upholstery from High Point region workshops.', '10 pcs', '$250 – $1,800', true),
      P('Soy & coconut wax candles', 'Home Decor', 'Private-label candles in glass, ceramic and tin vessels.', '250 pcs', '$4 – $18'),
      P('Custom retail packaging', 'Packaging', 'Rigid boxes, mailers and eco-friendly shipping materials.', '1,000 pcs', '$0.40 – $6'),
      P('Hardwood cutting boards', 'Kitchen & Dining', 'Walnut, maple and cherry boards and serving pieces.', '100 pcs', '$12 – $60'),
      P('Bath & body products', 'Bath & Spa', 'Private-label soaps, bath salts and body care.', '500 pcs', '$2 – $14'),
      P('Seasonal & gift sets', 'Gifts & Seasonal', 'Curated gift boxes and holiday decor for US retail calendars.', '200 sets', '$8 – $60'),
    ],
  },
  {
    slug: 'europe', name: 'Europe', code: 'EU', flag: '🇪🇺', region: 'Europe', currency: 'EUR', sort: 3, sellerCountries: EUROPE,
    intro: 'Premium European craftsmanship — design-led ceramics, glass, linen and furniture with strong sustainability credentials.',
    strengths: ['Ceramics & porcelain', 'Glassware', 'Linen', 'Design furniture'],
    hubs: ['Italy', 'Portugal', 'Spain', 'Poland', 'Germany', 'Lithuania'], ports: ['Rotterdam', 'Hamburg', 'Antwerp', 'Valencia'], leadTime: '4–10 weeks',
    products: [
      P('Porcelain & stoneware tableware', 'Kitchen & Dining', 'Italian, Portuguese and Spanish dinnerware, hotel and retail grade.', '500 pcs', '$3 – $35', true),
      P('Mouth-blown glassware', 'Kitchen & Dining', 'Drinkware, vases and lighting glass from Czech and Polish studios.', '300 pcs', '$4 – $45'),
      P('Stonewashed linen textiles', 'Home Textiles', 'Lithuanian and Belgian linen bedding, table linen and towels.', '200 pcs', '$8 – $70', true),
      P('Design-led furniture', 'Furniture', 'Polish and Italian solid-wood and upholstered pieces.', '20 pcs', '$120 – $1,500'),
      P('Leather goods', 'Leather Goods', 'Italian and Spanish leather bags and small accessories.', '50 pcs', '$25 – $250'),
      P('Natural cosmetics & spa', 'Bath & Spa', 'Organic-certified body care and spa textiles.', '500 pcs', '$2 – $20'),
    ],
  },
  {
    slug: 'australia', name: 'Australia', code: 'AU', flag: '🇦🇺', region: 'Oceania', currency: 'AUD', sort: 4,
    intro: 'Niche, natural and premium — Australian makers for wool, natural skincare and gourmet gift ranges.',
    strengths: ['Merino wool', 'Natural skincare', 'Gourmet & gifts'],
    hubs: ['Melbourne', 'Sydney', 'Brisbane'], ports: ['Melbourne', 'Sydney', 'Brisbane'], leadTime: '3–8 weeks',
    products: [
      P('Merino wool throws & blankets', 'Home Textiles', 'Australian merino throws, baby blankets and knitwear.', '100 pcs', '$25 – $140', true),
      P('Natural skincare', 'Bath & Spa', 'Botanical and native-ingredient skincare, private label available.', '500 pcs', '$3 – $25'),
      P('Sheepskin products', 'Home Decor', 'Sheepskin rugs, cushions and slippers.', '50 pcs', '$20 – $160'),
      P('Gourmet gift hampers', 'Gifts & Seasonal', 'Corporate and retail gift boxes with local produce.', '100 sets', '$15 – $90'),
      P('Outdoor & garden products', 'Garden & Outdoor', 'Weather-resistant outdoor furniture and planters.', '30 pcs', '$40 – $600'),
    ],
  },
  {
    slug: 'uk', name: 'UK', code: 'GB', flag: '🇬🇧', region: 'Europe', currency: 'GBP', sort: 5, sellerCountries: ['United Kingdom'],
    intro: 'Heritage British manufacturing — wool textiles, bone china, candles and premium gifting.',
    strengths: ['Wool textiles', 'Bone china', 'Candles', 'Premium gifts'],
    hubs: ['Yorkshire', 'Stoke-on-Trent', 'Scotland', 'London'], ports: ['Felixstowe', 'Southampton', 'London Gateway'], leadTime: '3–8 weeks',
    products: [
      P('Wool & tweed throws', 'Home Textiles', 'Yorkshire and Scottish woven wool throws and cushions.', '100 pcs', '$30 – $180', true),
      P('Fine bone china', 'Kitchen & Dining', 'Stoke-on-Trent mugs, teaware and giftware.', '300 pcs', '$5 – $60'),
      P('Luxury candles & home fragrance', 'Home Decor', 'Hand-poured candles and diffusers, private label.', '250 pcs', '$6 – $40'),
      P('Premium gift sets', 'Gifts & Seasonal', 'Tea, biscuit and lifestyle gift boxes.', '200 sets', '$10 – $80'),
      P('Leather accessories', 'Leather Goods', 'Bridle-leather wallets, belts and bags.', '50 pcs', '$20 – $220'),
    ],
  },
  {
    slug: 'china', name: 'China', code: 'CN', flag: '🇨🇳', region: 'East Asia', currency: 'CNY', sort: 6,
    intro: 'Scale and speed — the widest range of materials and components with mature export logistics.',
    strengths: ['Lighting', 'Ceramics', 'Seasonal decor', 'Packaging', 'Small furniture'],
    hubs: ['Guangdong (Foshan, Dongguan)', 'Zhejiang (Yiwu, Ningbo)', 'Fujian (Xiamen)', 'Jiangxi (Jingdezhen)'], ports: ['Shanghai', 'Ningbo', 'Shenzhen', 'Xiamen'], leadTime: '25–60 days',
    products: [
      P('LED & decorative lighting', 'Lighting', 'Table, pendant and outdoor lighting with CE/UL options.', '300 pcs', '$4 – $80', true),
      P('Ceramic home decor', 'Home Decor', 'Vases, planters and figurines from Dehua and Jingdezhen.', '500 pcs', '$1.50 – $30'),
      P('Christmas & seasonal decor', 'Gifts & Seasonal', 'Ornaments, garlands, artificial trees and festive sets.', '1,000 pcs', '$0.30 – $60', true),
      P('Panel & metal furniture', 'Furniture', 'Foshan home and office furniture, KD packed.', '50 pcs', '$20 – $400'),
      P('Kitchen tools & storage', 'Kitchen & Dining', 'Stainless, silicone and bamboo kitchenware.', '1,000 pcs', '$0.50 – $15'),
      P('Printed packaging', 'Packaging', 'Rigid gift boxes, paper bags and mailer boxes.', '3,000 pcs', '$0.10 – $3'),
    ],
  },
  {
    slug: 'japan', name: 'Japan', code: 'JP', flag: '🇯🇵', region: 'East Asia', currency: 'JPY', sort: 7,
    intro: 'Exceptional quality and craft — kitchen knives, ceramics, cast iron and minimalist living goods.',
    strengths: ['Kitchen knives', 'Ceramics', 'Cast iron', 'Minimalist home goods'],
    hubs: ['Seki', 'Tsubame-Sanjo', 'Arita', 'Mino', 'Iwate'], ports: ['Tokyo', 'Yokohama', 'Kobe', 'Nagoya'], leadTime: '6–12 weeks',
    products: [
      P('Kitchen knives', 'Kitchen & Dining', 'Seki and Sakai forged knives for retail and professional kitchens.', '50 pcs', '$25 – $300', true),
      P('Mino & Arita ceramics', 'Kitchen & Dining', 'Tableware, tea sets and donabe pots.', '200 pcs', '$5 – $80'),
      P('Nambu cast-iron ware', 'Kitchen & Dining', 'Teapots, kettles and trivets from Iwate.', '50 pcs', '$20 – $150'),
      P('Hinoki & wood homeware', 'Bath & Spa', 'Hinoki bath accessories, wooden trays and boxes.', '100 pcs', '$8 – $90'),
      P('Furoshiki & textiles', 'Home Textiles', 'Furoshiki wraps, tenugui and noren.', '200 pcs', '$4 – $40'),
    ],
  },
  {
    slug: 'vietnam', name: 'Vietnam', code: 'VN', flag: '🇻🇳', region: 'Southeast Asia', currency: 'VND', sort: 8,
    intro: 'Fast-growing furniture and lifestyle hub with strong export compliance and competitive labour costs.',
    strengths: ['Furniture', 'Ceramics', 'Bamboo & rattan', 'Lacquerware'],
    hubs: ['Binh Duong', 'Ho Chi Minh City', 'Hanoi', 'Bat Trang'], ports: ['Cat Lai (HCMC)', 'Cai Mep', 'Hai Phong'], leadTime: '35–70 days',
    products: [
      P('Indoor & outdoor furniture', 'Furniture', 'Acacia, rubberwood and aluminium furniture for retail chains.', '1 × 40′ mix', '$30 – $600', true),
      P('Rattan, seagrass & bamboo', 'Home Decor', 'Baskets, lampshades and storage, hand-woven.', '300 pcs', '$2 – $45', true),
      P('Glazed ceramic planters', 'Garden & Outdoor', 'Bat Trang and Binh Duong glazed pots in sets.', '1 × 20′ mix', '$3 – $90'),
      P('Lacquerware', 'Home Decor', 'Lacquer trays, bowls and decorative boxes.', '200 pcs', '$4 – $60'),
      P('Cut-and-sew apparel', 'Apparel', 'Knit and woven garments for international brands.', '1,000 pcs', '$3 – $25'),
    ],
  },
  {
    slug: 'indonesia', name: 'Indonesia', code: 'ID', flag: '🇮🇩', region: 'Southeast Asia', currency: 'IDR', sort: 9,
    intro: 'Solid-wood furniture and natural-fibre craft from Java and Bali with SVLK-legal timber.',
    strengths: ['Teak furniture', 'Woven goods', 'Batik', 'Stone carving'],
    hubs: ['Jepara', 'Bali', 'Yogyakarta', 'Surabaya', 'Cirebon'], ports: ['Tanjung Priok (Jakarta)', 'Tanjung Perak (Surabaya)', 'Semarang'], leadTime: '45–90 days',
    products: [
      P('Teak indoor & outdoor furniture', 'Furniture', 'SVLK-certified teak dining, lounge and garden furniture.', '1 × 20′ mix', '$60 – $1,200', true),
      P('Woven rattan & water hyacinth', 'Home Decor', 'Cirebon baskets, chairs and lamps.', '200 pcs', '$4 – $150'),
      P('Batik textiles', 'Home Textiles', 'Hand-drawn and stamped batik fabrics, sarongs and cushions.', '200 pcs', '$5 – $60'),
      P('Stone & wood carving', 'Handicrafts', 'Balinese carvings, stone basins and garden sculptures.', '20 pcs', '$15 – $800'),
      P('Silver jewellery', 'Jewelry', 'Celuk (Bali) handmade silver jewellery.', '100 pcs', '$5 – $90'),
    ],
  },
  {
    slug: 'malaysia', name: 'Malaysia', code: 'MY', flag: '🇲🇾', region: 'Southeast Asia', currency: 'MYR', sort: 10,
    intro: 'Rubberwood furniture powerhouse with modern factories, plus latex bedding and gloves.',
    strengths: ['Rubberwood furniture', 'Latex bedding', 'Pewter'],
    hubs: ['Muar', 'Selangor', 'Johor', 'Penang'], ports: ['Port Klang', 'Tanjung Pelepas', 'Penang'], leadTime: '35–60 days',
    products: [
      P('Rubberwood bedroom & dining sets', 'Furniture', 'Muar-made solid rubberwood furniture, KD packed.', '1 × 40′ mix', '$40 – $700', true),
      P('Natural latex mattresses & pillows', 'Home Textiles', 'Dunlop and Talalay latex bedding.', '100 pcs', '$15 – $400'),
      P('Pewter giftware', 'Gifts & Seasonal', 'Pewter tableware and corporate gifts.', '100 pcs', '$10 – $120'),
      P('Batik & songket textiles', 'Home Textiles', 'Malaysian batik scarves, cushions and fabrics.', '200 pcs', '$5 – $50'),
    ],
  },
  {
    slug: 'thailand', name: 'Thailand', code: 'TH', flag: '🇹🇭', region: 'Southeast Asia', currency: 'THB', sort: 11,
    intro: 'Design-savvy makers for silk, ceramics, wood and spa products with a strong export tradition.',
    strengths: ['Thai silk', 'Celadon ceramics', 'Spa products', 'Teak & mango wood'],
    hubs: ['Bangkok', 'Chiang Mai', 'Lampang', 'Ratchaburi'], ports: ['Laem Chabang', 'Bangkok'], leadTime: '35–70 days',
    products: [
      P('Thai silk textiles', 'Home Textiles', 'Silk cushions, throws, scarves and fabrics.', '100 pcs', '$8 – $90', true),
      P('Celadon & Benjarong ceramics', 'Kitchen & Dining', 'Hand-painted tableware and decor.', '200 pcs', '$4 – $70'),
      P('Spa & aromatherapy products', 'Bath & Spa', 'Essential oils, herbal compresses and spa textiles.', '500 pcs', '$1.50 – $25'),
      P('Wooden homeware', 'Kitchen & Dining', 'Teak and mango wood bowls, boards and trays.', '200 pcs', '$3 – $40'),
      P('Fashion accessories', 'Fashion Accessories', 'Bags, scarves and costume jewellery.', '200 pcs', '$3 – $40'),
    ],
  },
  {
    slug: 'cambodia', name: 'Cambodia', code: 'KH', flag: '🇰🇭', region: 'Southeast Asia', currency: 'KHR', sort: 12,
    intro: 'Apparel, travel goods and artisan silk — with preferential tariff access to many markets.',
    strengths: ['Apparel', 'Travel goods & bags', 'Silk weaving', 'Handicrafts'],
    hubs: ['Phnom Penh', 'Siem Reap', 'Takeo'], ports: ['Sihanoukville', 'Phnom Penh'], leadTime: '45–75 days',
    products: [
      P('Cut-and-sew apparel', 'Apparel', 'Knitwear, woven garments and sportswear.', '1,000 pcs', '$3 – $20', true),
      P('Bags & travel goods', 'Fashion Accessories', 'Backpacks, totes and luggage components.', '500 pcs', '$4 – $40'),
      P('Hand-woven silk', 'Home Textiles', 'Golden-silk scarves, cushions and throws.', '100 pcs', '$10 – $80'),
      P('Recycled & palm crafts', 'Handicrafts', 'Palm-leaf baskets, recycled-material accessories.', '200 pcs', '$2 – $25'),
    ],
  },
  {
    slug: 'laos', name: 'Laos', code: 'LA', flag: '🇱🇦', region: 'Southeast Asia', currency: 'LAK', sort: 13,
    intro: 'Small-batch, hand-woven textiles and natural products from artisan cooperatives.',
    strengths: ['Hand-woven textiles', 'Natural dyes', 'Coffee & tea', 'Bamboo crafts'],
    hubs: ['Vientiane', 'Luang Prabang', 'Champasak'], ports: ['Via Laem Chabang (TH) or Da Nang (VN)'], leadTime: '45–90 days',
    products: [
      P('Hand-woven silk & cotton', 'Home Textiles', 'Natural-dye scarves, table runners and wall hangings.', '50 pcs', '$8 – $120', true),
      P('Bamboo & rattan crafts', 'Home Decor', 'Baskets, sticky-rice baskets and decor.', '100 pcs', '$2 – $30'),
      P('Speciality coffee & tea', 'Gifts & Seasonal', 'Bolaven Plateau coffee and highland teas for gift ranges.', '200 kg', '$6 – $25 / kg'),
      P('Silver & tribal jewellery', 'Jewelry', 'Handmade silver jewellery from artisan villages.', '50 pcs', '$5 – $70'),
    ],
  },
  {
    slug: 'south-africa', name: 'South Africa', code: 'ZA', flag: '🇿🇦', region: 'Africa', currency: 'ZAR', sort: 14,
    intro: 'Bold, ethical design — beadwork, natural skincare, mohair and leather from Southern Africa.',
    strengths: ['Mohair', 'Beadwork', 'Natural skincare', 'Leather'],
    hubs: ['Cape Town', 'Johannesburg', 'Durban', 'Eastern Cape'], ports: ['Durban', 'Cape Town', 'Port Elizabeth'], leadTime: '6–10 weeks',
    products: [
      P('Mohair throws & cushions', 'Home Textiles', 'Eastern Cape mohair woven throws and blankets.', '50 pcs', '$40 – $250', true),
      P('Beaded decor & jewellery', 'Handicrafts', 'Zulu and Ndebele beadwork, bowls and accessories.', '100 pcs', '$3 – $80'),
      P('Rooibos & marula skincare', 'Bath & Spa', 'Natural-ingredient body care, private label.', '500 pcs', '$2 – $20'),
      P('Leather & hide products', 'Leather Goods', 'Bags, nguni-hide rugs and accessories.', '30 pcs', '$20 – $400'),
    ],
  },
  {
    slug: 'brazil', name: 'Brazil', code: 'BR', flag: '🇧🇷', region: 'South America', currency: 'BRL', sort: 15,
    intro: 'Tropical hardwoods, leather, natural cosmetics and footwear from Latin America’s largest economy.',
    strengths: ['Hardwood furniture', 'Leather & footwear', 'Natural cosmetics', 'Gemstones'],
    hubs: ['São Paulo', 'Rio Grande do Sul', 'Minas Gerais', 'Santa Catarina'], ports: ['Santos', 'Itajaí', 'Paranaguá'], leadTime: '6–10 weeks',
    products: [
      P('Hardwood & design furniture', 'Furniture', 'FSC hardwood dining, lounge and outdoor furniture.', '20 pcs', '$150 – $2,000', true),
      P('Leather footwear & bags', 'Leather Goods', 'Rio Grande do Sul leather shoes and accessories.', '200 pairs', '$15 – $120'),
      P('Natural & Amazonian cosmetics', 'Bath & Spa', 'Açaí, cupuaçu and murumuru body care.', '500 pcs', '$2 – $25'),
      P('Gemstone decor & jewellery', 'Jewelry', 'Minas Gerais agate, quartz and gemstone pieces.', '50 pcs', '$5 – $300'),
      P('Hammocks & woven textiles', 'Garden & Outdoor', 'Hammocks, rugs and outdoor textiles.', '100 pcs', '$15 – $120'),
    ],
  },
  {
    slug: 'uae', name: 'UAE', code: 'AE', flag: '🇦🇪', region: 'Middle East', currency: 'AED', sort: 16, sellerCountries: ['United Arab Emirates'],
    intro: 'Re-export and trading hub for the GCC and Africa, plus perfumes, dates and luxury gifting.',
    strengths: ['Fragrances & oud', 'Dates & gourmet', 'Re-export trading', 'Luxury gifting'],
    hubs: ['Dubai', 'Sharjah', 'Ajman', 'Abu Dhabi'], ports: ['Jebel Ali', 'Khalifa Port', 'Sharjah'], leadTime: '2–6 weeks',
    products: [
      P('Perfumes & oud', 'Bath & Spa', 'Arabic perfumes, attars and bakhoor, private label.', '300 pcs', '$3 – $60', true),
      P('Premium dates & gift boxes', 'Gifts & Seasonal', 'Medjool and specialty dates in luxury packaging.', '200 boxes', '$5 – $70'),
      P('Ramadan & Eid decor', 'Gifts & Seasonal', 'Lanterns, serveware and festive decor.', '200 pcs', '$3 – $80'),
      P('Luxury corporate gifts', 'Gifts & Seasonal', 'Branded gift sets for GCC corporate clients.', '100 sets', '$15 – $200'),
    ],
  },
  {
    slug: 'oman', name: 'Oman', code: 'OM', flag: '🇴🇲', region: 'Middle East', currency: 'OMR', sort: 17,
    intro: 'Frankincense, silverwork and traditional Omani crafts with access through Sohar and Salalah.',
    strengths: ['Frankincense', 'Silverwork', 'Pottery', 'Dates'],
    hubs: ['Muscat', 'Nizwa', 'Salalah', 'Sohar'], ports: ['Sohar', 'Salalah', 'Duqm'], leadTime: '4–8 weeks',
    products: [
      P('Frankincense & home fragrance', 'Home Decor', 'Dhofar frankincense, burners and fragrance gift sets.', '200 pcs', '$4 – $60', true),
      P('Omani silver jewellery', 'Jewelry', 'Traditional silver jewellery and khanjar-inspired pieces.', '50 pcs', '$15 – $250'),
      P('Bahla pottery', 'Home Decor', 'Hand-thrown terracotta pots and incense burners.', '100 pcs', '$5 – $60'),
      P('Dates & halwa gift boxes', 'Gifts & Seasonal', 'Omani dates and halwa in gift packaging.', '200 boxes', '$5 – $40'),
    ],
  },
  {
    slug: 'south-korea', name: 'South Korea', code: 'KR', flag: '🇰🇷', region: 'East Asia', currency: 'KRW', sort: 18,
    intro: 'Innovation-led beauty, kitchen and lifestyle products with world-class quality control.',
    strengths: ['K-beauty', 'Kitchenware', 'Stationery & lifestyle', 'Technical textiles'],
    hubs: ['Seoul / Gyeonggi', 'Busan', 'Daegu', 'Incheon'], ports: ['Busan', 'Incheon', 'Gwangyang'], leadTime: '3–8 weeks',
    products: [
      P('K-beauty & skincare', 'Bath & Spa', 'OEM/ODM skincare, masks and cosmetics.', '1,000 pcs', '$0.50 – $25', true),
      P('Non-stick & ceramic cookware', 'Kitchen & Dining', 'Cookware, food containers and kitchen gadgets.', '300 pcs', '$4 – $60'),
      P('Stationery & lifestyle goods', 'Gifts & Seasonal', 'Design stationery, character goods and desk accessories.', '500 pcs', '$0.50 – $20'),
      P('Bedding & functional textiles', 'Home Textiles', 'Cooling bedding, microfibre and quilts.', '200 pcs', '$10 – $120'),
    ],
  },
  {
    slug: 'turkey', name: 'Turkey', code: 'TR', flag: '🇹🇷', region: 'Europe / Middle East', currency: 'TRY', sort: 19, sellerCountries: ['Turkey'],
    intro: 'Premium cotton textiles, rugs and glass — a short hop from Europe and the Middle East.',
    strengths: ['Towels & bath linen', 'Glassware', 'Rugs', 'Ceramics'],
    hubs: ['Denizli', 'Bursa', 'Istanbul', 'Gaziantep', 'Kütahya'], ports: ['Mersin', 'Ambarlı (Istanbul)', 'Izmir'], leadTime: '4–8 weeks',
    products: [
      P('Turkish cotton towels & peshtemals', 'Bath & Spa', 'Denizli towels, bathrobes and peshtemal beach towels.', '300 pcs', '$3 – $40', true),
      P('Machine-made & kilim rugs', 'Rugs & Carpets', 'Gaziantep machine rugs and hand-woven kilims.', '50 pcs', '$20 – $600'),
      P('Glassware & tea sets', 'Kitchen & Dining', 'Tea glasses, drinkware and hand-blown glass.', '500 pcs', '$1 – $25'),
      P('Kütahya ceramics', 'Kitchen & Dining', 'Hand-painted Iznik-style ceramics.', '100 pcs', '$4 – $80'),
      P('Home textiles', 'Home Textiles', 'Bursa jacquards, bedding and curtains.', '200 pcs', '$5 – $70'),
    ],
  },
  // Existing sourcing countries kept from the original site
  {
    slug: 'mexico', name: 'Mexico', code: 'MX', flag: '🇲🇽', region: 'North America', currency: 'MXN', sort: 20,
    intro: 'Nearshore option for North American buyers, with truck delivery and USMCA advantages.',
    strengths: ['Pottery', 'Talavera', 'Leather', 'Hand-blown glass'],
    hubs: ['Puebla', 'Guadalajara', 'Oaxaca', 'León'], ports: ['Manzanillo', 'Veracruz', 'Land border crossings'], leadTime: '3–8 weeks',
    products: [
      P('Talavera ceramics', 'Kitchen & Dining', 'Hand-painted Puebla tableware and tiles.', '100 pcs', '$5 – $80', true),
      P('Hand-blown recycled glass', 'Kitchen & Dining', 'Guadalajara drinkware and vases.', '200 pcs', '$3 – $40'),
      P('Leather goods', 'Leather Goods', 'León leather bags, belts and accessories.', '100 pcs', '$10 – $120'),
      P('Woven textiles', 'Home Textiles', 'Oaxacan rugs, blankets and table linen.', '50 pcs', '$15 – $200'),
    ],
  },
  {
    slug: 'portugal', name: 'Portugal', code: 'PT', flag: '🇵🇹', region: 'Europe', currency: 'EUR', sort: 21,
    intro: 'European craftsmanship for premium tableware, cork and linen.',
    strengths: ['Ceramics', 'Cork', 'Linen', 'Cutlery'],
    hubs: ['Porto', 'Guimarães', 'Caldas da Rainha', 'Aveiro'], ports: ['Leixões', 'Lisbon', 'Sines'], leadTime: '4–8 weeks',
    products: [
      P('Stoneware & ceramics', 'Kitchen & Dining', 'Retail and hospitality dinnerware.', '300 pcs', '$4 – $45', true),
      P('Cork homeware', 'Home Decor', 'Cork trays, coasters, planters and bags.', '200 pcs', '$2 – $40'),
      P('Linen & cotton textiles', 'Home Textiles', 'Guimarães bed and table linen.', '200 pcs', '$8 – $90'),
      P('Cutlery', 'Kitchen & Dining', 'Stainless and gold-finish cutlery sets.', '200 sets', '$10 – $90'),
    ],
  },
];

/** Insert missing countries (never overwrites admin edits). */
export async function ensureCountries() {
  for (const c of DEFAULT_COUNTRIES) {
    const exists = await SourcingCountry.exists({ slug: c.slug });
    if (!exists) await SourcingCountry.create({ ...c, version: COUNTRY_VERSION });
  }
}
