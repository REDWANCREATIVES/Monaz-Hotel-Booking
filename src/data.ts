import { MenuItem, HotelRoom, RoomBooking, CafeOrder } from './types';

// All 71 items transcribed with 100% exact names & prices from the 3 attached Monaz Menu images
export const MENU_ITEMS: MenuItem[] = [
  // ==========================================
  // IMAGE 1: BURGERS & SANDWICHES
  // ==========================================
  {
    id: 'burger-1',
    name: 'Monaz Special burger',
    category: 'burgers',
    description: 'Double prime beef patty, caramelized onions, melted cheddar, house secret Monaz sauce, crisp lettuce & tomatoes on a toasted brioche bun.',
    price: 800,
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=600&auto=format&fit=crop',
    rating: 5.0,
    tags: ['Chef Special', 'Double Patty', 'Signature'],
    isSpecial: true,
    available: true
  },
  {
    id: 'burger-2',
    name: 'Special burger',
    category: 'burgers',
    description: 'Generous beef patty layered with farm bacon, fried egg, cheddar slice, pickles, and artisanal relish.',
    price: 700,
    image: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?q=80&w=600&auto=format&fit=crop',
    rating: 4.9,
    tags: ['Popular', 'Loaded'],
    isSpecial: true,
    available: true
  },
  {
    id: 'burger-3',
    name: 'Beef burger',
    category: 'burgers',
    description: 'Juicy 100% fresh seasoned ground beef grilled to perfection with sliced tomato, red onion, and crisp lettuce.',
    price: 450,
    image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=600&auto=format&fit=crop',
    rating: 4.8,
    tags: ['Classic', 'Beef'],
    available: true
  },
  {
    id: 'burger-4',
    name: 'Cheese burger',
    category: 'burgers',
    description: 'Savory grilled beef patty smothered with melted golden cheese, creamy garlic mayo, and garden veggies.',
    price: 550,
    image: 'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?q=80&w=600&auto=format&fit=crop',
    rating: 4.9,
    tags: ['Cheesy', 'Best Seller'],
    available: true
  },
  {
    id: 'burger-5',
    name: 'Chicken burger',
    category: 'burgers',
    description: 'Tender marinated chicken breast fillet, golden crisp outside and juicy inside with honey mustard coleslaw.',
    price: 550,
    image: 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?q=80&w=600&auto=format&fit=crop',
    rating: 4.8,
    tags: ['Crispy Chicken', 'Poultry'],
    available: true
  },
  {
    id: 'burger-6',
    name: 'Club sandwich',
    category: 'burgers',
    description: 'Triple-decker toasted artisan bread filled with sliced roast poultry, boiled egg, cheese, fresh greens, and mayo.',
    price: 550,
    image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?q=80&w=600&auto=format&fit=crop',
    rating: 4.8,
    tags: ['Triple Decker', 'Hearty'],
    available: true
  },
  {
    id: 'burger-7',
    name: 'Tuna sandwich',
    category: 'burgers',
    description: 'Flaked tender ocean tuna blended with diced celery, fresh herbs, lemon juice, and light mayo on toasted bread.',
    price: 500,
    image: 'https://images.unsplash.com/photo-1554433607-66b5efe9d304?q=80&w=600&auto=format&fit=crop',
    rating: 4.7,
    tags: ['Seafood', 'Fresh'],
    available: true
  },
  {
    id: 'burger-8',
    name: 'Egg sandwich',
    category: 'burgers',
    description: 'Fluffy farm-fresh seasoned eggs with melted butter, fresh herbs, and garden crisp greens.',
    price: 300,
    image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?q=80&w=600&auto=format&fit=crop',
    rating: 4.6,
    tags: ['Breakfast', 'Vegetarian'],
    available: true
  },
  {
    id: 'burger-9',
    name: 'Vegetable sandwich',
    category: 'burgers',
    description: 'Layers of roasted zucchini, bell peppers, fresh cucumbers, ripe tomatoes, and herb garlic spread on crusty bread.',
    price: 300,
    image: 'https://images.unsplash.com/photo-1540713434306-5852581b6710?q=80&w=600&auto=format&fit=crop',
    rating: 4.6,
    tags: ['Vegetarian', 'Healthy'],
    available: true
  },
  {
    id: 'burger-10',
    name: 'Sanbusa with Frice',
    category: 'burgers',
    description: 'Two golden flaky stuffed pastry sambusas served alongside a generous portion of hot crispy French fries.',
    price: 250,
    image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=600&auto=format&fit=crop',
    rating: 4.9,
    tags: ['Snack Combo', 'Crispy'],
    available: true
  },
  {
    id: 'burger-11',
    name: 'Sanbusa',
    category: 'burgers',
    description: 'Crispy fried pastry triangles filled with aromatic spiced lentils or seasoned savory minced filling.',
    price: 50,
    image: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?q=80&w=600&auto=format&fit=crop',
    rating: 4.7,
    tags: ['Pastry', 'Traditional'],
    available: true
  },
  {
    id: 'burger-12',
    name: 'French Frice',
    category: 'burgers',
    description: 'Golden, extra crispy hand-cut potato fries lightly salted, served with signature dipping sauces.',
    price: 250,
    image: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?q=80&w=600&auto=format&fit=crop',
    rating: 4.8,
    tags: ['Sides', 'Crispy Fries'],
    available: true
  },

  // ==========================================
  // IMAGE 1: PASTA & RICE ("Spaight")
  // ==========================================
  {
    id: 'pasta-1',
    name: 'Pasta with tomato sauce',
    category: 'pasta_rice',
    description: 'Al dente Italian spaghetti simmered in slow-cooked vine-ripened tomato marinara with garlic and fresh basil.',
    price: 320,
    image: 'https://images.unsplash.com/photo-1621996346565-e3d5d62816f5?q=80&w=600&auto=format&fit=crop',
    rating: 4.7,
    tags: ['Pasta', 'Italian Sauce'],
    available: true
  },
  {
    id: 'pasta-2',
    name: 'pasta with vegetable',
    category: 'pasta_rice',
    description: 'Spaghetti tossed with sautéed seasonal market vegetables, extra virgin olive oil, and aromatic garden herbs.',
    price: 350,
    image: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?q=80&w=600&auto=format&fit=crop',
    rating: 4.8,
    tags: ['Vegetarian', 'Healthy'],
    available: true
  },
  {
    id: 'pasta-3',
    name: 'Pasta with meat',
    category: 'pasta_rice',
    description: 'Rich bolognese-style slow-simmered minced meat ragu infused with rosemary and sweet onions over spaghetti.',
    price: 380,
    image: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?q=80&w=600&auto=format&fit=crop',
    rating: 4.9,
    tags: ['Meat Sauce', 'Hearty'],
    available: true
  },
  {
    id: 'pasta-4',
    name: 'Pasta with tuna',
    category: 'pasta_rice',
    description: 'Spaghetti gently tossed with fine tuna flakes, garlic, capers, parsley, and a light lemon olive oil emulsion.',
    price: 400,
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?q=80&w=600&auto=format&fit=crop',
    rating: 4.8,
    tags: ['Seafood', 'Italian'],
    available: true
  },
  {
    id: 'pasta-5',
    name: 'Rice with vegetable',
    category: 'pasta_rice',
    description: 'Fragrant steamed basmati rice stir-fried with diced bell peppers, sweet carrots, peas, and mild spices.',
    price: 350,
    image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?q=80&w=600&auto=format&fit=crop',
    rating: 4.7,
    tags: ['Rice', 'Vegetarian'],
    available: true
  },
  {
    id: 'pasta-6',
    name: 'Rice with tomato sauce',
    category: 'pasta_rice',
    description: 'Warm fluffy rice served with Monaz house special savory tomato sauce, herbs, and garlic garnish.',
    price: 300,
    image: 'https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?q=80&w=600&auto=format&fit=crop',
    rating: 4.6,
    tags: ['Comfort Food'],
    available: true
  },
  {
    id: 'pasta-7',
    name: 'Rice with tuna',
    category: 'pasta_rice',
    description: 'Fluffy seasoned long-grain rice topped with seasoned flaked tuna, diced onions, and fresh herb garnish.',
    price: 400,
    image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?q=80&w=600&auto=format&fit=crop',
    rating: 4.8,
    tags: ['Tuna', 'High Protein'],
    available: true
  },
  {
    id: 'pasta-8',
    name: 'Rice with meat',
    category: 'pasta_rice',
    description: 'Tender spiced beef chunks sautéed in rich savory gravy, served over aromatic steamed rice.',
    price: 350,
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600&auto=format&fit=crop',
    rating: 4.9,
    tags: ['Meat & Rice', 'Filling'],
    available: true
  },
  {
    id: 'pasta-9',
    name: 'Penne with meat',
    category: 'pasta_rice',
    description: 'Tubular penne pasta cooked al dente, smothered in robust seasoned minced beef sauce and freshly grated cheese.',
    price: 380,
    image: 'https://images.unsplash.com/photo-1608897013039-887f21d8c804?q=80&w=600&auto=format&fit=crop',
    rating: 4.9,
    tags: ['Penne', 'Rich Ragu'],
    available: true
  },
  {
    id: 'pasta-10',
    name: 'Penne with vegetable',
    category: 'pasta_rice',
    description: 'Penne rigate tossed with charred zucchini, broccoli florets, cherry tomatoes, and aromatic herbs.',
    price: 350,
    image: 'https://images.unsplash.com/photo-1556761223-4c4282c73f77?q=80&w=600&auto=format&fit=crop',
    rating: 4.7,
    tags: ['Garden Fresh', 'Pasta'],
    available: true
  },
  {
    id: 'pasta-11',
    name: 'Penne with tomato',
    category: 'pasta_rice',
    description: 'Classic penne coated in fragrant napolitana tomato sauce with fresh basil leaves and a hint of chilli olive oil.',
    price: 320,
    image: 'https://images.unsplash.com/photo-1621996346565-e3d5d62816f5?q=80&w=600&auto=format&fit=crop',
    rating: 4.7,
    tags: ['Tomato', 'Classic'],
    available: true
  },

  // ==========================================
  // IMAGE 1: SALAD AND SOUP
  // ==========================================
  {
    id: 'salad-1',
    name: 'Mixed salad',
    category: 'salad_soup',
    description: 'Crisp seasonal greens, cucumber wheels, tomatoes, shredded carrots, and red onions with zesty vinaigrette.',
    price: 280,
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=600&auto=format&fit=crop',
    rating: 4.7,
    tags: ['Fresh', 'Healthy'],
    available: true
  },
  {
    id: 'salad-2',
    name: 'Avocado salad',
    category: 'salad_soup',
    description: 'Fresh ripe avocado slices arranged over tender lettuce, sweet onions, and drizzled with lemon-herb dressing.',
    price: 300,
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=600&auto=format&fit=crop',
    rating: 4.9,
    tags: ['Avocado', 'Superfood'],
    available: true
  },
  {
    id: 'salad-3',
    name: 'Tuna salad',
    category: 'salad_soup',
    description: 'Flaked tender tuna on a bed of fresh mixed greens with black olives, capers, tomatoes, and house dressing.',
    price: 350,
    image: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?q=80&w=600&auto=format&fit=crop',
    rating: 4.8,
    tags: ['Protein', 'Seafood Salad'],
    available: true
  },
  {
    id: 'salad-4',
    name: 'Chicken salad',
    category: 'salad_soup',
    description: 'Grilled sliced seasoned chicken breast atop crisp romaine lettuce, crunchy croutons, and creamy dressing.',
    price: 350,
    image: 'https://images.unsplash.com/photo-1580013759032-c96505e24c1f?q=80&w=600&auto=format&fit=crop',
    rating: 4.9,
    tags: ['Grilled Chicken', 'Nutritious'],
    available: true
  },
  {
    id: 'soup-1',
    name: 'Chicken soup',
    category: 'salad_soup',
    description: 'Slow-simmered comforting poultry broth with tender pulled chicken, diced vegetables, and aromatic warming herbs.',
    price: 450,
    image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?q=80&w=600&auto=format&fit=crop',
    rating: 4.9,
    tags: ['Warm Broth', 'Comfort'],
    available: true
  },
  {
    id: 'soup-2',
    name: 'Vegetable soup',
    category: 'salad_soup',
    description: 'Hearty garden vegetable broth packed with carrots, potatoes, celery, zucchini, and gentle spices.',
    price: 250,
    image: 'https://images.unsplash.com/photo-1603105037880-880cd4edfb0d?q=80&w=600&auto=format&fit=crop',
    rating: 4.7,
    tags: ['Warm', 'Vegan'],
    available: true
  },

  // ==========================================
  // IMAGE 2: SMOOTHIE & COLD DRINKS
  // ==========================================
  {
    id: 'smoothie-1',
    name: 'Avocado',
    category: 'smoothies_cold',
    description: 'Rich and velvety pure avocado juice blend with a touch of fresh lime and sweet honey.',
    price: 250,
    image: 'https://images.unsplash.com/photo-1525385133512-2f3bdd039054?q=80&w=600&auto=format&fit=crop',
    rating: 4.9,
    tags: ['Fresh Juice', 'Thick & Creamy'],
    available: true
  },
  {
    id: 'smoothie-2',
    name: 'Papaya',
    category: 'smoothies_cold',
    description: 'Fresh tropical ripe papaya blended smoothly into a bright, naturally sweet antioxidant-rich refreshment.',
    price: 200,
    image: 'https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?q=80&w=600&auto=format&fit=crop',
    rating: 4.8,
    tags: ['Tropical', 'Freshly Squeezed'],
    available: true
  },
  {
    id: 'smoothie-3',
    name: 'Avocado with papay',
    category: 'smoothies_cold',
    description: 'Stunning layered Ethiopian-style juice presentation with creamy green avocado and luscious sunrise papaya.',
    price: 220,
    image: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?q=80&w=600&auto=format&fit=crop',
    rating: 5.0,
    tags: ['Layered Juice', 'Monaz Favorite'],
    isSpecial: true,
    available: true
  },
  {
    id: 'cold-1',
    name: 'Soft Drink',
    category: 'smoothies_cold',
    description: 'Choice of ice-chilled bottled carbonated soft beverages (Coca-Cola, Fanta, Sprite, Mirinda).',
    price: 70,
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=600&auto=format&fit=crop',
    rating: 4.7,
    tags: ['Chilled', 'Soda'],
    available: true
  },
  {
    id: 'cold-2',
    name: 'Ambo water',
    category: 'smoothies_cold',
    description: 'Naturally sparkling Ethiopian mineral water bottled straight from volcanic thermal springs at Ambo.',
    price: 70,
    image: 'https://images.unsplash.com/photo-1560512823-829485b8bf24?q=80&w=600&auto=format&fit=crop',
    rating: 4.9,
    tags: ['Sparkling', 'Mineral Water'],
    available: true
  },
  {
    id: 'cold-3',
    name: '1/4 Liter water',
    category: 'smoothies_cold',
    description: 'Purified still spring drinking water bottle (250ml).',
    price: 45,
    image: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?q=80&w=600&auto=format&fit=crop',
    rating: 4.6,
    tags: ['Water', 'Compact'],
    available: true
  },
  {
    id: 'cold-4',
    name: '1/2 Liter water',
    category: 'smoothies_cold',
    description: 'Purified still spring drinking water bottle (500ml).',
    price: 60,
    image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=600&auto=format&fit=crop',
    rating: 4.7,
    tags: ['Water', 'Standard'],
    available: true
  },
  {
    id: 'cold-5',
    name: '1 Litter water',
    category: 'smoothies_cold',
    description: 'Purified still spring drinking water bottle (1000ml).',
    price: 65,
    image: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?q=80&w=600&auto=format&fit=crop',
    rating: 4.7,
    tags: ['Hydration', '1L'],
    available: true
  },
  {
    id: 'cold-6',
    name: '2 Litter water',
    category: 'smoothies_cold',
    description: 'Family size purified still spring drinking water bottle (2000ml).',
    price: 70,
    image: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?q=80&w=600&auto=format&fit=crop',
    rating: 4.8,
    tags: ['Large', 'Water'],
    available: true
  },

  // ==========================================
  // IMAGE 2: HOT DRINKS
  // ==========================================
  {
    id: 'hot-1',
    name: 'Tea',
    category: 'hot_drinks',
    description: 'Classic brewed black tea served piping hot with lemon slice or sugar to taste.',
    price: 40,
    image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?q=80&w=600&auto=format&fit=crop',
    rating: 4.6,
    tags: ['Hot Tea', 'Classic'],
    available: true
  },
  {
    id: 'hot-2',
    name: 'Flavor tea',
    category: 'hot_drinks',
    description: 'Aromatic fruit and herbal infused premium hot tea leaves bursting with delicate natural flavors.',
    price: 90,
    image: 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?q=80&w=600&auto=format&fit=crop',
    rating: 4.8,
    tags: ['Aromatic', 'Infusion'],
    available: true
  },
  {
    id: 'hot-3',
    name: 'Milk tea',
    category: 'hot_drinks',
    description: 'Smooth slow-steeped spiced black tea gently whisked with steamed whole fresh milk.',
    price: 60,
    image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?q=80&w=600&auto=format&fit=crop',
    rating: 4.8,
    tags: ['Creamy', 'Warm'],
    available: true
  },
  {
    id: 'hot-4',
    name: 'Special tea',
    category: 'hot_drinks',
    description: 'House specialty spice blend tea infused with whole cardamom, cinnamon bark, cloves, and honey.',
    price: 130,
    image: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?q=80&w=600&auto=format&fit=crop',
    rating: 4.9,
    tags: ['Monaz Signature', 'Spiced'],
    isSpecial: true,
    available: true
  },
  {
    id: 'hot-5',
    name: 'Macchiato',
    category: 'hot_drinks',
    description: 'Famous Ethiopian layered macchiato: bold dark espresso topped with velvety textured milk foam.',
    price: 100,
    image: 'https://images.unsplash.com/photo-1534778101976-62847782c213?q=80&w=600&auto=format&fit=crop',
    rating: 5.0,
    tags: ['Best Seller', 'Artisan Coffee'],
    available: true
  },
  {
    id: 'hot-6',
    name: 'Coffee',
    category: 'hot_drinks',
    description: 'Traditional Ethiopian highland single-origin dark roasted coffee freshly brewed with intense aroma.',
    price: 70,
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=600&auto=format&fit=crop',
    rating: 4.9,
    tags: ['Traditional Brew', 'Single Origin'],
    available: true
  },
  {
    id: 'hot-7',
    name: 'Korerima coffee',
    category: 'hot_drinks',
    description: 'Authentic Ethiopian coffee brewed with roasted black cardamom (Korerima) seeds for an unforgettable spiced kick.',
    price: 50,
    image: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?q=80&w=600&auto=format&fit=crop',
    rating: 4.9,
    tags: ['Korerima Spiced', 'Authentic'],
    available: true
  },
  {
    id: 'hot-8',
    name: 'Milk',
    category: 'hot_drinks',
    description: 'Warm, gently steamed whole fresh dairy milk served in a comfort cup with honey or sugar.',
    price: 100,
    image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?q=80&w=600&auto=format&fit=crop',
    rating: 4.7,
    tags: ['Pure Dairy', 'Nourishing'],
    available: true
  },
  {
    id: 'hot-9',
    name: 'Peanut tea',
    category: 'hot_drinks',
    description: 'Unique warm toasted peanut tea drink with savory nutty aroma and silky smooth finish.',
    price: 100,
    image: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?q=80&w=600&auto=format&fit=crop',
    rating: 4.8,
    tags: ['Nutty Specialty', 'Warm'],
    available: true
  },
  {
    id: 'hot-10',
    name: 'Cappuccino',
    category: 'hot_drinks',
    description: 'Perfect harmony of rich espresso shot, hot steamed milk, and a thick cushion of cocoa-dusted froth.',
    price: 120,
    image: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?q=80&w=600&auto=format&fit=crop',
    rating: 4.9,
    tags: ['Italian Classic', 'Frothy'],
    available: true
  },
  {
    id: 'hot-11',
    name: 'Spris',
    category: 'hot_drinks',
    description: 'Classic Ethiopian hot Spris: half dark rich spiced tea and half rich highland coffee in harmonious layers.',
    price: 70,
    image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=600&auto=format&fit=crop',
    rating: 4.9,
    tags: ['Tea & Coffee Mix', 'Traditional'],
    available: true
  },
  {
    id: 'hot-12',
    name: 'Ginger tea',
    category: 'hot_drinks',
    description: 'Fresh crushed spicy ginger root decoction simmered with tea leaves and lemon for natural vigor.',
    price: 70,
    image: 'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?q=80&w=600&auto=format&fit=crop',
    rating: 4.8,
    tags: ['Immunity', 'Spicy Ginger'],
    available: true
  },
  {
    id: 'hot-13',
    name: 'Peanut with milk',
    category: 'hot_drinks',
    description: 'Creamy roasted peanut butter drink melted into hot steamed whole milk, sweet and comforting.',
    price: 110,
    image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?q=80&w=600&auto=format&fit=crop',
    rating: 4.8,
    tags: ['Peanut Milk', 'Sweet & Hearty'],
    available: true
  },
  {
    id: 'hot-14',
    name: 'Green tea',
    category: 'hot_drinks',
    description: 'Delicate, gently steamed premium green tea leaves rich in antioxidants with a smooth, clean palate.',
    price: 100,
    image: 'https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?q=80&w=600&auto=format&fit=crop',
    rating: 4.7,
    tags: ['Antioxidant', 'Zen'],
    available: true
  },
  {
    id: 'hot-15',
    name: 'Lipton tea',
    category: 'hot_drinks',
    description: 'Fine yellow label black tea steeped hot with fresh lemon and pure cane sugar.',
    price: 70,
    image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?q=80&w=600&auto=format&fit=crop',
    rating: 4.6,
    tags: ['Classic Tea'],
    available: true
  },
  {
    id: 'hot-16',
    name: 'Peanut with ginger',
    category: 'hot_drinks',
    description: 'Exhilarating hot fusion of warm roasted peanuts and zesty fresh spicy ginger root infusion.',
    price: 100,
    image: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?q=80&w=600&auto=format&fit=crop',
    rating: 4.8,
    tags: ['Peanut Ginger', 'Invigorating'],
    available: true
  },

  // ==========================================
  // IMAGE 3: TRADITIONAL FOOD (የባህል ምግቦች)
  // ==========================================
  {
    id: 'trad-1',
    name: 'Dulet',
    amharicName: 'ዱለት',
    category: 'traditional',
    description: 'Finely minced beef, tripe, liver, sautéed in seasoned spiced butter (niter kibbeh), onions, and mitmita pepper.',
    price: 350,
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=600&auto=format&fit=crop',
    rating: 4.9,
    tags: ['Authentic', 'Spiced Kibbeh'],
    available: true
  },
  {
    id: 'trad-2',
    name: 'Beef Roast',
    amharicName: 'ሥጋ ጥብስ',
    category: 'traditional',
    description: 'Succulent cubes of tender beef seared in a smoking clay pan with sliced onions, rosemary, jalapeños, and berbere.',
    price: 520,
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=600&auto=format&fit=crop',
    rating: 5.0,
    tags: ['Tibs', 'Sizzling Beef', 'Must Try'],
    isSpecial: true,
    available: true
  },
  {
    id: 'trad-3',
    name: 'Normal shiro',
    amharicName: 'ሽሮ ፈሰስ',
    category: 'traditional',
    description: 'Smooth, fragrant slow-simmered spiced chickpea and yellow split-pea stew prepared in a clay pot.',
    price: 300,
    image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=600&auto=format&fit=crop',
    rating: 4.8,
    tags: ['Clay Pot', 'Fasting Friendly'],
    available: true
  },
  {
    id: 'trad-4',
    name: 'Shiro with butter',
    amharicName: 'ተጋቢኖ በቅቤ',
    category: 'traditional',
    description: 'Bubbling Tegabino shiro enriched with aromatic clarified herbal butter (niter kibbeh), garlic, and chili.',
    price: 350,
    image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=600&auto=format&fit=crop',
    rating: 4.9,
    tags: ['Tegabino', 'Rich Kibbeh'],
    available: true
  },
  {
    id: 'trad-5',
    name: 'Fasting shiro',
    amharicName: 'ተጋቢኖ',
    category: 'traditional',
    description: 'Thick, sizzling Tegabino clay pot shiro made strictly with pure vegetable oil, onions, and garlic.',
    price: 320,
    image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=600&auto=format&fit=crop',
    rating: 4.8,
    tags: ['Tsom', 'Fasting', 'Vegan'],
    available: true
  },
  {
    id: 'trad-6',
    name: 'Shiro with meat',
    amharicName: 'ቦዘና ሽሮ',
    category: 'traditional',
    description: 'Rich Bozena Shiro simmered with tender dried or fresh marinated beef chunks infused into thick bubbling chickpea stew.',
    price: 400,
    image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=600&auto=format&fit=crop',
    rating: 4.9,
    tags: ['Bozena', 'Hearty Beef'],
    available: true
  },
  {
    id: 'trad-7',
    name: 'Fish goulash',
    amharicName: 'ዓሳ ጉላሽ',
    category: 'traditional',
    description: 'Fresh lake fish pieces sautéed in rich garlic-tomato sauce with green peppers, onions, and mild spices.',
    price: 700,
    image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?q=80&w=600&auto=format&fit=crop',
    rating: 4.9,
    tags: ['Fish Goulash', 'Fresh Lake Fish'],
    available: true
  },
  {
    id: 'trad-8',
    name: 'Fish Cutlet',
    amharicName: 'ዓሳ ኮተሌት',
    category: 'traditional',
    description: 'Golden, crispy breadcrumb-crusted fresh fish cutlet served with tartar dipping sauce and lemon wedges.',
    price: 900,
    image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?q=80&w=600&auto=format&fit=crop',
    rating: 5.0,
    tags: ['Crispy Cutlet', 'Chef Special'],
    isSpecial: true,
    available: true
  },
  {
    id: 'trad-9',
    name: 'Beyayenetu',
    amharicName: 'በየአይነቱ',
    category: 'traditional',
    description: 'A colorful platter of traditional vegan stews including yellow split pea (Alicha), red lentils (Misir Wot), gomen, cabbage, and beetroot.',
    price: 400,
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=600&auto=format&fit=crop',
    rating: 5.0,
    tags: ['Combination Platter', '100% Vegan'],
    isSpecial: true,
    available: true
  },
  {
    id: 'trad-10',
    name: 'Gomen with meat',
    amharicName: 'ጐመን በሥጋ',
    category: 'traditional',
    description: 'Slow-braised collard greens stewed with bone-in tender beef morsels, garlic, ginger, and spiced butter.',
    price: 400,
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600&auto=format&fit=crop',
    rating: 4.8,
    tags: ['Collard Greens', 'Tender Beef'],
    available: true
  },
  {
    id: 'trad-11',
    name: 'Gomen Tibes',
    amharicName: 'ጐመን ጥብስ',
    category: 'traditional',
    description: 'Fresh collard greens stir-fried quickly in a hot pan with onions, jalapeño chili, and fragrant herbs.',
    price: 300,
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=600&auto=format&fit=crop',
    rating: 4.7,
    tags: ['Stir Fried Greens', 'Vegetarian'],
    available: true
  },
  {
    id: 'trad-12',
    name: 'Gomen Kitfo',
    amharicName: 'ጐመን ክትፎ',
    category: 'traditional',
    description: 'Finely minced collard greens tossed with spiced herbal butter and cottage cheese (Ayib) in a traditional blend.',
    price: 350,
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=600&auto=format&fit=crop',
    rating: 4.8,
    tags: ['Gomen Kitfo', 'Ayib Cheese'],
    available: true
  },
  {
    id: 'trad-13',
    name: 'Special Kitfo',
    amharicName: 'ስፔሻል ክትፎ',
    category: 'traditional',
    description: 'Finest prime lean beef minced raw or warmed gently (Leb-Leb) with rich herbal niter kibbeh, spicy mitmita, served with Ayib and Kocho.',
    price: 1200,
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=600&auto=format&fit=crop',
    rating: 5.0,
    tags: ['Luxury Kitfo', 'Kocho & Ayib', 'Signature'],
    isSpecial: true,
    available: true
  },
  {
    id: 'trad-14',
    name: 'Kitfo Firfir',
    amharicName: 'ክትፎ ፍርፍር',
    category: 'traditional',
    description: 'Torn fresh Injera rolls tossed through warm savory spiced Kitfo and melted spiced butter for unmatched flavor.',
    price: 600,
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=600&auto=format&fit=crop',
    rating: 4.9,
    tags: ['Firfir Fusion', 'Savory'],
    available: true
  },
  {
    id: 'trad-15',
    name: 'Monaz special',
    amharicName: 'ሞናዝ ስፔሻል',
    category: 'traditional',
    description: 'The crowning Monaz Hotel feast: Special Kitfo, sizzling Tibs, Bozena Shiro, Dulet, Ayib cheese, Gomen, and fresh Injera.',
    price: 1600,
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=600&auto=format&fit=crop',
    rating: 5.0,
    tags: ['Grand Platter', 'Hotel Specialty', 'Feast for 2-3'],
    isSpecial: true,
    available: true
  },
  {
    id: 'trad-16',
    name: 'Non fasting combo',
    amharicName: 'የፍስክ ኮምቦ',
    category: 'traditional',
    description: 'Generous platter combining savory beef wot, doro wot sauce, beef tibs, kitfo, and hard-boiled farm egg on injera.',
    price: 1000,
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=600&auto=format&fit=crop',
    rating: 4.9,
    tags: ['Meat Combo', 'Royal Platter'],
    available: true
  },
  {
    id: 'trad-17',
    name: 'Fasting combo',
    amharicName: 'የጾም ኮምቦ',
    category: 'traditional',
    description: 'Grand vegetarian feast featuring shiro, misir wot, kik alicha, fosolia, salad, and spicy timatim fitfit.',
    price: 750,
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=600&auto=format&fit=crop',
    rating: 4.9,
    tags: ['Full Vegan Platter', 'Fasting Special'],
    available: true
  }
];

// Luxury Monaz Hotel Bedrooms & Suites
export const HOTEL_ROOMS: HotelRoom[] = [
  {
    id: 'room-presidential',
    name: 'Monaz Presidential Suite',
    tag: 'Penthouse VIP',
    description: 'The epitome of luxury at Monaz Hotel. Features a separate master bedroom, spacious living lounge, private dining room, panoramic city balcony, marble bathroom with jacuzzi, and 24/7 dedicated butler service.',
    pricePerNight: 4800,
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=800&auto=format&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=800&auto=format&fit=crop'
    ],
    maxGuests: 4,
    bedType: '1 Emperor King Bed + Sofa Bed',
    size: '85 m²',
    amenities: [
      'Panoramic Balcony',
      'Jacuzzi Spa Bath',
      'High-Speed Optical Wi-Fi',
      'Complimentary Monaz Breakfast',
      '65" 4K Smart OLED TV',
      'In-Room Espresso & Tea Station',
      'VIP Airport Pickup Included',
      '24/7 Room Service & Butler'
    ],
    rating: 5.0,
    reviewCount: 48,
    isAvailable: true
  },
  {
    id: 'room-executive',
    name: 'Executive Deluxe Suite',
    tag: 'Executive Floor',
    description: 'Tailored for discerning business travelers and couples seeking elevated comfort. Includes an ergonomic work lounge, plush California King bed, walk-in rain shower, and complimentary access to the Executive Lounge.',
    pricePerNight: 3500,
    image: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=800&auto=format&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1591088398332-8a7791972843?q=80&w=800&auto=format&fit=crop'
    ],
    maxGuests: 3,
    bedType: '1 California King Bed',
    size: '55 m²',
    amenities: [
      'Executive Work Desk',
      'Luxury Rain Shower',
      'Ultra High-Speed Wi-Fi',
      'Complimentary Monaz Breakfast',
      '55" 4K Smart TV',
      'Mini Bar & Coffee Machine',
      'Climate Control AC',
      '24/7 Room Service'
    ],
    rating: 4.9,
    reviewCount: 76,
    isAvailable: true
  },
  {
    id: 'room-balcony',
    name: 'Royal Balcony Room',
    tag: 'City View',
    description: 'Spacious room boasting a private furnished terrace overlooking the vibrant skyline. Decorated with warm African hardwood, ambient lighting, and handpicked textiles.',
    pricePerNight: 2800,
    image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=800&auto=format&fit=crop',
    maxGuests: 2,
    bedType: '1 Plush King Bed',
    size: '42 m²',
    amenities: [
      'Private Scenic Balcony',
      'Luxury En-Suite Bathroom',
      'Free High-Speed Wi-Fi',
      'Complimentary Monaz Breakfast',
      '50" Smart TV',
      'Mini Bar',
      'Soundproof Windows',
      'Room Service'
    ],
    rating: 4.8,
    reviewCount: 62,
    isAvailable: true
  },
  {
    id: 'room-deluxe-king',
    name: 'Deluxe King Bedroom',
    tag: 'Popular Choice',
    description: 'A serene haven featuring an ultra-comfortable orthopedic king mattress, crisp Egyptian cotton linens, elegant ambient illumination, and a modern marble-appointed en-suite.',
    pricePerNight: 2200,
    image: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?q=80&w=800&auto=format&fit=crop',
    maxGuests: 2,
    bedType: '1 King Bed',
    size: '35 m²',
    amenities: [
      'Orthopedic King Bed',
      'Marble Bathroom',
      'High-Speed Wi-Fi',
      'Monaz Breakfast Included',
      'Smart TV & Streaming',
      'Silent In-Room Safe',
      'Tea & Coffee Maker'
    ],
    rating: 4.9,
    reviewCount: 94,
    isAvailable: true
  },
  {
    id: 'room-classic-double',
    name: 'Classic Double Bedroom',
    tag: 'Comfort & Value',
    description: 'Impeccably designed for travelers who appreciate quiet comfort and understated elegance. Features a plush double bed, acoustic insulation, and full modern amenities.',
    pricePerNight: 1800,
    image: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?q=80&w=800&auto=format&fit=crop',
    maxGuests: 2,
    bedType: '1 Queen Bed',
    size: '30 m²',
    amenities: [
      'Queen Size Bed',
      'En-Suite Shower',
      'High-Speed Wi-Fi',
      'Breakfast Included',
      'Flat Screen TV',
      'Daily Housekeeping'
    ],
    rating: 4.7,
    reviewCount: 51,
    isAvailable: true
  },
  {
    id: 'room-superior-twin',
    name: 'Superior Twin Bedroom',
    tag: 'Flexible Twin',
    description: 'Fitted with two custom-crafted single beds with feather toppers, perfect for friends, colleagues, or siblings traveling together.',
    pricePerNight: 1600,
    image: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?q=80&w=800&auto=format&fit=crop',
    maxGuests: 2,
    bedType: '2 Twin Single Beds',
    size: '28 m²',
    amenities: [
      'Two Separate Beds',
      'En-Suite Shower',
      'Free High-Speed Wi-Fi',
      'Breakfast Included',
      'Work Desk',
      'Daily Housekeeping'
    ],
    rating: 4.8,
    reviewCount: 39,
    isAvailable: true
  }
];

// Initial bookings for Admin Dashboard display
export const INITIAL_ROOM_BOOKINGS: RoomBooking[] = [
  {
    id: 'BK-9481',
    roomId: 'room-presidential',
    roomName: 'Monaz Presidential Suite',
    guestName: 'Ambassador Samuel Girma',
    guestEmail: 'samuel.girma@un-eca.org',
    guestPhone: '+251 91 123 4567',
    checkInDate: '2026-10-28',
    checkOutDate: '2026-11-02',
    nights: 5,
    guestsCount: 2,
    specialRequests: 'VIP Airport pickup required, extra sparkling water in lounge.',
    totalPrice: 24000,
    status: 'confirmed',
    createdAt: '2026-10-25T10:14:00Z'
  },
  {
    id: 'BK-9482',
    roomId: 'room-executive',
    roomName: 'Executive Deluxe Suite',
    guestName: 'Sara Alemayehu',
    guestEmail: 'sara.alem@ethioairways.com',
    guestPhone: '+251 92 888 9911',
    checkInDate: '2026-10-27',
    checkOutDate: '2026-10-30',
    nights: 3,
    guestsCount: 1,
    specialRequests: 'Quiet room on highest possible floor.',
    totalPrice: 10500,
    status: 'checked-in',
    createdAt: '2026-10-26T14:32:00Z'
  },
  {
    id: 'BK-9483',
    roomId: 'room-balcony',
    roomName: 'Royal Balcony Room',
    guestName: 'Dr. Michael Chen',
    guestEmail: 'm.chen@globalhealth.org',
    guestPhone: '+1 415 555 0192',
    checkInDate: '2026-10-29',
    checkOutDate: '2026-11-01',
    nights: 3,
    guestsCount: 2,
    specialRequests: 'Late check-in around 10:30 PM.',
    totalPrice: 8400,
    status: 'confirmed',
    createdAt: '2026-10-27T08:20:00Z'
  },
  {
    id: 'BK-9484',
    roomId: 'room-deluxe-king',
    roomName: 'Deluxe King Bedroom',
    guestName: 'Redwan Hood',
    guestEmail: 'redwanredhood@gmail.com',
    guestPhone: '+251 91 444 7722',
    checkInDate: '2026-11-01',
    checkOutDate: '2026-11-05',
    nights: 4,
    guestsCount: 2,
    specialRequests: 'Owner / Executive Suite VIP setup, welcome fruit platter.',
    totalPrice: 8800,
    status: 'confirmed',
    createdAt: '2026-10-27T09:00:00Z'
  }
];

// Initial Cafe/Restaurant Orders for Admin Dashboard display
export const INITIAL_CAFE_ORDERS: CafeOrder[] = [
  {
    id: 'ORD-701',
    customerName: 'Redwan Hood',
    customerEmail: 'redwanredhood@gmail.com',
    customerPhone: '+251 91 444 7722',
    deliveryType: 'room_delivery',
    roomOrTableNumber: 'Suite 401',
    items: [
      { itemId: 'trad-15', name: 'Monaz special', quantity: 1, price: 1600 },
      { itemId: 'hot-5', name: 'Macchiato', quantity: 2, price: 100 },
      { itemId: 'smoothie-3', name: 'Avocado with papay', quantity: 1, price: 220 }
    ],
    totalAmount: 2020,
    notes: 'Please serve warm injera on the side with extra chili.',
    status: 'preparing',
    createdAt: '2026-10-27T14:45:00Z'
  },
  {
    id: 'ORD-702',
    customerName: 'Sara Alemayehu',
    customerEmail: 'sara.alem@ethioairways.com',
    customerPhone: '+251 92 888 9911',
    deliveryType: 'table_service',
    roomOrTableNumber: 'Table 7 (Veranda)',
    items: [
      { itemId: 'burger-1', name: 'Monaz Special burger', quantity: 1, price: 800 },
      { itemId: 'burger-12', name: 'French Frice', quantity: 1, price: 250 },
      { itemId: 'cold-2', name: 'Ambo water', quantity: 1, price: 70 }
    ],
    totalAmount: 1120,
    notes: 'Medium well patty please.',
    status: 'served',
    createdAt: '2026-10-27T13:20:00Z'
  },
  {
    id: 'ORD-703',
    customerName: 'Dawit Bekele',
    customerEmail: 'dawit.b@telecom.et',
    customerPhone: '+251 91 333 4455',
    deliveryType: 'takeaway',
    roomOrTableNumber: 'Counter Pickup',
    items: [
      { itemId: 'trad-2', name: 'Beef Roast (ሥጋ ጥብስ)', quantity: 2, price: 520 },
      { itemId: 'trad-4', name: 'Shiro with butter (ተጋቢኖ በቅቤ)', quantity: 1, price: 350 },
      { itemId: 'hot-6', name: 'Coffee', quantity: 2, price: 70 }
    ],
    totalAmount: 1530,
    notes: 'Packed securely for travel.',
    status: 'pending',
    createdAt: '2026-10-27T15:05:00Z'
  }
];
