import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Heart,
  Plus,
  Star,
  Sparkles,
  UtensilsCrossed,
  Coffee,
  Check,
  Flame,
  Filter,
  Eye,
  Info
} from 'lucide-react';
import { MenuItem } from '../types';

interface MenuSectionProps {
  menuItems: MenuItem[];
  onAddToCart: (item: MenuItem) => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
  onOpenBooking: () => void;
}

const CATEGORIES = [
  { id: 'all', label: 'All Dishes', icon: UtensilsCrossed },
  { id: 'traditional', label: 'Traditional (የባህል)', icon: Flame },
  { id: 'burgers', label: 'Burgers & Sandwiches', icon: UtensilsCrossed },
  { id: 'pasta_rice', label: 'Pasta & Rice', icon: UtensilsCrossed },
  { id: 'salad_soup', label: 'Salads & Soups', icon: UtensilsCrossed },
  { id: 'hot_drinks', label: 'Hot Drinks', icon: Coffee },
  { id: 'smoothies_cold', label: 'Smoothies & Cold', icon: Coffee }
];

export default function MenuSection({
  menuItems,
  onAddToCart,
  favorites,
  onToggleFavorite,
  activeCategory,
  setActiveCategory,
  onOpenBooking
}: MenuSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [selectedDishDetail, setSelectedDishDetail] = useState<MenuItem | null>(null);

  // Filter items
  const filteredItems = menuItems.filter((item) => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.amharicName && item.amharicName.includes(searchQuery)) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTag === 'all' || item.tags.includes(selectedTag);
    return matchesCategory && matchesSearch && matchesTag;
  });

  return (
    <section id="menu" className="py-20 md:py-28 bg-[#FFFDF9] relative">
      {/* Decorative ambient background */}
      <div className="absolute top-1/3 left-0 w-80 h-80 bg-[#EA580C]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-0 w-96 h-96 bg-[#2A1810]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 md:px-12 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[#EA580C]/30 text-[#EA580C] text-xs uppercase font-bold tracking-widest shadow-xs mb-3">
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>Monaz Culinary Masterpieces</span>
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#2A1810] tracking-tight">
            Restaurant & <span className="text-[#EA580C]">Cafe Menu</span>
          </h2>
          <p className="mt-3 text-[#6E4733] text-sm sm:text-base leading-relaxed">
            All prices and selections straight from our signature Monaz dining room. Savor sizzling Ethiopian Tibs, authentic Shiro, artisanal Burgers, fresh Juices, and highland Coffees.
          </p>

          {/* Search Bar */}
          <div className="mt-6 max-w-md mx-auto relative">
            <Search className="w-4 h-4 absolute left-4 top-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search 70+ dishes (e.g. Kitfo, Burger, Shiro, Macchiato)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-full border border-[#2A1810]/15 bg-white text-xs sm:text-sm text-[#2A1810] placeholder-gray-400 focus:outline-none focus:border-[#EA580C] shadow-sm transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-3 text-xs text-gray-400 hover:text-gray-600 font-bold"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center justify-start lg:justify-center gap-2 overflow-x-auto pb-4 mb-10 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            const count = cat.id === 'all'
              ? menuItems.length
              : menuItems.filter((i) => i.category === cat.id).length;

            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  setSelectedTag('all');
                }}
                className={`px-4 sm:px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-300 flex items-center gap-2 cursor-pointer shrink-0 shadow-xs ${
                  isActive
                    ? 'bg-gradient-to-r from-[#2A1810] to-[#422518] text-white border border-[#EA580C]/40 shadow-md scale-105'
                    : 'bg-white text-[#6E4733] hover:text-[#EA580C] hover:bg-[#FFF7ED] border border-[#2A1810]/10'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#FB923C]' : 'text-gray-400'}`} />
                <span>{cat.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isActive ? 'bg-[#EA580C] text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Results Counter */}
        <div className="flex items-center justify-between mb-6 text-xs text-[#6E4733] px-2">
          <p>
            Showing <strong className="text-[#2A1810]">{filteredItems.length}</strong> items
            {activeCategory !== 'all' && ` in ${activeCategory.replace('_', ' ')}`}
          </p>
          {searchQuery && (
            <p>Matching: &quot;{searchQuery}&quot;</p>
          )}
        </div>

        {/* Menu Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => {
            const isFav = favorites.includes(item.id);

            return (
              <div
                key={item.id}
                className="bg-white rounded-3xl overflow-hidden border border-[#2A1810]/10 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group relative"
              >
                {/* Image Section */}
                <div className="relative h-48 overflow-hidden bg-[#2A1810]">
                  <img
                    src={item.image}
                    alt={item.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  
                  {/* Subtle gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                  {/* Special Badge if marked */}
                  {item.isSpecial && (
                    <span className="absolute top-3 left-3 px-2.5 py-1 bg-[#EA580C] text-white text-[9px] font-bold uppercase tracking-wider rounded-full shadow-md flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>Signature</span>
                    </span>
                  )}

                  {/* Favorite Button */}
                  <button
                    onClick={() => onToggleFavorite(item.id)}
                    className="absolute top-3 right-3 p-2 rounded-full bg-white/85 hover:bg-white text-gray-400 hover:text-red-500 transition-colors shadow-sm cursor-pointer"
                    title={isFav ? 'Remove Favorite' : 'Add to Favorites'}
                  >
                    <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-red-500 text-red-500' : ''}`} />
                  </button>

                  {/* Bottom overlay price & rating */}
                  <div className="absolute bottom-2.5 inset-x-3 flex items-center justify-between text-white">
                    <span className="font-mono font-bold text-base text-[#FB923C] drop-shadow-sm">
                      {item.price.toLocaleString()} ETB
                    </span>
                    <div className="flex items-center gap-1 text-[11px] font-bold bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded-full">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{item.rating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    {item.amharicName && (
                      <span className="text-[11px] font-bold text-[#EA580C] tracking-wide block">
                        {item.amharicName}
                      </span>
                    )}
                    <h3 className="font-serif text-base font-bold text-[#2A1810] group-hover:text-[#EA580C] transition-colors leading-snug">
                      {item.name}
                    </h3>
                    <p className="text-[11px] text-[#6E4733] mt-1.5 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-md bg-[#FAF6F0] text-[#6E4733] text-[9.5px] font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Action Bar */}
                  <div className="pt-3 border-t border-[#2A1810]/5 flex items-center gap-2">
                    <button
                      onClick={() => onAddToCart(item)}
                      className="flex-1 py-2.5 bg-gradient-to-r from-[#2A1810] to-[#422518] hover:from-[#EA580C] hover:to-[#C2410C] text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#FB923C]" />
                      <span>Add to Order</span>
                    </button>

                    <button
                      onClick={() => setSelectedDishDetail(item)}
                      className="p-2.5 rounded-xl border border-[#2A1810]/15 hover:border-[#EA580C] text-gray-500 hover:text-[#EA580C] transition-colors cursor-pointer"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>

                </div>

              </div>
            );
          })}
        </div>

        {/* Empty state if nothing matches */}
        {filteredItems.length === 0 && (
          <div className="text-center py-16 bg-white rounded-3xl border border-[#2A1810]/10 max-w-md mx-auto p-8 space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#FFF7ED] text-[#EA580C] flex items-center justify-center mx-auto">
              <UtensilsCrossed className="w-6 h-6" />
            </div>
            <h4 className="font-serif text-lg font-bold text-[#2A1810]">No dishes found</h4>
            <p className="text-xs text-[#6E4733]">
              No items matched &quot;{searchQuery}&quot;. Try exploring other categories or clearing your search filter.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('all');
                setSelectedTag('all');
              }}
              className="px-5 py-2 bg-[#EA580C] text-white font-bold rounded-full text-xs uppercase tracking-wider"
            >
              Reset Filters
            </button>
          </div>
        )}

      </div>

      {/* Dish Detail Modal */}
      <AnimatePresence>
        {selectedDishDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl overflow-hidden max-w-lg w-full border border-[#2A1810]/15 shadow-2xl relative"
            >
              <div className="relative h-60 bg-[#2A1810]">
                <img
                  src={selectedDishDetail.image}
                  alt={selectedDishDetail.name}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setSelectedDishDetail(null)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors"
                >
                  <UtensilsCrossed className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  {selectedDishDetail.amharicName && (
                    <span className="text-xs font-bold text-[#EA580C]">
                      {selectedDishDetail.amharicName}
                    </span>
                  )}
                  <h3 className="font-serif text-2xl font-bold text-[#2A1810]">
                    {selectedDishDetail.name}
                  </h3>
                  <p className="font-mono font-bold text-lg text-[#EA580C] mt-1">
                    {selectedDishDetail.price.toLocaleString()} ETB
                  </p>
                </div>

                <p className="text-xs text-[#6E4733] leading-relaxed">
                  {selectedDishDetail.description}
                </p>

                <div className="flex flex-wrap gap-2">
                  {selectedDishDetail.tags.map((tag) => (
                    <span key={tag} className="px-2.5 py-1 rounded-md bg-[#FFF7ED] text-[#EA580C] text-xs font-semibold">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="pt-4 border-t border-[#2A1810]/10 flex items-center gap-3">
                  <button
                    onClick={() => {
                      onAddToCart(selectedDishDetail);
                      setSelectedDishDetail(null);
                    }}
                    className="flex-1 py-3 bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add to Order ({selectedDishDetail.price.toLocaleString()} ETB)</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </section>
  );
}
