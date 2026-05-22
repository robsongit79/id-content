// Database operations
const db = {

  // ── BRANDS ──
  async listBrands() {
    return supabase.select('brands', '?select=id,name,handle,color_primary,color_secondary,color_accent,updated_at&order=updated_at.desc');
  },

  async getBrand(id) {
    const rows = await supabase.select('brands', `?id=eq.${id}`);
    return rows[0] || null;
  },

  async createBrand(data) {
    const rows = await supabase.insert('brands', data);
    return rows[0];
  },

  async updateBrand(id, data) {
    const rows = await supabase.update('brands', id, data);
    return rows[0];
  },

  async deleteBrand(id) {
    await supabase.delete('brands', id);
  },

  // ── CAROUSEL CONFIGS ──
  async getCarouselConfig(brandId) {
    const rows = await supabase.select('carousel_configs', `?brand_id=eq.${brandId}`);
    return rows[0] || null;
  },

  async saveCarouselConfig(brandId, data) {
    const existing = await this.getCarouselConfig(brandId);
    if (existing) {
      const rows = await supabase.update('carousel_configs', existing.id, data);
      return rows[0];
    } else {
      const rows = await supabase.insert('carousel_configs', { ...data, brand_id: brandId });
      return rows[0];
    }
  },

  // ── POST CONFIGS ──
  async getPostConfig(brandId) {
    const rows = await supabase.select('post_configs', `?brand_id=eq.${brandId}`);
    return rows[0] || null;
  },

  async savePostConfig(brandId, data) {
    const existing = await this.getPostConfig(brandId);
    if (existing) {
      const rows = await supabase.update('post_configs', existing.id, data);
      return rows[0];
    } else {
      const rows = await supabase.insert('post_configs', { ...data, brand_id: brandId });
      return rows[0];
    }
  },

  // ── FULL BRAND LOAD ──
  async loadFullBrand(id) {
    const [brand, carousel, post] = await Promise.all([
      this.getBrand(id),
      this.getCarouselConfig(id),
      this.getPostConfig(id),
    ]);
    return { brand, carousel, post };
  },

  // ── SAVE ALL ──
  async saveAll(brandId, brandData, carData, postData) {
    await Promise.all([
      this.updateBrand(brandId, brandData),
      this.saveCarouselConfig(brandId, carData),
      this.savePostConfig(brandId, postData),
    ]);
  }
};
